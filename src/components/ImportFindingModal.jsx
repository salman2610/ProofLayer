import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileCode, 
  Shield, 
  Lock, 
  Eye, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ImportFindingModal({ onClose, onImportSuccess }) {
  const [importMode, setImportMode] = useState('FORM'); // 'FORM' | 'RAW_CURL' | 'SARIF_BURP'
  
  // Form State
  const [title, setTitle] = useState('');
  const [cwe, setCwe] = useState('CWE-639');
  const [severity, setSeverity] = useState('HIGH');
  const [asset, setAsset] = useState('/api/v1/user/account');
  const [description, setDescription] = useState('');
  const [expectedStatus, setExpectedStatus] = useState('403');
  const [forbiddenString, setForbiddenString] = useState('');

  // Raw cURL or JSON
  const [rawPayload, setRawPayload] = useState('');
  const [redactedPreview, setRedactedPreview] = useState(null);
  const [isRedacting, setIsRedacting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTestRedaction = async () => {
    if (!rawPayload.trim()) return;
    setIsRedacting(true);
    try {
      const res = await fetch('/api/redact-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawPayload })
      });
      const data = await res.json();
      setRedactedPreview(data.redacted);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRedacting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      let body;
      if (importMode === 'SARIF_BURP') {
        body = JSON.parse(rawPayload);
      } else if (importMode === 'RAW_CURL') {
        body = {
          title: title || 'Imported Endpoint Retest Finding',
          cwe: cwe || 'CWE-200',
          severity,
          asset: asset || '/api/endpoint',
          description: description || 'Imported via cURL / Raw HTTP evidence',
          expectedInvariants: {
            expectedStatus: parseInt(expectedStatus, 10) || 403,
            forbiddenStrings: forbiddenString ? [forbiddenString] : []
          },
          baselineEvidence: {
            timestamp: new Date().toISOString(),
            request: {
              method: 'GET',
              url: asset,
              headers: { 'Authorization': 'Bearer [RAW_TOKEN_MOCK]' },
              body: null
            },
            response: {
              status: 200,
              statusText: 'OK',
              body: { raw_captured_evidence: rawPayload }
            }
          }
        };
      } else {
        body = {
          title,
          cwe,
          severity,
          asset,
          description,
          expectedInvariants: {
            expectedStatus: parseInt(expectedStatus, 10) || 403,
            forbiddenStrings: forbiddenString ? [forbiddenString] : []
          }
        };
      }

      const res = await fetch('/api/findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || 'Failed to import finding');
      }

      const result = await res.json();
      onImportSuccess(result.imported);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Sample SARIF template for quick paste
  const loadSampleSarif = () => {
    const sample = {
      version: "2.1.0",
      runs: [{
        tool: { driver: { name: "ProofLayer Pentest Bridge", version: "1.0" } },
        results: [{
          ruleId: "AUTH-009",
          level: "error",
          message: { text: "IDOR vulnerability allows unauthorized read of tenant invoice records" },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: "/api/sandbox/invoices/1001" }
            }
          }]
        }]
      }]
    };
    setRawPayload(JSON.stringify(sample, null, 2));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f2fe' }}>
              <Upload size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                Import Pentest Finding & Evidence
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Automated PII & Secret Redaction enforced on all ingested evidence
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 2rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <button 
            className={`tab-btn ${importMode === 'FORM' ? 'active' : ''}`}
            onClick={() => setImportMode('FORM')}
          >
            Manual Invariant Spec
          </button>
          <button 
            className={`tab-btn ${importMode === 'RAW_CURL' ? 'active' : ''}`}
            onClick={() => setImportMode('RAW_CURL')}
          >
            Raw HTTP / cURL + Redactor
          </button>
          <button 
            className={`tab-btn ${importMode === 'SARIF_BURP' ? 'active' : ''}`}
            onClick={() => setImportMode('SARIF_BURP')}
          >
            SARIF / Burp Suite Report
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="modal-body">
            
            {errorMsg && (
              <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid var(--border-rose)', color: '#fb7185', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}

            {importMode === 'FORM' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Finding Title *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Broken Object Level Authorization in Customer Profile API"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>CWE Classification</label>
                    <select 
                      value={cwe}
                      onChange={(e) => setCwe(e.target.value)}
                      style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    >
                      <option value="CWE-639">CWE-639: BOLA / IDOR</option>
                      <option value="CWE-918">CWE-918: Server-Side Request Forgery (SSRF)</option>
                      <option value="CWE-285">CWE-285: Broken Function Level Auth</option>
                      <option value="CWE-79">CWE-79: Cross-Site Scripting (XSS)</option>
                      <option value="CWE-89">CWE-89: SQL Injection</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>Severity</label>
                    <select 
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Target Asset / Path *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="/api/v1/customer/profile"
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Expected Status Invariant
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. 403 or [401, 403]"
                      value={expectedStatus}
                      onChange={(e) => setExpectedStatus(e.target.value)}
                      style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Forbidden Leaked String (Optional)
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. invoice_secret or root:x:0:0"
                      value={forbiddenString}
                      onChange={(e) => setForbiddenString(e.target.value)}
                      style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.35rem', fontWeight: 600 }}>Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Describe how the vulnerability was found and what conditions must be tested."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ width: '100%', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}

            {importMode === 'RAW_CURL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>
                      Paste Raw cURL Command or HTTP Request/Response
                    </label>
                    <button 
                      type="button" 
                      onClick={handleTestRedaction} 
                      className="btn-secondary" 
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}
                    >
                      <Sparkles size={12} color="#00f2fe" />
                      Test Automated Redaction
                    </button>
                  </div>
                  <textarea 
                    rows={6}
                    placeholder="curl -X POST https://api.staging.acme.com/api/sandbox/invoices/1001 -H 'Authorization: Bearer eyJhbGciOi...'"
                    value={rawPayload}
                    onChange={(e) => setRawPayload(e.target.value)}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}
                  />
                </div>

                {redactedPreview && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={13} />
                      Redacted Evidence Preview (Masked secrets & PII before persistent storage):
                    </div>
                    <div className="code-box" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                      {redactedPreview}
                    </div>
                  </div>
                )}
              </div>
            )}

            {importMode === 'SARIF_BURP' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>
                    Paste SARIF 2.1.0 or Burp Suite JSON Report
                  </label>
                  <button 
                    type="button" 
                    onClick={loadSampleSarif}
                    className="btn-secondary"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}
                  >
                    Load Sample SARIF Payload
                  </button>
                </div>
                <textarea 
                  rows={8}
                  placeholder='{ "version": "2.1.0", "runs": [ ... ] }'
                  value={rawPayload}
                  onChange={(e) => setRawPayload(e.target.value)}
                  style={{ width: '100%', fontFamily: 'var(--font-mono)', background: '#0a0e18', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}
                />
              </div>
            )}

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Upload size={14} />
              Import and Enforce Invariants
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
