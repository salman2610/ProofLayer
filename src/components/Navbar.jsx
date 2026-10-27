import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  PlusCircle, 
  Server, 
  History, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  findings = [], 
  onOpenImport, 
  onOpenAuditTrail,
  onOpenSandboxModal,
  selectedEnv,
  setSelectedEnv
}) {
  const verifiedCount = findings.filter(f => f.status === 'VERIFIED').length;
  const regressionCount = findings.filter(f => f.status === 'REGRESSION_FOUND' || f.status === 'BYPASS_DETECTED').length;
  const pendingCount = findings.filter(f => f.status === 'PENDING_RETEST' || f.status === 'FAILED').length;

  return (
    <header className="top-nav">
      <div className="logo-area">
        <div className="logo-icon">
          <ShieldCheck size={22} strokeWidth={2.5} />
        </div>
        <div>
          <div className="logo-title">ProofLayer</div>
          <div className="logo-subtitle">Verifiable Remediation Engine</div>
        </div>
      </div>

      <nav className="nav-tabs">
        <button 
          className={`tab-btn ${activeTab === 'cockpit' ? 'active' : ''}`}
          onClick={() => setActiveTab('cockpit')}
        >
          <ShieldCheck size={16} />
          Remediation Cockpit
        </button>

        <button 
          className={`tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveTab('studio')}
        >
          <RotateCcw size={16} />
          Proof Studio
        </button>

        <button 
          className={`tab-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('sandbox')}
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
            style={{
              background: '#0a0e18',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer'
            }}
          >
            <option value="staging">Env: Staging (Safe Replay)</option>
            <option value="preprod">Env: Pre-Production</option>
            <option value="production">Env: Production (Restricted)</option>
          </select>
        </div>

        {/* Status Counters */}
        <div className="stat-pill" title="Cryptographically verified remediations">
          <span className="badge-dot emerald"></span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{verifiedCount}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Verified</span>
        </div>

        <div className="stat-pill" title="Fixes with regressions or bypasses detected">
          <span className="badge-dot amber"></span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{regressionCount}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Regressions</span>
        </div>

        <div className="stat-pill" title="Awaiting scoped retest">
          <span className="badge-dot cyan"></span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{pendingCount}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Pending</span>
        </div>

        {/* Action Buttons */}
        <button className="btn-secondary" onClick={onOpenAuditTrail} title="View tamper-evident audit ledger">
          <History size={15} />
          Audit Log
        </button>

        <button className="btn-primary" onClick={onOpenImport}>
          <PlusCircle size={15} />
          Import Finding
        </button>
      </div>
    </header>
  );
}
