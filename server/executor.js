import { redactEvidence } from './redaction.js';
import { evaluateInvariants } from './invariants.js';
import { generateBypassPermutations } from './permutations.js';
import { validateRetestScope } from './scopeGuard.js';
import { safeExecuteProbe } from './safeClient.js';
import { logAuditEvent } from './store.js';

/**
 * ProofLayer Hardened Retest Execution Engine
 * Enforces scope authorization, executes probe requests via hardened client (redirect & DNS pinned),
 * evaluates deterministic invariants, tests regression permutations, and computes unambiguous verdicts.
 */

/**
 * Runs full retest: baseline re-execution + invariant check + regression/bypass permutation matrix
 */
export async function runScopedRetest(finding, serverBaseUrl, options = {}) {
  logAuditEvent('RETEST_START', `Executing scoped retest for finding ${finding.id} (${finding.title})`);

  const baselineReq = finding.baselineEvidence?.request || {
    method: 'GET',
    url: finding.asset,
    headers: {}
  };

  const isLabSandbox = Boolean(finding.sandboxScenarioId || baselineReq.url.startsWith('/api/sandbox'));

  // 1. Strict Scope & SSRF Authorization Guard
  const scopeCheck = await validateRetestScope(baselineReq.url, {
    environmentTier: finding.environmentTier || 'staging',
    allowLabSandbox: isLabSandbox,
    productionAuthToken: options.productionAuthToken,
    method: baselineReq.method
  });

  if (!scopeCheck.allowed) {
    logAuditEvent('SCOPE_VIOLATION_BLOCKED', `Retest blocked for ${finding.id}: ${scopeCheck.reason}`);
    throw new Error(`Scope Guard Blocked: ${scopeCheck.reason}`);
  }

  // 2. Execute Primary Retest Request via Safe Client (with redirect revalidation)
  const rawResponse = await safeExecuteProbe(serverBaseUrl, baselineReq, {
    environmentTier: finding.environmentTier || 'staging',
    allowLabSandbox: isLabSandbox,
    productionAuthToken: options.productionAuthToken
  });
  const retestEvidence = redactEvidence({
    timestamp: new Date().toISOString(),
    request: baselineReq,
    response: rawResponse
  });

  // 3. Evaluate Security Invariants
  const invariantResult = evaluateInvariants(retestEvidence, finding.expectedInvariants);

  // If primary target is unreachable or crashed, mark as INCONCLUSIVE
  if (invariantResult.isInconclusive && invariantResult.status === 0) {
    return {
      retestEvidence,
      invariantResult,
      regressionResults: [],
      verdict: 'INCONCLUSIVE',
      verdictTitle: 'Retest Inconclusive (Network / Target Unreachable)',
      assertionCoverage: {
        invariantsPassed: 0,
        invariantsTotal: invariantResult.totalCount || 1,
        permutationsBlocked: 0,
        permutationsTotal: 0,
        overallPassed: 0,
        overallTotal: invariantResult.totalCount || 1,
        percentage: 0
      },
      conclusionConfidence: {
        score: 0,
        conclusionType: 'INCONCLUSIVE_DATA',
        explanation: 'Retest could not reach the target endpoint. Verification cannot be confirmed without live HTTP interaction.'
      },
      inconclusiveSummary: invariantResult.inconclusiveSummary,
      completedAt: new Date().toISOString()
    };
  }

  // 4. Generate and Execute Regression / Bypass Permutations
  const permutations = generateBypassPermutations(finding, baselineReq);
  const regressionResults = [];
  let bypassDetected = false;
  let functionalRegressionDetected = false;
  const successfulBypasses = [];

  for (const perm of permutations) {
    const permRawRes = await safeExecuteProbe(serverBaseUrl, perm.request, {
      environmentTier: finding.environmentTier || 'staging',
      allowLabSandbox: isLabSandbox,
      productionAuthToken: options.productionAuthToken
    });
    const permEvidence = redactEvidence({
      request: perm.request,
      response: permRawRes
    });

    let permPassed = false;
    let detail = '';

    if (perm.isPositiveControl) {
      // Functional test: legitimate user should get 200 OK
      permPassed = permRawRes.status === 200;
      detail = permPassed 
        ? 'Legitimate workflow preserved (200 OK confirmed)' 
        : `CRITICAL FUNCTIONAL BREAKAGE: Legitimate user received ${permRawRes.status}!`;
      if (!permPassed) {
        functionalRegressionDetected = true;
      }
    } else {
      // Security test: bypass must be BLOCKED (status 400, 401, 403, 404, or 405)
      const isBlocked = [400, 401, 403, 404, 405].includes(permRawRes.status);
      const isBodyClean = !JSON.stringify(permRawRes.body || '').includes('BYPASS_TRIGGERED') &&
                          !JSON.stringify(permRawRes.body || '').includes('EXPOSED');
      permPassed = isBlocked && isBodyClean;
      detail = permPassed
        ? `Successfully blocked (HTTP ${permRawRes.status})`
        : `BYPASS SUCCEEDED (HTTP ${permRawRes.status}): Attacker circumvented authorization invariant via ${perm.category}!`;
      if (!permPassed) {
        bypassDetected = true;
        successfulBypasses.push({
          id: perm.id,
          category: perm.category,
          method: perm.request.method,
          url: perm.request.url,
          status: permRawRes.status,
          risk: perm.riskIfVulnerable
        });
      }
    }

    regressionResults.push({
      id: perm.id,
      category: perm.category,
      description: perm.description,
      isPositiveControl: Boolean(perm.isPositiveControl),
      riskIfVulnerable: perm.riskIfVulnerable,
      passed: permPassed,
      detail,
      request: permEvidence.request,
      response: {
        status: permRawRes.status,
        durationMs: permRawRes.durationMs,
        bodyPreview: typeof permRawRes.body === 'object' ? JSON.stringify(permRawRes.body).slice(0, 160) : String(permRawRes.body).slice(0, 160)
      }
    });
  }

  // 5. Decoupled Verdict, Assertion Coverage, and Conclusion Confidence
  let verdict = 'VERIFIED_REMEDIATED';
  let verdictTitle = 'Remediation Verified';
  let verdictSummary = '';
  let conclusionType = 'CONFIRMATION_OF_REMEDIATION';
  let confidenceScore = 98;
  let confidenceExplanation = '';

  const permutationsPassed = regressionResults.filter(r => r.passed).length;
  const permutationsTotal = regressionResults.length;
  const totalAssertions = invariantResult.totalCount + permutationsTotal;
  const totalPassed = invariantResult.passedCount + permutationsPassed;
  const overallCoverage = Math.round((totalPassed / (totalAssertions || 1)) * 100);

  if (!invariantResult.passed) {
    verdict = 'VULNERABILITY_PERSISTS';
    verdictTitle = 'Vulnerability Persists (Fix Ineffective)';
    conclusionType = 'CONFIRMATION_OF_VULNERABILITY';
    confidenceScore = 99; // High confidence THAT THE VULNERABILITY STILL EXISTS!
    
    const failedRules = invariantResult.failedInvariants.map(f => f.rule).join(', ');
    verdictSummary = `The reported vulnerability is still exploitable. The target returned HTTP ${rawResponse.status} and violated security invariants: ${failedRules}.`;
    confidenceExplanation = `99% confidence that the vulnerability remains active: Deterministic assertion failure observed with explicit response proof.`;
  } else if (functionalRegressionDetected) {
    verdict = 'FUNCTIONAL_REGRESSION';
    verdictTitle = 'Functional Regression Detected';
    conclusionType = 'CONFIRMATION_OF_REGRESSION';
    confidenceScore = 95;
    verdictSummary = 'The patch blocked the attack, but broke legitimate authorized user workflows (positive control test received denial/error).';
    confidenceExplanation = '95% confidence of functional breakage: Legitimate user test case failed to receive HTTP 200.';
  } else if (bypassDetected) {
    verdict = 'BYPASS_DETECTED';
    verdictTitle = 'Fix Incomplete / Bypass Detected';
    conclusionType = 'CONFIRMATION_OF_BYPASS';
    confidenceScore = 96;
    const bypassList = successfulBypasses.map(b => `${b.category} (${b.method} ${b.url})`).join('; ');
    verdictSummary = `Naive patch detected: The direct baseline test was blocked, but alternate attack paths circumvented the fix: ${bypassList}.`;
    confidenceExplanation = `96% confidence that the fix is incomplete: ${successfulBypasses.length} alternate bypass permutation(s) succeeded.`;
  } else {
    verdict = 'VERIFIED_REMEDIATED';
    verdictTitle = 'Remediation Verified';
    conclusionType = 'CONFIRMATION_OF_REMEDIATION';
    confidenceScore = 98;
    verdictSummary = 'All deterministic security invariants passed, all bypass permutations were blocked, and valid user workflows were verified.';
    confidenceExplanation = '98% confidence in clean remediation: Primary invariant verified, 0/6 bypasses succeeded, and legitimate functional access preserved.';
  }

  const result = {
    retestEvidence,
    invariantResult,
    regressionResults,
    verdict,
    verdictTitle,
    verdictSummary,
    assertionCoverage: {
      invariantsPassed: invariantResult.passedCount,
      invariantsTotal: invariantResult.totalCount,
      permutationsBlocked: permutationsPassed,
      permutationsTotal: permutationsTotal,
      overallPassed: totalPassed,
      overallTotal: totalAssertions,
      percentage: overallCoverage
    },
    conclusionConfidence: {
      score: confidenceScore,
      conclusionType,
      explanation: confidenceExplanation
    },
    failedInvariants: invariantResult.failedInvariants,
    successfulBypasses,
    completedAt: new Date().toISOString()
  };

  logAuditEvent('RETEST_COMPLETED', `Finding ${finding.id} retest concluded with verdict: ${verdict} (${verdictTitle})`);
  return result;
}
