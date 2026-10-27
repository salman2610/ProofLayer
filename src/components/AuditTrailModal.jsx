import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Lock,
  RefreshCw
} from 'lucide-react';

export default function AuditTrailModal({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-trail');
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f2fe' }}>
              <History size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                Tamper-Evident System Audit Ledger
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Every verification, retest execution, and sign-off recorded with SHA-256 event integrity
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              No audit events logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {logs.map((log) => (
                <div 
                  key={log.id}
                  style={{
                    background: 'rgba(8, 12, 20, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge-tag" style={{ background: 'rgba(0, 242, 254, 0.12)', color: '#38bdf8', fontSize: '0.72rem' }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                        {log.details}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                    <div>Actor: <strong style={{ color: '#cbd5e1' }}>{log.actor}</strong></div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                      Hash: {log.integrityHash.slice(0, 16)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={fetchLogs}>
            <RefreshCw size={13} />
            Refresh Ledger
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
