import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { findingsStore, auditLog, logAuditEvent, importFindingPayload } from './store.js';
import { runScopedRetest } from './executor.js';
import { generateProofRecord, verifyProofRecordIntegrity } from './crypto.js';
import { redactEvidence, redactText, redactJson } from './redaction.js';
import { sandboxRouter } from './sandbox.js';
import { parseSarifWithProvenance, parseBurpWithProvenance, handleVCSWebhook } from './integrations.js';
import { 
  sessionMiddleware, 
  rateLimit, 
  createSession, 
  usersStore, 
  organizationsStore, 
  engagementsStore, 
  requireAuth, 
  requireRoles, 
  PERMISSIONS 
} from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../dist')));
app.use(sessionMiddleware);

// Sandbox Target Router (Mount under /api/sandbox)
app.use('/api/sandbox', sandboxRouter);

// --- Authentication & Organization Management API ---

// 1. Session status
app.get('/api/auth/session', (req, res) => {
  if (!req.user) {
    return res.json({ authenticated: false, user: null, organization: null });
  }
  const org = organizationsStore.find(o => o.id === req.user.organizationId);
  res.json({
    authenticated: true,
    user: req.user,
    organization: org,
    permissions: {
      canExecuteRetest: PERMISSIONS.EXECUTE_RETEST.includes(req.user.role),
      canIssueProof: PERMISSIONS.ISSUE_PROOF.includes(req.user.role),
      canImportFindings: PERMISSIONS.IMPORT_FINDINGS.includes(req.user.role),
      canManageOrg: PERMISSIONS.MANAGE_ORG.includes(req.user.role)
    }
  });
});

// 2. Demo role switcher (Instant login as any pre-seeded persona)
app.post('/api/auth/demo-login', rateLimit(60, 60000), (req, res) => {
  const { email, role, userId } = req.body || {};
  let targetUser = null;

  if (userId) {
    targetUser = usersStore.find(u => u.id === userId);
  } else if (email) {
    targetUser = usersStore.find(u => u.email.toLowerCase() === email.toLowerCase());
  } else if (role) {
    targetUser = usersStore.find(u => u.role === role);
  } else {
    targetUser = usersStore.find(u => u.role === 'SECURITY_LEAD');
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const session = createSession(targetUser);
  const org = organizationsStore.find(o => o.id === targetUser.organizationId);
  logAuditEvent('AUTH_LOGIN_SUCCESS', `User ${targetUser.name} (${targetUser.role}) logged in to ${org?.name}`, targetUser.name);

  res.json({
    success: true,
    sessionToken: session.token,
    user: session,
    organization: org
  });
});

// 3. Email/Password Login
app.post('/api/auth/login', rateLimit(20, 60000), (req, res) => {
  const { email, password } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = usersStore.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }

  const session = createSession(user);
  const org = organizationsStore.find(o => o.id === user.organizationId);
  logAuditEvent('AUTH_LOGIN_SUCCESS', `User ${user.email} authenticated successfully`, user.name);

  res.json({
    success: true,
    sessionToken: session.token,
    user: session,
    organization: org
  });
});

// 4. Logout
app.post('/api/auth/logout', (req, res) => {
  if (req.user) {
    logAuditEvent('AUTH_LOGOUT', `User ${req.user.name} logged out`, req.user.name);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// 5. List Organizations
app.get('/api/organizations', (req, res) => {
  res.json(organizationsStore);
});

// 6. List Engagements (Tenant-scoped)
app.get('/api/engagements', (req, res) => {
  if (req.user) {
    const orgEngagements = engagementsStore.filter(e => e.organizationId === req.user.organizationId);
    return res.json(orgEngagements);
  }
  // Public preview engagements
  res.json(engagementsStore);
});

// 7. Organization Members (Tenant-scoped)
app.get('/api/organizations/members', (req, res) => {
  const orgId = req.user?.organizationId || 'org-acme';
  const members = usersStore.filter(u => u.organizationId === orgId).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title,
    organizationId: u.organizationId
  }));
  res.json(members);
});

