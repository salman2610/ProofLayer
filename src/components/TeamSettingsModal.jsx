import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  Building2, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Lock, 
  Trash2,
  Mail
} from 'lucide-react';

export default function TeamSettingsModal({ isOpen, onClose, currentUser, currentOrg, onInviteSuccess }) {
  if (!isOpen) return null;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DEVELOPER');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [error, setError] = useState(null);

  const canManage = currentUser?.role === 'OWNER';

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/organizations/members');
      const data = await res.json();
      setMembers(data);
    } catch (e) {
      console.error('Failed to fetch members:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError(null);
    setInviteSuccess(false);

    try {
      const res = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Invitation failed');

      setInviteSuccess(true);
      setInviteName('');
      setInviteEmail('');
      await fetchMembers();
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="team-settings-modal-content" onClick={e => e.stopPropagation()}>
        <div className="team-modal-header">
          <div className="header-left">
            <div className="logo-icon small">
              <Building2 size={20} />
            </div>
            <div>
              <h3>Organization & Team Management</h3>
              <p>Tenant: <strong>{currentOrg?.name || 'Acme Corporation'}</strong> (Tier: {currentOrg?.tier || 'ENTERPRISE'})</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Organization Details Box */}
        <div className="org-profile-banner">
          <div className="profile-stat">
            <span className="stat-label">Organization ID</span>
            <span className="stat-val font-mono">{currentOrg?.id || 'org-acme'}</span>
          </div>
          <div className="profile-stat">
            <span className="stat-label">Authorized Target Domain</span>
            <span className="stat-val font-mono">{currentOrg?.domain || 'acmecloud.internal'}</span>
          </div>
          <div className="profile-stat">
            <span className="stat-label">Your Active Role</span>
            <span className={`role-pill ${(currentUser?.role || 'DEVELOPER').toLowerCase()}`}>
              {(currentUser?.role || 'DEVELOPER').replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Member Invite Form (Owner Only) */}
        {canManage ? (
          <div className="invite-box">
            <h4><UserPlus size={16} /> Invite New Organization Member</h4>
            <form onSubmit={handleInvite} className="invite-form-grid">
              <input 
                type="text" 
                placeholder="Full Name" 
                value={inviteName} 
                onChange={e => setInviteName(e.target.value)} 
                required 
              />
              <input 
                type="email" 
                placeholder="name@company.com" 
                value={inviteEmail} 
                onChange={e => setInviteEmail(e.target.value)} 
                required 
              />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="DEVELOPER">Developer (View & Fixes)</option>
                <option value="SECURITY_ENGINEER">Security Engineer (Retests)</option>
                <option value="SECURITY_LEAD">Security Lead (Issue Proofs)</option>
                <option value="AUDITOR">Auditor (Read-Only)</option>
                <option value="OWNER">Owner (Full Admin)</option>
              </select>
              <button type="submit" className="btn-primary invite-btn">Send Invite</button>
            </form>
            {inviteSuccess && (
              <div className="invite-success-msg">
                <Check size={14} /> Member invited and added to organization.
              </div>
            )}
            {error && (
              <div className="invite-error-msg">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>
        ) : (
          <div className="permission-note-box">
            <Lock size={15} />
            <span>Only users with the <strong>Organization Owner</strong> role can invite new members or change team permissions.</span>
          </div>
        )}

        {/* Members List */}
        <div className="members-section">
          <h4>Active Members ({members.length})</h4>
          <div className="members-table-wrapper">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Name & Email</th>
                  <th>Title</th>
                  <th>Role</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div className="member-name-text">{m.name}</div>
                      <div className="member-email-text">{m.email}</div>
                    </td>
                    <td className="member-title-text">{m.title}</td>
                    <td>
                      <span className={`role-pill ${m.role.toLowerCase()}`}>
                        {m.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="member-perm-text">
                      {m.role === 'OWNER' && 'Full Organization Admin, Re-tests, Proofs'}
                      {m.role === 'SECURITY_LEAD' && 'Manage Engagements, Retests, Issue Proofs'}
                      {m.role === 'SECURITY_ENGINEER' && 'Execute Retests, Inspect Evidence'}
                      {m.role === 'DEVELOPER' && 'View Findings, Submit Fixes (No Retests)'}
                      {m.role === 'AUDITOR' && 'Read-Only Audit & Proof Verification'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
