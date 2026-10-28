import React, { useState } from 'react';
import { 
  ShieldCheck, 
  PlusCircle, 
  Server, 
  History, 
  RotateCcw,
  Building2,
  Users,
  LogOut,
  ChevronDown,
  Terminal,
  FileText,
  Lock,
  LogIn,
  UserCheck,
  GitPullRequest,
  ExternalLink
} from 'lucide-react';

export default function Navbar({ 
  viewMode, // 'public' | 'app'
  setViewMode,
  activePublicTab, // 'home' | 'demo' | 'trust' | 'docs'
  setActivePublicTab,
  activeAppTab, // 'cockpit' | 'studio' | 'sandbox'
  setActiveAppTab,
  findings = [], 
  currentUser,
  currentOrg,
  onExploreDemo,
  onOpenImport, 
  onOpenAuditTrail, 
  onOpenTeamSettings,
  onOpenAuthModal,
  onOpenPersonaSwitcher,
  onLogout,
  selectedEnv,
  setSelectedEnv
}) {
  const GitHubIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="gh-icon">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
    </svg>
  );

  if (viewMode === 'public') {
    return (
      <header className="liquid-glass-nav public-nav">
        <div className="liquid-nav-container">
          {/* Brand Logo */}
          <div 
            className="clean-logo-link" 
            onClick={() => { setActivePublicTab('home'); }} 
            style={{ cursor: 'pointer' }}
          >
            <img 
              src="/prooflayer-logo.png" 
              alt="ProofLayer — Verify, Validate, Prove" 
              className="navbar-brand-logo"
            />
          </div>

          {/* Mockup matching Navigation */}
          <nav className="liquid-segmented-capsule">
            <button 
              className={`liquid-segment-tab ${activePublicTab === 'home' ? 'active' : ''}`}
              onClick={() => {
                setActivePublicTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <span>Product</span>
            </button>
            <button 
              className="liquid-segment-tab"
              onClick={() => {
                setActivePublicTab('home');
                setTimeout(() => {
                  const el = document.getElementById('workflow');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 60);
              }}
            >
              <span>How it works</span>
            </button>
            <button 
              className="liquid-segment-tab"
              onClick={() => {
                setActivePublicTab('home');
                setTimeout(() => {
                  const el = document.getElementById('security-teams') || document.getElementById('outcomes');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 60);
              }}
            >
              <span>Use cases</span>
            </button>
            <button 
              className={`liquid-segment-tab ${activePublicTab === 'docs' ? 'active' : ''}`}
              onClick={() => setActivePublicTab('docs')}
            >
              <span>Docs</span>
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="liquid-nav-actions">
            {currentUser ? (
              <div className="nav-user-session">
                <button 
                  className="liquid-glass-primary-btn"
                  onClick={() => setViewMode('app')}
                >
                  <Building2 size={15} />
                  <span>Open {currentOrg?.name || 'Workspace'}</span>
                </button>

                <button 
                  className="liquid-glass-btn"
                  onClick={onOpenPersonaSwitcher}
                  title="Switch Role or Persona"
                >
                  <UserCheck size={14} />
                  <span>{currentUser.name.split(' ')[0]} ({currentUser.role.replace('_', ' ')})</span>
                </button>

                <button 
                  className="liquid-glass-btn icon-btn"
                  onClick={onLogout}
                  title="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="nav-guest-actions">
                <a 
                  href="https://github.com/salman2610/ProofLayer" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="liquid-glass-btn github-btn"
                  title="View ProofLayer on GitHub"
                >
                  <GitHubIcon />
                  <span className="hide-on-mobile">GitHub</span>
                </a>

                <button 
                  className="liquid-glass-btn login-btn"
                  onClick={() => onOpenAuthModal('login')}
                  id="nav-login-btn"
                >
                  <LogIn size={14} />
                  <span>Sign in</span>
                </button>

                <button 
                  className="hero-amber-pill-btn nav-demo-pill"
                  onClick={() => {
                    const el = document.getElementById('access');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else if (onExploreDemo) onExploreDemo();
                  }}
                  id="nav-request-demo-btn"
                >
                  <span>Request a demo ➔</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Authenticated Application Top Bar (Spacious Apple Liquid Glass Design)
  return (
    <header className="liquid-glass-nav app-header">
      <div className="liquid-nav-container app-container-fluid">
        {/* Left Zone: Brand + Tenant Identity */}
        <div className="nav-left-group">
          <div 
            className="clean-logo-link" 
            onClick={() => setViewMode('public')} 
            style={{ cursor: 'pointer' }} 
            title="Return to Public Website"
          >
            <img 
              src="/prooflayer-logo.png" 
              alt="ProofLayer" 
              className="navbar-brand-logo"
            />
          </div>

          <div 
            className="liquid-org-badge" 
            onClick={onOpenTeamSettings} 
            title="Organization & Tenant Settings"
          >
            <Building2 size={14} className="gold" />
            <span className="org-name-text">{currentOrg?.name || 'Acme Corporation'}</span>
            <span className="org-tier-tag">{currentOrg?.tier || 'ENTERPRISE'}</span>
          </div>
        </div>

        {/* Center Zone: Segmented Liquid Glass Navigation Capsule */}
        <nav className="liquid-segmented-capsule app-center-tabs">
          <button 
            className={`liquid-segment-tab ${activeAppTab === 'cockpit' ? 'active' : ''}`}
            onClick={() => setActiveAppTab('cockpit')}
            title="Remediation Cockpit"
          >
            <ShieldCheck size={14} />
            <span className="tab-text-full">Remediation Cockpit</span>
            <span className="tab-text-compact">Cockpit</span>
          </button>

          <button 
            className={`liquid-segment-tab ${activeAppTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveAppTab('studio')}
            title="Proof Studio"
          >
            <RotateCcw size={14} />
            <span className="tab-text-full">Proof Studio</span>
            <span className="tab-text-compact">Studio</span>
          </button>

          <button 
            className={`liquid-segment-tab ${activeAppTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveAppTab('sandbox')}
            title="Sandbox Targets"
          >
            <Server size={14} />
            <span className="tab-text-full">Sandbox Targets</span>
            <span className="tab-text-compact">Sandbox</span>
          </button>
        </nav>

        {/* Right Zone: Controls, Environment, User, GitHub */}
        <div className="nav-right-group">
          {/* GitHub Issues & PRs Button */}
          <a 
            href="https://github.com/salman2610/ProofLayer" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="liquid-glass-btn github-btn"
            title="GitHub Repository: View Code, Open Issues & Pull Requests"
          >
            <GitHubIcon />
            <span className="gh-label">Issues & PRs</span>
          </a>

          {/* Environment Selector Dropdown */}
          <select 
            value={selectedEnv} 
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="liquid-glass-select"
            title="Active Testing Target Environment"
          >
            <option value="staging">Staging (Safe)</option>
            <option value="preprod">Pre-Production</option>
            <option value="production">Production (Guarded)</option>
          </select>

          {/* User Persona Chip */}
          <div 
            className="liquid-user-chip" 
            onClick={onOpenPersonaSwitcher}
            title={`Active User: ${currentUser?.name || 'Sarah Chen'} (${(currentUser?.role || 'SECURITY_LEAD').replace('_', ' ')}) — Click to switch persona or role`}
          >
            <div className="user-avatar-circle">
              {currentUser ? currentUser.name.split(' ').map(n => n[0]).join('') : 'SC'}
            </div>
            <span className="user-name">{currentUser ? currentUser.name.split(' ')[0] : 'Sarah'}</span>
            <span className={`role-pill ${(currentUser?.role || 'SECURITY_LEAD').toLowerCase()}`}>
              {(currentUser?.role || 'SECURITY_LEAD').replace('_', ' ')}
            </span>
            <ChevronDown size={12} className="chip-chevron" />
          </div>

          {/* Action Icons */}
          <div className="liquid-icon-group">
            <button 
              className="liquid-glass-btn icon-btn" 
              onClick={onOpenTeamSettings} 
              title="Team Members & RBAC Roles"
            >
              <Users size={15} />
            </button>

            <button 
              className="liquid-glass-btn icon-btn" 
              onClick={onOpenAuditTrail} 
              title="Audit Ledger"
            >
              <History size={15} />
            </button>
          </div>

          {/* Import Finding CTA */}
          <button className="liquid-glass-primary-btn import-btn" onClick={onOpenImport}>
            <PlusCircle size={15} />
            <span>Import</span>
          </button>

          {/* Return to Public Website */}
          <button 
            className="liquid-glass-btn exit-btn" 
            onClick={() => setViewMode('public')} 
            title="Switch to Public Product Website"
          >
            <span>Site</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </header>
  );
}