// 8. Invite Member (Owner role required)
app.post('/api/organizations/invite', requireRoles(PERMISSIONS.MANAGE_ORG), (req, res) => {
  const { name, email, role = 'DEVELOPER', title = 'Engineer' } = req.body || {};
  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    name,
    email,
    role,
    title,
    organizationId: req.user?.organizationId || 'org-acme'
  };

  usersStore.push(newUser);
  logAuditEvent('ORG_MEMBER_INVITED', `Invited ${email} as ${role} to organization`, req.user?.name || 'Owner');
  res.status(201).json({ success: true, member: newUser });
});

// --- Findings API (Tenant-Isolated & Role-Protected) ---

// 1. List findings (Tenant isolated when authenticated)
app.get('/api/findings', (req, res) => {
  // If user is authenticated, filter by their organization
  if (req.user && req.query.all !== 'true') {
    const orgFindings = findingsStore.filter(f => f.organizationId === req.user.organizationId);
    return res.json(orgFindings);
  }
  // Default: return all pre-seeded demo findings
  res.json(findingsStore);
});

// 2. Get single finding
app.get('/api/findings/:id', (req, res) => {
  const finding = findingsStore.find(f => f.id === req.params.id);
  if (!finding) return res.status(404).json({ error: 'Finding not found' });
  res.json(finding);
});

// 3. Import new finding (Burp, SARIF, Pentest JSON)
app.post('/api/findings', (req, res) => {
  try {
    const { type, payload } = req.body;
    let imported;

    if (type === 'sarif' || (req.body.runs && Array.isArray(req.body.runs))) {
      imported = parseSarifWithProvenance(payload || req.body);
    } else if (type === 'burp' || req.body.issueName || req.body.issueDetail) {
      imported = [parseBurpWithProvenance(payload || req.body)];
    } else {
      imported = importFindingPayload(payload || req.body);
    }

    res.status(201).json({ success: true, imported });
  } catch (err) {
    res.status(400).json({ error: 'Failed to parse import payload', details: err.message });
  }
});

// 4. Execute Scoped Retest (Server-Enforced RBAC & Tenant Isolation)
app.post('/api/findings/:id/retest', requireRoles(PERMISSIONS.EXECUTE_RETEST), async (req, res) => {
  const finding = findingsStore.find(f => f.id === req.params.id);
  if (!finding) return res.status(404).json({ error: 'Finding not found' });

  // Tenant Isolation Enforcement: Org A cannot retest Org B's findings
  if (req.user && finding.organizationId && finding.organizationId !== req.user.organizationId) {
    return res.status(403).json({
      error: 'TENANT_ISOLATION_VIOLATION',
      message: 'Access denied: Finding belongs to another organization.'
    });
  }

  try {
    const serverBaseUrl = `http://localhost:${PORT}`;
    const result = await runScopedRetest(finding, serverBaseUrl, req.body || {});

    // Update finding record with decoupled metrics
    finding.latestRetest = result.retestEvidence;
    finding.invariantResult = result.invariantResult;
    finding.regressionMatrix = result.regressionResults;
    finding.status = result.verdict;
    finding.verdictTitle = result.verdictTitle;
    finding.verdictSummary = result.verdictSummary;
    finding.assertionCoverage = result.assertionCoverage;
    finding.conclusionConfidence = result.conclusionConfidence;
    finding.lastTestedAt = result.completedAt;

    res.json({
      success: true,
      verdict: result.verdict,
      verdictTitle: result.verdictTitle,
      verdictSummary: result.verdictSummary,
      assertionCoverage: result.assertionCoverage,
      conclusionConfidence: result.conclusionConfidence,
      failedInvariants: result.failedInvariants || [],
      successfulBypasses: result.successfulBypasses || [],
      retestEvidence: result.retestEvidence,
      invariantResult: result.invariantResult,
      regressionResults: result.regressionResults
    });
  } catch (err) {
    res.status(500).json({ error: 'Retest execution failed', details: err.message });
  }
});

