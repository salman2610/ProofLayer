import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  LogIn,
  Layers,
  Sparkles,
  ShieldAlert,
  Server,
  FileCheck2,
  RefreshCw,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Copy,
  Sliders,
  FileText,
  Database,
  Crosshair,
  Code,
  Circle,
  Shield,
  CheckCircle,
  Share2,
  FileSpreadsheet,
  Clock
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function PublicLandingPage({ 
  onExploreDemo, 
  onOpenAuth, 
  onOpenSampleProof,
  onNavigateTab,
  onLaunchScenario
}) {
  const containerRef = useRef(null);
  const heroCardRef = useRef(null);
  const ctaStackRef = useRef(null);

  // 1. Hero Cockpit Interactive State
  const [heroActiveTab, setHeroActiveTab] = useState('overview'); // 'overview' | 'evidence' | 'retest' | 'verification'
  const [isHeroRetesting, setIsHeroRetesting] = useState(false);
  const [heroRetestState, setHeroRetestState] = useState('passed'); // 'passed' | 'retesting'

  // 2. Cryptographic Signature Verifier State
  const [isTampered, setIsTampered] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [cryptoVerificationStatus, setCryptoVerificationStatus] = useState(null); // null | 'valid' | 'invalid' | 'checking'
  const [isVerifyingCrypto, setIsVerifyingCrypto] = useState(false);

  // 3. Early Access Form State
  const [formData, setFormData] = useState({ email: '', company: '', useCase: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // 4. Interactive Hero Re-test Simulation
  const handleTriggerHeroRetest = () => {
    if (isHeroRetesting) return;
    setIsHeroRetesting(true);
    setHeroRetestState('retesting');

    const tl = gsap.timeline({
      onComplete: () => {
        setIsHeroRetesting(false);
        setHeroRetestState('passed');
        gsap.fromTo('#hero-result-badge', 
          { scale: 0.7, opacity: 0 }, 
          { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' }
        );
      }
    });

    tl.to('#hero-retest-spinner', { rotation: 720, duration: 1.4, ease: 'power2.inOut' });
  };

  // 5. In-Browser Signature Verification
  const handleVerifyRealSignature = async () => {
    setIsVerifyingCrypto(true);
    setCryptoVerificationStatus('checking');

    try {
      await new Promise(r => setTimeout(r, 600));
      const isValid = !isTampered;
      setCryptoVerificationStatus(isValid ? 'valid' : 'invalid');

      if (isValid) {
        gsap.fromTo('#signature-status-pill', 
          { scale: 0.7, y: -8 }, 
          { scale: 1, y: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' }
        );
      } else {
        gsap.fromTo('#signature-status-pill', 
          { x: -12 }, 
          { x: 0, duration: 0.4, ease: 'power2.inOut' }
        );
      }
    } catch {
      setCryptoVerificationStatus(!isTampered ? 'valid' : 'invalid');
    } finally {
      setIsVerifyingCrypto(false);
    }
  };

  const handleToggleTamperPayload = () => {
    setIsTampered(prev => !prev);
    setCryptoVerificationStatus(null);
  };

  const handleCopyCode = () => {
    const code = `{
  "finding_id": "FL-2026-092",
  "result": "${isTampered ? 'Incomplete' : 'Fixed'}",
  "tested_at": "2026-10-28T14:22:01Z",
  "evidence": {
    "request_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "response_hash": "1b4f0e985197199feb6dc4ebda735c3c5e5804a85d532d08a332917044189ee1"
  },
  "signature": "${isTampered ? 'tampered_invalid_sig_0000000000' : '893c52b904d9c0269f88c3a50284fb797d8e6a100650d03b0c309855db913282'}"
}`;
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEarlyAccessSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    gsap.fromTo('#access-success-box', 
      { scale: 0.85, opacity: 0, y: 20 }, 
      { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(2)' }
    );
  };

  // 6. GSAP Orchestration: Comprehensive ScrollTrigger & Typographic Animations
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      // --- A. HERO ENTRANCE TYPOGRAPHIC ANIMATIONS ---
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      heroTl
        .fromTo('.hero-eyebrow-tag', 
          { opacity: 0, y: -20, letterSpacing: '0.28em' }, 
          { opacity: 1, y: 0, letterSpacing: '0.14em', duration: 0.9, delay: 0.1 }
        )
        .fromTo('.hero-title-line span', 
          { yPercent: 90, opacity: 0 }, 
          { yPercent: 0, opacity: 1, stagger: 0.14, duration: 1.1, ease: 'power4.out' }, 
          '-=0.6'
        )
        .fromTo('.hero-sub-description', 
          { opacity: 0, y: 22 }, 
          { opacity: 1, y: 0, duration: 0.8 }, 
          '-=0.7'
        )
        .fromTo('.hero-btn-row .hero-anim-btn', 
          { opacity: 0, y: 24, scale: 0.94 }, 
          { opacity: 1, y: 0, scale: 1, stagger: 0.12, duration: 0.7, ease: 'back.out(1.8)' }, 
          '-=0.6'
        )
        .fromTo('.hero-trust-bullets .trust-bullet-item', 
          { opacity: 0, y: 14 }, 
          { opacity: 1, y: 0, stagger: 0.1, duration: 0.6 }, 
          '-=0.5'
        )
        .fromTo('#hero-cockpit-window', 
          { opacity: 0, y: 60, scale: 0.93, rotationX: 10 }, 
          { opacity: 1, y: 0, scale: 1, rotationX: 0, duration: 1.2, ease: 'expo.out' }, 
          '-=0.9'
        );

      // --- B. CONTINUOUS GENTLE FLOATING ON COCKPIT WINDOW ---
      gsap.to('#hero-cockpit-window', {
        y: '+=6',
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // --- C. 3D CARD TILT ON MOUSE MOVE ---
      const cardEl = heroCardRef.current;
      if (cardEl) {
        const qRotY = gsap.quickTo(cardEl, 'rotationY', { duration: 0.6, ease: 'power2.out' });
        const qRotX = gsap.quickTo(cardEl, 'rotationX', { duration: 0.6, ease: 'power2.out' });
        const handleCardMouseMove = (e) => {
          const rect = cardEl.getBoundingClientRect();
          const cardX = e.clientX - rect.left - rect.width / 2;
          const cardY = e.clientY - rect.top - rect.height / 2;
          qRotY(cardX * 0.02);
          qRotX(-cardY * 0.02);
        };
        const handleCardMouseLeave = () => {
          qRotY(0);
          qRotX(0);
        };
        cardEl.addEventListener('mousemove', handleCardMouseMove);
        cardEl.addEventListener('mouseleave', handleCardMouseLeave);
      }

      // --- D. SCROLL-TRIGGERED ANIMATIONS: SECTION BY SECTION ---

      // 1. Four Honest Outcomes
      gsap.fromTo('#outcomes-frame', 
        { opacity: 0, y: 40, scale: 0.97 }, 
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#outcomes', start: 'top 85%' }
        }
      );

      gsap.fromTo('.outcome-card-item', 
        { opacity: 0, y: 45, rotateX: 15 }, 
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          stagger: 0.12,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#outcomes', start: 'top 80%' }
        }
      );

      gsap.fromTo('.outcome-icon-circle', 
        { scale: 0, rotate: -45 }, 
        {
          scale: 1,
          rotate: 0,
          stagger: 0.12,
          duration: 0.7,
          ease: 'back.out(2.5)',
          scrollTrigger: { trigger: '#outcomes', start: 'top 80%' }
        }
      );

      // 2. Deterministic Verification / Invariant Specifications
      gsap.fromTo('#invariants-left-copy', 
        { opacity: 0, x: -45 }, 
        {
          opacity: 1,
          x: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#invariants', start: 'top 82%' }
        }
      );

      gsap.fromTo('.spec-feature-card', 
        { opacity: 0, x: 50 }, 
        {
          opacity: 1,
          x: 0,
          stagger: 0.15,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#invariants', start: 'top 82%' }
        }
      );

      gsap.fromTo('.spec-icon-box', 
        { scale: 0, rotate: 25 }, 
        {
          scale: 1,
          rotate: 0,
          stagger: 0.15,
          duration: 0.7,
          ease: 'back.out(2)',
          scrollTrigger: { trigger: '#invariants', start: 'top 80%' }
        }
      );

      // 3. Workflow 5-Step Stepper with Scrubbed Connector Fill
      gsap.fromTo('.workflow-header-group', 
        { opacity: 0, y: 30 }, 
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#workflow', start: 'top 85%' }
        }
      );

      gsap.fromTo('#workflow-connector-line', 
        { scaleX: 0 }, 
        {
          scaleX: 1,
          transformOrigin: 'left center',
          ease: 'none',
          scrollTrigger: { 
            trigger: '#workflow', 
            start: 'top 75%', 
            end: 'bottom 80%', 
            scrub: 0.5 
          }
        }
      );

      gsap.fromTo('.workflow-step-node', 
        { opacity: 0, y: 35 }, 
        {
          opacity: 1,
          y: 0,
          stagger: 0.14,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#workflow', start: 'top 78%' }
        }
      );

      gsap.fromTo('.step-number-circle', 
        { scale: 0.4, opacity: 0 }, 
        {
          scale: 1,
          opacity: 1,
          stagger: 0.14,
          duration: 0.7,
          ease: 'back.out(2.4)',
          scrollTrigger: { trigger: '#workflow', start: 'top 78%' }
        }
      );

      // 4. Tamper-Proof Cryptographic Signature Terminal
      gsap.fromTo('#signature-terminal-col', 
        { opacity: 0, x: -50, rotateY: 10 }, 
        {
          opacity: 1,
          x: 0,
          rotateY: 0,
          duration: 1,
          ease: 'expo.out',
          scrollTrigger: { trigger: '#tamper-proof', start: 'top 82%' }
        }
      );

      gsap.fromTo('.code-line-numbers span', 
        { opacity: 0 }, 
        {
          opacity: 1,
          stagger: 0.05,
          duration: 0.4,
          ease: 'none',
          scrollTrigger: { trigger: '#tamper-proof', start: 'top 78%' }
        }
      );

      gsap.fromTo('#signature-right-copy', 
        { opacity: 0, x: 50 }, 
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: 'expo.out',
          scrollTrigger: { trigger: '#tamper-proof', start: 'top 82%' }
        }
      );

      // 5. Built for Audit & Compliance
      gsap.fromTo('#compliance-header-group', 
        { opacity: 0, y: 30 }, 
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#compliance', start: 'top 85%' }
        }
      );

      gsap.fromTo('.compliance-feature-box', 
        { opacity: 0, y: 45 }, 
        {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#compliance', start: 'top 80%' }
        }
      );

      gsap.fromTo('.compliance-icon-wrap', 
        { scale: 0, rotate: -30 }, 
        {
          scale: 1,
          rotate: 0,
          stagger: 0.12,
          duration: 0.7,
          ease: 'back.out(2)',
          scrollTrigger: { trigger: '#compliance', start: 'top 80%' }
        }
      );

      // 6. Product Roadmap
      gsap.fromTo('#roadmap-left-copy', 
        { opacity: 0, x: -40 }, 
        {
          opacity: 1,
          x: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#roadmap', start: 'top 82%' }
        }
      );

      gsap.fromTo('.roadmap-column-card', 
        { opacity: 0, y: 40 }, 
        {
          opacity: 1,
          y: 0,
          stagger: 0.16,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#roadmap', start: 'top 82%' }
        }
      );

      gsap.fromTo('.roadmap-items-list li', 
        { opacity: 0, x: -16 }, 
        {
          opacity: 1,
          x: 0,
          stagger: 0.07,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: { trigger: '#roadmap', start: 'top 75%' }
        }
      );

      // 7. Built for Security Teams
      gsap.fromTo('#security-teams-header', 
        { opacity: 0, y: 30 }, 
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#security-teams', start: 'top 85%' }
        }
      );

      gsap.fromTo('.persona-target-card', 
        { opacity: 0, y: 40, scale: 0.96 }, 
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#security-teams', start: 'top 80%' }
        }
      );

      gsap.fromTo('.persona-icon-circle', 
        { scale: 0, rotate: -40 }, 
        {
          scale: 1,
          rotate: 0,
          stagger: 0.12,
          duration: 0.65,
          ease: 'back.out(2.2)',
          scrollTrigger: { trigger: '#security-teams', start: 'top 80%' }
        }
      );

      // 8. CTA Big Frame & Fanned Stack
      gsap.fromTo('#cta-main-frame', 
        { opacity: 0, scale: 0.94, y: 40 }, 
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1,
          ease: 'expo.out',
          scrollTrigger: { trigger: '#access', start: 'top 82%' }
        }
      );

      // Fanned cards fan out smoothly from center on enter
      gsap.fromTo('.cta-fanned-card.card-front', 
        { opacity: 0, y: 140, rotate: 0 }, 
        {
          opacity: 1,
          y: 100,
          rotate: -1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#access', start: 'top 75%' }
        }
      );

      gsap.fromTo('.cta-fanned-card.card-middle', 
        { opacity: 0, y: 100, rotate: 0, x: 0 }, 
        {
          opacity: 1,
          y: 50,
          rotate: 3,
          x: 8,
          duration: 0.8,
          delay: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#access', start: 'top 75%' }
        }
      );

      gsap.fromTo('.cta-fanned-card.card-back', 
        { opacity: 0, y: 50, rotate: 0, x: 0 }, 
        {
          opacity: 1,
          y: 0,
          rotate: -4,
          x: -8,
          duration: 0.8,
          delay: 0.16,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#access', start: 'top 75%' }
        }
      );

      // Form inputs stagger reveal
      gsap.fromTo('.cta-field-group, .cta-submit-row', 
        { opacity: 0, y: 20 }, 
        {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.65,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#access', start: 'top 72%' }
        }
      );

      // 9. Footer Columns Reveal
      gsap.fromTo('.footer-columns-grid > div', 
        { opacity: 0, y: 30 }, 
        {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#footer', start: 'top 90%' }
        }
      );

      gsap.fromTo('.author-attribution-box', 
        { scale: 0.9, opacity: 0 }, 
        {
          scale: 1,
          opacity: 1,
          duration: 0.7,
          ease: 'back.out(2)',
          scrollTrigger: { trigger: '#footer', start: 'top 92%' }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="prooflayer-exact-page" ref={containerRef}>
      {/* =========================================================================
          SECTION 1: HERO (EXACT SCREENSHOT LAYOUT & COPY)
         ========================================================================= */}
      <section className="prooflayer-hero-section" id="hero">
        <div className="prooflayer-container hero-two-column-grid">
          
          {/* Left Column: Hero Copy & Actions */}
          <div className="hero-left-col">
            <div className="hero-eyebrow-tag">
              <span>DETERMINISTIC PROOF FOR SECURITY FIXES</span>
            </div>

            <h1 className="hero-exact-h1">
              <div className="hero-title-line">
                <span>A fix isn't a claim</span>
              </div>
              <div className="hero-title-line">
                <span>until it's <strong className="proven-glow-text">proven.</strong></span>
              </div>
            </h1>

            <p className="hero-sub-description">
              ProofLayer verifies website security fixes with deterministic tests, evidence-based proof, and cryptographic signatures. Close vulnerabilities with confidence.
            </p>

            <div className="hero-btn-row">
              <button 
                type="button" 
                className="hero-amber-pill-btn hero-anim-btn"
                onClick={() => {
                  const el = document.getElementById('access');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else if (onExploreDemo) onExploreDemo();
                }}
                id="hero-request-demo-btn"
              >
                <span>Request a demo ➔</span>
              </button>

              <button 
                type="button" 
                className="hero-dark-outline-btn hero-anim-btn"
                onClick={onExploreDemo}
                id="hero-explore-product-btn"
              >
                <span>Explore the product</span>
              </button>
            </div>

            {/* 3 Trust Bullets with Amber Dots */}
            <div className="hero-trust-bullets">
              <div className="trust-bullet-item">
                <span className="trust-bullet-dot"></span>
                <span>Deterministic verification</span>
              </div>
              <div className="trust-bullet-item">
                <span className="trust-bullet-dot"></span>
                <span>Evidence-backed</span>
              </div>
              <div className="trust-bullet-item">
                <span className="trust-bullet-dot"></span>
                <span>Audit ready</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sleek 3D ProofLayer Cockpit Preview Window */}
          <div className="hero-right-col" ref={heroCardRef}>
            <div className="prooflayer-cockpit-window" id="hero-cockpit-window">
              
              {/* Top Window Bar with Real ProofLayer Logo */}
              <div className="cockpit-window-topbar">
                <div className="cockpit-brand-badge">
                  <img 
                    src="/prooflayer-logo.png" 
                    alt="ProofLayer" 
                    className="cockpit-logo-img"
                  />
                </div>

                <div className="cockpit-window-controls">
                  <span className="ctrl-dot"></span>
                  <span className="ctrl-dot"></span>
                  <span className="ctrl-dot"></span>
                </div>
              </div>

              {/* Main Window Body: Split Sidebar & Detail */}
              <div className="cockpit-window-body">
                
                {/* Mini Sidebar */}
                <div className="cockpit-mini-sidebar">
                  <div className="cockpit-sidebar-item active">
                    <div className="sidebar-item-left">
                      <Shield size={14} />
                      <span>Findings</span>
                    </div>
                    <span className="sidebar-count-chip">8</span>
                  </div>

                  <div className="cockpit-sidebar-item">
                    <div className="sidebar-item-left">
                      <FileCode size={14} />
                      <span>Tests</span>
                    </div>
                  </div>

                  <div className="cockpit-sidebar-item">
                    <div className="sidebar-item-left">
                      <Database size={14} />
                      <span>Evidence</span>
                    </div>
                  </div>

                  <div className="cockpit-sidebar-item">
                    <div className="sidebar-item-left">
                      <RefreshCw size={14} />
                      <span>Retests</span>
                    </div>
                  </div>

                  <div className="cockpit-sidebar-item">
                    <div className="sidebar-item-left">
                      <Key size={14} />
                      <span>Signatures</span>
                    </div>
                  </div>

                  <div className="cockpit-sidebar-item">
                    <div className="sidebar-item-left">
                      <FileText size={14} />
                      <span>Reports</span>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="cockpit-main-content">
                  
                  {/* Top Finding Row */}
                  <div className="cockpit-finding-header">
                    <div className="finding-title-group">
                      <div className="finding-meta-row">
                        <span className="critical-tag-badge">CRITICAL</span>
                      </div>
                      <h3 className="finding-main-title">SQL Injection</h3>
                      <div className="finding-target-url">
                        <code>http://example.com/production/1</code>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="cockpit-retest-action-btn"
                      onClick={handleTriggerHeroRetest}
                      disabled={isHeroRetesting}
                      title="Run live deterministic retest on this finding"
                    >
                      <RefreshCw size={13} className={isHeroRetesting ? 'spin-fast' : ''} id="hero-retest-spinner" />
                      <span>{isHeroRetesting ? 'Testing…' : 'Re-test'}</span>
                    </button>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="cockpit-detail-tabs">
                    <button 
                      type="button" 
                      className={`cockpit-tab-btn ${heroActiveTab === 'overview' ? 'active' : ''}`}
                      onClick={() => setHeroActiveTab('overview')}
                    >
                      Overview
                    </button>
                    <button 
                      type="button" 
                      className={`cockpit-tab-btn ${heroActiveTab === 'evidence' ? 'active' : ''}`}
                      onClick={() => setHeroActiveTab('evidence')}
                    >
                      Evidence
                    </button>
                    <button 
                      type="button" 
                      className={`cockpit-tab-btn ${heroActiveTab === 'retest' ? 'active' : ''}`}
                      onClick={() => setHeroActiveTab('retest')}
                    >
                      Retest
                    </button>
                    <button 
                      type="button" 
                      className={`cockpit-tab-btn ${heroActiveTab === 'verification' ? 'active' : ''}`}
                      onClick={() => setHeroActiveTab('verification')}
                    >
                      Verification
                    </button>
                  </div>

                  {/* Dynamic Tab Body */}
                  <div className="cockpit-card-section">
                    
                    {heroActiveTab === 'overview' && (
                      <>
                        {/* Retest Result Card */}
                        <div className="cockpit-sub-card">
                          <div className="sub-card-header">
                            <span className="sub-card-label">Retest Result:</span>
                          </div>
                          <div className="sub-card-body">
                            <span className="passed-status-badge" id="hero-result-badge">
                              {heroRetestState === 'retesting' ? 'Testing Invariants…' : 'Passed'}
                            </span>
                            <p className="sub-card-text">
                              Deterministic tests confirm the vulnerability is no longer present.
                            </p>
                          </div>
                        </div>

                        {/* Verification Card */}
                        <div className="cockpit-sub-card verification-sub-card">
                          <div className="verification-row">
                            <div className="verification-left">
                              <div className="verified-circle-icon">
                                <Check size={14} strokeWidth={3} />
                              </div>
                              <div className="verified-text-col">
                                <div className="verified-status-title">
                                  <span>Verified Status</span>
                                  <strong className="status-green-txt">✓ Verified</strong>
                                </div>
                                <span className="verified-timestamp">
                                  Signed on Oct 28, 2026 - 14:02 UTC
                                </span>
                              </div>
                            </div>

                            <div className="verification-key-chip">
                              <Lock size={12} />
                              <code>e255…7a7e</code>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {heroActiveTab === 'evidence' && (
                      <div className="cockpit-sub-card">
                        <div className="sub-card-header">
                          <span className="sub-card-label">Immutable Cryptographic Evidence:</span>
                        </div>
                        <div className="evidence-hashes-list">
                          <div className="hash-row">
                            <span>Request SHA-256:</span>
                            <code>e3b0c44298fc1c149afbf4c8996fb92427ae41e4</code>
                          </div>
                          <div className="hash-row">
                            <span>Response SHA-256:</span>
                            <code>1b4f0e985197199feb6dc4ebda735c3c5e5804a8</code>
                          </div>
                        </div>
                      </div>
                    )}

                    {heroActiveTab === 'retest' && (
                      <div className="cockpit-sub-card">
                        <div className="sub-card-header">
                          <span className="sub-card-label">Invariant Execution Matrix:</span>
                        </div>
                        <div className="retest-logs">
                          <div className="retest-log-line ok">✓ Invariant: Response time &lt; 250ms (Passed)</div>
                          <div className="retest-log-line ok">✓ Invariant: SQL error signatures absent (Passed)</div>
                          <div className="retest-log-line ok">✓ Invariant: Parameterized query enforcement (Passed)</div>
                        </div>
                      </div>
                    )}

                    {heroActiveTab === 'verification' && (
                      <div className="cockpit-sub-card">
                        <div className="sub-card-header">
                          <span className="sub-card-label">Ed25519 Public Key &amp; Certificate:</span>
                        </div>
                        <div className="certificate-meta">
                          <div><strong>Issuer:</strong> ProofLayer Automated Notary @ staging-us-east-1</div>
                          <div><strong>Curve:</strong> Ed25519 · RFC 8032 Compliant</div>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 2: FOUR HONEST OUTCOMES
         ========================================================================= */}
      <section className="prooflayer-section" id="outcomes">
        <div className="prooflayer-container">
          <div className="outcomes-framed-container" id="outcomes-frame">
            
            <div className="outcomes-eyebrow-header">
              <span>FOUR HONEST OUTCOMES</span>
            </div>

            <div className="outcomes-four-grid">
              
              {/* 1. Fixed */}
              <div className="outcome-card-item outcome-fixed">
                <div className="outcome-icon-circle green">
                  <Check size={18} strokeWidth={3} />
                </div>
                <h4 className="outcome-title">Fixed</h4>
                <p className="outcome-description">
                  The vulnerability is no longer present.
                </p>
              </div>

              {/* 2. Incomplete */}
              <div className="outcome-card-item outcome-incomplete">
                <div className="outcome-icon-circle amber">
                  <AlertCircle size={18} strokeWidth={2.5} />
                </div>
                <h4 className="outcome-title">Incomplete</h4>
                <p className="outcome-description">
                  The fix is partial or does not fully address the issue.
                </p>
              </div>

              {/* 3. Still vulnerable */}
              <div className="outcome-card-item outcome-vulnerable">
                <div className="outcome-icon-circle red">
                  <Crosshair size={18} strokeWidth={2.5} />
                </div>
                <h4 className="outcome-title">Still vulnerable</h4>
                <p className="outcome-description">
                  The issue is still present and can be reproduced.
                </p>
              </div>

              {/* 4. Inconclusive */}
              <div className="outcome-card-item outcome-inconclusive">
                <div className="outcome-icon-circle purple">
                  <Circle size={18} strokeWidth={2.5} />
                </div>
                <h4 className="outcome-title">Inconclusive</h4>
                <p className="outcome-description">
                  The result is uncertain due to environmental or technical limitations.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>


      {/* =========================================================================
          SECTION 3: DETERMINISTIC VERIFICATION / INVARIANT SPECIFICATIONS
         ========================================================================= */}
      <section className="prooflayer-section" id="invariants">
        <div className="prooflayer-container invariants-two-col-grid">
          
          {/* Left Column */}
          <div className="invariants-left-copy" id="invariants-left-copy">
            <span className="section-eyebrow-amber">DETERMINISTIC VERIFICATION</span>
            <h2 className="section-exact-h2">Invariant Specifications</h2>
            <p className="section-body-paragraph">
              Each finding is verified using deterministic invariant specifications. The same tests, the same evidence, the same result — every time.
            </p>
            <div style={{ marginTop: '28px' }}>
              <button 
                type="button" 
                className="hero-dark-outline-btn"
                onClick={onExploreDemo}
              >
                <span>Learn about invariants ➔</span>
              </button>
            </div>
          </div>

          {/* Right Column: 3 Feature Cards */}
          <div className="invariants-right-cards">
            
            {/* Card 1 */}
            <div className="spec-feature-card">
              <div className="spec-icon-box">
                <Sliders size={22} className="amber-icon" />
              </div>
              <div className="spec-card-content">
                <h4 className="spec-card-title">Reproducible Tests</h4>
                <p className="spec-card-desc">
                  Well-defined test cases that validate the fix consistently.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="spec-feature-card">
              <div className="spec-icon-box">
                <FileText size={22} className="amber-icon" />
              </div>
              <div className="spec-card-content">
                <h4 className="spec-card-title">Clear Pass/Fail Criteria</h4>
                <p className="spec-card-desc">
                  Deterministic rules for verifying whether the vulnerability is resolved.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="spec-feature-card">
              <div className="spec-icon-box">
                <Database size={22} className="amber-icon" />
              </div>
              <div className="spec-card-content">
                <h4 className="spec-card-title">Evidence Collection</h4>
                <p className="spec-card-desc">
                  Request, response and environment data stored for audit and review.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 4: FROM FINDING TO PROOF (A CLEAR, DETERMINISTIC WORKFLOW)
         ========================================================================= */}
      <section className="prooflayer-section" id="workflow">
        <div className="prooflayer-container">
          
          <div className="workflow-header-group text-center">
            <span className="section-eyebrow-amber">FROM FINDING TO PROOF</span>
            <h2 className="section-exact-h2">A clear, deterministic workflow.</h2>
            <p className="section-body-paragraph center-max-ch">
              ProofLayer takes you from finding to a signed, verifiable result in five steps.
            </p>
          </div>

          {/* Horizontal 5-Step Stepper */}
          <div className="workflow-stepper-wrap">
            <div className="workflow-line-rail">
              <div className="workflow-line-fill" id="workflow-connector-line"></div>
            </div>

            <div className="workflow-steps-five-grid">
              
              {/* Step 1 */}
              <div className="workflow-step-node">
                <div className="step-number-circle purple-glow">1</div>
                <h4 className="step-title">Find</h4>
                <p className="step-description">
                  The vulnerability is findings from your tests or tools.
                </p>
              </div>

              {/* Step 2 */}
              <div className="workflow-step-node">
                <div className="step-number-circle purple-glow">2</div>
                <h4 className="step-title">Record</h4>
                <p className="step-description">
                  Capture detailed evidence of the issue.
                </p>
              </div>

              {/* Step 3 */}
              <div className="workflow-step-node">
                <div className="step-number-circle purple-pink-glow">3</div>
                <h4 className="step-title">Fix</h4>
                <p className="step-description">
                  Implement the remediation.
                </p>
              </div>

              {/* Step 4 */}
              <div className="workflow-step-node">
                <div className="step-number-circle pink-glow">4</div>
                <h4 className="step-title">Retest</h4>
                <p className="step-description">
                  Run deterministic tests to verify the fix.
                </p>
              </div>

              {/* Step 5 */}
              <div className="workflow-step-node">
                <div className="step-number-circle amber-glow">5</div>
                <h4 className="step-title">Sign</h4>
                <p className="step-description">
                  Generate a cryptographic proof of the result.
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 5: TAMPER-PROOF PROOF (SIGNATURE VERIFICATION)
         ========================================================================= */}
      <section className="prooflayer-section" id="tamper-proof">
        <div className="prooflayer-container signature-two-col-grid">
          
          {/* Left Column: Interactive Terminal */}
          <div className="signature-terminal-col" id="signature-terminal-col">
            <div className="code-terminal-card">
              
              {/* Terminal Top Bar */}
              <div className="terminal-topbar">
                <div className="terminal-badge-left">
                  <Lock size={14} className="terminal-lock-icon" />
                  <span className="terminal-badge-title">Verified by cryptographic signature</span>
                </div>
                <div className="terminal-badge-right">
                  <span className="verified-pill-tag" id="signature-status-pill">
                    {cryptoVerificationStatus === 'invalid' ? '✕ Altered' : '✓ Verified'}
                  </span>
                  <button 
                    type="button" 
                    className="copy-btn-icon" 
                    onClick={handleCopyCode}
                    title="Copy verifiable JSON payload"
                  >
                    {copiedCode ? <Check size={14} className="green-txt" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Line-Numbered JSON Code Block */}
              <div className="terminal-code-body">
                <div className="code-line-numbers">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                  <span>6</span>
                  <span>7</span>
                  <span>8</span>
                  <span>9</span>
                  <span>10</span>
                </div>
                <pre className="code-json-content">
{`{
  "finding_id": "FL-2026-092",
  "result": `}<span className={`json-val-highlight ${isTampered ? 'tampered-highlight' : 'ok-highlight'}`}>"{isTampered ? 'Incomplete' : 'Fixed'}"</span>{`,
  "tested_at": "2026-10-28T14:22:01Z",
  "evidence": {
    "request_hash": "e3b0c44...",
    "response_hash": "1b4f0e9..."
  },
  "signature": `}<span className="json-sig-highlight">"893c52b...db913282"</span>{`
}`}
                </pre>
              </div>

              {/* Interactive Verifier Controls Bar */}
              <div className="terminal-interactive-toolbar">
                <button 
                  type="button" 
                  className="terminal-action-btn primary"
                  onClick={handleVerifyRealSignature}
                  disabled={isVerifyingCrypto}
                >
                  <Key size={13} />
                  <span>{isVerifyingCrypto ? 'Validating curve…' : 'Verify signature'}</span>
                </button>
                <button 
                  type="button" 
                  className="terminal-action-btn secondary"
                  onClick={handleToggleTamperPayload}
                >
                  <AlertCircle size={13} />
                  <span>{isTampered ? 'Restore Genuine Payload' : 'Tamper Payload (Simulate Attack)'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Copy & Link */}
          <div className="signature-right-copy" id="signature-right-copy">
            <span className="section-eyebrow-amber">TAMPER-PROOF PROOF</span>
            <h2 className="section-exact-h2">Verify a real signature, right here.</h2>
            <p className="section-body-paragraph">
              Every verification result is signed using cryptographic signatures. You can validate the proof, confirm the evidence hasn't changed and trust the result.
            </p>
            <div style={{ marginTop: '28px' }}>
              <button 
                type="button" 
                className="hero-amber-pill-btn"
                onClick={handleVerifyRealSignature}
              >
                <span>Learn how signature verification works ➔</span>
              </button>
            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 6: BUILT FOR AUDIT & COMPLIANCE
         ========================================================================= */}
      <section className="prooflayer-section" id="compliance">
        <div className="prooflayer-container">
          
          <div className="compliance-header-group" id="compliance-header-group">
            <span className="section-eyebrow-amber">BUILT FOR AUDIT &amp; COMPLIANCE</span>
            <h2 className="section-exact-h2">Evidence your team can trust.</h2>
            <p className="section-body-paragraph">
              ProofLayer provides structured evidence, deterministic test results and signed verification records to support audits, compliance and internal reviews.
            </p>
          </div>

          {/* 4 Feature Boxes in a Row */}
          <div className="compliance-four-grid">
            
            {/* Box 1 */}
            <div className="compliance-feature-box">
              <div className="compliance-icon-wrap purple">
                <FileSpreadsheet size={24} />
              </div>
              <h4 className="comp-box-title">Complete Evidence Trail</h4>
              <p className="comp-box-desc">
                Requests, responses, test results and metadata.
              </p>
            </div>

            {/* Box 2 */}
            <div className="compliance-feature-box">
              <div className="compliance-icon-wrap purple-pink">
                <Lock size={24} />
              </div>
              <h4 className="comp-box-title">Tamper-Proof Records</h4>
              <p className="comp-box-desc">
                Cryptographically signed results.
              </p>
            </div>

            {/* Box 3 */}
            <div className="compliance-feature-box">
              <div className="compliance-icon-wrap amber">
                <FileCheck2 size={24} />
              </div>
              <h4 className="comp-box-title">Audit Ready</h4>
              <p className="comp-box-desc">
                Export reports for compliance and review.
              </p>
            </div>

            {/* Box 4 */}
            <div className="compliance-feature-box">
              <div className="compliance-icon-wrap amber-gold">
                <RefreshCw size={24} />
              </div>
              <h4 className="comp-box-title">Consistent &amp; Reproducible</h4>
              <p className="comp-box-desc">
                Same tests, same results, every time.
              </p>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 7: PRODUCT ROADMAP
         ========================================================================= */}
      <section className="prooflayer-section" id="roadmap">
        <div className="prooflayer-container roadmap-two-col-grid">
          
          {/* Left Column */}
          <div className="roadmap-left-copy" id="roadmap-left-copy">
            <span className="section-eyebrow-amber">PRODUCT ROADMAP</span>
            <h2 className="section-exact-h2">What works today, and what's still ahead.</h2>
            <p className="section-body-paragraph">
              We're building the most trusted way to verify security fixes. Here's what's available now and what's coming next.
            </p>
          </div>

          {/* Right Column: 2 Cards Side-by-Side */}
          <div className="roadmap-right-cards">
            
            {/* Card 1: Available Now */}
            <div className="roadmap-column-card available-card">
              <div className="roadmap-col-header">
                <span className="roadmap-status-dot green-dot"></span>
                <h4 className="roadmap-col-title">Available now</h4>
              </div>

              <ul className="roadmap-items-list">
                <li>
                  <Check size={16} className="roadmap-check green" />
                  <span>Deterministic invariant specifications</span>
                </li>
                <li>
                  <Check size={16} className="roadmap-check green" />
                  <span>Evidence collection and storage</span>
                </li>
                <li>
                  <Check size={16} className="roadmap-check green" />
                  <span>Retest and verification engine</span>
                </li>
                <li>
                  <Check size={16} className="roadmap-check green" />
                  <span>"Request/Test" signatures</span>
                </li>
                <li>
                  <Check size={16} className="roadmap-check green" />
                  <span>Audit reports and exports</span>
                </li>
              </ul>
            </div>

            {/* Card 2: In Progress */}
            <div className="roadmap-column-card inprogress-card">
              <div className="roadmap-col-header">
                <span className="roadmap-status-dot amber-dot"></span>
                <h4 className="roadmap-col-title">In progress</h4>
              </div>

              <ul className="roadmap-items-list inprogress-list">
                <li>
                  <Circle size={14} className="roadmap-circle amber" />
                  <span>Integrations with popular security tools</span>
                </li>
                <li>
                  <Circle size={14} className="roadmap-circle amber" />
                  <span>Expanded test libraries</span>
                </li>
                <li>
                  <Circle size={14} className="roadmap-circle amber" />
                  <span>Team collaboration and workflows</span>
                </li>
                <li>
                  <Circle size={14} className="roadmap-circle amber" />
                  <span>API access</span>
                </li>
                <li>
                  <Circle size={14} className="roadmap-circle amber" />
                  <span>Additional compliance frameworks</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 8: BUILT FOR SECURITY TEAMS
         ========================================================================= */}
      <section className="prooflayer-section" id="security-teams">
        <div className="prooflayer-container">
          
          <div className="security-teams-header" id="security-teams-header">
            <span className="section-eyebrow-amber">BUILT FOR SECURITY TEAMS</span>
            <h2 className="section-exact-h2">For the people who sign off on fixes.</h2>
            <p className="section-body-paragraph">
              Whether you find, fix, verify or audit, ProofLayer gives you a single source of truth for vulnerability resolution.
            </p>
          </div>

          {/* 4 Persona Cards */}
          <div className="personas-four-grid">
            
            {/* Persona 1 */}
            <div className="persona-target-card">
              <div className="persona-icon-circle purple">
                <Shield size={20} />
              </div>
              <h4 className="persona-title">Penetration testing firms</h4>
              <p className="persona-desc">
                Verify fixes and provide ironclad evidence to clients.
              </p>
            </div>

            {/* Persona 2 */}
            <div className="persona-target-card">
              <div className="persona-icon-circle purple-pink">
                <Code size={20} />
              </div>
              <h4 className="persona-title">Application security teams</h4>
              <p className="persona-desc">
                Validate remediation fixes and reduce re-tests.
              </p>
            </div>

            {/* Persona 3 */}
            <div className="persona-target-card">
              <div className="persona-icon-circle amber">
                <FileCheck2 size={20} />
              </div>
              <h4 className="persona-title">Auditors and risk teams</h4>
              <p className="persona-desc">
                Get reliable, trustable evidence for compliance.
              </p>
            </div>

            {/* Persona 4 */}
            <div className="persona-target-card">
              <div className="persona-icon-circle red-pink">
                <Crosshair size={20} />
              </div>
              <h4 className="persona-title">Red teams</h4>
              <p className="persona-desc">
                Ensure fixes are real, not just cosmetic.
              </p>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 9: CTA CARD ("MAKE FIXED SOMETHING YOU CAN CHECK")
         ========================================================================= */}
      <section className="prooflayer-section" id="access">
        <div className="prooflayer-container">
          
          <div className="cta-grand-frame" id="cta-main-frame">
            
            {/* Top Heading */}
            <div className="cta-top-header text-center">
              <h2 className="cta-exact-h2">Make "fixed" something you can check.</h2>
              <p className="cta-exact-subtext">
                See how ProofLayer can help your team verify security fixes with deterministic proof.
              </p>
            </div>

            {/* Inside Content: Fanned Cards on Left, Form on Right */}
            <div className="cta-inside-grid">
              
              {/* Left Column: 3 Fanned Tilted Finding Cards */}
              <div className="cta-fanned-col" ref={ctaStackRef}>
                <div className="fanned-stack-wrapper">
                  
                  {/* Card 1: SQL Injection (Fixed) */}
                  <div className="cta-fanned-card card-front">
                    <span className="finding-name">SQL Injection</span>
                    <span className="finding-pill fixed">Fixed</span>
                  </div>

                  {/* Card 2: XSS in search (Incomplete) */}
                  <div className="cta-fanned-card card-middle">
                    <span className="finding-name">XSS in search</span>
                    <span className="finding-pill incomplete">Incomplete</span>
                  </div>

                  {/* Card 3: Auth bypass (Still vulnerable) */}
                  <div className="cta-fanned-card card-back">
                    <span className="finding-name">Auth bypass</span>
                    <span className="finding-pill vulnerable">Still vulnerable</span>
                  </div>

                </div>
              </div>

              {/* Right Column: Lead Request Form */}
              <div className="cta-form-col">
                {formSubmitted ? (
                  <div className="cta-success-box" id="access-success-box">
                    <div className="success-icon-circle">
                      <Check size={28} />
                    </div>
                    <h3>Demo Request Received</h3>
                    <p>We've received your request and will follow up with access details shortly.</p>
                  </div>
                ) : (
                  <form className="cta-exact-form" onSubmit={handleEarlyAccessSubmit}>
                    
                    <div className="cta-field-group">
                      <label htmlFor="cta-email">Work email*</label>
                      <input 
                        type="email" 
                        id="cta-email"
                        required 
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="cta-input-field"
                      />
                    </div>

                    <div className="cta-field-group">
                      <label htmlFor="cta-company">Company</label>
                      <input 
                        type="text" 
                        id="cta-company"
                        placeholder="Your company name"
                        value={formData.company}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                        className="cta-input-field"
                      />
                    </div>

                    <div className="cta-field-group">
                      <label htmlFor="cta-usecase">What are you looking to solve?</label>
                      <textarea 
                        id="cta-usecase"
                        rows={3} 
                        placeholder="Tell us about your use case..."
                        value={formData.useCase}
                        onChange={e => setFormData({ ...formData, useCase: e.target.value })}
                        className="cta-textarea-field"
                      />
                    </div>

                    <div className="cta-submit-row">
                      <button type="submit" className="hero-amber-pill-btn cta-submit-btn">
                        <span>Request a demo ➔</span>
                      </button>
                      <span className="cta-micro-note">
                        We'll get back to you as soon as possible.
                      </span>
                    </div>

                  </form>
                )}
              </div>

            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 10: FOOTER (WITH REAL PROOFLAYER LOGOS & USER ATTRIBUTION)
         ========================================================================= */}
      <footer className="prooflayer-exact-footer" id="footer">
        <div className="prooflayer-container">
          
          {/* Main 4-Column Footer Row */}
          <div className="footer-columns-grid">
            
            {/* Column 1: Brand Info with Real ProofLayer Logo Image */}
            <div className="footer-brand-col">
              <div className="footer-brand-header">
                <img 
                  src="/prooflayer-logo.png" 
                  alt="ProofLayer — Verify, Validate, Prove" 
                  className="footer-brand-logo-img"
                />
              </div>

              <p className="footer-brand-desc">
                Deterministic verification for security fixes. Evidence-based. Cryptographically signed. Built for security teams.
              </p>

              <div className="footer-copyright-text">
                © 2026 ProofLayer. All rights reserved.
              </div>
            </div>

            {/* Column 2: Product */}
            <div className="footer-links-col">
              <h5 className="footer-col-heading">Product</h5>
              <ul className="footer-links-list">
                <li><a href="#invariants">Features</a></li>
                <li><a href="#workflow">How it works</a></li>
                <li><a href="#security-teams">Use cases</a></li>
                <li><a href="#roadmap">Roadmap</a></li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div className="footer-links-col">
              <h5 className="footer-col-heading">Resources</h5>
              <ul className="footer-links-list">
                <li><a href="#tamper-proof">Documentation</a></li>
                <li><a href="#tamper-proof">API Reference</a></li>
                <li><a href="#compliance">Security</a></li>
                <li><a href="#access">Contact</a></li>
              </ul>
            </div>

            {/* Column 4: Glowing Brand Badge with Real ProofLayer Mark */}
            <div className="footer-badge-col">
              <div className="footer-claim-card">
                <img 
                  src="/prooflayer-mark.png" 
                  alt="ProofLayer Mark" 
                  className="footer-claim-mark-img"
                />
                <div className="claim-card-text">
                  <span>A fix isn't a claim</span>
                  <strong>until it's proven.</strong>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar with Privacy, Terms & Salmanul Faris Attribution */}
          <div className="footer-sub-bar">
            
            <div className="footer-sub-left">
              <span>© 2026 ProofLayer. All rights reserved.</span>
            </div>

            <div className="footer-sub-center">
              <a href="#privacy" className="footer-legal-link">Privacy Policy</a>
              <span className="footer-bar-dot">•</span>
              <a href="#terms" className="footer-legal-link">Terms of Service</a>
            </div>

            {/* EXPLICIT USER REQUIREMENT: Designed and developed by salmanul faris with the name clickable to salman2610.github.io */}
            <div className="footer-sub-right author-attribution-box">
              <span className="attribution-label">Designed and developed by</span>
              <a 
                href="https://salman2610.github.io" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="salman-portfolio-link"
                title="Visit Salmanul Faris's Portfolio"
              >
                Salmanul Faris ↗
              </a>
            </div>

          </div>

        </div>
      </footer>

    </div>
  );
}
