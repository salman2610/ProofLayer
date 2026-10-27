import crypto from 'crypto';
import { getSigningPrivateKey, getPublicKey } from './keyManager.js';

/**
 * ProofLayer Asymmetric Cryptographic Proof Record & Verification Engine
 * 
 * DESIGN PRINCIPLE:
 * Uses Ed25519 asymmetric digital signatures (RFC 8032) rather than shared-secret HMAC.
 * ProofLayer signs records using a protected private key. External auditors, clients,
 * and CI gates verify using the public key with zero knowledge of the signing secret.
 * 
 * A signed certificate establishes record integrity and provenance; it does not by
 * itself guarantee security beyond the inspectable assertions and scope recorded.
 */

const TEST_SUITE_VERSION = 'ProofLayer-TestSuite/v1.4.2-hardened';

// Deterministic canonical JSON stringifier (RFC 8785 inspired) to guarantee bitwise reproducibility
export function canonicalJson(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}';
}

// Compute SHA-256 hash of arbitrary content
export function sha256(content) {
  const str = typeof content === 'string' ? content : canonicalJson(content);
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Creates an Asymmetrically Signed Proof Record using Ed25519
 */
export function generateProofRecord({
  findingId,
  title,
  cwe,
  severity,
  environment,
  environmentTier = 'staging',
  baselineEvidence,
  retestEvidence,
  invariantEvaluations,
  regressionMatrix,
  verdict, // 'VERIFIED_REMEDIATED' | 'BYPASS_DETECTED' | 'VULNERABILITY_PERSISTS' | 'FUNCTIONAL_REGRESSION' | 'INCONCLUSIVE'
  verdictTitle,
  assertionCoverage = {},
  conclusionConfidence = {},
  reviewer = { name: 'SecOps Automated Verifier', role: 'AppSec Engineer', email: 'secops@prooflayer.internal' },
  testSuiteVersion = TEST_SUITE_VERSION,
  notes = '',
  issuedAt = null,
  signingKeyOverride = null
}) {
  const timestamp = issuedAt || new Date().toISOString();
  const { keyId, privateKey } = signingKeyOverride || getSigningPrivateKey();

  // 1. Compute discrete hashes for each evidence tier
  const baselineHash = sha256(baselineEvidence || {});
  const retestHash = sha256(retestEvidence || {});
  const invariantsHash = sha256(invariantEvaluations || {});
  const regressionHash = sha256(regressionMatrix || []);
  const findingMetadataHash = sha256({ findingId, title, cwe, severity });

  // 2. Compute composite Root Proof Digest
  const compositeProofString = [
    findingMetadataHash,
    baselineHash,
    retestHash,
    invariantsHash,
    regressionHash,
    environment,
    environmentTier,
    verdict,
    testSuiteVersion,
    timestamp,
    reviewer.email
  ].join('::');

  const rootProofDigest = crypto.createHash('sha256').update(compositeProofString).digest('hex');

  // 3. Generate Ed25519 Digital Signature (Asymmetric cryptography)
  const digitalSignature = crypto.sign(
    null,
    Buffer.from(rootProofDigest, 'utf8'),
    privateKey
  ).toString('base64');

  const recordId = `PL-PROOF-${findingId.toUpperCase()}-${rootProofDigest.slice(0, 8).toUpperCase()}`;

  // 4. Staging vs Production Risk Divergence Warning & Testing Limitations
  const environmentDisclaimer = environmentTier.toLowerCase() !== 'production'
    ? 'NOTICE: This proof was verified in a non-production staging/test environment. Architectural divergence (WAF rules, identity federation, environmental configs) must be accounted for before declaring production immunity.'
    : 'AUDIT NOTICE: Verified in live production environment with authorized non-destructive bounds.';

  const auditLimitationsStatement = 'CERTIFICATE LIMITATIONS: This cryptographic record establishes tamper-evident provenance and integrity of the recorded test execution. It certifies that the specific invariants and bypass permutations recorded herein were tested and observed at the stated timestamp. It does not certify absence of other undiscovered vulnerabilities or environment drift outside the recorded scope.';

  return {
    recordId,
    schemaVersion: 'prooflayer.schema.v2',
    findingId,
    title,
    cwe,
    severity,
    verdict,
    verdictTitle: verdictTitle || (verdict === 'VERIFIED_REMEDIATED' ? 'Remediation Verified' : 'Vulnerability Persists / Incomplete'),
    status: verdict === 'VERIFIED_REMEDIATED' ? 'RESOLVED_VERIFIED' : 'ACTION_REQUIRED',
    issuedAt: timestamp,
    testSuiteVersion,
    
    // Decoupled Metrics
    assertionCoverage: {
      invariantsPassed: assertionCoverage.invariantsPassed ?? (invariantEvaluations?.passedCount || 0),
      invariantsTotal: assertionCoverage.invariantsTotal ?? (invariantEvaluations?.totalCount || 0),
      permutationsBlocked: assertionCoverage.permutationsBlocked ?? 0,
      permutationsTotal: assertionCoverage.permutationsTotal ?? 0,
      overallPassed: assertionCoverage.overallPassed ?? 0,
      overallTotal: assertionCoverage.overallTotal ?? 0,
      coveragePercentage: assertionCoverage.percentage ?? 0
    },
    conclusionConfidence: {
      score: conclusionConfidence.score ?? 95,
      conclusionType: conclusionConfidence.conclusionType ?? 'CONFIRMATION_OF_REMEDIATION',
      explanation: conclusionConfidence.explanation ?? 'Deterministic evaluation of recorded evidence'
    },

    environment: {
      target: environment,
      tier: environmentTier,
      disclaimer: environmentDisclaimer
    },
    reviewer: {
      ...reviewer,
      signedAt: timestamp
    },
    integrity: {
      rootProofDigest,
      signatureAlgorithm: 'Ed25519',
      keyId,
      digitalSignature, // Base64 Ed25519 signature
      evidenceHashes: {
        baselineHash,
        retestHash,
        invariantsHash,
        regressionHash,
        findingMetadataHash
      }
    },
    evidence: {
      baseline: baselineEvidence,
      retest: retestEvidence,
      invariants: invariantEvaluations,
      regressionMatrix: regressionMatrix
    },
    limitations: auditLimitationsStatement,
    notes: notes || 'Evidence-backed cryptographic closure record generated by ProofLayer Engine.'
  };
}

/**
 * Validates the cryptographic integrity of an existing Proof Record using public key
 */
export function verifyProofRecordIntegrity(proofRecord, overridePublicKey = null) {
  try {
    const { 
      integrity, 
      evidence, 
      findingId, 
      title, 
      cwe, 
      severity, 
      environment, 
      verdict, 
      issuedAt, 
      reviewer,
      testSuiteVersion = TEST_SUITE_VERSION
    } = proofRecord;
    
    // 1. Resolve Public Key
    const keyId = integrity.keyId || 'pl-ed25519-2026-k1';
    const keyEntry = overridePublicKey ? { publicKey: overridePublicKey, status: 'ACTIVE' } : getPublicKey(keyId);

    if (!keyEntry) {
      return {
        isValid: false,
        tamperDetected: true,
        error: `Unknown or untrusted signing key ID "${keyId}"`,
        checks: { keyTrusted: false }
      };
    }

    if (keyEntry.tampered) {
      return {
        isValid: false,
        tamperDetected: true,
        error: keyEntry.error || 'KEYRING_INTEGRITY_COMPROMISED: Local trusted keyring has been altered.',
        checks: { keyringIntact: false, keyTrusted: false }
      };
    }

    if (keyEntry.status === 'REVOKED') {
      return {
        isValid: false,
        tamperDetected: true,
        error: `Signing key "${keyId}" was REVOKED due to compromise: ${keyEntry.revocationReason || 'Revoked by key administrator'}. All records signed with this key are untrusted.`,
        checks: { keyNotRevoked: false }
      };
    }

    if (keyEntry.status === 'RETIRED') {
      const issuedTime = new Date(issuedAt).getTime();
      const retiredTime = new Date(keyEntry.retiredAt).getTime();
      if (!isNaN(issuedTime) && !isNaN(retiredTime) && issuedTime > retiredTime) {
        return {
          isValid: false,
          tamperDetected: true,
          error: `Signing key "${keyId}" was RETIRED at ${keyEntry.retiredAt}. Proof issued after retirement is invalid.`,
          checks: { keyNotRetiredAtIssuance: false }
        };
      }
    }

    // 2. Recompute Evidence Hashes
    const baselineHash = sha256(evidence.baseline || {});
    const retestHash = sha256(evidence.retest || {});
    const invariantsHash = sha256(evidence.invariants || {});
    const regressionHash = sha256(evidence.regressionMatrix || []);
    const findingMetadataHash = sha256({ findingId, title, cwe, severity });

    // 3. Recompute Canonical Root Digest
    const compositeProofString = [
      findingMetadataHash,
      baselineHash,
      retestHash,
      invariantsHash,
      regressionHash,
      environment.target,
      environment.tier,
      verdict,
      testSuiteVersion,
      issuedAt,
      reviewer.email
    ].join('::');

    const expectedRoot = crypto.createHash('sha256').update(compositeProofString).digest('hex');
    const digestMatches = expectedRoot === integrity.rootProofDigest;

    // 4. Verify Ed25519 Digital Signature with Public Key
    let signatureMatches = false;
    try {
      signatureMatches = crypto.verify(
        null,
        Buffer.from(integrity.rootProofDigest, 'utf8'),
        keyEntry.publicKey,
        Buffer.from(integrity.digitalSignature, 'base64')
      );
    } catch (sigErr) {
      signatureMatches = false;
    }

    const baselineMatches = baselineHash === integrity.evidenceHashes.baselineHash;
    const retestMatches = retestHash === integrity.evidenceHashes.retestHash;
    const invariantsMatches = invariantsHash === integrity.evidenceHashes.invariantsHash;
    const regressionMatches = regressionHash === integrity.evidenceHashes.regressionHash;

    const expectedRecordId = `PL-PROOF-${findingId.toUpperCase()}-${integrity.rootProofDigest.slice(0, 8).toUpperCase()}`;
    const recordIdMatches = proofRecord.recordId === expectedRecordId;

    const isValid = digestMatches && signatureMatches && baselineMatches && retestMatches && invariantsMatches && regressionMatches && recordIdMatches;

    return {
      isValid,
      tamperDetected: !isValid,
      recordId: proofRecord.recordId,
      findingId: proofRecord.findingId,
      verdict: proofRecord.verdict,
      keyId,
      checks: {
        keyTrusted: true,
        keyNotRevoked: keyEntry.status !== 'REVOKED',
        recordIdMatch: recordIdMatches,
        rootDigestMatch: digestMatches,
        ed25519SignatureMatch: signatureMatches,
        baselineIntegrity: baselineMatches,
        retestIntegrity: retestMatches,
        invariantsIntegrity: invariantsMatches,
        regressionIntegrity: regressionMatches
      },
      auditSummary: isValid 
        ? `Proof record ${proofRecord.recordId} is CRYPTOGRAPHICALLY VALID and authentic (Signed with Ed25519 key: ${keyId}).`
        : `SECURITY ALERT: Proof record ${proofRecord.recordId} has been TAMPERED WITH or modified!`
    };
  } catch (err) {
    return {
      isValid: false,
      tamperDetected: true,
      error: err.message
    };
  }
}
