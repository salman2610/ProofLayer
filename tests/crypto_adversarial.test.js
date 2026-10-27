import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { generateProofRecord, verifyProofRecordIntegrity, canonicalJson } from '../server/crypto.js';
import { getPublicKey, retireKey, revokeKey, registerKey, initKeys } from '../server/keyManager.js';

describe('Suite 1: Cryptographic Adversarial & Keyring Tamper Tests', () => {

  const baseRecord = generateProofRecord({
    findingId: 'PL-FIND-001',
    title: 'BOLA / Broken Object Level Authorization in Customer Invoice Endpoint',
    cwe: 'CWE-639',
    severity: 'CRITICAL',
    environment: 'http://localhost:3001/api/sandbox/invoices/1001',
    environmentTier: 'staging',
    baselineEvidence: { req: 'GET /invoices/1001', res: { status: 200, body: 'Alice Secret' } },
    retestEvidence: { req: 'GET /invoices/1001', res: { status: 403, body: 'Forbidden' } },
    invariantEvaluations: { passed: true, passedCount: 3, totalCount: 3 },
    regressionMatrix: [{ id: 'PERM-1', passed: true }, { id: 'PERM-2', passed: true }],
    verdict: 'VERIFIED_REMEDIATED',
    reviewer: { name: 'Sarah Chen', role: 'Principal AppSec', email: 'sarah.chen@prooflayer.internal' },
    notes: 'Base authentic cryptographic record for mutation testing'
  });

  // 1. Mutate EVERY signed field independently
  test('Field Mutation: Every signed field must invalidate the digital signature when modified', () => {
    const mutations = [
      { name: 'recordId', mutator: (r) => { r.recordId = 'PL-PROOF-PL-FIND-FORGED'; } },
      { name: 'findingId', mutator: (r) => { r.findingId = 'PL-FIND-999'; } },
      { name: 'title', mutator: (r) => { r.title = 'Different Finding Title'; } },
      { name: 'cwe', mutator: (r) => { r.cwe = 'CWE-89'; } },
      { name: 'severity', mutator: (r) => { r.severity = 'LOW'; } },
      { name: 'verdict', mutator: (r) => { r.verdict = 'VULNERABILITY_PERSISTS'; } },
      { name: 'environment.target', mutator: (r) => { r.environment.target = 'http://evil.internal'; } },
      { name: 'environment.tier', mutator: (r) => { r.environment.tier = 'production'; } },
      { name: 'issuedAt', mutator: (r) => { r.issuedAt = '2026-01-01T00:00:00.000Z'; } },
      { name: 'reviewer.email', mutator: (r) => { r.reviewer.email = 'attacker@forged.com'; } },
      { name: 'testSuiteVersion', mutator: (r) => { r.testSuiteVersion = 'FakeSuite/v0.0'; } },
      { name: 'evidence.baseline', mutator: (r) => { r.evidence.baseline.tampered = true; } },
      { name: 'evidence.retest', mutator: (r) => { r.evidence.retest.res.status = 200; } },
      { name: 'evidence.invariants', mutator: (r) => { r.evidence.invariants.passedCount = 0; } },
      { name: 'evidence.regressionMatrix', mutator: (r) => { r.evidence.regressionMatrix = []; } }
    ];

    for (const { name, mutator } of mutations) {
      const copy = JSON.parse(JSON.stringify(baseRecord));
      mutator(copy);
      const res = verifyProofRecordIntegrity(copy);
      assert.equal(res.isValid, false, `Field mutation of "${name}" MUST invalidate proof record`);
      assert.equal(res.tamperDetected, true, `Field mutation of "${name}" must flag tamperDetected`);
    }
  });

  // 2. Unknown or Rogue Key ID
  test('Key Identity: Proof record with unknown Key ID is rejected', () => {
    const copy = JSON.parse(JSON.stringify(baseRecord));
    copy.integrity.keyId = 'pl-ed25519-unknown-nonexistent-key';

    const res = verifyProofRecordIntegrity(copy);
    assert.equal(res.isValid, false);
    assert.ok(res.error.includes('Unknown or untrusted'));
  });

  // 3. Key Retirement vs Compromise Revocation Semantics
  test('Key Semantics: Retired key permits historical proofs; revoked key invalidates ALL proofs', () => {
    // Generate fresh key for rotation test
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    });
    const keyId = 'pl-ed25519-rotation-test';
    registerKey(keyId, publicKey, 'ACTIVE');

    // Sign record at T1
    const t1 = '2026-10-20T12:00:00.000Z';
    const proofT1 = generateProofRecord({
      findingId: 'PL-FIND-ROTATION',
      title: 'Historical Fix',
      cwe: 'CWE-200',
      severity: 'MEDIUM',
      environment: 'http://localhost:3001/api/test',
      baselineEvidence: { a: 1 },
      retestEvidence: { b: 2 },
      verdict: 'VERIFIED_REMEDIATED',
      issuedAt: t1,
      signingKeyOverride: { keyId, privateKey }
    });

    // A: Normal key retirement at T2 (T2 > T1)
    const t2 = '2026-10-25T00:00:00.000Z';
    retireKey(keyId, t2);

    const resT1 = verifyProofRecordIntegrity(proofT1);
    assert.equal(resT1.isValid, true, 'Historical proof issued prior to key retirement date MUST remain valid');

    // Sign forged record at T3 (T3 > T2 - post-retirement!)
    const proofT3 = generateProofRecord({
      findingId: 'PL-FIND-ROTATION',
      title: 'Historical Fix',
      cwe: 'CWE-200',
      severity: 'MEDIUM',
      environment: 'http://localhost:3001/api/test',
      baselineEvidence: { a: 1 },
      retestEvidence: { b: 2 },
      verdict: 'VERIFIED_REMEDIATED',
      issuedAt: '2026-10-26T00:00:00.000Z',
      signingKeyOverride: { keyId, privateKey }
    });
    const resT3 = verifyProofRecordIntegrity(proofT3);
    assert.equal(resT3.isValid, false, 'Proof issued AFTER key retirement date must be rejected');
    assert.ok(resT3.error.includes('RETIRED'));

    // B: Key Compromise Revocation
    revokeKey(keyId, 'Emergency revocation: Private key leaked');
    const resRevoked = verifyProofRecordIntegrity(proofT1);
    assert.equal(resRevoked.isValid, false, 'Key revoked due to compromise MUST invalidate all records regardless of date');
    assert.ok(resRevoked.error.includes('REVOKED due to compromise'));
  });

  // 4. Local Keyring Tampering Detection
  test('Keyring Integrity: Direct unauthorized tampering with trusted_keyring.json is detected', () => {
    const keyringPath = path.resolve('keys/trusted_keyring.json');
    const originalContent = fs.readFileSync(keyringPath, 'utf8');

    try {
      const parsed = JSON.parse(originalContent);
      // Maliciously inject an unauthorized public key without valid HMAC seal
      parsed.keys['rogue-attacker-key'] = {
        keyId: 'rogue-attacker-key',
        publicKey: '-----BEGIN PUBLIC KEY-----\nBAD\n-----END PUBLIC KEY-----',
        status: 'ACTIVE'
      };
      fs.writeFileSync(keyringPath, JSON.stringify(parsed, null, 2), 'utf8');

      // Re-initialize keys and test resolution
      initKeys();
      const keyResult = getPublicKey('rogue-attacker-key');
      assert.ok(keyResult.tampered, 'Tampered keyring must be caught by Root Trust Anchor seal');
    } finally {
      // Restore valid keyring
      fs.writeFileSync(keyringPath, originalContent, 'utf8');
      initKeys();
    }
  });

  // 5. Canonicalization Determinism
  test('Canonical JSON: Deterministic serialization is bitwise identical across key ordering', () => {
    const objA = { z: 1, a: 2, m: { nested_b: true, nested_a: 'hello' } };
    const objB = { a: 2, m: { nested_a: 'hello', nested_b: true }, z: 1 };

    assert.equal(canonicalJson(objA), canonicalJson(objB), 'Canonical JSON must be identical regardless of property insertion order');
  });

});
