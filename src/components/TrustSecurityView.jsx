import React from 'react';
import { 
  ShieldCheck, 
  Key, 
  Terminal, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  FileCheck, 
  ArrowLeft 
} from 'lucide-react';

export default function TrustSecurityView({ onBackToHome, onOpenSampleProof }) {
  return (
    <div className="doc-view-container">
      <div className="doc-nav-header">
        <button className="btn-secondary back-btn" onClick={onBackToHome}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
        <div className="doc-meta-badge">Security Whitepaper & Verification Model</div>
      </div>

      <div className="doc-article">
        <h1>ProofLayer Trust & Security Model</h1>
        <p className="doc-lead">
          ProofLayer is engineered around the principle of zero trust in unverified remediation claims. 
          This document specifies our cryptographic guarantees, network egress controls, fail-safe invariant engine, and inspectable limitations.
        </p>

        <hr className="doc-divider" />

        <h2>1. Cryptographic Record Architecture</h2>
        <p>
          Unlike legacy scanners that store findings in proprietary relational databases, ProofLayer packages remediation 
          telemetry into deterministic, tamper-evident cryptographic certificates signed using <strong>RFC 8032 Ed25519</strong> digital signatures.
        </p>
        
        <div className="doc-callout purple">
          <h4>Why Asymmetric Ed25519 instead of HMAC?</h4>
          <p>
            HMAC relies on a shared symmetric secret: anyone who can verify a record also possesses the secret necessary to forge one. 
            ProofLayer signs records with an internal protected private key. External auditors, client security teams, and CI/CD gates 
            verify records using only the public key with zero knowledge of the signing secret.
          </p>
        </div>

        <h3>Evidence Merkle Hashing</h3>
        <p>
          Each proof record constructs a composite root digest from discrete SHA-256 hashes representing:
        </p>
        <ul>
          <li><strong>Baseline Exploit Evidence:</strong> Exact HTTP request, headers, parameters, and vulnerable response.</li>
          <li><strong>Retest Execution Evidence:</strong> Observed HTTP response status, headers, duration, and sanitized body.</li>
          <li><strong>Deterministic Invariant Evaluations:</strong> Exact status code rules, required headers, and forbidden secret strings.</li>
          <li><strong>Regression Permutation Matrix:</strong> Results of alternate bypass vectors (verb tunneling, dot-segments, header spoofing).</li>
          <li><strong>Target Scope & Environment Tier:</strong> Bounded hostname, path, and tier flag (staging vs production).</li>
        </ul>

        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span>Canonical Root Proof Digest Construction</span>
            <span className="lang-tag">RFC 8785 Canonical JSON</span>
          </div>
          <pre className="code-content">
{`const compositeProofString = [
  sha256({ findingId, title, cwe, severity }),
  sha256(baselineEvidence),
  sha256(retestEvidence),
  sha256(invariantEvaluations),
  sha256(regressionMatrix),
  environment.target,
  environment.tier,
  verdict,
  testSuiteVersion,
  issuedAt,
  reviewer.email
].join('::');

const rootProofDigest = sha256(compositeProofString);
const digitalSignature = ed25519.sign(rootProofDigest, privateKey);`}
          </pre>
        </div>

        <hr className="doc-divider" />

        <h2>2. Key Management & Revocation Lifecycle</h2>
        <p>
          ProofLayer enforces strict semantics distinguishing key retirement from compromise revocation:
        </p>
        <div className="table-wrapper">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Key Status</th>
                <th>Trigger Event</th>
                <th>Verification Semantics</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong style={{ color: '#10b981' }}>ACTIVE</strong></td>
                <td>Current operational signing key</td>
                <td>All historical and new records signed with this key are valid.</td>
              </tr>
              <tr>
                <td><strong style={{ color: '#f59e0b' }}>RETIRED</strong></td>
                <td>Routine scheduled key rotation</td>
                <td>Records issued <em>prior</em> to retirement timestamp remain valid; records issued after retirement are rejected.</td>
              </tr>
              <tr>
                <td><strong style={{ color: '#ef4444' }}>REVOKED</strong></td>
                <td>Key compromise or unauthorized exposure</td>
                <td><strong>ALL</strong> records signed with this key are immediately invalidated, regardless of historical timestamp.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr className="doc-divider" />

        <h2>3. Network Boundary & Socket Pinning</h2>
        <p>
          When executing automated security retests, ProofLayer’s safe client enforces strict egress isolation to prevent 
          the engine from being weaponized for Server-Side Request Forgery (SSRF) or lateral movement:
        </p>
        <ul>
          <li><strong>Socket-Level Destination Pinning:</strong> Operating system sockets connect strictly to pre-validated IP addresses, completely mitigating Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding.</li>
          <li><strong>Mixed DNS Rejection:</strong> If a hostname returns both public and private addresses, the entire query is rejected.</li>
          <li><strong>IPv4-Mapped IPv6 Normalization:</strong> Addresses such as <code>::ffff:169.254.169.254</code> or <code>::ffff:10.0.0.1</code> are normalized and blocked.</li>
          <li><strong>Manual Redirect Re-validation:</strong> Every HTTP 3xx redirect is intercepted, checked against Scope Guard allowlists, and capped at a maximum depth of 3 hops.</li>
        </ul>

        <hr className="doc-divider" />

        <h2>4. Explicit Limitations Statement</h2>
        <div className="doc-callout amber">
          <h4>What ProofLayer Certificates Certify vs What They Do Not</h4>
          <p>
            <strong>Certified:</strong> A ProofLayer certificate certifies that the specific deterministic invariants and bypass permutations recorded in the evidence payload were executed and observed at the stated timestamp against the recorded target environment.
          </p>
          <p>
            <strong>Not Certified:</strong> A certificate does not certify the absence of undiscovered vulnerabilities, architectural flaws outside the test scope, or environment drift between staging and production (e.g. WAF rules, CDN edge routing, identity federation).
          </p>
        </div>

        <div className="doc-action-bar">
          <button className="btn-primary" onClick={onOpenSampleProof}>
            <FileCheck size={16} />
            <span>Inspect Live Sample Certificate</span>
          </button>
        </div>
      </div>

      {/* Sleek Minimalist Apple Footer */}
      <footer className="prooflayer-minimal-footer" style={{ marginTop: '72px' }}>
        <div className="w minimal-footer-inner">
          <div className="footer-left-col">
            <span className="footer-copy">© 2026 ProofLayer</span>
            <span className="dot-sep">•</span>
            <span className="footer-tagline">Prove the fix, don’t trust the ticket.</span>
          </div>

          <div className="footer-right-col">
            <span className="footer-author">Made &amp; designed by</span>
            <a 
              href="https://salman2610.github.io" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="designer-link"
              title="P Salmanulfaris Portfolio"
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
              GitHub (Issues &amp; PRs) ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
