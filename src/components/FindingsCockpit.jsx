import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Play, 
  FileCheck2, 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Bug,
  Server,
  Filter,
  Sparkles,
  ArrowRight,
  Lock,
  GitPullRequest
} from 'lucide-react';

export default function FindingsCockpit({ 
  findings = [], 
  onSelectFinding, 
  onRunRetest, 
  onViewProofRecord, 
  onOpenSandbox,
  retestingId 
}) {
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFindings = findings.filter(f => {
    if (filter === 'VERIFIED') return f.status === 'VERIFIED' || f.status === 'VERIFIED_REMEDIATED';
    if (filter === 'REGRESSION') return f.status === 'REGRESSION_FOUND' || f.status === 'BYPASS_DETECTED' || f.status === 'FUNCTIONAL_REGRESSION';
    if (filter === 'PENDING') return f.status === 'PENDING_RETEST' || f.status === 'FAILED' || f.status === 'VULNERABILITY_PERSISTS' || f.status === 'INCONCLUSIVE';
    return true;
  }).filter(f => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return f.title.toLowerCase().includes(query) || 
           f.cwe.toLowerCase().includes(query) || 
           f.asset.toLowerCase().includes(query);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED_REMEDIATED':
      case 'VERIFIED':
        return (
          <span className="badge-tag verified">
            <CheckCircle2 size={13} />
            Remediation Verified
          </span>
        );
      case 'BYPASS_DETECTED':
        return (
          <span className="badge-tag bypass">
            <AlertTriangle size={13} />
            Bypass Detected
          </span>
        );
      case 'FUNCTIONAL_REGRESSION':
      case 'REGRESSION_FOUND':
        return (
          <span className="badge-tag regression">
            <AlertTriangle size={13} />
            Functional Regression
          </span>
        );
      case 'VULNERABILITY_PERSISTS':
      case 'FAILED':
        return (
          <span className="badge-tag critical">
            <ShieldAlert size={13} />
            Vulnerability Persists
          </span>
        );
      case 'INCONCLUSIVE':
        return (
          <span className="badge-tag pending">
            <AlertTriangle size={13} />
            Inconclusive Retest
          </span>
        );
      default:
        return (
          <span className="badge-tag pending">
            <Clock size={13} />
            Awaiting Retest
          </span>
        );
    }
  };

  const getSeverityBadge = (severity) => {
    const sev = (severity || 'MEDIUM').toUpperCase();
    if (sev === 'CRITICAL') return <span className="badge-tag critical">CRITICAL</span>;
    if (sev === 'HIGH') return <span className="badge-tag high">HIGH</span>;
    if (sev === 'MEDIUM') return <span className="badge-tag medium">MEDIUM</span>;
    return <span className="badge-tag pending">LOW</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Banner / Value Proposition with Apple Liquid Glass Design */}
      <div className="liquid-glass-banner" style={{
        background: 'linear-gradient(135deg, rgba(46, 19, 58, 0.65) 0%, rgba(22, 8, 28, 0.75) 100%)',
        backdropFilter: 'blur(28px) saturate(190%)',
        WebkitBackdropFilter: 'blur(28px) saturate(190%)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '20px',
        padding: '2rem 2.25rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 20px 60px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '820px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#F6C453', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              <Sparkles size={14} />
              Evidence-Based Verification Layer
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#FBEFE6', marginBottom: '0.6rem' }}>
              A closed ticket is not proof that the risk has been eliminated.
            </h1>
            <p style={{ color: '#BBA3C4', fontSize: '0.96rem', lineHeight: 1.6, margin: 0 }}>
              ProofLayer captures original pentest evidence, enforces deterministic security invariants, checks for naive-fix regressions & alternate attack paths, and issues audit-ready cryptographic proof records.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-secondary liquid-glass-btn" onClick={onOpenSandbox}>
              <Server size={15} />
              <span>Target Sandbox</span>
            </button>

            <a 
              href="https://github.com/salman2610/ProofLayer/issues" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-secondary liquid-glass-btn"
              title="Report an issue or submit a pull request on GitHub"
            >
              <GitPullRequest size={15} />
              <span>GitHub (Issues & PRs)</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
            <Bug size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Total Imported Findings</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{findings.length}</div>
          </div>
        </div>

        <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <FileCheck2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Verified Remediations</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
              {findings.filter(f => f.status === 'VERIFIED').length}
            </div>
          </div>
        </div>

        <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Regressions / Bypasses Intercepted</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>
              {findings.filter(f => f.status === 'REGRESSION_FOUND' || f.status === 'BYPASS_DETECTED').length}
            </div>
          </div>
        </div>

        <div className="panel-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f2fe' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Retest Queue</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
              {findings.filter(f => f.status === 'PENDING_RETEST' || f.status === 'FAILED').length}
            </div>
          </div>
        </div>
      </div>

      {/* Findings Table Panel */}
      <div className="panel-card">
        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              className={`btn-secondary ${filter === 'ALL' ? 'active' : ''}`}
              style={filter === 'ALL' ? { borderColor: '#00f2fe', color: '#00f2fe' } : {}}
              onClick={() => setFilter('ALL')}
            >
              All Findings ({findings.length})
            </button>
            <button 
              className={`btn-secondary ${filter === 'VERIFIED' ? 'active' : ''}`}
              style={filter === 'VERIFIED' ? { borderColor: '#10b981', color: '#10b981' } : {}}
              onClick={() => setFilter('VERIFIED')}
            >
              Verified ({findings.filter(f => f.status === 'VERIFIED').length})
            </button>
            <button 
              className={`btn-secondary ${filter === 'REGRESSION' ? 'active' : ''}`}
              style={filter === 'REGRESSION' ? { borderColor: '#f59e0b', color: '#f59e0b' } : {}}
              onClick={() => setFilter('REGRESSION')}
            >
              Regressions & Bypasses ({findings.filter(f => f.status === 'REGRESSION_FOUND' || f.status === 'BYPASS_DETECTED').length})
            </button>
            <button 
              className={`btn-secondary ${filter === 'PENDING' ? 'active' : ''}`}
              style={filter === 'PENDING' ? { borderColor: '#38bdf8', color: '#38bdf8' } : {}}
              onClick={() => setFilter('PENDING')}
            >
              Pending Retest ({findings.filter(f => f.status === 'PENDING_RETEST' || f.status === 'FAILED').length})
            </button>
          </div>

          <div style={{ minWidth: '260px' }}>
            <input 
              type="text" 
              placeholder="Search by title, CWE, or asset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#090d16',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-ui)'
              }}
            />
          </div>
        </div>

        {/* Findings List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {filteredFindings.map((finding) => {
            const isCurrentlyRetesting = retestingId === finding.id;

            return (
              <div 
                key={finding.id}
                style={{
                  background: 'rgba(10, 14, 23, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Left: Finding Info */}
                <div style={{ flex: '1 1 500px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                    {getSeverityBadge(finding.severity)}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#00f2fe', fontWeight: 600 }}>
                      {finding.cwe}
                    </span>
                    <span style={{ color: '#475569' }}>•</span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {finding.reportedBy}
                    </span>
                    {finding.environmentTier && (
                      <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                        Tier: {finding.environmentTier}
                      </span>
                    )}
                  </div>

                  <h3 
                    style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.45rem', cursor: 'pointer' }}
                    onClick={() => onSelectFinding(finding)}
                  >
                    {finding.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#64748b', background: '#070a11', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      Asset: <span style={{ color: '#cbd5e1' }}>{finding.asset}</span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Expected Invariant: <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        Status {Array.isArray(finding.expectedInvariants?.expectedStatus) ? finding.expectedInvariants.expectedStatus.join('/') : finding.expectedInvariants?.expectedStatus}
                      </span>
                    </div>

                    {finding.remediationConfidence && (
                      <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                        Confidence: {finding.remediationConfidence}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Status & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div>
                    {getStatusBadge(finding.status)}
                  </div>

                  {/* Scoped Retest Trigger Button */}
                  <button 
                    className="btn-secondary"
                    disabled={isCurrentlyRetesting}
                    onClick={() => onRunRetest(finding)}
                    title="Execute authorized scoped retest"
                    style={isCurrentlyRetesting ? { opacity: 0.7 } : {}}
                  >
                    <Play size={14} className={isCurrentlyRetesting ? 'pulsing-retest' : ''} />
                    {isCurrentlyRetesting ? 'Retesting...' : 'Run Retest'}
                  </button>

                  {/* View Proof Record Certificate */}
                  {finding.proofRecord && (
                    <button 
                      className="btn-emerald"
                      onClick={() => onViewProofRecord(finding.proofRecord)}
                      title="View cryptographic proof record certificate"
                    >
                      <FileCheck2 size={14} />
                      Proof Record
                    </button>
                  )}

                  {/* Open Studio */}
                  <button 
                    className="btn-secondary"
                    onClick={() => onSelectFinding(finding)}
                    title="Open in Proof Studio"
                  >
                    Proof Studio
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredFindings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              No findings matched your filter or search query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
