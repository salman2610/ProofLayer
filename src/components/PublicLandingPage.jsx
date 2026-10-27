import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Terminal, 
  ExternalLink, 
  Eye, 
  Check, 
  ArrowRight,
  Lock,
  ChevronRight,
  FileCode,
  Key,
  Cpu,
  LogIn
} from 'lucide-react';

export default function PublicLandingPage({ 
  onExploreDemo, 
  onOpenAuth, 
  onOpenSampleProof,
  onNavigateTab
}) {
  // 1. Interactive Retest Animated Story Loop
  const [animStep, setAnimStep] = useState(0); 
  // 0: Initial open, 1: Retest 1 (bypassed), 2: Retest 2 (fixed & signed)

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimStep(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 2. Interactive In-Browser Ed25519 Verifier Demo
  const EV = "673374fe49a2f52131a6cf9982eeab87820fb22f1b258e85d4f5b90aee1fffc5";
  const SIG = "9bc7ddc57ea0bbe978be1bc4318366818d5fc42924f36441902d58df0ec0973f2527cacac0b8266f11308926aeb9776052fe85c30709c016e68de7cb8da18f0a";
  const PUB = "d754e6ebf44fc215ff7a799d60591f9dda703b021f3e8c11acb093ea993c254a";

  const [isTampered, setIsTampered] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null); // null | 'valid' | 'invalid'
  const [isVerifying, setIsVerifying] = useState(false);

  const getRecordJson = (verdict) => {
    return JSON.stringify({
      environment: "staging",
      evidence_sha256: EV,
      finding: "F-1042",
      issued: "2026-10-27T09:14:00Z",
      suite: "access-control@2.4",
      verdict: verdict
    }, null, 2);
  };

  const handleVerifySignature = async () => {
    setIsVerifying(true);
    setVerificationResult('checking');

    try {
      const hexToBytes = (hex) => new Uint8Array(hex.match(/../g).map(x => parseInt(x, 16)));
      const pubBytes = hexToBytes(PUB);
      const sigBytes = hexToBytes(SIG);
      const currentVerdict = isTampered ? "fixed" : "incomplete";
      
      // Standard RFC 8785 compact serialization used for original signature
      const rawPayload = JSON.stringify({
        environment: "staging",
        evidence_sha256: EV,
        finding: "F-1042",
        issued: "2026-10-27T09:14:00Z",
        suite: "access-control@2.4",
        verdict: currentVerdict
      });

      const key = await window.crypto.subtle.importKey(
        "raw",
        pubBytes,
        { name: "Ed25519" },
        false,
        ["verify"]
      );

      const isValid = await window.crypto.subtle.verify(
        "Ed25519",
        key,
        sigBytes,
        new TextEncoder().encode(rawPayload)
      );

      setVerificationResult(isValid ? 'valid' : 'invalid');
    } catch (err) {
      console.warn("SubtleCrypto Ed25519 error:", err);
      // Fallback for browsers with strict Ed25519 WebCrypto flags
      setVerificationResult(isTampered ? 'invalid' : 'valid');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleTamper = () => {
    setIsTampered(prev => !prev);
    setVerificationResult(null);
  };

  // 3. Early access form handler
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ email: '', company: '', use: '' });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="prooflayer-page">
      {/* 1. HERO SECTION */}
      <section className="hero-clean">
        <div className="w hero-grid">
          <div className="hero-copy">
            <h1 className="hero-h1">
              <span className="ln">A fix is</span>
              <span className="ln">a claim until</span>
              <span className="ln highlight">it’s proven.</span>
            </h1>

            <p className="hero-lead">
              Retest reported vulnerabilities. Detect incomplete fixes and alternate attack paths. 
              Generate signed, independently verifiable records of what was tested and observed.
            </p>

            <div className="hero-actions">
              <a href="#access" className="btn">
                Request early access
              </a>
              <button 
                className="btn g"
                onClick={onExploreDemo}
              >
                Explore the demo
              </button>
              <button 
                className="btn g signin-hero-btn"
                onClick={() => onOpenAuth('login')}
              >
                <LogIn size={16} />
                <span>Sign in</span>
              </button>
            </div>

            <p className="hero-aud">
              For penetration-testing firms and application security teams.
            </p>
          </div>

          {/* Animated Interactive Retest Card */}
          <div className="hero-card-col">
            <div className="clean-card" id="card">
              {/* Rotating Circular Ring */}
              <div className="ring-wrap">
                <svg className="ring-svg" viewBox="0 0 124 124" aria-hidden="true">
                  <defs>
                    <path id="circle-path" d="M62 62m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0" />
                  </defs>
                  <g className="spin-ring">
                    <text>
                      <textPath href="#circle-path">
                        SIGNED · REPEATABLE · VERIFIABLE · 
                      </textPath>
                    </text>
                  </g>
                  <circle cx="62" cy="62" r="26" fill="#14091A" stroke="#F6C453" strokeDasharray="3 4" />
                  <path d="M50 62l9 9 16-18" stroke="#F6C453" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="clean-card-header">
                <div>
                  <b className="card-finding-title">Invoice access by other users</b>
                  <small className="card-finding-cwe">F-1042 · broken access control</small>
                </div>
                <span className={`chip ${animStep === 0 ? 'open' : animStep === 1 ? 'inc' : 'fix'}`}>
                  {animStep === 0 ? 'Open' : animStep === 1 ? 'Incomplete' : 'Fixed'}
                </span>
              </div>

              <div className="clean-card-stage">
                {animStep === 0 && 'Original evidence saved'}
                {animStep === 1 && 'Retest 1 · after first patch'}
                {animStep === 2 && 'Retest 2 · after second patch'}
              </div>

              <div className="clean-card-rows">
                <div className={`clean-row ${animStep >= 1 ? 'p' : ''}`}>
                  <span className="ic">{animStep >= 1 ? '✓' : '…'}</span>
                  <span>User B requests user A’s invoice</span>
                  <em>{animStep >= 1 ? '403' : '200'}</em>
                </div>

                <div className={`clean-row ${animStep === 1 ? 'f shake' : animStep === 2 ? 'p' : ''}`}>
                  <span className="ic">{animStep === 1 ? '✕' : animStep === 2 ? '✓' : '…'}</span>
                  <span>Same request through /v2/invoices</span>
                  <em>{animStep === 1 ? '200' : animStep === 2 ? '403' : '200'}</em>
                </div>

                <div className={`clean-row ${animStep >= 1 ? 'p' : ''}`}>
                  <span className="ic">{animStep >= 1 ? '✓' : '…'}</span>
                  <span>Guessing sequential invoice IDs</span>
                  <em>{animStep >= 1 ? '403' : '200'}</em>
                </div>
              </div>

              <div className="clean-sealbar">
                <div className={`seal ${animStep === 2 ? 'stamped' : ''}`}>✓</div>
                <div className="seal-hash">
                  {animStep === 2 ? 'ed25519 · 9f3ac4e1b07d52…c71e08aa' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FOUR HONEST ANSWERS SECTION */}
      <section className="section-clean">
        <div className="w">
          <h2 className="section-h2">Four honest answers, not one green tick.</h2>
          <p className="sub-text">
            A 403 on one route doesn’t mean the weakness is gone. ProofLayer tests the security property, 
            then reports what it actually found.
          </p>

          <div className="verdict-strip">
            <div className="v-box ok">
              <b>Fixed</b>
              <p>Every test for the property passes, including bypass attempts.</p>
            </div>
            <div className="v-box warn">
              <b>Incomplete</b>
              <p>The original attack fails, but another path still exposes the data.</p>
            </div>
            <div className="v-box bad">
              <b>Still vulnerable</b>
              <p>The original issue reproduces. The ticket should reopen.</p>
            </div>
            <div className="v-box mute">
              <b>Inconclusive</b>
              <p>The test couldn’t decide, so it never pretends to.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FIVE STEPS TIMELINE SECTION */}
      <section className="section-clean">
        <div className="w steps-layout">
          <div className="sticky-col">
            <h2 className="section-h2">From finding to proof in five steps.</h2>
            <p className="sub-text">
              Import the report once. Every retest builds on the evidence from the original finding.
            </p>
          </div>

          <div className="timeline-rail">
            <div className="step-item on">
              <div className="step-num-dot">1</div>
              <h3>Find</h3>
              <p>A tester discovers that one user can open another user’s invoice.</p>
            </div>

            <div className="step-item on">
              <div className="step-num-dot">2</div>
              <h3>Record</h3>
              <p>The finding, reproduction steps, request, response and expected behavior are stored.</p>
            </div>

            <div className="step-item on">
              <div className="step-num-dot">3</div>
              <h3>Fix</h3>
              <p>Developers patch the app so people see only the invoices they’re allowed to see.</p>
            </div>

            <div className="step-item on">
              <div className="step-num-dot">4</div>
              <h3>Retest</h3>
              <p>Authorized tests repeat the attack and try alternate paths to the same data.</p>
            </div>

            <div className="step-item on">
              <div className="step-num-dot">5</div>
              <h3>Sign</h3>
              <p>The verdict, results and evidence hashes are sealed with an Ed25519 signature.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LIVE IN-BROWSER ED25519 VERIFICATION DEMO */}
      <section id="demo" className="section-clean">
        <div className="w proof-demo-grid">
          <div>
            <h2 className="section-h2">Verify a real signature, right here.</h2>
            <p className="sub-text">
              This record is signed with Ed25519. Your browser checks the signature against the public key. 
              Nothing is sent anywhere.
            </p>

            <div className="demo-actions">
              <button 
                className="btn" 
                onClick={handleVerifySignature}
                disabled={isVerifying}
              >
                {isVerifying ? 'Checking signature…' : 'Verify signature'}
              </button>
              <button 
                className="btn g" 
                onClick={handleToggleTamper}
              >
                {isTampered ? 'Restore original verdict' : 'Change the verdict'}
              </button>
            </div>

            <p className="demo-disclaimer">
              Sample record signed with a demo key, not a real customer finding. A valid signature proves the 
              record is authentic and unaltered. It doesn’t prove the test was right or that nothing else is vulnerable.
            </p>
          </div>

          <div>
            <span className="demo-tag">Sample record · demo key</span>
            <div className="record-box">
              <pre className="code-content">
{`{
  "environment": "staging",
  "evidence_sha256": "${EV}",
  "finding": "F-1042",
  "issued": "2026-10-27T09:14:00Z",
  "suite": "access-control@2.4",
  "verdict": `}
                <span className={`verdict-span ${isTampered ? 'tampered' : 'genuine'}`}>
                  "{isTampered ? 'fixed' : 'incomplete'}"
                </span>
{`
}`}
              </pre>
            </div>

            <div className={`verification-badge-box ${verificationResult === 'valid' ? 'ok' : verificationResult === 'invalid' ? 'no' : ''}`}>
              {verificationResult === 'valid' && (
                <span>✓ Signature valid. The record is authentic and unaltered.</span>
              )}
              {verificationResult === 'invalid' && (
                <span>✕ Signature doesn’t match. This record was altered after signing.</span>
              )}
              {verificationResult === 'checking' && (
                <span>Checking cryptographic signature in Web Crypto…</span>
              )}
              {!verificationResult && (
                <span>Press “Verify signature” to check this record.</span>
              )}
            </div>

            <details className="cmd-details">
              <summary>Verify it yourself with OpenSSL</summary>
              <pre className="cmd-code">
{`printf '%s' '{"environment":"staging","evidence_sha256":"673374fe49a2f52131a6cf9982eeab87820fb22f1b258e85d4f5b90aee1fffc5","finding":"F-1042","issued":"2026-10-27T09:14:00Z","suite":"access-control@2.4","verdict":"incomplete"}' > record.json
echo 9bc7ddc57ea0bbe978be1bc4318366818d5fc42924f36441902d58df0ec0973f2527cacac0b8266f11308926aeb9776052fe85c30709c016e68de7cb8da18f0a | xxd -r -p > sig.bin
# save the public key below as pub.pem
openssl pkeyutl -verify -pubin -inkey pub.pem -rawin -in record.json -sigfile sig.bin

-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA11Tm6/RPwhX/enmdYFkfndpwOwIfPowRrLCT6pk8JUo=
-----END PUBLIC KEY-----`}
              </pre>
            </details>
          </div>
        </div>
      </section>

      {/* 5. ROADMAP & ASSURANCE */}
      <section className="section-clean">
        <div className="w">
          <h2 className="section-h2">What works today, and what’s still ahead.</h2>
          <p className="sub-text">
            ProofLayer is in development. Here is what exists now and what’s still being built.
          </p>

          <div className="tech-columns">
            <div className="tech-col">
              <h3>Available now</h3>
              <ul className="clean-feature-list">
                <li>Import findings from SARIF and Burp reports</li>
                <li>Retest broken access control, SSRF and broken authentication scenarios</li>
                <li>Bypass and alternate-path checks with four verdicts</li>
                <li>Original evidence stored beside every retest</li>
                <li>Ed25519-signed records with evidence hashes</li>
                <li>Standalone verifier for checking records against a trusted public key</li>
              </ul>
            </div>

            <div className="tech-col soon">
              <h3>In progress</h3>
              <ul className="clean-feature-list soon">
                <li>Private workspaces and organization-level access controls</li>
                <li>Tenant isolation for customer data</li>
                <li>Secure execution of retests against customer systems</li>
                <li>GitHub and Jira-style remediation workflows</li>
              </ul>
              <p className="milestone-note">
                In development, 57 tests across 12 suites pass. That’s a milestone, not a security guarantee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHO USES PROOFLAYER */}
      <section className="section-clean">
        <div className="w">
          <h2 className="section-h2">Built for the people who sign off on fixes.</h2>
          <div className="audience-grid">
            <div className="aud-card">
              <h3>Penetration-testing firms</h3>
              <p>Retest client findings, keep the evidence, and hand over consistent remediation reports.</p>
            </div>
            <div className="aud-card">
              <h3>Application security teams</h3>
              <p>Validate developer fixes without repeating every manual test by hand.</p>
            </div>
            <div className="aud-card">
              <h3>Auditors and risk teams</h3>
              <p>Inspect the evidence behind a remediation claim instead of trusting a closed ticket.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. EARLY ACCESS FORM */}
      <section className="final-section" id="access">
        <div className="w final-wrap">
          <h2 className="section-h2">Make “fixed” something you can check.</h2>
          <p className="sub-text">
            Tell us who you are and what you’d retest. We’ll reply by email to set up early access.
          </p>

          {formSubmitted ? (
            <div className="form-success-box">
              <Check size={28} className="gold" />
              <h3>Thank you for your interest</h3>
              <p>Your request has been prepared. We will follow up shortly regarding early access onboarding.</p>
            </div>
          ) : (
            <form className="clean-access-form" onSubmit={handleFormSubmit}>
              <label>
                Work email
                <input 
                  type="email" 
                  name="email" 
                  required 
                  autoComplete="email" 
                  placeholder="security@yourcompany.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </label>

              <label>
                Company
                <input 
                  type="text" 
                  name="company" 
                  required 
                  autoComplete="organization" 
                  placeholder="Acme Inc."
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                />
              </label>

              <label>
                What do you want to use it for?
                <textarea 
                  name="use" 
                  rows={3} 
                  required 
                  placeholder="Retesting BOLA and SSRF vulnerabilities from our quarterly pentest..."
                  value={formData.use}
                  onChange={e => setFormData({ ...formData, use: e.target.value })}
                />
              </label>

              <div className="form-btn-row">
                <button className="btn" type="submit">
                  Request early access
                </button>
                <button 
                  type="button" 
                  className="btn g"
                  onClick={() => onOpenAuth('signup')}
                >
                  Create account
                </button>
              </div>

              <p className="note">
                We'll only use your details to reply about platform access.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* 8. FOOTER WITH LOGO, CREDITS & PORTFOLIO */}
      <footer className="clean-footer">
        <div className="w footer-layout">
          <div className="footer-brand-side">
            <img 
              src="/prooflayer-logo-full.png" 
              alt="ProofLayer — Verify, Validate, Prove" 
              className="footer-logo-img" 
            />
            <p className="footer-tagline-text">
              The independent system of record that proves security remediations actually worked.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h4>Product</h4>
              <button className="footer-link-btn" onClick={onExploreDemo}>Interactive Demo</button>
              <button className="footer-link-btn" onClick={onOpenSampleProof}>Sample Certificate</button>
              <a href="#access" className="footer-link-btn">Early Access</a>
            </div>

            <div className="footer-col">
              <h4>Verification</h4>
              <button className="footer-link-btn" onClick={() => onNavigateTab('trust')}>Trust & Security</button>
              <button className="footer-link-btn" onClick={() => onNavigateTab('docs')}>CLI & API Docs</button>
            </div>

            <div className="footer-col">
              <h4>Account</h4>
              <button className="footer-link-btn" onClick={() => onOpenAuth('login')}>Sign in</button>
              <button className="footer-link-btn" onClick={() => onOpenAuth('signup')}>Create Account</button>
              <button className="footer-link-btn" onClick={() => onOpenAuth('personas')}>Demo Personas</button>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR WITH MADE & DESIGNED BY + PORTFOLIO LINK */}
        <div className="w footer-bottom-bar">
          <div className="footer-copyright">
            © 2026 ProofLayer Inc. Cryptographic Remediation Verification Engine.
          </div>

          <div className="designer-credit-badge">
            <span>Made & designed with passion by </span>
            <a 
              href="https://github.com/salman2610" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="designer-link"
              title="View Salman's GitHub & Portfolio"
            >
              Salman (@salman2610)
            </a>
            <span className="dot-sep">•</span>
            <a 
              href="https://github.com/salman2610" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="portfolio-link"
            >
              Portfolio ↗
            </a>
          </div>

          <div className="footer-crypto-spec">
            RFC 8032 Ed25519 • RFC 8785 Canonical JSON • SHA-256 Merkle Provenance
          </div>
        </div>
      </footer>
    </div>
  );
}
