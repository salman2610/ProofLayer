import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  PlusCircle, 
  Server, 
  History, 
  CheckCircle2, 
  RotateCcw,
  Building2,
  Users,
  LogOut,
  ExternalLink,
  ChevronDown,
  Terminal,
  FileText,
  Lock,
  Layers
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
  onOpenImport, 
  onOpenAuditTrail,
  onOpenTeamSettings,
  onOpenAuthModal,
  onOpenPersonaSwitcher,
  onLogout,
  selectedEnv,
  setSelectedEnv
}) {
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  const verifiedCount = findings.filter(f => f.status === 'VERIFIED_REMEDIATED' || f.status === 'VERIFIED').length;
  const regressionCount = findings.filter(f => f.status === 'REGRESSION_FOUND' || f.status === 'BYPASS_DETECTED').length;
  const pendingCount = findings.filter(f => f.status === 'PENDING_RETEST' || f.status === 'VULNERABILITY_PERSISTS').length;

  if (viewMode === 'public') {
    return (
      <header className="public-top-nav">
        <div className="nav-container">
          <div className="logo-area" onClick={() => { setActivePublicTab('home'); }} style={{ cursor: 'pointer' }}>
            <div className="logo-icon">
              <ShieldCheck size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="logo-title">ProofLayer</div>
              <div className="logo-subtitle">Remediation Verification Engine</div>
            </div>
          </div>

          <nav className="public-nav-links">
            <button 
              className={`public-nav-btn ${activePublicTab === 'home' ? 'active' : ''}`}
              onClick={() => setActivePublicTab('home')}
            >
              Product
            </button>
            <button 
              className={`public-nav-btn ${activePublicTab === 'demo' ? 'active' : ''}`}
              onClick={() => setActivePublicTab('demo')}
            >
              <Terminal size={14} />
              Interactive Demo
            </button>
            <button 
              className={`public-nav-btn ${activePublicTab === 'trust' ? 'active' : ''}`}
              onClick={() => setActivePublicTab('trust')}
            >
              <Lock size={14} />
              Trust & Security
            </button>
            <button 
              className={`public-nav-btn ${activePublicTab === 'docs' ? 'active' : ''}`}
              onClick={() => setActivePublicTab('docs')}
            >
              <FileText size={14} />
              Docs
            </button>
          </nav>

          <div className="public-nav-actions">
            {currentUser ? (
              <div className="logged-in-user-chip">
                <button 
                  className="btn-primary app-enter-btn"
                  onClick={() => setViewMode('app')}
                >
                  <Building2 size={15} />
                  <span>Open {currentOrg?.name || 'Dashboard'}</span>
                </button>
              </div>
            ) : (
              <>
                <button 
                  className="btn-ghost signin-btn"
                  onClick={() => onOpenAuthModal('login')}
                >
                  Sign In
                </button>
                <button 
                  className="btn-primary get-started-btn"
                  onClick={() => onOpenAuthModal('signup')}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Authenticated Application Top Bar
  return (
    <header className="top-nav app-top-nav">
      <div className="logo-area" onClick={() => setViewMode('public')} style={{ cursor: 'pointer' }} title="Return to Public Website">
        <div className="logo-icon">
          <ShieldCheck size={22} strokeWidth={2.5} />
        </div>
        <div>
          <div className="logo-title">ProofLayer</div>
          <div className="logo-subtitle">Enterprise AppSec Workspace</div>
        </div>
      </div>

      {/* Organization Context Switcher */}
      <div className="org-context-pill" onClick={onOpenTeamSettings} title="Click to view Organization & Team Members">
        <Building2 size={14} className="purple" />
        <span className="org-name-text">{currentOrg?.name || 'Acme Corporation'}</span>
        <span className="tenant-tag">{currentOrg?.tier || 'ENTERPRISE'}</span>
      </div>

      {/* Main App Navigation Tabs */}
      <nav className="nav-tabs">
        <button 
          className={`tab-btn ${activeAppTab === 'cockpit' ? 'active' : ''}`}
          onClick={() => setActiveAppTab('cockpit')}
        >
          <ShieldCheck size={16} />
          Remediation Cockpit
        </button>

        <button 
          className={`tab-btn ${activeAppTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveAppTab('studio')}
        >
          <RotateCcw size={16} />
          Proof Studio
        </button>

        <button 
          className={`tab-btn ${activeAppTab === 'sandbox' ? 'active' : ''}`}
          onClick={() => setActiveAppTab('sandbox')}
        >
          <Server size={16} />
          Vulnerability Sandbox
        </button>
      </nav>

      <div className="nav-stats">
        {/* Environment Pill with Staging Warning */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select 
            value={selectedEnv} 
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="env-selector-dropdown"
          >
            <option value="staging">Env: Staging (Safe Replay)</option>
            <option value="preprod">Env: Pre-Production</option>
            <option value="production">Env: Production (Restricted)</option>
          </select>
        </div>

        {/* User Role Pill & Persona Switcher */}
        <div 
          className="user-role-badge" 
          onClick={onOpenPersonaSwitcher}
          title="Click to switch persona or RBAC role"
        >
          <span className="user-name">{currentUser?.name?.split(' ')[0] || 'Sarah'}</span>
          <span className={`role-pill ${(currentUser?.role || 'SECURITY_LEAD').toLowerCase()}`}>
            {(currentUser?.role || 'SECURITY_LEAD').replace('_', ' ')}
          </span>
          <ChevronDown size={12} />
        </div>

        {/* Team Settings */}
        <button className="btn-secondary icon-btn-nav" onClick={onOpenTeamSettings} title="Manage Organization & Team Members">
          <Users size={15} />
        </button>

        {/* Audit Trail */}
        <button className="btn-secondary icon-btn-nav" onClick={onOpenAuditTrail} title="View Tamper-Evident Audit Ledger">
          <History size={15} />
        </button>

        {/* Import Finding */}
        <button className="btn-primary import-nav-btn" onClick={onOpenImport}>
          <PlusCircle size={15} />
          Import Finding
        </button>

        {/* Return to Public Website */}
        <button 
          className="btn-ghost exit-app-btn" 
          onClick={() => setViewMode('public')} 
          title="Switch to Public Product Website"
        >
          Website
        </button>
      </div>
    </header>
  );
}