// 5. Issue & Cryptographically Seal Proof Record (Requires OWNER or SECURITY_LEAD)
app.post('/api/findings/:id/issue-proof', requireRoles(PERMISSIONS.ISSUE_PROOF), (req, res) => {
  const finding = findingsStore.find(f => f.id === req.params.id);
  if (!finding) return res.status(404).json({ error: 'Finding not found' });

  // Tenant Isolation Enforcement
  if (req.user && finding.organizationId && finding.organizationId !== req.user.organizationId) {
    return res.status(403).json({
      error: 'TENANT_ISOLATION_VIOLATION',
      message: 'Access denied: Finding belongs to another organization.'
    });
  }

  if (!finding.latestRetest) {
    return res.status(400).json({ error: 'Cannot issue proof: Retest has not been executed yet.' });
  }

  const { reviewerName, reviewerRole, reviewerEmail, notes } = req.body || {};

  const proof = generateProofRecord({
    findingId: finding.id,
    title: finding.title,
    cwe: finding.cwe,
    severity: finding.severity,
    environment: `http://localhost:${PORT}${finding.asset}`,
    environmentTier: finding.environmentTier || 'staging',
    baselineEvidence: finding.baselineEvidence,
    retestEvidence: finding.latestRetest,
    invariantEvaluations: finding.invariantResult,
    regressionMatrix: finding.regressionMatrix,
    verdict: finding.status,
    verdictTitle: finding.verdictTitle,
    assertionCoverage: finding.assertionCoverage,
    conclusionConfidence: finding.conclusionConfidence,
    reviewer: {
      name: reviewerName || 'SecOps Lead Signer',
      role: reviewerRole || 'Principal Application Security Engineer',
      email: reviewerEmail || 'appsec-lead@prooflayer.internal'
    },
    notes: notes || 'Remediation verified with deterministic invariants and regression permutation test suite.'
  });

  finding.proofRecord = proof;
  logAuditEvent('PROOF_RECORD_ISSUED', `Issued tamper-evident proof record ${proof.recordId} for ${finding.id}`, proof.reviewer.name);

  res.json({ success: true, proofRecord: proof });
});

// 6. Get Proof Record
app.get('/api/findings/:id/proof', (req, res) => {
  const finding = findingsStore.find(f => f.id === req.params.id);
  if (!finding || !finding.proofRecord) {
    return res.status(404).json({ error: 'Proof record not found for this finding' });
  }
  res.json(finding.proofRecord);
});

// 7. Verify Proof Record Integrity (External auditor verification endpoint)
app.post('/api/proof/verify', (req, res) => {
  const proofBundle = req.body;
  if (!proofBundle || !proofBundle.integrity) {
    return res.status(400).json({ error: 'Invalid proof record payload' });
  }
  const verification = verifyProofRecordIntegrity(proofBundle);
  logAuditEvent('PROOF_VERIFY_REQUEST', `Verification checked for ${proofBundle.recordId}: Valid=${verification.isValid}`);
  res.json(verification);
});

// 8. GitHub / Jira Webhook Endpoint
app.post('/api/integrations/webhook/:platform', async (req, res) => {
  const { platform } = req.params;
  const serverBaseUrl = `http://localhost:${PORT}`;

  try {
    const result = await handleVCSWebhook(platform, req.body, serverBaseUrl, req.headers);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing failed', details: err.message });
  }
});

// 9. Test Secret & PII Redaction Engine
app.post('/api/redact-preview', (req, res) => {
  const { text, json } = req.body;
  if (text !== undefined) {
    return res.json({ original: text, redacted: redactText(text) });
  }
  if (json !== undefined) {
    return res.json({ original: json, redacted: redactJson(json) });
  }
  res.status(400).json({ error: 'Provide text or json property' });
});

// 10. Audit Trail
app.get('/api/audit-trail', (req, res) => {
  res.json(auditLog);
});

// SPA fallback handler for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`[ProofLayer Engine] Running on http://localhost:${PORT}`);
  logAuditEvent('ENGINE_INIT', `ProofLayer Verification Engine started on port ${PORT}`);
});
