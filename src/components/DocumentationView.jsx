import React, { useState } from 'react';
import { 
  Terminal, 
  FileCode, 
  GitBranch, 
  Key, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';

export default function DocumentationView({ onBackToHome }) {
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="doc-view-container">
      <div className="doc-nav-header">
        <button className="btn-secondary back-btn" onClick={onBackToHome}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
        <div className="doc-meta-badge">ProofLayer Technical Documentation</div>
      </div>

      <div className="doc-article">
        <h1>Integrations, Verification CLI & API Reference</h1>
        <p className="doc-lead">
          Connect ProofLayer into your existing AppSec workflow through standard formats, 
          offline cryptographic tooling, and native VCS webhook integrations.
        </p>

        <hr className="doc-divider" />

        {/* 1. STANDALONE OFFLINE CLI */}
        <h2>1. Standalone Offline CLI Verifier</h2>
        <p>
          External auditors, CI/CD pipelines, and compliance evaluators can verify any signed ProofLayer record 
          completely offline without an active internet connection, without account credentials, and without access to ProofLayer servers.
        </p>

        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span>Verify Using Public Keyring</span>
            <button 
              className="copy-btn" 
              onClick={() => copyToClipboard('node bin/verify-proof.js proof-record.json', 'cli1')}
            >
              {copiedId === 'cli1' ? <Check size={14} className="emerald" /> : <Copy size={14} />}
              <span>{copiedId === 'cli1' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="code-content">
{`# 1. Verify against default trusted public keyring
node bin/verify-proof.js /path/to/PL-PROOF-BOLA-8D7F9B1E.json

# 2. Verify using an independent auditor public key PEM (zero trust mode)
node bin/verify-proof.js /path/to/PL-PROOF-BOLA-8D7F9B1E.json --key /path/to/auditor_trusted_pubkey.pem`}
          </pre>
        </div>

        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span>Sample CLI Output</span>
            <span className="lang-tag">Audit Trace</span>
          </div>
          <pre className="code-content">
{`======================================================
       ProofLayer Standalone Cryptographic Verifier   
======================================================

Analyzing Record: PL-PROOF-PL-FIND-001-C91A7B42
Finding:         PL-FIND-001: BOLA in Customer Invoice Endpoint
Target:          http://api.staging.acmecloud.internal/api/invoices/1001 (Tier: staging)
Verdict:         VERIFIED_REMEDIATED (Remediation Verified)
Signer:          Sarah Chen <sarah.chen@prooflayer.internal>

--- Cryptographic Integrity Checks ---
[PASS] Root Proof Digest Match (SHA-256)
[PASS] Ed25519 Digital Signature Valid (Key: pl-ed25519-2026-k1)
[PASS] Key Status: ACTIVE & Trusted
[PASS] Baseline Exploit Evidence Hash Match
[PASS] Retest Execution Evidence Hash Match
[PASS] Invariant Assertions Hash Match
[PASS] Regression Permutations Hash Match

--- Auditor Verification Result ---
CRYPTOGRAPHICALLY VALID & AUTHENTIC`}
          </pre>
        </div>

        <hr className="doc-divider" />

        {/* 2. GITHUB WEBHOOKS */}
        <h2>2. GitHub PR & Issue Webhook Retesting</h2>
        <p>
          Developers can trigger automated retesting directly from GitHub pull requests or issue discussions. 
          ProofLayer enforces constant-time HMAC signature checks, 5-minute freshness limits, atomic delivery deduplication, 
          and author permission checks (only <code>OWNER</code>, <code>MEMBER</code>, or <code>COLLABORATOR</code> can trigger retests).
        </p>

        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span>GitHub PR Comment Syntax</span>
            <button 
              className="copy-btn" 
              onClick={() => copyToClipboard('/prooflayer retest PL-FIND-001 --env staging', 'gh1')}
            >
              {copiedId === 'gh1' ? <Check size={14} className="emerald" /> : <Copy size={14} />}
              <span>{copiedId === 'gh1' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="code-content">
{`# Comment on any GitHub PR or Issue:
/prooflayer retest PL-FIND-001 --env staging

# ProofLayer automatically executes the scoped retest and replies:
# ✅ VERIFIED REMEDIATED
# - Security Invariants: 3/3 passed
# - Bypass Permutations Blocked: 6/6
# - Ed25519 Signature: 3a9f81bc2041...
# - Cryptographic Proof Record: PL-PROOF-PL-FIND-001-C91A7B42`}
          </pre>
        </div>

        <hr className="doc-divider" />

        {/* 3. SARIF & BURP IMPORT */}
        <h2>3. Ingesting Findings (SARIF 2.1.0 & Burp Suite)</h2>
        <p>
          ProofLayer ingests findings with complete provenance metadata, including exact HTTP requests, responses, line numbers, and toolchain versions.
        </p>

        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span>REST API Import Endpoint</span>
            <span className="lang-tag">POST /api/findings</span>
          </div>
          <pre className="code-content">
{`# Ingest SARIF 2.1.0 report
curl -X POST http://localhost:3001/api/findings \\
  -H "Content-Type: application/json" \\
  -d @semgrep-scan.sarif

# Ingest Burp Suite XML/JSON Export
curl -X POST http://localhost:3001/api/findings \\
  -H "Content-Type: application/json" \\
  -d '{ "type": "burp", "payload": { "issueName": "SSRF", "path": "/api/webhook", ... } }'`}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <footer className="clean-footer" style={{ marginTop: '60px' }}>
        <div className="w footer-bottom-bar">
          <div className="footer-copyright">
            © 2026 ProofLayer Inc. Cryptographic Remediation Verification Engine.
          </div>
          <div className="designer-credit-badge liquid-glass-badge">
            <span>Made & designed with passion by </span>
            <a 
              href="https://salman2610.github.io" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="designer-link"
              title="View P Salmanulfaris Portfolio"
            >
              P Salmanulfaris
            </a>
            <span className="dot-sep">•</span>
            <a 
              href="https://salman2610.github.io" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="portfolio-link"
            >
              Portfolio ↗
            </a>
            <span className="dot-sep">•</span>
            <a 
              href="https://github.com/salman2610/ProofLayer/issues" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="github-issues-link"
              title="Report an issue or submit a pull request on GitHub"
            >
              GitHub (Issues & PRs) ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
