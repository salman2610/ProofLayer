import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import { sandboxState } from '../server/sandbox.js';
import { runScopedRetest } from '../server/executor.js';
import { redactEvidence, redactText } from '../server/redaction.js';
import { generateProofRecord, verifyProofRecordIntegrity, canonicalJson } from '../server/crypto.js';
import { validateRetestScope } from '../server/scopeGuard.js';
import { findingsStore } from '../server/store.js';

describe('ProofLayer End-to-End Verification Test Suite', () => {
  const SERVER_URL = 'http://localhost:3001';

  // 1. Secret & PII Redaction Engine Test
  test('Redaction: Masks Bearer tokens, AWS keys, Cookies, and Credit Cards', () => {
    const rawText = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secretpayload and AKIAIOSFODNN7EXAMPLE and card 4532-1234-5678-9012';
    const redacted = redactText(rawText);

    assert.ok(!redacted.includes('eyJhbGciOiJIUzI1NiJ9.secretpayload'), 'Bearer token must be masked');
    assert.ok(!redacted.includes('AKIAIOSFODNN7EXAMPLE'), 'AWS Key must be masked');
    assert.ok(!redacted.includes('4532-1234-5678-9012'), 'Credit card must be masked');
    assert.ok(redacted.includes('[REDACTED_TOKEN:sha256:'), 'Deterministic hash signature must be present');
    assert.ok(redacted.includes('AKIA[REDACTED_AWS_KEY:sha256:'), 'AWS Key hash signature must be present');
    assert.ok(redacted.includes('****-****-****-9012'), 'Credit card masked with last 4 digits');
  });

  // 2. Scope Guard & SSRF Protection Test
  test('Scope Guard: Blocks unauthorized hosts and unapproved cloud metadata access', async () => {
    // A: Unauthorized external host
    const resUnauthorized = await validateRetestScope('http://attacker-controlled-evil.com/exploit');
    assert.equal(resUnauthorized.allowed, false);
    assert.equal(resUnauthorized.category, 'UNAUTHORIZED_TARGET_DOMAIN');

    // B: Cloud metadata SSRF attempt
    const resMetadata = await validateRetestScope('http://169.254.169.254/latest/meta-data/');
    assert.equal(resMetadata.allowed, false);
    assert.equal(resMetadata.category, 'CLOUD_METADATA_BLOCKED');

    // C: Production retest without auth token
    const resProdNoAuth = await validateRetestScope('https://api.staging.acmecloud.internal/api/resource', {
      environmentTier: 'production'
    });
    assert.equal(resProdNoAuth.allowed, false);
    assert.equal(resProdNoAuth.category, 'PRODUCTION_AUTH_REQUIRED');

    // D: Authorized staging target
    const resAuthorized = await validateRetestScope('/api/sandbox/invoices/1001', {
      environmentTier: 'staging'
    });
    assert.equal(resAuthorized.allowed, true);
  });

  // 3. Outcome A: Vulnerable target fails verification
  test('Outcome A: Vulnerable target fails verification (VULNERABILITY_PERSISTS)', async () => {
    const finding = findingsStore.find(f => f.id === 'PL-FIND-001');
    assert.ok(finding, 'Finding PL-FIND-001 must exist');

    // Set sandbox scenario to vulnerable via server API
    await fetch(`${SERVER_URL}/api/sandbox/scenarios/PL-SANDBOX-BOLA/set-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'vulnerable' })
    });

    const result = await runScopedRetest(finding, SERVER_URL);

    assert.equal(result.verdict, 'VULNERABILITY_PERSISTS', 'Verdict must be VULNERABILITY_PERSISTS');
    assert.equal(result.conclusionConfidence.conclusionType, 'CONFIRMATION_OF_VULNERABILITY', 'Confidence must indicate confidence in vulnerability persisting');
    assert.ok(result.conclusionConfidence.score >= 95, 'Confidence score should be high');
    assert.ok(result.failedInvariants.length > 0, 'Must record which invariants failed');

    // Invariant failure detail check
    const statusFail = result.failedInvariants.find(f => f.rule.includes('Status Code'));
    assert.ok(statusFail, 'Status code invariant must have failed');
    assert.ok(statusFail.actual.includes('200'), 'Observed status must be HTTP 200');
  });

  // 4. Outcome B: Naive or bypassable fix fails verification
  test('Outcome B: Naive / bypassable fix fails verification (BYPASS_DETECTED)', async () => {
    const finding = findingsStore.find(f => f.id === 'PL-FIND-001');

    // Set sandbox scenario to naive_fix (developer only guarded direct GET request)
    await fetch(`${SERVER_URL}/api/sandbox/scenarios/PL-SANDBOX-BOLA/set-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'naive_fix' })
    });

    const result = await runScopedRetest(finding, SERVER_URL);

    assert.equal(result.verdict, 'BYPASS_DETECTED', 'Verdict must be BYPASS_DETECTED');
    assert.equal(result.conclusionConfidence.conclusionType, 'CONFIRMATION_OF_BYPASS', 'Conclusion type must be CONFIRMATION_OF_BYPASS');
    assert.ok(result.successfulBypasses.length > 0, 'Must identify which bypass permutations succeeded');

    // Verify bypass details
    const bypassCategories = result.successfulBypasses.map(b => b.category);
    assert.ok(bypassCategories.includes('Verb Tunneling'), 'Must catch verb tunneling / method override bypass');
  });

  // 5. Outcome C: Genuinely fixed target passes verification
  test('Outcome C: Genuinely fixed target passes verification (VERIFIED_REMEDIATED)', async () => {
    const finding = findingsStore.find(f => f.id === 'PL-FIND-001');

    // Set sandbox scenario to fixed
    await fetch(`${SERVER_URL}/api/sandbox/scenarios/PL-SANDBOX-BOLA/set-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'fixed' })
    });

    const result = await runScopedRetest(finding, SERVER_URL);

    assert.equal(result.verdict, 'VERIFIED_REMEDIATED', 'Verdict must be VERIFIED_REMEDIATED');
    assert.equal(result.conclusionConfidence.conclusionType, 'CONFIRMATION_OF_REMEDIATION', 'Conclusion type must be CONFIRMATION_OF_REMEDIATION');
    assert.equal(result.successfulBypasses.length, 0, 'No bypass permutations should have succeeded');
    assert.equal(result.assertionCoverage.percentage, 100, 'Assertion coverage should be 100%');
  });

  // 6. Cryptographic Proof Records & Tamper Detection
  test('Cryptographic Proof: Sealed records verify successfully; tampering is detected', () => {
    const finding = findingsStore.find(f => f.id === 'PL-FIND-001');

    // Generate authentic proof record
    const proof = generateProofRecord({
      findingId: finding.id,
      title: finding.title,
      cwe: finding.cwe,
      severity: finding.severity,
      environment: `http://localhost:3001${finding.asset}`,
      environmentTier: 'staging',
      baselineEvidence: finding.baselineEvidence,
      retestEvidence: { response: { status: 403, body: { error: 'FORBIDDEN' } } },
      invariantEvaluations: { passed: true, passedCount: 3, totalCount: 3 },
      regressionMatrix: [{ id: 'PERM-1', passed: true }],
      verdict: 'VERIFIED_REMEDIATED',
      reviewer: { name: 'Automated Test Runner', role: 'CI Bot', email: 'ci@prooflayer.internal' }
    });

    // Verify intact proof record
    const intactVerification = verifyProofRecordIntegrity(proof);
    assert.equal(intactVerification.isValid, true, 'Intact proof record must be cryptographically valid');
    assert.equal(intactVerification.tamperDetected, false, 'No tamper should be detected on intact record');

    // Maliciously tamper with the retest response status
    const tampered = JSON.parse(JSON.stringify(proof));
    tampered.evidence.retest.response.status = 200; // Forged modification!

    const tamperedVerification = verifyProofRecordIntegrity(tampered);
    assert.equal(tamperedVerification.isValid, false, 'Tampered proof record must FAIL verification');
    assert.equal(tamperedVerification.tamperDetected, true, 'Tamper must be explicitly flagged');
    assert.equal(tamperedVerification.checks.retestIntegrity, false, 'Retest integrity hash must mismatch');
  });

  // 7. Standalone CLI Verification Script Test
  test('Standalone CLI: bin/verify-proof.js verifies offline without dashboard connection', () => {
    const finding = findingsStore.find(f => f.id === 'PL-FIND-001');

    const tempDir = path.resolve('/tmp');
    const validProofPath = path.join(tempDir, 'prooflayer-valid-test.json');
    const tamperedProofPath = path.join(tempDir, 'prooflayer-tampered-test.json');

    const proof = generateProofRecord({
      findingId: finding.id,
      title: finding.title,
      cwe: finding.cwe,
      severity: finding.severity,
      environment: `http://localhost:3001${finding.asset}`,
      environmentTier: 'staging',
      baselineEvidence: finding.baselineEvidence,
      retestEvidence: { response: { status: 403 } },
      invariantEvaluations: { passed: true, passedCount: 2, totalCount: 2 },
      regressionMatrix: [],
      verdict: 'VERIFIED_REMEDIATED',
      reviewer: { name: 'CLI Auditor', role: 'Auditor', email: 'auditor@external.firm' }
    });

    fs.writeFileSync(validProofPath, JSON.stringify(proof, null, 2));

    const tamperedProof = JSON.parse(JSON.stringify(proof));
    tamperedProof.verdict = 'MALICIOUS_OVERRIDE';
    fs.writeFileSync(tamperedProofPath, JSON.stringify(tamperedProof, null, 2));

    // A: Test valid record via CLI -> exit code 0
    let validOutput = '';
    try {
      validOutput = execSync(`node bin/verify-proof.js ${validProofPath}`, { encoding: 'utf8' });
      assert.ok(validOutput.includes('CRYPTOGRAPHICALLY AUTHENTIC'), 'CLI output must confirm authenticity');
    } catch (e) {
      assert.fail(`Valid proof verification failed with CLI exit: ${e.message}`);
    }

    // B: Test tampered record via CLI -> exit code 2
    let tamperedExitedWithNonZero = false;
    try {
      execSync(`node bin/verify-proof.js ${tamperedProofPath}`, { encoding: 'utf8' });
    } catch (e) {
      tamperedExitedWithNonZero = true;
      assert.equal(e.status, 2, 'Tampered record must exit with status code 2');
    }
    assert.ok(tamperedExitedWithNonZero, 'Tampered proof verification CLI must reject modified file');

    // Clean up temporary files
    try { fs.unlinkSync(validProofPath); } catch (e) {}
    try { fs.unlinkSync(tamperedProofPath); } catch (e) {}
  });

});
