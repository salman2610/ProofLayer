import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Users
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  if (!isOpen) return null;

  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'personas'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const demoPersonas = [
    {
      id: 'usr-lead',
      name: 'Sarah Chen',
      email: 'sarah.chen@acme.internal',
      role: 'SECURITY_LEAD',
      org: 'Acme Corporation',
      desc: 'Can manage engagements, execute retests, review evidence, and issue proof certificates.'
    },
    {
      id: 'usr-dev',
      name: 'Alex Rivera',
      email: 'alex.dev@acme.internal',
      role: 'DEVELOPER',
      org: 'Acme Corporation',
      desc: 'Target owner. Can view findings and submit fixes. Server blocks direct retest execution.'
    },
    {
      id: 'usr-auditor',
      name: 'David Thorne',
      email: 'auditor@compliance.org',
      role: 'AUDITOR',
      org: 'Acme Corporation',
      desc: 'External compliance officer. Read-only audit access to findings and sealed proof records.'
    },
    {
      id: 'usr-owner',
      name: 'Elena Rostova',
      email: 'owner@acme.internal',
      role: 'OWNER',
      org: 'Acme Corporation',
      desc: 'Full administrator. Can manage members, invite users, configure integrations.'
    },
    {
      id: 'usr-mssp',
      name: 'Rhea Patel',
      email: 'rhea@cybershield.io',
      role: 'OWNER',
      org: 'CyberShield Managed SecOps',
      desc: 'MSSP Partner tenant. Proves complete tenant isolation from Acme Corporation.'
    }
  ];

  const handleDemoSwitch = async (persona) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: persona.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Login failed');
      onAuthSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === 'signup' ? '/api/auth/login' : '/api/auth/login'; // demo login endpoint
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || 'password123' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Authentication failed');
      onAuthSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="auth-modal-content" onClick={e => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div className="auth-title-row">
            <div className="logo-icon small">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="auth-modal-title">
                {mode === 'personas' ? 'One-Click Persona Switcher' : (mode === 'signup' ? 'Create Organization Account' : 'Sign In to ProofLayer')}
              </h3>
              <p className="auth-modal-subtitle">
                {mode === 'personas' 
                  ? 'Instantly test ProofLayer under different RBAC roles and tenant organizations.' 
                  : 'Access your organization’s engagements, findings, and verification proof vault.'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tab Selector */}
        <div className="auth-tab-bar">
          <button 
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); }}
          >
            Sign In
          </button>
          <button 
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(null); }}
          >
            Create Organization
          </button>
          <button 
            className={`auth-tab-btn personas ${mode === 'personas' ? 'active' : ''}`}
            onClick={() => { setMode('personas'); setError(null); }}
          >
            <Users size={14} />
            <span>Test Personas (RBAC)</span>
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {mode === 'personas' ? (
          <div className="personas-list">
            <p className="personas-hint">
              Select a persona below to experience how ProofLayer enforces strict tenant isolation and role permissions on the server:
            </p>
            {demoPersonas.map(p => (
              <div 
                key={p.id} 
                className="persona-card"
                onClick={() => handleDemoSwitch(p)}
              >
                <div className="persona-info-col">
                  <div className="persona-name-row">
                    <span className="persona-name">{p.name}</span>
                    <span className={`role-pill ${p.role.toLowerCase()}`}>{p.role.replace('_', ' ')}</span>
                  </div>
                  <div className="persona-email">{p.email} • <strong>{p.org}</strong></div>
                  <div className="persona-desc">{p.desc}</div>
                </div>
                <button className="persona-select-btn" disabled={loading}>
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <>
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-with-icon">
                    <User size={16} />
                    <input 
                      type="text" 
                      placeholder="e.g. Alex Vance" 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Organization Name</label>
                  <div className="input-with-icon">
                    <Building2 size={16} />
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Security Labs" 
                      value={orgName} 
                      onChange={e => setOrgName(e.target.value)}
                      required 
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label>Work Email</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input 
                  type="email" 
                  placeholder="name@company.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input 
                  type="password" 
                  placeholder="••••••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="auth-submit-row">
              <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                {loading ? 'Authenticating...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}
              </button>
            </div>

            <div className="auth-footer-hint">
              <span>Looking for quick testing? </span>
              <button 
                type="button" 
                className="text-link-btn"
                onClick={() => setMode('personas')}
              >
                Use One-Click Test Personas
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
