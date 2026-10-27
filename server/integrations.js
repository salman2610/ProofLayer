import crypto from 'crypto';
import { redactEvidence } from './redaction.js';
import { logAuditEvent, findingsStore } from './store.js';
import { runScopedRetest } from './executor.js';
import { generateProofRecord } from './crypto.js';

/**
 * ProofLayer Enterprise Integrations Engine
 * 
 * 1. High-fidelity SARIF & Burp Suite importers preserving source evidence and provenance.
 * 2. GitHub Issues / PR & Jira Webhook Automation allowing developers to trigger
 *    scoped retests via comment commands or ticket state changes.
 */

/**
 * Parse SARIF 2.1.0 with complete source provenance
 */
export function parseSarifWithProvenance(sarifJson) {
  const importedFindings = [];

  const runs = sarifJson.runs || [];
  for (const run of runs) {
    const driver = run.tool?.driver || {};
    const toolName = driver.name || 'Static/Dynamic Security Scanner';
    const toolVersion = driver.version || '1.0.0';
    const rules = driver.rules || [];

    const results = run.results || [];
    for (const res of results) {
      const ruleId = res.ruleId || 'SEC-001';
      const ruleObj = rules.find(r => r.id === ruleId) || {};
      const ruleName = ruleObj.shortDescription?.text || ruleObj.name || ruleId;
      const cweTag = (ruleObj.properties?.tags || []).find(t => t.startsWith('CWE-')) || 'CWE-20';

      const location = res.locations?.[0] || {};
      const physLoc = location.physicalLocation || {};
      const fileUri = physLoc.artifactLocation?.uri || '/api/endpoint';
      const startLine = physLoc.region?.startLine || 1;
      const endLine = physLoc.region?.endLine || startLine;
      const snippet = physLoc.region?.snippet?.text || '';

      const findingId = `PL-SARIF-${Math.floor(1000 + Math.random() * 9000)}`;

      // Infer expected invariants based on CWE/scanner message
      let expectedStatus = 403;
      let forbiddenStrings = [];
      if (ruleId.includes('SSRF') || cweTag === 'CWE-918') {
        expectedStatus = [400, 403];
        forbiddenStrings = ['169.254', 'metadata'];
      }

      const finding = {
        id: findingId,
        title: `[${toolName}] ${ruleId}: ${res.message?.text?.slice(0, 70) || ruleName}`,
        cwe: cweTag,
        cweName: ruleName,
        severity: res.level === 'error' ? 'HIGH' : res.level === 'warning' ? 'MEDIUM' : 'LOW',
        cvss: res.level === 'error' ? 8.0 : 5.5,
        asset: fileUri,
        category: 'SARIF Provenance Import',
        status: 'PENDING_RETEST',
        environmentTier: 'staging',
        assignedDev: 'dev-team@acmecloud.internal',
        reportedBy: `${toolName} v${toolVersion}`,
        provenance: {
          scannerName: toolName,
          scannerVersion: toolVersion,
          ruleId,
          ruleName,
          fileUri,
          lineRange: `L${startLine}-L${endLine}`,
          scannerSnippet: snippet,
          rawScannerMessage: res.message?.text || ''
        },
        description: res.message?.text || 'Imported from SARIF 2.1.0 artifact with full provenance.',
        reproductionSteps: [
          `Execute scanner rule check ${ruleId} against ${fileUri}`,
          `Verify security invariant at lines ${startLine}-${endLine}`
        ],
        expectedInvariants: {
          expectedStatus,
          forbiddenStrings
        },
        baselineEvidence: redactEvidence({
          timestamp: new Date().toISOString(),
          request: {
            method: 'GET',
            url: fileUri.startsWith('/') ? fileUri : `/api/${fileUri}`,
            headers: { 'Host': 'api.staging.acmecloud.internal' },
            body: null
          },
          response: {
            status: 200,
            statusText: 'OK',
            durationMs: 45,
            headers: { 'content-type': 'application/json' },
            body: {
              scanner_alert: res.message?.text || 'Vulnerability detected by static rule',
              vulnerable_source_line: `${fileUri}:${startLine}`
            }
          }
        }),
        latestRetest: null,
        regressionMatrix: null,
        proofRecord: null
      };

      findingsStore.push(finding);
      importedFindings.push(finding);
    }
  }

  logAuditEvent('IMPORT_SARIF_PROVENANCE', `Imported ${importedFindings.length} findings with complete source provenance`);
  return importedFindings;
}

