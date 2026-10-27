import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import FindingsCockpit from './components/FindingsCockpit.jsx';
import ProofStudio from './components/ProofStudio.jsx';
import SandboxPlayground from './components/SandboxPlayground.jsx';
import ProofCertificateModal from './components/ProofCertificateModal.jsx';
import ImportFindingModal from './components/ImportFindingModal.jsx';
import IssueProofModal from './components/IssueProofModal.jsx';
import AuditTrailModal from './components/AuditTrailModal.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('cockpit'); // 'cockpit' | 'studio' | 'sandbox'
  const [findings, setFindings] = useState([]);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [selectedEnv, setSelectedEnv] = useState('staging');
  
  // Modals
  const [activeProofRecord, setActiveProofRecord] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [findingToIssue, setFindingToIssue] = useState(null);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);

  // Retest state
  const [retestingId, setRetestingId] = useState(null);

  const fetchFindings = async () => {
    try {
      const res = await fetch('/api/findings');
      const data = await res.json();
      setFindings(data);
      if (selectedFinding) {
        const updated = data.find(f => f.id === selectedFinding.id);
        if (updated) setSelectedFinding(updated);
      }
    } catch (e) {
      console.error('Failed to fetch findings:', e);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, []);

  const handleSelectFinding = (finding) => {
    setSelectedFinding(finding);
    setActiveTab('studio');
  };

  const handleRunRetest = async (finding) => {
    setRetestingId(finding.id);
    try {
      const res = await fetch(`/api/findings/${finding.id}/retest`, {
        method: 'POST'
      });
      const data = await res.json();
      await fetchFindings();
      if (selectedFinding && selectedFinding.id === finding.id) {
        setSelectedFinding(prev => ({
          ...prev,
          latestRetest: data.retestEvidence,
          invariantResult: data.invariantResult,
          regressionMatrix: data.regressionResults,
          status: data.verdict,
          remediationConfidence: data.confidenceScore
        }));
      }
    } catch (err) {
      console.error('Retest error:', err);
    } finally {
      setRetestingId(null);
    }
  };

  const handleOpenIssueModal = (finding) => {
    setFindingToIssue(finding);
    setIsIssueModalOpen(true);
  };

  const handleConfirmIssueProof = async (finding, reviewerInfo) => {
    try {
      const res = await fetch(`/api/findings/${finding.id}/issue-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewerInfo)
      });
      const data = await res.json();
      if (data.proofRecord) {
        setActiveProofRecord(data.proofRecord);
        await fetchFindings();
      }
    } catch (err) {
      console.error('Failed to issue proof:', err);
    }
  };

  const handleSelectScenarioFinding = (findingId) => {
    const f = findings.find(item => item.id === findingId);
    if (f) {
      setSelectedFinding(f);
      setActiveTab('studio');
    }
  };

  return (
    <div className="app-container">
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        findings={findings}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
        onOpenSandboxModal={() => setActiveTab('sandbox')}
        selectedEnv={selectedEnv}
        setSelectedEnv={setSelectedEnv}
      />

      <main className="main-content">
        {activeTab === 'cockpit' && (
          <FindingsCockpit 
            findings={findings}
            onSelectFinding={handleSelectFinding}
            onRunRetest={handleRunRetest}
            onViewProofRecord={(proof) => setActiveProofRecord(proof)}
            onOpenSandbox={() => setActiveTab('sandbox')}
            retestingId={retestingId}
          />
        )}

        {activeTab === 'studio' && (
          <ProofStudio 
            finding={selectedFinding || findings[0]}
            onBack={() => setActiveTab('cockpit')}
            onRunRetest={handleRunRetest}
            onIssueProof={handleOpenIssueModal}
            onOpenSandbox={() => setActiveTab('sandbox')}
            isRetesting={retestingId === (selectedFinding?.id || findings[0]?.id)}
          />
        )}

        {activeTab === 'sandbox' && (
          <SandboxPlayground 
            onSelectScenarioFinding={handleSelectScenarioFinding}
          />
        )}
      </main>

      {/* Proof Record Certificate Modal */}
      {activeProofRecord && (
        <ProofCertificateModal 
          proofRecord={activeProofRecord}
          onClose={() => setActiveProofRecord(null)}
        />
      )}

      {/* Import Pentest Finding Modal */}
      {isImportOpen && (
        <ImportFindingModal 
          onClose={() => setIsImportOpen(false)}
          onImportSuccess={(newFindings) => {
            fetchFindings();
            if (newFindings && newFindings[0]) {
              setSelectedFinding(newFindings[0]);
              setActiveTab('studio');
            }
          }}
        />
      )}

      {/* Issue Proof Modal */}
      {isIssueModalOpen && findingToIssue && (
        <IssueProofModal 
          finding={findingToIssue}
          onClose={() => {
            setIsIssueModalOpen(false);
            setFindingToIssue(null);
          }}
          onConfirmIssue={handleConfirmIssueProof}
        />
      )}

      {/* Audit Trail Modal */}
      {isAuditTrailOpen && (
        <AuditTrailModal 
          onClose={() => setIsAuditTrailOpen(false)}
        />
      )}
    </div>
  );
}
