import crypto from 'crypto';

/**
 * ProofLayer Cryptographic Proof Record & Verification Engine
 * Produces audit-ready, tamper-evident cryptographic certificates of remediation.
 * 
 * DESIGN PRINCIPLE:
 * A signed certificate establishes record integrity, provenance, and non-repudiation;
 * it cannot by itself prove that a system is perpetually secure.
 * The underlying tests, invariants, and scope limitations must remain fully inspectable.
 */

const SYSTEM_PROOF_SECRET = process.env.PROOF_SIGNING_SECRET || 'prooflayer_master_remediation_seal_2026_key';
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
 * Creates a cryptographically sealed Proof Record for an evaluated finding
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
  notes = ''
}) {
  const timestamp = new Date().toISOString();

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

  // 3. Generate HMAC cryptographic seal
  const cryptographicSeal = crypto
    .createHmac('sha256', SYSTEM_PROOF_SECRET)
    .update(rootProofDigest)
    .digest('hex');

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
      cryptographicSeal,
      signatureAlgorithm: 'HMAC-SHA256-PROOF-SEAL',
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
 * Validates the cryptographic integrity of an existing Proof Record
 */
export function verifyProofRecordIntegrity(proofRecord) {
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
    
    // Recompute hashes
    const baselineHash = sha256(evidence.baseline || {});
    const retestHash = sha256(evidence.retest || {});
    const invariantsHash = sha256(evidence.invariants || {});
    const regressionHash = sha256(evidence.regressionMatrix || []);
    const findingMetadataHash = sha256({ findingId, title, cwe, severity });

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
    const expectedSeal = crypto.createHmac('sha256', SYSTEM_PROOF_SECRET).update(expectedRoot).digest('hex');

    const digestMatches = expectedRoot === integrity.rootProofDigest;
    const sealMatches = expectedSeal === integrity.cryptographicSeal;

    const baselineMatches = baselineHash === integrity.evidenceHashes.baselineHash;
    const retestMatches = retestHash === integrity.evidenceHashes.retestHash;
    const invariantsMatches = invariantsHash === integrity.evidenceHashes.invariantsHash;
    const regressionMatches = regressionHash === integrity.evidenceHashes.regressionHash;

    const isValid = digestMatches && sealMatches && baselineMatches && retestMatches && invariantsMatches && regressionMatches;

    return {
      isValid,
      tamperDetected: !isValid,
      recordId: proofRecord.recordId,
      findingId: proofRecord.findingId,
      verdict: proofRecord.verdict,
      checks: {
        rootDigestMatch: digestMatches,
        sealSignatureMatch: sealMatches,
        baselineIntegrity: baselineMatches,
        retestIntegrity: retestMatches,
        invariantsIntegrity: invariantsMatches,
        regressionIntegrity: regressionMatches
      },
      auditSummary: isValid 
        ? `Proof record ${proofRecord.recordId} is CRYPTOGRAPHICALLY VALID and authentic. Evidence hashes match exactly.`
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
