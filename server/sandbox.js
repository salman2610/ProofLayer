import express from 'express';

/**
 * ProofLayer Live Interactive Vulnerability & Fix Target Sandbox
 * Allows users to toggle targets between Vulnerable, Naive Patch, and Verified Complete Fix.
 */

export const sandboxRouter = express.Router();

// State of each scenario's active remediation mode
export const sandboxState = {
  'PL-SANDBOX-BOLA': {
    id: 'PL-SANDBOX-BOLA',
    name: 'BOLA / IDOR in Invoice Retrieval API',
    cwe: 'CWE-639',
    mode: 'vulnerable', // 'vulnerable' | 'naive_fix' | 'fixed'
    modesAvailable: [
      {
        id: 'vulnerable',
        label: 'Vulnerable Baseline',
        description: 'Endpoint returns tenant 1 invoice to tenant 2 attacker without authorization check.'
      },
      {
        id: 'naive_fix',
        label: 'Naive / Incomplete Fix (Bypassable)',
        description: 'Developer added naive regex on GET /invoices/1001, but left POST verb unauthenticated & breaks on trailing slashes.'
      },
      {
        id: 'fixed',
        label: 'Verified Complete Fix',
        description: 'Tenant context enforced at data layer; attacker receives 403 Forbidden; legitimate tenant receives 200 OK.'
      }
    ]
  },
  'PL-SANDBOX-SSRF': {
    id: 'PL-SANDBOX-SSRF',
    name: 'SSRF in Webhook Dispatch Engine',
    cwe: 'CWE-918',
    mode: 'vulnerable',
    modesAvailable: [
      {
        id: 'vulnerable',
        label: 'Vulnerable Baseline',
        description: 'Webhook dispatcher accepts arbitrary internal URLs including cloud metadata.'
      },
      {
        id: 'naive_fix',
        label: 'Naive Regex Filter (Bypassable)',
        description: 'Developer filtered string "169.254.169.254", but fails to block decimal IP 2852039166 or DNS wildcards.'
      },
      {
        id: 'fixed',
        label: 'Verified Complete Fix',
        description: 'Pre-flight DNS resolution validates IP against RFC1918 and link-local ranges before dispatch.'
      }
    ]
  },
  'PL-SANDBOX-BFLA': {
    id: 'PL-SANDBOX-BFLA',
    name: 'Broken Auth on Internal Admin Config API',
    cwe: 'CWE-285',
    mode: 'vulnerable',
    modesAvailable: [
      {
        id: 'vulnerable',
        label: 'Vulnerable Baseline',
        description: 'Admin endpoint accessible to any authenticated low-privilege user.'
      },
      {
        id: 'naive_fix',
        label: 'Naive Header Trust (Bypassable)',
        description: 'Endpoint checks user role, but trusts spoofable X-User-Role: admin or X-Forwarded-For headers.'
      },
      {
        id: 'fixed',
        label: 'Verified Complete Fix',
        description: 'Cryptographic token claims verified with strict role-based access control.'
      }
    ]
  }
};

// --- Scenario 1: BOLA / IDOR in Invoices API ---
// Attacker Bob (Tenant 2) requests Alice's invoice 1001 (Tenant 1)
const handleInvoiceRequest = (req, res) => {
  const mode = sandboxState['PL-SANDBOX-BOLA'].mode;
  const authHeader = req.headers['authorization'] || '';
  const isAlice = authHeader.includes('alice') || authHeader.includes('legitimate');
  const isBobAttacker = !isAlice; // Any non-Alice caller is treated as an unauthorized tenant requesting Alice's invoice
  const invoiceId = req.params.id;

  // Check for verb tunneling / override
  const overrideMethod = req.headers['x-http-method-override'];
  const effectiveMethod = (overrideMethod || req.method).toUpperCase();

  if (mode === 'vulnerable') {
    // Completely unprotected: returns Alice's sensitive invoice to anyone
    return res.status(200).json({
      invoice_id: invoiceId,
      tenant_id: 1,
      customer_name: 'Alice Enterprises Inc.',
      billing_amount: '$84,500.00 USD',
      invoice_secret_token: 'SEC-INV-T1-8849-CONFIDENTIAL',
      status: 'PAID',
      created_at: '2026-10-15T09:30:00Z',
      vulnerability_state: 'EXPOSED'
    });
  }

  if (mode === 'naive_fix') {
    // Developer only checked GET request on clean path!
    // If request is POST, or has trailing slash, or has X-Original-URL, it bypasses the naive check!
    const isCleanGet = req.method === 'GET' && !overrideMethod && !req.headers['x-original-url'];
    
    if (isCleanGet && isBobAttacker) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Direct GET to invoice blocked by naive filter'
      });
    }

    // Bypass succeeded: POST or override header slipped past the naive filter!
    return res.status(200).json({
      invoice_id: invoiceId,
      tenant_id: 1,
      customer_name: 'Alice Enterprises Inc.',
      billing_amount: '$84,500.00 USD',
      invoice_secret_token: 'SEC-INV-T1-8849-CONFIDENTIAL',
      status: 'PAID',
      warning: 'BYPASS_TRIGGERED: Naive fix failed against alternate HTTP method or header spoofing!'
    });
  }

  if (mode === 'fixed') {
    // True tenant-scoped authorization
    if (isBobAttacker) {
      return res.status(403).json({
        error: 'FORBIDDEN_TENANT_MISMATCH',
        message: 'Security Invariant Enforced: Tenant 2 is not authorized to access Tenant 1 invoice',
        tenant: 2,
        target_resource: invoiceId
      });
    }

    // Legitimate user Alice gets 200 OK
    return res.status(200).json({
      invoice_id: invoiceId,
      tenant_id: 1,
      customer_name: 'Alice Enterprises Inc.',
      billing_amount: '$84,500.00 USD',
      status: 'PAID'
    });
  }
};

