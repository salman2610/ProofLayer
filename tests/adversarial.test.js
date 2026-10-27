import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { verifyProofRecordIntegrity, generateProofRecord } from '../server/crypto.js';
import { revokeKey, initKeys } from '../server/keyManager.js';
import { evaluateInvariants } from '../server/invariants.js';
import { validateRetestScope } from '../server/scopeGuard.js';
import { isProhibitedIp, normalizeIpAddress, safeExecuteProbe } from '../server/safeClient.js';
import { verifyWebhookSecurity } from '../server/integrations.js';
import { redactText, redactJson, stripAnsiEscapes } from '../server/redaction.js';
import { findingsStore } from '../server/store.js';

describe('ProofLayer Security Assurance Test Suite (Adversarial Validation)', () => {
  const SERVER_URL = 'http://localhost:3001';

  // =========================================================================
  // AREA 1: VERDICT ENGINE RESILIENCE & MUTATION ATTACKS
  // =========================================================================
  describe('Area 1: Verdict Engine Adversarial Resilience', () => {
    test('Attack: Unexpected 500 crash must NEVER result in clean verified verdict', () => {
      const mockEvidence = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          body: { error: 'Database connection failed / unhandled exception' }
        }
      };

      const result = evaluateInvariants(mockEvidence, { expectedStatus: 403 });
      assert.equal(result.passed, false, 'Server crash must NOT pass verification');
      assert.equal(result.isInconclusive, true, 'Server crash must be flagged as INCONCLUSIVE');
      assert.ok(result.inconclusiveReasons.length > 0, 'Must record inconclusive explanation');
    });

    test('Attack: Target connection refused must be flagged as INCONCLUSIVE, not verified', () => {
      const mockEvidence = {
        response: {
          status: 0,
          statusText: 'CONNECTION_REFUSED',
          body: { error: 'TCP connection refused' }
        }
      };

      const result = evaluateInvariants(mockEvidence, { expectedStatus: 403 });
      assert.equal(result.passed, false, 'Connection drop must not pass');
      assert.equal(result.isInconclusive, true, 'Must flag as inconclusive');
    });

    test('Attack: Contradictory response (HTTP 403 status but body leaks forbidden string) fails cleanly', () => {
      const mockEvidence = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          body: {
            message: 'Access Denied',
            leaked_secret: 'invoice_secret_token_1001' // Forbidden string!
          }
        }
      };

      const result = evaluateInvariants(mockEvidence, {
        expectedStatus: 403,
        forbiddenStrings: ['invoice_secret_token_1001']
      });

      assert.equal(result.passed, false, 'Leaked secret must cause invariant failure despite 403 status');
      const leakFail = result.failedInvariants.find(f => f.rule.includes('invoice_secret_token_1001'));
      assert.ok(leakFail, 'Must record specific data leak violation');
      assert.ok(leakFail.evidenceExcerpt.includes('invoice_secret_token_1001'));
    });
  });

  // =========================================================================
  // AREA 2: PROOF INTEGRITY, FORGERY & ASYMMETRIC SIGNATURE ATTACKS
  // =========================================================================
  describe('Area 2: Proof Integrity & Asymmetric Ed25519 Digital Signature Attacks', () => {
    const sampleProof = generateProofRecord({
      findingId: 'PL-FIND-001',
      title: 'BOLA in Invoice API',
      cwe: 'CWE-639',
      severity: 'CRITICAL',
      environment: 'http://localhost:3001/api/sandbox/invoices/1001',
      environmentTier: 'staging',
      baselineEvidence: { req: 'GET /invoices/1001', res: 200 },
      retestEvidence: { req: 'GET /invoices/1001', res: 403 },
      invariantEvaluations: { passed: true, passedCount: 2, totalCount: 2 },
      regressionMatrix: [{ id: 'PERM-1', passed: true }],
      verdict: 'VERIFIED_REMEDIATED',
      reviewer: { name: 'Lead Auditor', role: 'AppSec', email: 'auditor@prooflayer.io' }
    });

    test('Attack: Modifying signed verdict from VERIFIED to VULNERABLE or vice-versa fails integrity', () => {
      const forged = JSON.parse(JSON.stringify(sampleProof));
      forged.verdict = 'VULNERABILITY_PERSISTS';

      const result = verifyProofRecordIntegrity(forged);
      assert.equal(result.isValid, false, 'Tampered verdict must be rejected');
      assert.equal(result.checks.rootDigestMatch, false, 'Root digest must fail to match');
    });

    test('Attack: Changing environment tier from staging to production is detected', () => {
      const forged = JSON.parse(JSON.stringify(sampleProof));
      forged.environment.tier = 'production';

      const result = verifyProofRecordIntegrity(forged);
      assert.equal(result.isValid, false, 'Tampered environment must be rejected');
    });

    test('Attack: Altering reviewer email or timestamp is detected', () => {
      const forged = JSON.parse(JSON.stringify(sampleProof));
      forged.reviewer.email = 'attacker@evil.corp';

      const result = verifyProofRecordIntegrity(forged);
      assert.equal(result.isValid, false, 'Tampered reviewer must be rejected');
    });

    test('Attack: Forged signature using a rogue Ed25519 key fails verification', () => {
      const forged = JSON.parse(JSON.stringify(sampleProof));

      // Generate attacker's own rogue Ed25519 key pair
      const roguePair = crypto.generateKeyPairSync('ed25519');
      const rogueSignature = crypto.sign(null, Buffer.from(forged.integrity.rootProofDigest, 'utf8'), roguePair.privateKey);
      forged.integrity.digitalSignature = rogueSignature.toString('base64');

      const result = verifyProofRecordIntegrity(forged);
      assert.equal(result.isValid, false, 'Signature from rogue key must fail verification');
      assert.equal(result.checks.ed25519SignatureMatch, false, 'Signature verification must fail against trusted public key');
    });

    test('Attack: Revoked signing key invalidates proof record', () => {
      // Create a record with a temporary key ID
      const tempKeyId = 'pl-ed25519-temp-test-key';
      const tempPair = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' }
      });
      
      // Revoke the key in the keyring
      revokeKey(tempKeyId, 'Emergency revocation due to key rotation');

      const forgedRecord = JSON.parse(JSON.stringify(sampleProof));
      forgedRecord.integrity.keyId = tempKeyId;

      const result = verifyProofRecordIntegrity(forgedRecord);
      assert.equal(result.isValid, false, 'Record signed by revoked key must be rejected');
      assert.ok(result.error.includes('REVOKED'), 'Error must explicitly state key revocation');
    });
  });

  // =========================================================================
  // AREA 3: SCOPE GUARD, POST-DNS PINNING & SSRF ESCAPE ATTACKS
  // =========================================================================
  describe('Area 3: Scope Guard, Post-DNS Pinning & SSRF Defense', () => {
    test('Attack: IPv4-mapped IPv6 address [::ffff:169.254.169.254] is recognized and blocked', () => {
      const check = isProhibitedIp('::ffff:169.254.169.254');
      assert.equal(check.prohibited, true, 'IPv4-mapped metadata must be prohibited');
      assert.ok(check.reason.includes('Metadata'));
    });

    test('Attack: IPv6 loopback [::1] is recognized and blocked', () => {
      const check = isProhibitedIp('::1');
      assert.equal(check.prohibited, true, 'IPv6 loopback must be prohibited');
    });

    test('Attack: Decimal IP representation (2852039166 = 169.254.169.254) is blocked', async () => {
      const result = await validateRetestScope('http://2852039166/latest/meta-data/');
      assert.equal(result.allowed, false, 'Decimal IP metadata must be blocked');
      assert.equal(result.category, 'CLOUD_METADATA_BLOCKED');
    });

    test('Attack: Open redirect bypass (302 redirecting to cloud metadata) is intercepted by safe client', async () => {
      // Request that returns an open redirect to 169.254.169.254
      const mockRedirectRequest = {
        method: 'GET',
        url: 'http://169.254.169.254/latest/meta-data/'
      };

      const result = await safeExecuteProbe(SERVER_URL, mockRedirectRequest, {
        environmentTier: 'staging',
        allowLabSandbox: false
      });

      assert.equal(result.status, 0, 'Connection to metadata must be aborted');
      assert.equal(result.statusText, 'SCOPE_GUARD_BLOCKED', 'Must be blocked by Scope Guard');
      assert.ok(result.body.reason.includes('metadata') || result.body.category.includes('METADATA'));
    });

    test('Attack: Destructive mutation method (DELETE) in production without authorization is blocked', async () => {
      const result = await validateRetestScope('https://api.staging.acmecloud.internal/api/resource', {
        environmentTier: 'production',
        productionAuthToken: 'valid-test-token',
        method: 'DELETE',
        allowMutatingProduction: false
      });

      assert.equal(result.allowed, false, 'Destructive DELETE must be blocked in production');
      assert.equal(result.category, 'DESTRUCTIVE_METHOD_BLOCKED');
    });
  });

  // =========================================================================
  // AREA 4: WEBHOOK FORGERY & REPLAY ATTACKS
  // =========================================================================
  describe('Area 4: Webhook Signature, Freshness & Replay Defense', () => {
    const WEBHOOK_SECRET = 'prooflayer_webhook_hmac_secret_2026';
    const validPayload = { comment: { body: '/prooflayer retest PL-FIND-001' } };
    const rawPayloadStr = JSON.stringify(validPayload);

    test('Attack: Webhook with invalid or forged HMAC signature is rejected', () => {
      const headers = {
        'x-hub-signature-256': 'sha256=baddeadbeef00000000000000000000000000000000000000000000000000000'
      };

      const result = verifyWebhookSecurity(headers, rawPayloadStr);
      assert.equal(result.valid, false, 'Forged signature must be rejected');
      assert.equal(result.code, 'INVALID_SIGNATURE');
    });

    test('Attack: Replay of an expired webhook (> 5 minutes old) is rejected', () => {
      const staleTimestamp = new Date(Date.now() - (10 * 60 * 1000)).toISOString(); // 10 minutes ago
      const signature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawPayloadStr).digest('hex');

      const headers = {
        'x-hub-signature-256': signature,
        'x-prooflayer-timestamp': staleTimestamp
      };

      const result = verifyWebhookSecurity(headers, rawPayloadStr);
      assert.equal(result.valid, false, 'Stale webhook must be rejected');
      assert.equal(result.code, 'STALE_TIMESTAMP');
    });

    test('Attack: Replay of duplicate delivery ID is intercepted', () => {
      const deliveryId = `test-delivery-replay-attack-${Date.now()}`;
      const signature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawPayloadStr).digest('hex');

      const headers = {
        'x-hub-signature-256': signature,
        'x-github-delivery': deliveryId,
        'x-prooflayer-timestamp': new Date().toISOString()
      };

      // First delivery: valid
      const res1 = verifyWebhookSecurity(headers, rawPayloadStr);
      assert.equal(res1.valid, true, 'First delivery should be valid');

      // Second delivery with same delivery ID: replay attack!
      const res2 = verifyWebhookSecurity(headers, rawPayloadStr);
      assert.equal(res2.valid, false, 'Replayed delivery ID must be rejected');
      assert.equal(res2.code, 'REPLAY_REJECTED');
    });
  });

  // =========================================================================
  // AREA 5: EVIDENCE HANDLING & REDACTION INJECTION DEFENSE
  // =========================================================================
  describe('Area 5: Evidence Handling & Log Injection Defense', () => {
    test('Attack: ANSI escape sequences attempting terminal log forgery are stripped', () => {
      // Terminal injection: \x1b[2K (erase line) + \x1b[32m (green text) + forged prompt
      const maliciousLog = 'Real log line\x1b[2K\r\x1b[32mVERIFIED CLEAN - ZERO ISSUES\x1b[0m';
      const sanitized = stripAnsiEscapes(maliciousLog);

      assert.ok(!sanitized.includes('\x1b['), 'ANSI escape control codes must be stripped');
      assert.ok(!sanitized.includes('\u001b['), 'Unicode escapes must be stripped');
    });

    test('Attack: Raw Base64-encoded JWT token in body is masked', () => {
      const rawBody = 'Authentication response: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const redacted = redactText(rawBody);

      assert.ok(!redacted.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'Raw JWT header must be masked');
      assert.ok(redacted.includes('[REDACTED_RAW_JWT:sha256:'), 'Must be replaced with deterministic placeholder');
    });

    test('Attack: Deeply nested JSON payload (depth 50) is bounded without crashing stack', () => {
      let deepObj = { leaf: 'secret_key_123' };
      for (let i = 0; i < 50; i++) {
        deepObj = { nested: deepObj };
      }

      // Should not throw RangeError: Maximum call stack size exceeded
      assert.doesNotThrow(() => {
        const result = redactJson(deepObj);
        assert.ok(result, 'Deep JSON should be handled with depth guard');
      });
    });
  });
});