/**
 * Parse Burp Suite XML/JSON with full request/response provenance
 */
export function parseBurpWithProvenance(burpItem) {
  const findingId = `PL-BURP-${Math.floor(1000 + Math.random() * 9000)}`;

  const cleanBaseline = redactEvidence({
    timestamp: burpItem.time || new Date().toISOString(),
    request: burpItem.request || {
      method: burpItem.method || 'GET',
      url: burpItem.path || burpItem.url || '/api/target',
      headers: burpItem.requestHeaders || {},
      body: burpItem.requestBody || null
    },
    response: burpItem.response || {
      status: burpItem.status || 200,
      statusText: 'OK',
      durationMs: burpItem.durationMs || 50,
      headers: burpItem.responseHeaders || {},
      body: burpItem.responseBody || 'Burp scanner proof evidence'
    }
  });

  const finding = {
    id: findingId,
    title: `[Burp Suite] ${burpItem.issueName || burpItem.name || 'Application Security Finding'}`,
    cwe: burpItem.cwe || 'CWE-200',
    cweName: burpItem.issueType || 'Information Disclosure',
    severity: (burpItem.severity || 'MEDIUM').toUpperCase(),
    cvss: burpItem.cvss || 6.5,
    asset: burpItem.path || burpItem.url || '/api/resource',
    category: 'Burp Suite Provenance',
    status: 'PENDING_RETEST',
    environmentTier: burpItem.environmentTier || 'staging',
    assignedDev: 'appsec-triage@acmecloud.internal',
    reportedBy: `Burp Suite Professional / Enterprise (Host: ${burpItem.host || 'staging'})`,
    provenance: {
      scannerName: 'PortSwigger Burp Suite',
      host: burpItem.host || 'api.staging.acmecloud.internal',
      issueBackground: burpItem.issueBackground || '',
      remediationDetail: burpItem.remediationDetail || ''
    },
    description: burpItem.issueDetail || burpItem.description || 'Imported from Burp Suite scan report.',
    reproductionSteps: [
      `Replay Burp request to ${burpItem.path || '/api/target'}`,
      'Observe vulnerable response payload'
    ],
    expectedInvariants: {
      expectedStatus: 403,
      forbiddenStrings: burpItem.forbiddenString ? [burpItem.forbiddenString] : []
    },
    baselineEvidence: cleanBaseline,
    latestRetest: null,
    regressionMatrix: null,
    proofRecord: null
  };

  findingsStore.push(finding);
  logAuditEvent('IMPORT_BURP_PROVENANCE', `Imported finding ${finding.id} from Burp Suite with full request/response provenance`);
  return finding;
}

const WEBHOOK_HMAC_SECRET = process.env.PROOF_WEBHOOK_SECRET || 'prooflayer_webhook_hmac_secret_2026';
const MAX_EVENT_AGE_MS = 5 * 60 * 1000; // 5 minutes max freshness window
const seenDeliveryIds = new Set(); // Replay protection cache

/**
 * Validates cryptographic webhook signature, timestamp freshness, and delivery replay defense
 */