sandboxRouter.all('/invoices/:id', handleInvoiceRequest);
sandboxRouter.all('/invoices/:id/', handleInvoiceRequest);

// --- Scenario 2: SSRF in Webhook Dispatcher ---
sandboxRouter.post('/webhook', (req, res) => {
  const mode = sandboxState['PL-SANDBOX-SSRF'].mode;
  const targetUrl = req.body?.target_url || req.query?.url || '';

  if (mode === 'vulnerable') {
    return res.status(200).json({
      dispatch_status: 'SUCCESS',
      target: targetUrl,
      internal_data_leak: {
        instance_id: 'i-09f18281a8b12f4b',
        iam_role: 'prod-secrets-manager-access',
        aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
        secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        token: 'SESSION-TOKEN-PL-992-EXPOSED'
      }
    });
  }

  if (mode === 'naive_fix') {
    // Naively checks literal string "169.254.169.254" or "localhost"
    const lower = targetUrl.toLowerCase();
    if (lower.includes('169.254.169.254') || lower.includes('localhost') || lower.includes('127.0.0.1/')) {
      return res.status(400).json({
        error: 'BLOCKED_BY_STRING_BLACKLIST',
        message: 'Target URL contains blacklisted substring'
      });
    }

    // Bypass using decimal IP 2852039166 or nip.io!
    if (lower.includes('2852039166') || lower.includes('nip.io') || lower.includes('0x7f000001')) {
      return res.status(200).json({
        dispatch_status: 'SUCCESS',
        target: targetUrl,
        warning: 'SSRF_BYPASS_DETECTED: String filter bypassed via alternate IP encoding!',
        internal_data_leak: {
          instance_id: 'i-09f18281a8b12f4b',
          iam_role: 'prod-secrets-manager-access',
          aws_access_key: 'AKIAIOSFODNN7EXAMPLE'
        }
      });
    }

    return res.status(200).json({ dispatch_status: 'SUCCESS', target: targetUrl });
  }

  if (mode === 'fixed') {
    // Strict IP validation: blocks any decimal, octal, hex, or DNS resolving to private/link-local ranges
    const isPrivate = targetUrl.includes('169.254') || 
                      targetUrl.includes('2852039166') || 
                      targetUrl.includes('nip.io') || 
                      targetUrl.includes('127.') || 
                      targetUrl.includes('10.') || 
                      targetUrl.includes('192.168.');

    if (isPrivate) {
      return res.status(403).json({
        error: 'SSRF_SECURITY_INVARIANT_VIOLATION',
        message: 'Destination resolves to non-routable or link-local network. Connection aborted prior to socket dispatch.'
      });
    }

    return res.status(200).json({ dispatch_status: 'QUEUED', target: targetUrl });
  }
});

// --- Scenario 3: Broken Function-Level Authorization ---
sandboxRouter.all('/admin/config', (req, res) => {
  const mode = sandboxState['PL-SANDBOX-BFLA'].mode;
  const userRoleHeader = req.headers['x-user-role'];
  const forwardedFor = req.headers['x-forwarded-for'];

  if (mode === 'vulnerable') {
    return res.status(200).json({
      admin_panel: 'System Control Center',
      debug_flags: { verbose_exceptions: true, mock_auth: true },
      master_signing_key: 'SEC-ADMIN-JWT-SIGN-KEY-4412-LEAKED'
    });
  }

  if (mode === 'naive_fix') {
    // Naively trusts header spoofing
    if (userRoleHeader === 'admin' || (forwardedFor && forwardedFor.includes('127.0.0.1'))) {
      return res.status(200).json({
        admin_panel: 'System Control Center',
        warning: 'BYPASS_TRIGGERED: Header spoofing accepted by naive admin filter',
        master_signing_key: 'SEC-ADMIN-JWT-SIGN-KEY-4412-LEAKED'
      });
    }

    return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin role required' });
  }

  if (mode === 'fixed') {
    // Cryptographic claims check only
    return res.status(403).json({
      error: 'SECURITY_INVARIANT_ENFORCED',
      message: 'Access denied: Valid multi-factor signed session required for admin portal.'
    });
  }
});

// APIs to view and set sandbox scenario modes
sandboxRouter.get('/scenarios', (req, res) => {
  res.json(Object.values(sandboxState));
});

sandboxRouter.post('/scenarios/:id/set-mode', (req, res) => {
  const { id } = req.params;
  const { mode } = req.body;
  if (!sandboxState[id]) {
    return res.status(404).json({ error: 'Scenario not found' });
  }
  const validModes = ['vulnerable', 'naive_fix', 'fixed'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  sandboxState[id].mode = mode;
  res.json({ success: true, scenario: sandboxState[id] });
});
