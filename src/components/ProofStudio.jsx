import React, { useState } from 'react';
import { 
  Play, 
  FileCheck2, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Lock, 
  Eye, 
  Server, 
  Code, 
  Download, 
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';

export default function ProofStudio({ 
  finding, 
  onBack, 
  onRunRetest, 
  onIssueProof, 
  onOpenSandbox,
  isRetesting 
}) {
  const [studioTab, setStudioTab] = useState('EVIDENCE_DIFF'); // 'EVIDENCE_DIFF' | 'REGRESSION_MATRIX' | 'INVARIANTS'

  if (!finding) {
    return (
      <div className="panel-card" style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>No finding selected for verification.</p>
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Remediation Cockpit
        </button>
      </div>
    );
  }

  const baseline = finding.baselineEvidence;
  const retest = finding.latestRetest;
  const invariantResult = finding.invariantResult;
  const regressionMatrix = finding.regressionMatrix || [];
  const coverage = finding.assertionCoverage || {
    invariantsPassed: invariantResult?.passedCount || 0,
    invariantsTotal: invariantResult?.totalCount || 0,
    permutationsBlocked: regressionMatrix.filter(r => r.passed).length,
    permutationsTotal: regressionMatrix.length,
    percentage: invariantResult ? Math.round(((invariantResult.passedCount || 0) / (invariantResult.totalCount || 1)) * 100) : 0
  };
  const confidence = finding.conclusionConfidence || {
    score: finding.remediationConfidence || 95,
    conclusionType: finding.status === 'VERIFIED_REMEDIATED' ? 'CONFIRMATION_OF_REMEDIATION' : 'CONFIRMATION_OF_VULNERABILITY',
    explanation: 'Evaluation of recorded evidence'
  };

  const getVerdictTheme = (status) => {
    switch (status) {
      case 'VERIFIED_REMEDIATED':
      case 'VERIFIED':
        return {
          color: '#10b981',
          border: 'var(--border-emerald)',
          bg: 'rgba(16, 185, 129, 0.1)',
          title: 'Remediation Verified Clean',
          badge: 'verified'
        };
      case 'BYPASS_DETECTED':
        return {
          color: '#f59e0b',
          border: 'var(--border-amber)',
          bg: 'rgba(245, 158, 11, 0.1)',
          title: 'Fix Incomplete / Bypass Detected',
          badge: 'bypass'
        };
      case 'FUNCTIONAL_REGRESSION':
        return {
          color: '#f59e0b',
          border: 'var(--border-amber)',
          bg: 'rgba(245, 158, 11, 0.1)',
          title: 'Functional Regression (Valid Users Blocked)',
          badge: 'regression'
        };
      case 'VULNERABILITY_PERSISTS':
      case 'FAILED':
        return {
          color: '#f43f5e',
          border: 'var(--border-rose)',
          bg: 'rgba(244, 63, 94, 0.1)',
          title: 'Vulnerability Persists (Fix Ineffective)',
          badge: 'critical'
        };
      default:
        return {
          color: '#94a3b8',
          border: 'var(--border-subtle)',
          bg: 'rgba(148, 163, 184, 0.08)',
          title: 'Awaiting Scoped Retest',
          badge: 'pending'
        };
    }
  };

  const theme = getVerdictTheme(finding.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Studio Top Header */}
      <div className="panel-card" style={{ borderLeft: `4px solid ${theme.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <button 
              className="btn-secondary" 
              onClick={onBack}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', marginBottom: '0.75rem' }}
            >
              <ArrowLeft size={13} /> Back to Cockpit
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <span className={`badge-tag ${finding.severity.toLowerCase()}`}>{finding.severity}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#00f2fe', fontWeight: 600 }}>
                {finding.cwe}: {finding.cweName}
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Asset: <code style={{ color: '#cbd5e1' }}>{finding.asset}</code>
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
              {finding.title}
            </h1>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {finding.sandboxScenarioId && (
              <button className="btn-secondary" onClick={onOpenSandbox}>
                <Server size={14} />
                Toggle Fix in Sandbox
              </button>
            )}

            <button 
              className="btn-primary"
              disabled={isRetesting}
              onClick={() => onRunRetest(finding)}
            >
              <Play size={14} className={isRetesting ? 'pulsing-retest' : ''} />
              {isRetesting ? 'Executing Scoped Retest...' : 'Execute Scoped Retest'}
            </button>

            {retest && (
              <button 
                className="btn-emerald"
                onClick={() => onIssueProof(finding)}
              >
                <FileCheck2 size={14} />
                {finding.proofRecord ? 'Re-Issue Proof Record' : 'Issue Proof Record'}
              </button>
            )}
          </div>
        </div>

        {/* Guardrail Callout */}
        <div style={{
          background: 'rgba(0, 242, 254, 0.05)',
          border: '1px solid rgba(0, 242, 254, 0.2)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.82rem',
          color: '#94a3b8'
        }}>
          <Sparkles size={18} color="#00f2fe" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#f8fafc' }}>Evidence-Backed Trust Constraint: </strong>
            AI generates analysis but cannot mark a fix verified without empirical test proof passing.
            Staging execution is demarcated from production immunity.
          </div>
        </div>
      </div>

      {/* THREE INDEPENDENT ASSESSMENT METRICS (Decoupled Verdict, Coverage, and Confidence) */}
      {retest && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          
          {/* 1. VERDICT */}
          <div className="panel-card" style={{ borderLeft: `3px solid ${theme.color}`, background: theme.bg }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
              Remediation Verdict
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.color, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              {theme.title}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              {finding.verdictSummary || (
                finding.status === 'VERIFIED_REMEDIATED' || finding.status === 'VERIFIED'
                  ? 'All invariants satisfied and bypasses blocked.'
                  : 'Vulnerability remained exploitable under test.'
              )}
            </div>
          </div>

          {/* 2. ASSERTION COVERAGE */}
          <div className="panel-card" style={{ borderLeft: '3px solid #38bdf8' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
              Assertion Coverage
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.3rem' }}>
              {coverage.overallPassed ?? coverage.invariantsPassed} / {coverage.overallTotal ?? (coverage.invariantsTotal + coverage.permutationsTotal)} Assertions Passed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Invariants: <strong style={{ color: '#cbd5e1' }}>{coverage.invariantsPassed}/{coverage.invariantsTotal}</strong></span>
                <span>Bypasses Blocked: <strong style={{ color: '#cbd5e1' }}>{coverage.permutationsBlocked}/{coverage.permutationsTotal}</strong></span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${coverage.percentage || coverage.coveragePercentage || 0}%`, height: '100%', background: theme.color }} />
              </div>
            </div>
          </div>

          {/* 3. CONCLUSION CONFIDENCE */}
          <div className="panel-card" style={{ borderLeft: '3px solid #a78bfa' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
              Conclusion Confidence
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.3rem' }}>
              {confidence.score}% Confidence
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
              {confidence.explanation}
            </div>
          </div>

        </div>
      )}

      {/* DETAILED EVIDENCE EXPLANATION CALLOUT FOR FAILED / BYPASS VERDICTS */}
      {retest && (finding.status === 'VULNERABILITY_PERSISTS' || finding.status === 'FAILED' || finding.status === 'BYPASS_DETECTED') && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid var(--border-rose)',
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fb7185', fontWeight: 800, fontSize: '0.95rem' }}>
            <AlertCircle size={18} />
            Diagnostic Evidence: Why This Fix Failed Verification
          </div>

          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            {finding.status === 'BYPASS_DETECTED' ? (
              <div>
                <strong>Bypass Paths Detected: </strong>
                The direct baseline request was blocked, but alternate HTTP methods or headers bypassed the developer's check.
                A patch that only handles the exact pentest payload does not constitute proof of remediation.
              </div>
            ) : (
              <div>
                <strong>Deterministic Invariant Violation: </strong>
                The endpoint responded with HTTP {retest.response?.status} and returned confidential data. A closed ticket without empirical verification leaves the system exposed.
              </div>
            )}
          </div>

          {/* Show specific failed invariants */}
          {invariantResult?.failedInvariants?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
              {invariantResult.failedInvariants.map((fail, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#fca5a5' }}>
                  <strong>{fail.rule}: </strong> {fail.failureExplanation || fail.actual}
                  {fail.evidenceExcerpt && (
                    <div style={{ fontFamily: 'var(--font-mono)', color: '#f87171', marginTop: '0.2rem' }}>
                      Evidence: {fail.evidenceExcerpt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button 
          className={`tab-btn ${studioTab === 'EVIDENCE_DIFF' ? 'active' : ''}`}
          onClick={() => setStudioTab('EVIDENCE_DIFF')}
        >
          <Code size={15} />
          Evidence Comparison (Baseline vs Retest)
        </button>

        <button 
          className={`tab-btn ${studioTab === 'REGRESSION_MATRIX' ? 'active' : ''}`}
          onClick={() => setStudioTab('REGRESSION_MATRIX')}
        >
          <AlertTriangle size={15} />
          Regression & Bypass Matrix ({regressionMatrix.length} Permutations)
        </button>

        <button 
          className={`tab-btn ${studioTab === 'INVARIANTS' ? 'active' : ''}`}
          onClick={() => setStudioTab('INVARIANTS')}
        >
          <ShieldCheck size={15} />
          Security Invariants ({invariantResult?.evaluations?.length || 0} Assertions)
        </button>
      </div>

      {/* Tab 1: Evidence Diff */}
      {studioTab === 'EVIDENCE_DIFF' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.25rem' }}>
            
            {/* Left Column: Original Baseline Proof */}
            <div className="panel-card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
              <div className="panel-header">
                <div className="panel-title" style={{ color: '#fb7185' }}>
                  <ShieldAlert size={18} />
                  Original Exploit Baseline Evidence
                </div>
                <span className="badge-tag critical">Vulnerable State</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>HTTP Request</div>
                  <div className="code-box">
                    <div><span style={{ color: '#38bdf8' }}>{baseline?.request?.method}</span> <span style={{ color: '#f8fafc' }}>{baseline?.request?.url}</span></div>
                    {Object.entries(baseline?.request?.headers || {}).map(([k, v]) => (
                      <div key={k} style={{ color: '#94a3b8' }}>
                        <span style={{ color: '#818cf8' }}>{k}:</span> {v}
                      </div>
                    ))}
                    {baseline?.request?.body && (
                      <div style={{ marginTop: '0.5rem', color: '#cbd5e1', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.4rem' }}>
                        {JSON.stringify(baseline.request.body, null, 2)}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>HTTP Response</div>
                  <div className="code-box diff-removed">
                    <div style={{ color: '#f87171', fontWeight: 700, marginBottom: '0.4rem' }}>
                      Status: {baseline?.response?.status} {baseline?.response?.statusText} ({baseline?.response?.durationMs}ms)
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {typeof baseline?.response?.body === 'object' 
                        ? JSON.stringify(baseline.response.body, null, 2) 
                        : baseline?.response?.body}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Retest Evidence */}
            <div className="panel-card" style={{ borderColor: retest ? theme.border : 'var(--border-subtle)' }}>
              <div className="panel-header">
                <div className="panel-title" style={{ color: retest ? theme.color : '#94a3b8' }}>
                  <ShieldCheck size={18} />
                  Scoped Retest Evidence
                </div>
                {retest ? (
                  <span className={`badge-tag ${theme.badge}`}>
                    Status: {retest.response?.status}
                  </span>
                ) : (
                  <span className="badge-tag pending">Not Executed Yet</span>
                )}
              </div>

              {retest ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Replayed HTTP Request</div>
                    <div className="code-box">
                      <div><span style={{ color: '#38bdf8' }}>{retest?.request?.method}</span> <span style={{ color: '#f8fafc' }}>{retest?.request?.url}</span></div>
                      {Object.entries(retest?.request?.headers || {}).map(([k, v]) => (
                        <div key={k} style={{ color: '#94a3b8' }}>
                          <span style={{ color: '#818cf8' }}>{k}:</span> {v}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Retest HTTP Response</div>
                    <div className={`code-box ${retest.response?.status === 200 ? 'diff-removed' : 'diff-added'}`}>
                      <div style={{ color: retest.response?.status === 200 ? '#f87171' : '#34d399', fontWeight: 700, marginBottom: '0.4rem' }}>
                        Status: {retest.response?.status} {retest.response?.statusText} ({retest.response?.durationMs}ms)
                      </div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {typeof retest.response?.body === 'object' 
                          ? JSON.stringify(retest.response.body, null, 2) 
                          : retest.response?.body}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                  <RefreshCw size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <div>No retest recorded for this environment yet.</div>
                  <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => onRunRetest(finding)}>
                    <Play size={13} /> Run Retest Now
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab 2: Regression & Bypass Permutations Matrix */}
      {studioTab === 'REGRESSION_MATRIX' && (
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                <AlertTriangle size={18} color="#f59e0b" />
                Fix Regression & Alternate Attack Path Matrix
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Automated permutation suite checking verb tunneling, header spoofing, path normalization, and functional integrity.
              </div>
            </div>
            {retest && (
              <span className="badge-tag pending">
                {regressionMatrix.filter(r => r.passed).length} / {regressionMatrix.length} Passed
              </span>
            )}
          </div>

          {regressionMatrix.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {regressionMatrix.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: 'rgba(8, 12, 20, 0.7)',
                    border: `1px solid ${item.passed ? 'rgba(255,255,255,0.06)' : 'var(--border-rose)'}`,
                    borderRadius: '10px',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {item.passed ? (
                        <CheckCircle2 size={18} color="#10b981" />
                      ) : (
                        <XCircle size={18} color="#f43f5e" />
                      )}
                      <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                        {item.description}
                      </span>
                      <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#94a3b8', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        {item.category}
                      </span>
                    </div>

                    <span className={`badge-tag ${item.passed ? 'verified' : 'bypass'}`}>
                      {item.passed ? 'SECURED / BLOCKED' : 'BYPASS DETECTED'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ color: '#cbd5e1' }}>Payload / Request: </strong>
                      <code style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        {item.request?.method} {item.request?.url}
                      </code>
                    </div>
                    <div>
                      <strong style={{ color: '#cbd5e1' }}>Response Observed: </strong>
                      <span style={{ color: item.passed ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                        {item.detail}
                      </span>
                    </div>
                  </div>

                  {!item.passed && (
                    <div style={{ fontSize: '0.78rem', color: '#fca5a5', background: 'rgba(244, 63, 94, 0.08)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <strong>Risk Caught: </strong> {item.riskIfVulnerable}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Run a scoped retest to execute the regression permutation matrix.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Security Invariants Assertions */}
      {studioTab === 'INVARIANTS' && (
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                <ShieldCheck size={18} color="#00f2fe" />
                Security Invariant Assertions
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Deterministic rules evaluated against the retest HTTP response.
              </div>
            </div>
          </div>

          {invariantResult?.evaluations?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {invariantResult.evaluations.map((ev, i) => (
                <div 
                  key={i}
                  style={{
                    background: 'rgba(8, 12, 20, 0.7)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '0.85rem 1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {ev.passed ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#f43f5e" />}
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>{ev.rule}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Expected: <span style={{ color: '#cbd5e1' }}>{ev.expected}</span> | Actual: <span style={{ color: ev.passed ? '#34d399' : '#f87171' }}>{ev.actual}</span>
                      </div>
                      {ev.evidenceExcerpt && (
                        <div style={{ fontSize: '0.72rem', color: ev.passed ? '#64748b' : '#f87171', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                          Evidence: {ev.evidenceExcerpt}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`badge-tag ${ev.passed ? 'verified' : 'critical'}`}>
                    {ev.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Execute retest to evaluate invariants.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
