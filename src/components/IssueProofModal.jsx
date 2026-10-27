import React, { useState } from 'react';
import { 
  X, 
  FileCheck2, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

export default function IssueProofModal({ finding, onClose, onConfirmIssue }) {
  const [reviewerName, setReviewerName] = useState('Sarah Chen');
  const [reviewerRole, setReviewerRole] = useState('Lead Application Security Engineer');
  const [reviewerEmail, setReviewerEmail] = useState('sarah.chen@prooflayer.internal');
  const [notes, setNotes] = useState('Verified with full deterministic invariant assertions and 6-vector regression matrix. Staging validation complete.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onConfirmIssue(finding, {
      reviewerName,
      reviewerRole,
      reviewerEmail,
      notes
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <FileCheck2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                Cryptographic Remediation Sign-Off
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Seal verifiable proof record for {finding.id}
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Finding summary notice */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              fontSize: '0.82rem'
            }}>
              <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>{finding.title}</div>
              <div style={{ color: '#94a3b8' }}>
                Verdict: <span style={{ color: finding.status === 'VERIFIED' ? '#34d399' : '#fbbf24', fontWeight: 700 }}>{finding.status}</span> • 
                Confidence: <span style={{ color: '#00f2fe', fontWeight: 700 }}>{finding.remediationConfidence || 95}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Reviewer Full Name *
                </label>
                <input 
                  type="text"
                  required
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Role / Title
                  </label>
                  <input 
                    type="text"
                    required
                    value={reviewerRole}
                    onChange={(e) => setReviewerRole(e.target.value)}
                    style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Corporate Email
                  </label>
                  <input 
                    type="email"
                    required
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Verification Assessment Notes
                </label>
                <textarea 
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-emerald" disabled={isSubmitting}>
              <Lock size={14} />
              {isSubmitting ? 'Signing...' : 'Cryptographically Seal & Issue'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
