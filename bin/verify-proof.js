#!/usr/bin/env node

/**
 * ProofLayer Standalone Proof Record Verification CLI
 * 
 * Verifies cryptographic proof record integrity and provenance completely offline,
 * without connecting to the ProofLayer dashboard or database.
 * 
 * Usage:
 *   node bin/verify-proof.js <path-to-proof.json>
 *   npm run verify -- <path-to-proof.json>
 */

import fs from 'fs';
import path from 'path';
import { verifyProofRecordIntegrity } from '../server/crypto.js';

const filePath = process.argv[2];

if (!filePath) {
  console.error('\nUsage: node bin/verify-proof.js <path-to-proof-record.json>\n');
  process.exit(1);
}

try {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`\n[ERROR] File not found: ${fullPath}\n`);
    process.exit(1);
  }

  const raw = fs.readFileSync(fullPath, 'utf8');
  const record = JSON.parse(raw);

  console.log('\n======================================================');
  console.log('       ProofLayer Standalone Cryptographic Verifier   ');
  console.log('======================================================\n');
  console.log(`Analyzing Record: ${record.recordId || 'Unknown ID'}`);
  console.log(`Finding:         ${record.findingId}: ${record.title}`);
  console.log(`Target:          ${record.environment?.target} (Tier: ${record.environment?.tier})`);
  console.log(`Verdict:         ${record.verdict} (${record.verdictTitle || ''})`);
  console.log(`Issued At:       ${record.issuedAt}`);
  console.log(`Signer:          ${record.reviewer?.name} <${record.reviewer?.email}>`);
  console.log(`Test Suite:      ${record.testSuiteVersion || 'N/A'}\n`);

  console.log('--- Cryptographic Integrity Checks ---');
  const result = verifyProofRecordIntegrity(record);

  console.log(`[${result.checks.rootDigestMatch ? 'PASS' : 'FAIL'}] Root Proof Digest Match`);
  console.log(`[${result.checks.sealSignatureMatch ? 'PASS' : 'FAIL'}] HMAC Cryptographic Seal Valid`);
  console.log(`[${result.checks.baselineIntegrity ? 'PASS' : 'FAIL'}] Baseline Exploit Evidence Hash Match`);
  console.log(`[${result.checks.retestIntegrity ? 'PASS' : 'FAIL'}] Retest Execution Evidence Hash Match`);
  console.log(`[${result.checks.invariantsIntegrity ? 'PASS' : 'FAIL'}] Invariant Assertions Hash Match`);
  console.log(`[${result.checks.regressionIntegrity ? 'PASS' : 'FAIL'}] Regression Permutations Hash Match\n`);

  if (record.assertionCoverage) {
    console.log('--- Test Coverage & Assertions ---');
    console.log(`Invariants Passed:     ${record.assertionCoverage.invariantsPassed}/${record.assertionCoverage.invariantsTotal}`);
    console.log(`Permutations Blocked:  ${record.assertionCoverage.permutationsBlocked}/${record.assertionCoverage.permutationsTotal}`);
    console.log(`Overall Coverage:      ${record.assertionCoverage.coveragePercentage}%\n`);
  }

  if (record.conclusionConfidence) {
    console.log('--- Conclusion Confidence ---');
    console.log(`Confidence Score:      ${record.conclusionConfidence.score}%`);
    console.log(`Type:                  ${record.conclusionConfidence.conclusionType}`);
    console.log(`Explanation:           ${record.conclusionConfidence.explanation}\n`);
  }

  if (record.limitations) {
    console.log('--- Verification Scope Limitations ---');
    console.log(record.limitations);
    console.log('');
  }

  console.log('======================================================');
  if (result.isValid) {
    console.log('VERDICT: [✓ CRYPTOGRAPHICALLY AUTHENTIC & UNTAMPERED]');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.log('VERDICT: [✖ TAMPER DETECTED - PROOF RECORD CORRUPTED OR FORGED]');
    console.log('======================================================\n');
    process.exit(2);
  }
} catch (err) {
  console.error(`\n[FATAL] Verification failed: ${err.message}\n`);
  process.exit(1);
}
