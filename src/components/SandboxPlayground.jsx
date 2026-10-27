import React, { useState, useEffect } from 'react';
import { 
  Server, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Play, 
  ArrowRight,
  Code,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export default function SandboxPlayground({ onSelectScenarioFinding }) {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/sandbox/scenarios');
      const data = await res.json();
      setScenarios(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleSetMode = async (scenarioId, mode) => {
    setUpdatingId(scenarioId);
    try {
      await fetch(`/api/sandbox/scenarios/${scenarioId}/set-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      await fetchScenarios();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const getScenarioFindingId = (scenarioId) => {
    if (scenarioId === 'PL-SANDBOX-BOLA') return 'PL-FIND-001';
    if (scenarioId === 'PL-SANDBOX-SSRF') return 'PL-FIND-002';
    if (scenarioId === 'PL-SANDBOX-BFLA') return 'PL-FIND-003';
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Banner */}
      <div className="panel-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#a78bfa', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              <Layers size={14} />
              Live Interactive Target Playground
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
              Interactive Vulnerability & Remediation Sandbox
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '850px', marginTop: '0.4rem' }}>
              Test ProofLayer in real time against live target endpoints. Switch each scenario between <strong>Vulnerable</strong>, <strong>Naive/Bypassable Patch</strong>, and <strong>Verified Complete Fix</strong>, then trigger a retest to watch ProofLayer catch regressions and verify true fixes!
            </p>
          </div>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {scenarios.map((sc) => {
          const findingId = getScenarioFindingId(sc.id);

          return (
            <div key={sc.id} className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span className="badge-tag pending">{sc.id}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#00f2fe', fontWeight: 600 }}>{sc.cwe}</span>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                    {sc.name}
                  </h2>
                </div>

                {findingId && (
                  <button 
                    className="btn-primary"
                    onClick={() => onSelectScenarioFinding(findingId)}
                  >
                    <Play size={14} />
                    Test in Proof Studio
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {/* Mode Selector Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {sc.modesAvailable.map((m) => {
                  const isActive = sc.mode === m.id;
                  let borderCol = 'rgba(255,255,255,0.08)';
                  let activeGlow = 'none';

                  if (isActive) {
                    if (m.id === 'vulnerable') {
                      borderCol = '#f43f5e';
                      activeGlow = '0 0 15px rgba(244, 63, 94, 0.2)';
                    } else if (m.id === 'naive_fix') {
                      borderCol = '#f59e0b';
                      activeGlow = '0 0 15px rgba(245, 158, 11, 0.2)';
                    } else {
                      borderCol = '#10b981';
                      activeGlow = '0 0 15px rgba(16, 185, 129, 0.2)';
                    }
                  }

                  return (
                    <div 
                      key={m.id}
                      onClick={() => handleSetMode(sc.id, m.id)}
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.05)' : 'rgba(8, 12, 20, 0.6)',
                        border: `1.5px solid ${borderCol}`,
                        boxShadow: activeGlow,
                        borderRadius: '10px',
                        padding: '1.1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                          <span 
                            style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '50%', 
                              background: m.id === 'vulnerable' ? '#f43f5e' : m.id === 'naive_fix' ? '#f59e0b' : '#10b981' 
                            }} 
                          />
                          {m.label}
                        </div>
                        {isActive && (
                          <span className="badge-tag" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.68rem' }}>
                            ACTIVE TARGET
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                        {m.description}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