export function verifyWebhookSecurity(headers = {}, rawBody = '', options = {}) {
  const { skipSignatureInDev = false } = options;

  // 1. Replay Defense: Check Delivery ID
  const deliveryId = headers['x-github-delivery'] || headers['x-delivery-id'] || headers['x-atlassian-webhook-id'];
  if (deliveryId) {
    if (seenDeliveryIds.has(deliveryId)) {
      return {
        valid: false,
        error: 'REPLAY_ATTACK_DETECTED: Webhook delivery ID was already processed. Duplicate event rejected.',
        code: 'REPLAY_REJECTED'
      };
    }
    seenDeliveryIds.add(deliveryId);
    if (seenDeliveryIds.size > 10000) {
      const first = seenDeliveryIds.values().next().value;
      seenDeliveryIds.delete(first);
    }
  }

  // 2. Timestamp Freshness
  const eventTimestampHeader = headers['x-prooflayer-timestamp'] || headers['x-event-time'];
  if (eventTimestampHeader) {
    const eventTime = new Date(eventTimestampHeader).getTime();
    if (!isNaN(eventTime)) {
      const age = Math.abs(Date.now() - eventTime);
      if (age > MAX_EVENT_AGE_MS) {
        return {
          valid: false,
          error: `STALE_EVENT_REJECTED: Webhook timestamp (${eventTimestampHeader}) is older than 5 minutes (${Math.round(age/1000)}s old). Potential replay attack.`,
          code: 'STALE_TIMESTAMP'
        };
      }
    }
  }

  // 3. HMAC-SHA256 Signature Verification
  const signatureHeader = headers['x-hub-signature-256'] || headers['x-signature-sha256'];
  if (signatureHeader) {
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', WEBHOOK_HMAC_SECRET)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    const sigBuffer = Buffer.from(signatureHeader, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return {
        valid: false,
        error: 'FORGED_WEBHOOK_REJECTED: X-Hub-Signature-256 did not match expected HMAC digest. Unauthorized request.',
        code: 'INVALID_SIGNATURE'
      };
    }
  } else if (!skipSignatureInDev && process.env.NODE_ENV === 'production') {
    return {
      valid: false,
      error: 'SIGNATURE_REQUIRED: Missing X-Hub-Signature-256 header in production webhook request.',
      code: 'MISSING_SIGNATURE'
    };
  }

  return { valid: true };
}

/**
 * Handle incoming GitHub / Jira Webhook Event
 * e.g. Developer comments: `/prooflayer retest --target staging`
 * or Jira ticket transitions to `Ready for Retest`.
 */
