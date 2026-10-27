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
  UserCheck
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
  if (viewMode === 'public') {
    return (
      <header className="clean-nav">
        <div className="w nav-row">
          {/* Official Logo Cropped from ProofLayer Logo Asset */}
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

          <nav className="clean-nav-links">
            <button 
              className={`nav-link-item ${activePublicTab === 'home' ? 'active' : ''}`}
              onClick={() => setActivePublicTab('home')}
            >
              Product
            </button>
            <button 
              className={`nav-link-item ${activePublicTab === 'demo' ? 'active' : ''}`}
              onClick={() => setActivePublicTab('demo')}
            >
              <Terminal size={14} />
              <span>Interactive Demo</span>
            </button>
            <button 
              className={`nav-link-item ${activePublicTab === 'trust' ? 'active' : ''}`}
              onClick={() => setActivePublicTab('trust')}
            >
              <Lock size={14} />
              <span>Trust & Security</span>
            </button>
            <button 
              className={`nav-link-item ${activePublicTab === 'docs' ? 'active' : ''}`}
              onClick={() => setActivePublicTab('docs')}
            >
              <FileText size={14} />
              <span>Docs</span>
            </button>
          </nav>

          {/* Right Action Buttons with Explicit, Prominent Login */}
          <div className="clean-nav-actions">
            {currentUser ? (
              <div className="nav-user-session">
                <button 
                  className="btn nav-enter-btn"
                  onClick={() => setViewMode('app')}
                >
                  <Building2 size={15} />
                  <span>Open {currentOrg?.name || 'Workspace'}</span>
                </button>

                <button 
                  className="btn g persona-quick-btn"
                  onClick={onOpenPersonaSwitcher}
                  title="Switch Role or Persona"
                >
                  <UserCheck size={14} />
                  <span>{currentUser.name.split(' ')[0]} ({currentUser.role.replace('_', ' ')})</span>
                </button>

                <button 
                  className="btn g icon-nav-btn"
                  onClick={onLogout}
                  title="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="nav-guest-actions">
                {/* PROMINENT LOGIN BUTTON */}
                <button 
                  className="btn g login-highlight-btn"
                  onClick={() => onOpenAuthModal('login')}
                  id="nav-login-btn"
                >
                  <LogIn size={15} />
                  <span>Sign In</span>
                </button>

                {/* Instant 1-Click Demo Personas Switcher */}
                <button 
                  className="btn g persona-demo-pill"
                  onClick={() => onOpenAuthModal('personas')}
                  title="One-click switch to Lead, Developer, Auditor, or Owner personas"
                >
                  <span>Personas</span>
                </button>

                {/* Early Access / Get Started */}
                <button 
                  className="btn get-started-btn"
                  onClick={() => onOpenAuthModal('signup')}
                >
                  <span>Get started</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Authenticated Application Top Bar
  return (
    <header className="clean-nav app-header">
      <div className="w nav-row">
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

        {/* Organization Context Switcher */}
        <div className="org-badge-pill" onClick={onOpenTeamSettings} title="Click to view Organization & Team Members">
          <Building2 size={14} className="gold" />
          <span className="org-name-text">{currentOrg?.name || 'Acme Corporation'}</span>
          <span className="org-tier-tag">{currentOrg?.tier || 'ENTERPRISE'}</span>
        </div>

        {/* Main App Navigation Tabs */}
        <nav className="clean-nav-links app-tabs">
          <button 
            className={`nav-link-item ${activeAppTab === 'cockpit' ? 'active' : ''}`}
            onClick={() => setActiveAppTab('cockpit')}
          >
            <ShieldCheck size={16} />
            <span>Remediation Cockpit</span>
          </button>

          <button 
            className={`nav-link-item ${activeAppTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveAppTab('studio')}
          >
            <RotateCcw size={16} />
            <span>Proof Studio</span>
          </button>

          <button 
            className={`nav-link-item ${activeAppTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveAppTab('sandbox')}
          >
            <Server size={16} />
            <span>Sandbox Targets</span>
          </button>
        </nav>

        <div className="clean-nav-actions app-actions">
          {/* Environment Selector */}
          <select 
            value={selectedEnv} 
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="clean-env-select"
          >
            <option value="staging">Staging (Safe)</option>
            <option value="preprod">Pre-Production</option>
            <option value="production">Production (Guarded)</option>
          </select>

          {/* User Role Pill & Persona Switcher */}
          <div 
            className="user-session-chip" 
            onClick={onOpenPersonaSwitcher}
            title="Click to switch persona or RBAC role"
          >
            <span className="user-name">{currentUser?.name?.split(' ')[0] || 'User'}</span>
            <span className={`role-pill ${(currentUser?.role || 'SECURITY_LEAD').toLowerCase()}`}>
              {(currentUser?.role || 'SECURITY_LEAD').replace('_', ' ')}
            </span>
            <ChevronDown size={13} />
          </div>

          {/* Team Settings */}
          <button className="btn g icon-btn" onClick={onOpenTeamSettings} title="Organization & Team Members">
            <Users size={15} />
          </button>

          {/* Audit Trail */}
          <button className="btn g icon-btn" onClick={onOpenAuditTrail} title="Audit Ledger">
            <History size={15} />
          </button>

          {/* Import Finding */}
          <button className="btn import-btn" onClick={onOpenImport}>
            <PlusCircle size={15} />
            <span>Import</span>
          </button>

          {/* Exit / Public Website */}
          <button 
            className="btn g exit-btn" 
            onClick={() => setViewMode('public')} 
            title="Switch to Public Product Website"
          >
            Website
          </button>
        </div>
      </div>
    </header>
  );
}
