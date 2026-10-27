import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  Key, 
  Terminal, 
  FileCode, 
  ExternalLink, 
  Cpu, 
  Eye, 
  Sparkles,
  GitBranch,
  Layers,
  FileCheck2,
  Check,
  ChevronRight,
  Fingerprint,
  RefreshCw,
  RotateCcw,
  Server
} from 'lucide-react';

export default function PublicLandingPage({ 
  onExploreDemo, 
  onOpenAuth, 
  onOpenSampleProof,
  onNavigateTab
}) {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflowSteps = [
    {
      step: '01',
      title: 'Import Finding with Provenance',
      description: 'Ingest security findings from Burp Suite, SARIF 2.1.0, or pentest deliverables preserving original HTTP requests, responses, line numbers, and scanner toolchain metadata.',
      badge: 'Provenance Preserved',
      icon: FileCode
    },
    {
      step: '02',
      title: 'Execute Scoped Retest',
      description: 'Dispatch safe, non-destructive retests through our hardened egress client. Socket-level destination pinning, DNS rebinding defense, and Scope Guard strictly block loopback or cloud metadata egress.',
      badge: 'Socket Pinning & SSRF Guard',
      icon: ShieldCheck
    },
    {
      step: '03',
      title: 'Evaluate Invariants & Bypass Permutations',
      description: 'Run deterministic assertions across status codes, response headers, and confidential data leak strings. Simultaneously test alternate attack paths (method swaps, verb tunneling, parameter pollution).',
      badge: 'Deterministic Rules',
      icon: Cpu
    },
    {
      step: '04',
      title: 'Issue Cryptographic Proof Certificate',
      description: 'Compute a SHA-256 Merkle tree of baseline and retest evidence, sign with RFC 8032 Ed25519 digital signature, and export an audit-ready, tamper-evident certificate verifiable offline.',
      badge: 'Ed25519 RFC 8032',
      icon: Key
    }
  ];

  return (
    <div className="public-landing">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot emerald"></span>
            <span>Security Remediation Verification Platform</span>
          </div>

          <h1 className="hero-title">
            Don't just close vulnerabilities. <br />
            <span className="gradient-text">Prove they're fixed.</span>
          </h1>

          <p className="hero-subtitle">
            Evidence-backed security retesting, regression detection, and independently verifiable 
            remediation records for penetration testers, AppSec teams, and compliance auditors.
          </p>

          <div className="hero-cta-group">
            <button 
              className="btn-primary hero-btn-main"
              onClick={() => onOpenAuth('signup')}
            >
              <span>Get started</span>
              <ArrowRight size={18} />
            </button>

            <button 
              className="btn-secondary hero-btn-demo"
              onClick={onExploreDemo}
            >
              <Terminal size={17} />
              <span>Explore demo</span>
            </button>
          </div>

          <div className="hero-trust-row">
            <div className="trust-item">
              <Check size={14} className="emerald" />
              <span>Ed25519 Asymmetric Proofs</span>
            </div>
            <div className="trust-item">
              <Check size={14} className="emerald" />
              <span>Offline Public Key Verification</span>
            </div>
            <div className="trust-item">
              <Check size={14} className="emerald" />
              <span>Zero-Storage Secret Redaction</span>
            </div>
          </div>
        </div>

        {/* HERO VISUAL CARD: Exact user spec */}
        <div className="hero-visual">
          <div className="verification-overview-card">
            <div className="card-top-bar">
              <div className="top-title-group">
                <div className="env-badge-demo">Demo environment</div>
                <span className="card-sub-label">ProofLayer Verification Engine v1.4</span>
              </div>
              <div className="signal-indicator">
                <span className="pulse-dot"></span>
                <span>Live Telemetry</span>
              </div>
            </div>

            {/* Metric counters */}
            <div className="metric-triad">
              <div className="metric-box verified">
                <div className="metric-num">24</div>
                <div className="metric-label">Verified</div>
              </div>
              <div className="metric-box vulnerable">
                <div className="metric-num">8</div>
                <div className="metric-label">Still vulnerable</div>
              </div>
              <div className="metric-box inconclusive">
                <div className="metric-num">3</div>
                <div className="metric-label">Inconclusive</div>
              </div>
            </div>

            {/* Sample Finding Status Rows */}
            <div className="sample-findings-list">
              <div className="sample-row">
                <div className="finding-name-col">
                  <div className="finding-title-text">BOLA / IDOR</div>
                  <div className="finding-cwe-meta">CWE-639 Customer Invoice Endpoint</div>
                </div>
                <div className="verdict-tag verified">
                  <CheckCircle2 size={13} />
                  <span>Verified remediated</span>
                </div>
              </div>

              <div className="sample-row">
                <div className="finding-name-col">
                  <div className="finding-title-text">SSRF</div>
                  <div className="finding-cwe-meta">CWE-918 Cloud Metadata Webhook</div>
                </div>
                <div className="verdict-tag vulnerable">
                  <XCircle size={13} />
                  <span>Vulnerability persists</span>
                </div>
              </div>

              <div className="sample-row">
                <div className="finding-name-col">
                  <div className="finding-title-text">Authentication</div>
                  <div className="finding-cwe-meta">CWE-285 Function Level Authorization</div>
                </div>
                <div className="verdict-tag inconclusive">
                  <AlertCircle size={13} />
                  <span>Inconclusive</span>
                </div>
              </div>
            </div>

            <div className="demo-disclaimer-bar">
              <span>Illustrative data only — not actual customer results.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="section-container workflow-section" id="how-it-works">
        <div className="section-header">
          <div className="section-eyebrow">Verification Lifecycle</div>
          <h2 className="section-title">How ProofLayer Works</h2>
          <p className="section-description">
            A deterministic, four-stage verification pipeline that transforms subjective 
            remediation claims into tamper-evident cryptographic artifacts.
          </p>
        </div>

        <div className="workflow-grid">
          {workflowSteps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div 
                key={s.step} 
                className={`workflow-card ${activeWorkflowStep === idx ? 'active' : ''}`}
                onClick={() => setActiveWorkflowStep(idx)}
              >
                <div className="card-step-badge">{s.step}</div>
                <div className="card-icon-bubble">
                  <Icon size={22} />
                </div>
                <h3 className="workflow-card-title">{s.title}</h3>
                <p className="workflow-card-text">{s.description}</p>
                <div className="card-footer-tag">{s.badge}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. KEY CAPABILITIES */}
      <section className="section-container capabilities-section" id="capabilities">
        <div className="section-header">
          <div className="section-eyebrow">Core Engine Controls</div>
          <h2 className="section-title">Hardened for Security Professionals</h2>
          <p className="section-description">
            Designed to withstand adversarial evasion, false confidence scores, and unvalidated network boundaries.
          </p>
        </div>

        <div className="capabilities-grid">
          <div className="cap-card">
            <div className="cap-icon-box">
              <RotateCcw size={22} className="purple" />
            </div>
            <h3>Bypass Permutation Matrix</h3>
            <p>
              Developers frequently implement naive filters that block the exact pentest string. ProofLayer automatically tests alternate attack vectors including HTTP method tunneling, path dot-segments (`/..;/`), header spoofing (`X-Original-URL`), and parameter pollution.
            </p>
            <div className="cap-meta">6+ Permutation Vectors Tested</div>
          </div>

          <div className="cap-card">
            <div className="cap-icon-box">
              <Lock size={22} className="emerald" />
            </div>
            <h3>Zero-Exposure Evidence Redaction</h3>
            <p>
              Secrets, AWS keys, Bearer tokens, cookies, and credit cards are scrubbed in-memory using NFKC Unicode normalization and percent-decoding *before* evidence reaches storage, logs, or exports. Deterministic SHA-256 signatures prove data consistency without disclosing keys.
            </p>
            <div className="cap-meta">NFKC Normalized & ANSI-Stripped</div>
          </div>

          <div className="cap-card">
            <div className="cap-icon-box">
              <Fingerprint size={22} className="blue" />
            </div>
            <h3>Ed25519 Cryptographic Proofs</h3>
            <p>
              Every verified record is signed using asymmetric Ed25519 digital signatures (RFC 8032) bound to a SHA-256 Merkle tree of baseline and retest evidence. External auditors can verify proof records completely offline with zero access to ProofLayer servers.
            </p>
            <div className="cap-meta">RFC 8785 Canonical Serialization</div>
          </div>

          <div className="cap-card">
            <div className="cap-icon-box">
              <GitBranch size={22} className="amber" />
            </div>
            <h3>CI/CD & VCS Webhook Retests</h3>
            <p>
              Trigger verified retests directly from GitHub PR comments (`/prooflayer retest`) or Jira transitions. Hardened with constant-time HMAC verification, 5-minute freshness windows, atomic delivery-ID replay deduplication, and commenter RBAC.
            </p>
            <div className="cap-meta">Durable Atomic Replay Defense</div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE SAMPLE PROOF CERTIFICATE */}
      <section className="section-container sample-proof-section">
        <div className="sample-proof-banner">
          <div className="banner-left">
            <div className="banner-badge">Auditor-Ready System of Record</div>
            <h2 className="banner-title">Inspect a Live Cryptographic Certificate</h2>
            <p className="banner-desc">
              Experience how ProofLayer packages baseline exploit evidence, retest telemetry, 
              deterministic invariant assertions, and Ed25519 signatures into an exportable, self-verifying JSON audit certificate.
            </p>
          </div>
          <div className="banner-right">
            <button 
              className="btn-primary banner-inspect-btn"
              onClick={onOpenSampleProof}
            >
              <Eye size={18} />
              <span>Inspect Sample Proof Record</span>
            </button>
            <span className="banner-subnote">Includes inspectable limitations & Merkle tree hashes</span>
          </div>
        </div>
      </section>

      {/* 5. SECURITY ARCHITECTURE & TRUST MODEL */}
      <section className="section-container trust-section" id="security-architecture">
        <div className="section-header">
          <div className="section-eyebrow">Trust Architecture</div>
          <h2 className="section-title">Built Upon Provable Security Guarantees</h2>
          <p className="section-description">
            ProofLayer does not claim that every vulnerability can be solved with AI or that test passes equal total security. 
            We enforce deterministic, inspectable boundaries.
          </p>
        </div>

        <div className="trust-grid">
          <div className="trust-box">
            <h4>1. Key Management & Revocation</h4>
            <p>
              Private signing keys are protected with deployment boundaries and never exposed to browser client code. 
              The keyring enforces distinct semantics for normal key rotation (`RETIRED`—historical proofs remain valid) 
              versus emergency compromise (`REVOKED`—all proofs signed by the key are untrusted).
            </p>
          </div>

          <div className="trust-box">
            <h4>2. Socket-Level Destination Pinning</h4>
            <p>
              Pre-flight DNS checks alone are insufficient against rebinding. ProofLayer’s safe client resolves destination IPs, 
              rejects mixed public/private responses, and pins the connected operating system socket directly to the validated IP 
              while strictly revalidating every 3xx redirect hop.
            </p>
          </div>

          <div className="trust-box">
            <h4>3. Fail-Safe Invariant Engine</h4>
            <p>
              An unexpected HTTP 500 crash or dropped socket connection is strictly categorized as `INCONCLUSIVE`, 
              never reported as verified. Remediation confidence expresses conviction in the *observed verdict*—a failed patch 
              produces high confidence that the bug persists, not false remediation hope.
            </p>
          </div>

          <div className="trust-box">
            <h4>4. Multi-Tenant Organization Isolation</h4>
            <p>
              Organizations operate within strictly bounded data perimeters. Customer A can never view, retest, or export 
              findings belonging to Customer B. All access is governed by server-enforced role-based access control.
            </p>
          </div>
        </div>
      </section>

      {/* 6. USE CASES */}
      <section className="section-container use-cases-section">
        <div className="section-header">
          <div className="section-eyebrow">Who Uses ProofLayer</div>
          <h2 className="section-title">Designed for Modern Security Teams</h2>
        </div>

        <div className="use-case-triad">
          <div className="use-case-card">
            <div className="uc-badge">Penetration Testing Firms</div>
            <h3>Deliver Proof, Not Just Retest Reports</h3>
            <p>
              Replace manual spreadsheets and ambiguous screenshots with cryptographically signed proof certificates 
              that clients can verify independently without paying for redundant full re-engagements.
            </p>
          </div>

          <div className="use-case-card">
            <div className="uc-badge">Internal Enterprise AppSec</div>
            <h3>Close the Remediation Trust Gap</h3>
            <p>
              Give developers unambiguous deterministic invariants to code against. Eliminate back-and-forth arguments 
              by verifying both the security fix and legitimate authorized user functionality.
            </p>
          </div>

          <div className="use-case-card">
            <div className="uc-badge">Managed Security Providers (MSSP)</div>
            <h3>Scale Multi-Tenant Verification SLAs</h3>
            <p>
              Provide managed clients with measurable remediation proof dashboards, automated GitHub webhook verification, 
              and audit trails that satisfy SOC 2, ISO 27001, and PCI-DSS requirements.
            </p>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="final-cta-section">
        <div className="cta-box">
          <h2>Ready to turn closed tickets into verifiable proof?</h2>
          <p>
            Explore the live synthetic sandbox environment without an account, or create an organization 
            account to manage your team’s findings and verification runs.
          </p>
          <div className="cta-btn-row">
            <button 
              className="btn-primary cta-btn-large"
              onClick={() => onOpenAuth('signup')}
            >
              <span>Create an organization account</span>
              <ArrowRight size={18} />
            </button>
            <button 
              className="btn-secondary cta-btn-large"
              onClick={onExploreDemo}
            >
              <span>Launch interactive demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="public-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo-area">
              <div className="logo-icon">
                <ShieldCheck size={20} />
              </div>
              <span className="footer-logo-text">ProofLayer</span>
            </div>
            <p className="footer-tagline">
              The independent system of record that proves security remediations actually worked.
            </p>
          </div>

          <div className="footer-links-col">
            <h4>Product</h4>
            <a href="#how-it-works">How It Works</a>
            <a href="#capabilities">Capabilities</a>
            <button onClick={onExploreDemo} className="footer-text-btn">Interactive Demo</button>
            <button onClick={onOpenSampleProof} className="footer-text-btn">Sample Certificate</button>
          </div>

          <div className="footer-links-col">
            <h4>Trust & Verification</h4>
            <a href="#security-architecture">Security Architecture</a>
            <button onClick={() => onNavigateTab('trust')} className="footer-text-btn">Trust Model & Limitations</button>
            <button onClick={() => onNavigateTab('docs')} className="footer-text-btn">Integrations & CLI</button>
          </div>

          <div className="footer-links-col">
            <h4>Platform Access</h4>
            <button onClick={() => onOpenAuth('login')} className="footer-text-btn">Sign In</button>
            <button onClick={() => onOpenAuth('signup')} className="footer-text-btn">Create Organization</button>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} ProofLayer Inc. Cryptographic Remediation Verification Engine. All rights reserved.</p>
          <div className="footer-security-note">
            RFC 8032 Ed25519 • RFC 8785 Canonical JSON • SHA-256 Merkle Provenance
          </div>
        </div>
      </footer>
    </div>
  );
}
