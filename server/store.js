import { redactEvidence } from './redaction.js';
import { sha256 } from './crypto.js';

/**
 * ProofLayer In-Memory Data Store & Pentest Importers
 */

export const auditLog = [];

export function logAuditEvent(action, details, actor = 'System Automated Agent') {
  const entry = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    details,
    actor,
    integrityHash: sha256({ action, details, actor, timestamp: Date.now() })
  };
  auditLog.unshift(entry);
  if (auditLog.length > 200) auditLog.pop();
  return entry;
}

// Initial realistic pre-seeded findings
export const findingsStore = [
  {
    id: 'PL-FIND-001',
    title: 'BOLA / Broken Object Level Authorization in Customer Invoice Endpoint',
    cwe: 'CWE-639',
    cweName: 'Authorization Bypass Through User-Controlled Key',
    severity: 'CRITICAL',
    cvss: 9.1,
    asset: '/api/sandbox/invoices/1001',
    category: 'BOLA',
    organizationId: 'org-acme',
    engagementId: 'eng-acme-q4',
    status: 'PENDING_RETEST', // 'PENDING_RETEST' | 'VERIFIED' | 'PARTIAL_FIX' | 'REGRESSION_FOUND' | 'BYPASS_DETECTED'
    remediationConfidence: null,
    environmentTier: 'staging',
    sandboxScenarioId: 'PL-SANDBOX-BOLA',
    assignedDev: 'dev-alex@acmecloud.internal',
    reportedBy: 'Kroll / Cure53 Pentest Engagement 2026',
    description: 'Tenant 2 (Attacker Bob) can read confidential billing records and confidential API tokens of Tenant 1 (Alice Enterprises) by directly tampering with the invoice ID in the URL parameter.',
    reproductionSteps: [
      'Authenticate as low-privilege Tenant 2 user (Bob)',
      'Issue HTTP GET request to /api/sandbox/invoices/1001',
      'Observe Tenant 1 confidential invoice details and secret PIN returned with HTTP 200 OK'
    ],
    expectedInvariants: {
      expectedStatus: 403,
      forbiddenStrings: ['invoice_secret_token', 'SEC-INV-T1-8849-CONFIDENTIAL', 'Alice Enterprises Inc.'],
      requiredHeaders: { 'content-type': 'application/json' },
      maxResponseTimeMs: 1500
    },
    baselineEvidence: redactEvidence({
      timestamp: '2026-10-20T14:12:00Z',
      request: {
        method: 'GET',
        url: '/api/sandbox/invoices/1001',
        headers: {
          'Host': 'api.staging.acmecloud.internal',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.bob_attacker_tenant2_token_confidential',
          'User-Agent': 'ProofLayer-PentestClient/1.4',
          'Accept': 'application/json'
        },
        body: null
      },
      response: {
        status: 200,
        statusText: 'OK',
        durationMs: 42,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'x-powered-by': 'Express'
        },
        body: {
          invoice_id: '1001',
          tenant_id: 1,
          customer_name: 'Alice Enterprises Inc.',
          billing_amount: '$84,500.00 USD',
          invoice_secret_token: 'SEC-INV-T1-8849-CONFIDENTIAL',
          status: 'PAID',
          created_at: '2026-10-15T09:30:00Z',
          vulnerability_state: 'EXPOSED'
        }
      }
    }),
    latestRetest: null,
    regressionMatrix: null,
    proofRecord: null
  },
  {
    id: 'PL-FIND-002',
    title: 'Blind SSRF via Webhook Notification Dispatcher to Cloud Metadata',
    cwe: 'CWE-918',
    cweName: 'Server-Side Request Forgery (SSRF)',
    severity: 'HIGH',
    cvss: 8.6,
    asset: '/api/sandbox/webhook',
    category: 'SSRF',
    organizationId: 'org-acme',
    engagementId: 'eng-acme-q4',
    status: 'PENDING_RETEST',
    remediationConfidence: null,
    environmentTier: 'staging',
    sandboxScenarioId: 'PL-SANDBOX-SSRF',
    assignedDev: 'dev-charlie@acmecloud.internal',
    reportedBy: 'HackerOne Bug Bounty #19488',
    description: 'The webhook configuration endpoint does not restrict loopback (127.0.0.1) or link-local AWS metadata (169.254.169.254) addresses, allowing unauthenticated attackers to exfiltrate IAM role credentials.',
    reproductionSteps: [
      'POST /api/sandbox/webhook with payload target_url=http://169.254.169.254/latest/meta-data/',
      'Receive AWS IAM credentials and temporary secret keys in response payload'
    ],
    expectedInvariants: {
      expectedStatus: [400, 403],
      forbiddenStrings: ['AKIAIOSFODNN7EXAMPLE', 'iam_role', 'secret_access_key'],
      maxResponseTimeMs: 2000
    },
    baselineEvidence: redactEvidence({
      timestamp: '2026-10-21T09:44:00Z',
      request: {
        method: 'POST',
        url: '/api/sandbox/webhook',
        headers: {
          'Host': 'api.staging.acmecloud.internal',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer api_key_pentester_secret_4492'
        },
        body: {
          target_url: 'http://169.254.169.254/latest/meta-data/'
        }
      },
      response: {
        status: 200,
        statusText: 'OK',
        durationMs: 110,
        headers: { 'content-type': 'application/json' },
        body: {
          dispatch_status: 'SUCCESS',
          target: 'http://169.254.169.254/latest/meta-data/',
          internal_data_leak: {
            instance_id: 'i-09f18281a8b12f4b',
            iam_role: 'prod-secrets-manager-access',
            aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
            secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            token: 'SESSION-TOKEN-PL-992-EXPOSED'
          }
        }
      }
    }),
    latestRetest: null,
    regressionMatrix: null,
    proofRecord: null
  },
  {
    id: 'PL-FIND-003',
    title: 'Broken Function-Level Authorization on Administrative Diagnostics API',
    cwe: 'CWE-285',
    cweName: 'Improper Authorization',
    severity: 'HIGH',
    cvss: 8.2,
    asset: '/api/sandbox/admin/config',
    category: 'Broken Auth',
    organizationId: 'org-acme',
    engagementId: 'eng-acme-pci',
    status: 'PENDING_RETEST',
    remediationConfidence: null,
    environmentTier: 'staging',
    sandboxScenarioId: 'PL-SANDBOX-BFLA',
    assignedDev: 'dev-sarah@acmecloud.internal',
    reportedBy: 'NCC Group AppSec Assessment',
    description: 'Internal configuration diagnostics endpoint is exposed without enforcing administrative session privileges.',
    reproductionSteps: [
      'Send GET request to /api/sandbox/admin/config without admin credentials',
      'Receive full system JWT signing key and debug parameters'
    ],
    expectedInvariants: {
      expectedStatus: 403,
      forbiddenStrings: ['SEC-ADMIN-JWT-SIGN-KEY-4412-LEAKED', 'master_signing_key']
    },
    baselineEvidence: redactEvidence({
      timestamp: '2026-10-22T11:20:00Z',
      request: {
        method: 'GET',
        url: '/api/sandbox/admin/config',
        headers: {
          'Host': 'api.staging.acmecloud.internal',
          'Authorization': 'Bearer low_priv_user_session_441'
        },
        body: null
      },
      response: {
        status: 200,
        statusText: 'OK',
        durationMs: 38,
        headers: { 'content-type': 'application/json' },
        body: {
          admin_panel: 'System Control Center',
          debug_flags: { verbose_exceptions: true, mock_auth: true },
          master_signing_key: 'SEC-ADMIN-JWT-SIGN-KEY-4412-LEAKED'
        }
      }
    }),
    latestRetest: null,
    regressionMatrix: null,
    proofRecord: null
  },
  {
    id: 'PL-CS-101',
    title: 'Tenant Boundary Traversal in GraphQL Proxy Gateway',
    cwe: 'CWE-639',
    cweName: 'Authorization Bypass',
    severity: 'HIGH',
    cvss: 8.5,
    asset: '/api/partner/graphql',
    category: 'Multi-Tenant Isolation',
    organizationId: 'org-cybershield',
    engagementId: 'eng-mssp-01',
    status: 'PENDING_RETEST',
    remediationConfidence: null,
    environmentTier: 'staging',
    assignedDev: 'dev-rhea@cybershield.io',
    reportedBy: 'CyberShield Internal Red Team',
    description: 'GraphQL proxy permits unauthorized cross-tenant query variables without verifying client tenant ID header.',
    reproductionSteps: [
      'Submit GraphQL query with tenantId="customer_beta" using customer_alpha credentials'
    ],
    expectedInvariants: {
      expectedStatus: 403,
      forbiddenStrings: ['customer_beta_vault']
    },
    baselineEvidence: redactEvidence({
      timestamp: '2026-10-23T10:00:00Z',
      request: { method: 'POST', url: '/api/partner/graphql', headers: { 'Authorization': 'Bearer test' } },
      response: { status: 200, statusText: 'OK', durationMs: 45, headers: {}, body: 'customer_beta_vault' }
    }),
    latestRetest: null,
    regressionMatrix: null,
    proofRecord: null
  }
];

