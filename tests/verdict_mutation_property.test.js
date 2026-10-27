import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateInvariants } from '../server/invariants.js';

describe('Suite 5: Verdict Mutation & Property-Based Fail-Safe Tests', () => {

  const baseFinding = {
    id: 'PL-PROP-TEST',
    asset: '/api/target',
    expectedInvariants: {
      expectedStatus: 403,
      forbiddenStrings: ['ALICE_CONFIDENTIAL_INVOICE_DATA', 'SSN_999-88-7777'],
      requiredHeaders: { 'x-content-type-options': 'nosniff' },
      forbiddenHeaders: ['x-powered-by', 'server']
    }
  };

  // 1. Property-Based HTTP Status Code Mutation Test
  test('Property-Based Test: VERIFIED_REMEDIATED is impossible for any status code other than expected 403', () => {
    // Test across standard HTTP status codes: 100-599
    const testStatusCodes = [
      100, 101,
      200, 201, 202, 204, 206,
      301, 302, 304, 307, 308,
      400, 401, 402, 404, 405, 409, 418, 422, 429,
      500, 501, 502, 503, 504
    ];

    for (const statusCode of testStatusCodes) {
      const mockEvidence = {
        response: {
          status: statusCode,
          statusText: `Status-${statusCode}`,
          headers: { 'x-content-type-options': 'nosniff' },
          body: { message: 'Some response body' }
        }
      };

      const result = evaluateInvariants(mockEvidence, baseFinding.expectedInvariants);

      // Property invariant: For any non-403 status code, result.passed MUST be false!
      assert.equal(
        result.passed, 
        false, 
        `FAIL-SAFE VIOLATION: HTTP status ${statusCode} incorrectly produced a passing invariant!`
      );

      // Property invariant: If 5xx, it MUST be flagged as inconclusive
      if (statusCode >= 500) {
        assert.equal(
          result.isInconclusive, 
          true, 
          `HTTP ${statusCode} server crash must be flagged as isInconclusive`
        );
      }
    }
  });

  // 2. Contradictory Evidence Defense (Correct Status + Confidential Leak)
  test('Contradictory Evidence: HTTP 403 Forbidden with confidential data leak in body must strictly fail', () => {
    const contradictoryEvidence = {
      response: {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'x-content-type-options': 'nosniff' },
        body: JSON.stringify({
          error: 'Access Denied',
          debug_leak: 'ALICE_CONFIDENTIAL_INVOICE_DATA for customer #1001'
        })
      }
    };

    const result = evaluateInvariants(contradictoryEvidence, baseFinding.expectedInvariants);

    assert.equal(result.passed, false, 'Contradictory response must not pass');
    const leakRule = result.failedInvariants.find(f => f.rule.includes('ALICE_CONFIDENTIAL_INVOICE_DATA'));
    assert.ok(leakRule, 'Data leak rule must be recorded as failed');
    assert.ok(leakRule.actual.includes('LEAKED'));
  });

  // 3. Partial / Missing Security Headers
  test('Missing Security Policy: Omission of required header fails invariant check', () => {
    const missingHeaderEvidence = {
      response: {
        status: 403,
        statusText: 'Forbidden',
        headers: {}, // Missing x-content-type-options: nosniff
        body: { message: 'Access denied' }
      }
    };

    const result = evaluateInvariants(missingHeaderEvidence, baseFinding.expectedInvariants);
    assert.equal(result.passed, false);
    const headerFail = result.failedInvariants.find(f => f.rule.includes('x-content-type-options'));
    assert.ok(headerFail, 'Header rule must fail when required header is absent');
  });

  // 4. Information Disclosure in Framework Headers
  test('Information Disclosure Header: Exposed framework header (x-powered-by: Express) fails invariant', () => {
    const exposedHeaderEvidence = {
      response: {
        status: 403,
        statusText: 'Forbidden',
        headers: {
          'x-content-type-options': 'nosniff',
          'x-powered-by': 'Express/5.0.0-beta.1'
        },
        body: { message: 'Access denied' }
      }
    };

    const result = evaluateInvariants(exposedHeaderEvidence, baseFinding.expectedInvariants);
    assert.equal(result.passed, false);
    const disclosureFail = result.failedInvariants.find(f => f.rule.includes('x-powered-by'));
    assert.ok(disclosureFail);
    assert.equal(disclosureFail.passed, false);
  });

  // 5. Connection Aborts and Socket Timeouts (Status 0)
  test('Network Failures: Zero status or connection refusal strictly yields isInconclusive', () => {
    const connectionDropEvidence = {
      response: {
        status: 0,
        statusText: 'CONNECTION_REFUSED',
        body: { details: 'ECONNREFUSED 127.0.0.1:3001' }
      }
    };

    const result = evaluateInvariants(connectionDropEvidence, baseFinding.expectedInvariants);
    assert.equal(result.passed, false);
    assert.equal(result.isInconclusive, true);
    assert.ok(result.inconclusiveSummary.includes('unreachable') || result.inconclusiveSummary.includes('refused'));
  });

  // 6. Malformed Evidence Inputs
  test('Malformed Evidence: Null, undefined, or empty evidence objects fail-safe without throwing', () => {
    const emptyCases = [null, undefined, {}, { response: null }, { response: {} }];

    for (const emptyEvidence of emptyCases) {
      assert.doesNotThrow(() => {
        const res = evaluateInvariants(emptyEvidence, baseFinding.expectedInvariants);
        assert.equal(res.passed, false, 'Empty or malformed evidence must never report clean pass');
      });
    }
  });

});