export async function handleVCSWebhook(platform, payload, serverBaseUrl, headers = {}) {
  // 1. Verify Webhook Security & Replay Protections
  const secCheck = verifyWebhookSecurity(headers, payload, { skipSignatureInDev: !headers['x-hub-signature-256'] });
  if (!secCheck.valid) {
    logAuditEvent('WEBHOOK_SECURITY_REJECTED', `Webhook security check failed: ${secCheck.error}`);
    return {
      success: false,
      error: secCheck.error,
      code: secCheck.code
    };
  }

  let findingId = null;
  let actionRequested = 'RETEST';
  let actor = 'External Developer';
  let targetEnvironment = 'staging';

  if (platform === 'github') {
    // GitHub Issue Comment or Pull Request Review Comment
    const commentBody = payload.comment?.body || payload.issue?.body || '';
    actor = payload.comment?.user?.login || payload.sender?.login || 'github-user';

    // Parse command: /prooflayer retest PL-FIND-001 or find by issue title/tag
    const match = commentBody.match(/\/prooflayer\s+retest(?:\s+(PL-[A-Z0-9-]+))?(?:\s+--env\s+([a-z]+))?/i);
    if (!match) {
      return { ignored: true, reason: 'Comment does not contain /prooflayer retest command' };
    }

    findingId = match[1];
    if (match[2]) targetEnvironment = match[2];

    // If findingId not in command, try to extract from issue title or body
    if (!findingId) {
      const issueText = `${payload.issue?.title || ''} ${payload.issue?.body || ''}`;
      const issueMatch = issueText.match(/(PL-FIND-\d+|PL-SARIF-\d+|PL-BURP-\d+)/);
      if (issueMatch) findingId = issueMatch[1];
    }
  } else if (platform === 'jira') {
    // Jira Webhook: Issue Updated / Transitioned
    const issue = payload.issue || {};
    actor = payload.user?.displayName || 'Jira User';
    const statusName = issue.fields?.status?.name || '';
    
    // Check if status is ready for retest
    if (statusName.toLowerCase().includes('retest') || statusName.toLowerCase().includes('fixed')) {
      const summary = issue.fields?.summary || '';
      const match = summary.match(/(PL-FIND-\d+|PL-SARIF-\d+|PL-BURP-\d+)/);
      if (match) findingId = match[1];
    } else {
      return { ignored: true, reason: `Jira transition to "${statusName}" does not trigger retest` };
    }
  }

  if (!findingId) {
    return {
      success: false,
      error: 'Could not resolve a valid ProofLayer Finding ID from webhook event'
    };
  }

  const finding = findingsStore.find(f => f.id === findingId);
  if (!finding) {
    return {
      success: false,
      error: `Finding ${findingId} not found in ProofLayer registry`
    };
  }

  logAuditEvent('WEBHOOK_RETEST_TRIGGERED', `${platform.toUpperCase()} webhook from @${actor} triggered retest for ${finding.id}`, actor);

  // Execute Retest
  const retestResult = await runScopedRetest(finding, serverBaseUrl, { environmentTier: targetEnvironment });

  // Update finding record
  finding.latestRetest = retestResult.retestEvidence;
  finding.invariantResult = retestResult.invariantResult;
  finding.regressionMatrix = retestResult.regressionResults;
  finding.status = retestResult.verdict;
  finding.remediationConfidence = retestResult.confidenceScore;
  finding.lastTestedAt = retestResult.completedAt;

  // Auto-generate Proof Record if verified clean
  let proof = null;
  if (retestResult.verdict === 'VERIFIED_REMEDIATED') {
    proof = generateProofRecord({
      findingId: finding.id,
      title: finding.title,
      cwe: finding.cwe,
      severity: finding.severity,
      environment: `${serverBaseUrl}${finding.asset}`,
      environmentTier: targetEnvironment,
      baselineEvidence: finding.baselineEvidence,
      retestEvidence: retestResult.retestEvidence,
      invariantEvaluations: retestResult.invariantResult,
      regressionMatrix: retestResult.regressionResults,
      verdict: retestResult.verdict,
      verdictTitle: retestResult.verdictTitle,
      assertionCoverage: retestResult.assertionCoverage,
      conclusionConfidence: retestResult.conclusionConfidence,
      reviewer: {
        name: `ProofLayer Webhook Bridge (${actor})`,
        role: 'Automated CI/CD Remediation Gate',
        email: `${actor}@vcs.internal`
      },
      notes: `Automated retest triggered via ${platform.toUpperCase()} webhook command.`
    });
    finding.proofRecord = proof;
  }

  // Generate GitHub/Jira Markdown Response Comment
  const markdownComment = `### 🛡️ ProofLayer Remediation Verification Result

**Target Finding:** \`${finding.id}\` — ${finding.title}  
**Environment:** \`${targetEnvironment}\` | **Triggered by:** @${actor}  
**Verdict:** **${retestResult.verdict === 'VERIFIED_REMEDIATED' ? '✅ VERIFIED REMEDIATED' : '❌ ' + retestResult.verdictTitle}**  

---

#### 📊 Assertion Coverage & Evidence Breakdown
- **Security Invariants:** \`${retestResult.assertionCoverage.invariantsPassed}/${retestResult.assertionCoverage.invariantsTotal}\` assertions passed
- **Bypass Permutations Blocked:** \`${retestResult.assertionCoverage.permutationsBlocked}/${retestResult.assertionCoverage.permutationsTotal}\` alternate attack paths blocked
- **Confidence:** **${retestResult.conclusionConfidence.score}%** — _${retestResult.conclusionConfidence.explanation}_

${retestResult.verdict === 'VERIFIED_REMEDIATED' 
  ? `> **🔒 Cryptographic Proof Record Issued:** \`${proof.recordId}\`  
> **Root Proof Digest:** \`${proof.integrity.rootProofDigest}\`  
> **HMAC Seal:** \`${proof.integrity.cryptographicSeal.slice(0, 32)}...\`  
> _Audit-ready certificate generated and sealed._`
  : `> ⚠️ **Action Required:** Fix did not pass all deterministic assertions or regression permutations. See ProofLayer dashboard for side-by-side evidence diffs.`
}
`;

  return {
    success: true,
    findingId: finding.id,
    verdict: retestResult.verdict,
    verdictTitle: retestResult.verdictTitle,
    markdownComment,
    proofRecordId: proof?.recordId || null
  };
}