/**
 * Finding Importer: Supports SARIF, Burp, and generic pentest JSON
 */
export function importFindingPayload(payload) {
  // Check if SARIF format
  if (payload.runs && Array.isArray(payload.runs)) {
    const findings = [];
    for (const run of payload.runs) {
      const results = run.results || [];
      for (const res of results) {
        const id = `PL-SARIF-${Math.floor(1000 + Math.random() * 9000)}`;
        const ruleId = res.ruleId || 'SEC-001';
        const message = res.message?.text || 'Security issue reported by static/dynamic scanner';
        const location = res.locations?.[0]?.physicalLocation?.artifactLocation?.uri || '/api/endpoint';
        
        const newFinding = {
          id,
          title: `[SARIF] ${ruleId}: ${message.slice(0, 60)}...`,
          cwe: 'CWE-20',
          cweName: 'Improper Input Validation',
          severity: res.level === 'error' ? 'HIGH' : 'MEDIUM',
          cvss: res.level === 'error' ? 7.5 : 5.0,
          asset: location,
          category: 'SARIF Import',
          status: 'PENDING_RETEST',
          environmentTier: 'staging',
          reportedBy: `SARIF Scanner: ${run.tool?.driver?.name || 'Automated Tool'}`,
          description: message,
          reproductionSteps: [`Automated rule check ${ruleId} at ${location}`],
          expectedInvariants: {
            expectedStatus: 403,
            forbiddenStrings: ['error', 'stack']
          },
          baselineEvidence: redactEvidence({
            timestamp: new Date().toISOString(),
            request: { method: 'GET', url: location, headers: {}, body: null },
            response: { status: 200, statusText: 'OK', durationMs: 50, headers: {}, body: { alert: message } }
          }),
          latestRetest: null,
          regressionMatrix: null,
          proofRecord: null
        };
        findingsStore.push(newFinding);
        findings.push(newFinding);
      }
    }
    logAuditEvent('IMPORT_SARIF', `Imported ${findings.length} findings from SARIF report`);
    return findings;
  }

  // Single or custom pentest JSON finding
  const id = payload.id || `PL-IMP-${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanBaseline = redactEvidence(payload.baselineEvidence || {
    timestamp: new Date().toISOString(),
    request: payload.request || { method: 'GET', url: payload.asset || '/api/test', headers: {}, body: null },
    response: payload.response || { status: 200, statusText: 'OK', body: payload.proofData || 'Vulnerable payload observed' }
  });

  const finding = {
    id,
    title: payload.title || 'Imported Pentest Finding',
    cwe: payload.cwe || 'CWE-200',
    cweName: payload.cweName || 'Information Disclosure',
    severity: payload.severity || 'MEDIUM',
    cvss: payload.cvss || 6.5,
    asset: payload.asset || payload.url || '/api/resource',
    category: payload.category || 'Web Application',
    status: 'PENDING_RETEST',
    environmentTier: payload.environmentTier || 'staging',
    assignedDev: payload.assignedDev || 'unassigned@team.internal',
    reportedBy: payload.reportedBy || 'Manual Import / External Pentest',
    description: payload.description || 'Imported security finding awaiting scoped verification.',
    reproductionSteps: payload.reproductionSteps || ['Replay baseline request against target environment'],
    expectedInvariants: payload.expectedInvariants || {
      expectedStatus: 403,
      forbiddenStrings: []
    },
    baselineEvidence: cleanBaseline,
    latestRetest: null,
    regressionMatrix: null,
    proofRecord: null
  };

  findingsStore.push(finding);
  logAuditEvent('IMPORT_FINDING', `Imported finding ${finding.id} (${finding.title})`);
  return [finding];
}
