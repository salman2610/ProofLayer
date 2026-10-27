import React, { useState } from 'react';
import { 
  X, 
  FileCheck2, 
  Download, 
  Copy, 
  Check, 
  Lock, 
  ShieldCheck, 
  ExternalLink,
  Printer,
  Shield,
  AlertCircle,
  Terminal,
  Info
} from 'lucide-react';

export default function ProofCertificateModal({ proofRecord, onClose }) {
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null);

  if (!proofRecord) return null;

  const handleCopyDigest = () => {
    navigator.clipboard.writeText(proofRecord.integrity.rootProofDigest);
    setCopiedDigest(true);
    setTimeout(() => setCopiedDigest(false), 2000);
  };

  const cliCommand = `node bin/verify-proof.js ${proofRecord.recordId}.proof.json`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(proofRecord, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${proofRecord.recordId}.proof.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleVerify = async () => {
    setVerifyStatus('CHECKING');
    try {
      const res = await fetch('/api/proof/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proofRecord)
      });
      const data = await res.json();
      setVerifyStatus(data.isValid ? 'VALID' : 'INVALID');
    } catch (e) {
      setVerifyStatus('ERROR');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '880px' }}>
        
        {/* Certificate Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #091220 0%, #0d1a2d 100%)', borderBottom: '1px solid rgba(0,242,254,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'rgba(16, 185, 129, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#10b981',
              border: '1px solid var(--border-emerald)'
            }}>
              <FileCheck2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Cryptographic Remediation Certificate
              </div>
              <div style={{ fontSize: '0.75rem', color: '#00f2fe', fontFamily: 'var(--font-mono)' }}>
                {proofRecord.recordId} • {proofRecord.testSuiteVersion || 'ProofLayer-v1.4'}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Certificate Body */}
        <div className="modal-body" style={{ background: '#080c14' }}>
          
          {/* Official Seal Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.08) 100%)',
            border: '1px solid var(--border-emerald)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <span className="badge-tag verified" style={{ marginBottom: '0.4rem' }}>
                <ShieldCheck size={13} />
                CRYPTOGRAPHIC REMEDIATION SEAL
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                {proofRecord.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                CWE: <strong style={{ color: '#00f2fe' }}>{proofRecord.cwe}</strong> • 
                Severity: <strong style={{ color: '#f87171' }}>{proofRecord.severity}</strong> • 
                Target: <code style={{ color: '#cbd5e1' }}>{proofRecord.environment.target}</code>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Issued At</div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
                {new Date(proofRecord.issuedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Three Decoupled Assessment Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
            <div className="panel-card" style={{ padding: '0.9rem', borderLeft: '3px solid #10b981' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Verdict</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399' }}>
                {proofRecord.verdictTitle || proofRecord.verdict}
              </div>
            </div>

            <div className="panel-card" style={{ padding: '0.9rem', borderLeft: '3px solid #38bdf8' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Assertion Coverage</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {proofRecord.assertionCoverage?.overallPassed ?? 0}/{proofRecord.assertionCoverage?.overallTotal ?? 0} Passed ({proofRecord.assertionCoverage?.coveragePercentage ?? 100}%)
              </div>
            </div>

            <div className="panel-card" style={{ padding: '0.9rem', borderLeft: '3px solid #a78bfa' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Confidence in Conclusion</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {proofRecord.conclusionConfidence?.score ?? 98}% Confidence
              </div>
            </div>
          </div>

          {/* Standalone Offline CLI Verification Callout */}
          <div style={{
            background: 'rgba(0, 242, 254, 0.05)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: '#00f2fe' }}>
                <Terminal size={15} />
                Independent Offline CLI Verification
              </div>
              <button 
                onClick={handleCopyCli}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
              >
                {copiedCli ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {copiedCli ? 'Copied' : 'Copy CLI Command'}
              </button>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              Any external auditor or CI/CD gate can verify this proof record completely offline without trusting screenshots or accessing the ProofLayer database:
            </div>
            <div className="code-box" style={{ padding: '0.5rem 0.85rem', fontSize: '0.78rem', color: '#38bdf8' }}>
              {cliCommand}
            </div>
          </div>

          {/* Cryptographic Hashes Merkle Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Lock size={14} color="#00f2fe" />
              Canonical SHA-256 Root Proof Digest
            </div>

            <div className="code-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#00f2fe', wordBreak: 'break-all', fontSize: '0.78rem' }}>
                {proofRecord.integrity.rootProofDigest}
              </span>
              <button 
                onClick={handleCopyDigest}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
                title="Copy Digest"
              >
                {copiedDigest ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              </button>
            </div>

            {/* Evidence Merkle Hashes Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.55rem' }}>
              <div className="code-box" style={{ fontSize: '0.7rem' }}>
                <span style={{ color: '#94a3b8' }}>Baseline Exploit Hash:</span><br />
                <span style={{ color: '#e2e8f0' }}>{proofRecord.integrity.evidenceHashes.baselineHash.slice(0, 32)}...</span>
              </div>
              <div className="code-box" style={{ fontSize: '0.7rem' }}>
                <span style={{ color: '#94a3b8' }}>Retest Evidence Hash:</span><br />
                <span style={{ color: '#34d399' }}>{proofRecord.integrity.evidenceHashes.retestHash.slice(0, 32)}...</span>
              </div>
              <div className="code-box" style={{ fontSize: '0.7rem' }}>
                <span style={{ color: '#94a3b8' }}>Invariants Hash:</span><br />
                <span style={{ color: '#38bdf8' }}>{proofRecord.integrity.evidenceHashes.invariantsHash.slice(0, 32)}...</span>
              </div>
              <div className="code-box" style={{ fontSize: '0.7rem' }}>
                <span style={{ color: '#94a3b8' }}>Regression Permutations Hash:</span><br />
                <span style={{ color: '#fbbf24' }}>{proofRecord.integrity.evidenceHashes.regressionHash.slice(0, 32)}...</span>
              </div>
            </div>
          </div>

          {/* Scope Limitations Statement */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            fontSize: '0.75rem',
            color: '#94a3b8',
            lineHeight: 1.5
          }}>
            <strong style={{ color: '#e2e8f0' }}>Inspectable Scope Limitations: </strong>
            {proofRecord.limitations || 'This cryptographic record establishes tamper-evident provenance and integrity of the recorded test execution. It does not certify absence of other undiscovered vulnerabilities outside the recorded scope.'}
          </div>

          {/* Signer & Sign-off Details */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Authorizing Signer</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                {proofRecord.reviewer.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {proofRecord.reviewer.role} ({proofRecord.reviewer.email})
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Signing Algorithm</div>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {proofRecord.integrity.signatureAlgorithm}
              </div>
            </div>
          </div>

          {/* Live Verification Status */}
          {verifyStatus && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: verifyStatus === 'VALID' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: verifyStatus === 'VALID' ? '#34d399' : '#fb7185',
              border: `1px solid ${verifyStatus === 'VALID' ? 'var(--border-emerald)' : 'var(--border-rose)'}`
            }}>
              {verifyStatus === 'VALID' 
                ? '✓ Cryptographic Integrity Verified: Record is authentic and untampered across all hash layers.' 
                : '⚠ Tamper Alert: Hash mismatch detected! Proof record does not match canonical root digest.'}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleVerify}>
            <ShieldCheck size={14} />
            Verify Authenticity Live
          </button>

          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={14} />
            Print Certificate
          </button>

          <button className="btn-primary" onClick={handleDownloadJson}>
            <Download size={14} />
            Export Portable Proof (.json)
          </button>
        </div>

      </div>
    </div>
  );
}
