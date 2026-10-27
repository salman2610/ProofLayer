/**
 * ProofLayer Security Invariant Evaluation Engine
 * Evaluates whether observed retest behavior satisfies expected security invariants.
 * 
 * Rules are deterministic:
 * - AI can summarize evidence, but deterministic assertions govern the verdict.
 * - Inconclusive responses (5xx errors, connection failures) are explicitly marked INCONCLUSIVE,
 *   never falsely reported as verified.
 */

export function evaluateInvariants(evidence, invariantRules = {}) {
  const evaluations = [];
  const inconclusiveReasons = [];
  let allPassed = true;
  let hasInconclusive = false;

  const { response } = evidence || {};

  // 1. Connection / Network Inconclusive Check
  if (!response || response.status === 0 || response.statusText === 'CONNECTION_REFUSED') {
    return {
      passed: false,
      isInconclusive: true,
      inconclusiveSummary: 'Target host was unreachable or connection was refused during execution.',
      evaluations: [{
        rule: 'Target Connectivity',
        expected: 'Active HTTP listener responding to scoped probe',
        actual: 'CONNECTION_REFUSED / Target Unreachable',
        passed: false,
        critical: true,
        evidenceExcerpt: response?.body?.details || 'Target did not accept TCP connection'
      }],
      inconclusiveReasons: ['Network connectivity failure prevented deterministic evaluation']
    };
  }

  // 2. Unexpected 5xx Server Crash Check
  if (response.status >= 500 && response.status <= 599) {
    hasInconclusive = true;
    inconclusiveReasons.push(`Target returned unexpected server error (HTTP ${response.status} ${response.statusText || ''}). Crash or unhandled exception must be investigated before declaring remediation verified.`);
  }

  const {
    expectedStatus,          // number, array, or string e.g. 403 or [401, 403]
    forbiddenStrings = [],   // Array of strings that MUST NOT be in response body
    requiredStrings = [],    // Array of strings that MUST be in response body
    forbiddenHeaders = [],   // Headers that must not be exposed (e.g. Server, X-Powered-By)
    requiredHeaders = {},    // Headers that must exist e.g. { 'x-content-type-options': 'nosniff' }
    maxResponseTimeMs,       // Performance / timing constraint
    negativeFunctionalCheck  // Valid user invariant
  } = invariantRules;

  const bodyStr = typeof response.body === 'object' ? JSON.stringify(response.body) : String(response.body || '');

  // 1. Status Code Invariant
  if (expectedStatus !== undefined) {
    let statusPass = false;
    let expectedDesc = '';

    if (Array.isArray(expectedStatus)) {
      statusPass = expectedStatus.includes(response.status);
      expectedDesc = `one of [${expectedStatus.join(', ')}]`;
    } else if (typeof expectedStatus === 'number') {
      statusPass = response.status === expectedStatus;
      expectedDesc = `${expectedStatus}`;
    } else if (typeof expectedStatus === 'string') {
      if (expectedStatus.startsWith('!=')) {
        const notCode = parseInt(expectedStatus.slice(2).trim(), 10);
        statusPass = response.status !== notCode;
        expectedDesc = `!= ${notCode}`;
      } else {
        const code = parseInt(expectedStatus, 10);
        statusPass = response.status === code;
        expectedDesc = `== ${code}`;
      }
    }

    evaluations.push({
      rule: 'Status Code Invariant',
      expected: expectedDesc,
      actual: `${response.status} ${response.statusText || ''}`.trim(),
      passed: statusPass,
      critical: true,
      evidenceExcerpt: `Observed HTTP status: ${response.status}. Expected: ${expectedDesc}`,
      failureExplanation: !statusPass 
        ? `Target responded with HTTP ${response.status} instead of expected secured response (${expectedDesc}). An HTTP 200/success response confirms the vulnerability is still accessible.`
        : null
    });

    if (!statusPass) allPassed = false;
  }

  // 2. Forbidden Strings (Negative invariant: Data leak prevention)
  for (const forbidden of forbiddenStrings) {
    const present = bodyStr.includes(forbidden);
    let excerpt = '';
    if (present) {
      const idx = bodyStr.indexOf(forbidden);
      const start = Math.max(0, idx - 40);
      const end = Math.min(bodyStr.length, idx + forbidden.length + 40);
      excerpt = `...${bodyStr.slice(start, end)}...`;
    }

    evaluations.push({
      rule: `Data Leak Invariant: "${forbidden}"`,
      expected: 'Strictly absent from response payload',
      actual: present ? 'LEAKED (Forbidden string detected in response body)' : 'Safely absent',
      passed: !present,
      critical: true,
      evidenceExcerpt: present ? excerpt : 'String absent from response stream',
      failureExplanation: present 
        ? `Confidential data leak detected: response body explicitly discloses "${forbidden}". Direct proof of unmitigated vulnerability.`
        : null
    });

    if (present) allPassed = false;
  }

  // 3. Required Security Strings
  for (const req of requiredStrings) {
    const present = bodyStr.includes(req);
    evaluations.push({
      rule: `Required Security Notice: "${req}"`,
      expected: 'Confirmed present in response',
      actual: present ? 'Confirmed present' : 'Missing from response',
      passed: present,
      critical: false,
      evidenceExcerpt: present ? `Found "${req}" in response` : `Expected string "${req}" was absent`,
      failureExplanation: !present ? `Target did not return the expected security error message or token.` : null
    });
    if (!present) allPassed = false;
  }

  // 4. Required Security Headers
  for (const [hKey, hVal] of Object.entries(requiredHeaders)) {
    const actualVal = response.headers ? response.headers[hKey.toLowerCase()] : undefined;
    let hPass = false;
    if (hVal === true || hVal === '*') {
      hPass = actualVal !== undefined && actualVal !== '';
    } else {
      hPass = actualVal && actualVal.toLowerCase().includes(String(hVal).toLowerCase());
    }

    evaluations.push({
      rule: `Security Header Invariant: "${hKey}"`,
      expected: typeof hVal === 'boolean' ? 'Present' : hVal,
      actual: actualVal || 'Missing',
      passed: Boolean(hPass),
      critical: false,
      evidenceExcerpt: actualVal ? `${hKey}: ${actualVal}` : `Header ${hKey} was missing from response headers`,
      failureExplanation: !hPass ? `Security header "${hKey}" is missing or does not match required policy.` : null
    });
    if (!hPass) allPassed = false;
  }

  // 5. Forbidden Headers (Information disclosure)
  for (const fKey of forbiddenHeaders) {
    const actualVal = response.headers ? response.headers[fKey.toLowerCase()] : undefined;
    const passed = !actualVal;
    evaluations.push({
      rule: `Information Disclosure Header: "${fKey}"`,
      expected: 'Stripped / Suppressed',
      actual: actualVal ? `Exposed: ${actualVal}` : 'Safely suppressed',
      passed,
      critical: false,
      evidenceExcerpt: actualVal ? `${fKey}: ${actualVal}` : 'Header absent',
      failureExplanation: !passed ? `Server exposes internal framework header "${fKey}: ${actualVal}".` : null
    });
    if (!passed) allPassed = false;
  }

  // 6. Max Response Latency (Timing attack / ReDoS guard)
  if (maxResponseTimeMs && response.durationMs) {
    const timingPass = response.durationMs <= maxResponseTimeMs;
    evaluations.push({
      rule: 'Response Latency Bound',
      expected: `<= ${maxResponseTimeMs} ms`,
      actual: `${response.durationMs} ms`,
      passed: timingPass,
      critical: false,
      evidenceExcerpt: `Observed roundtrip: ${response.durationMs} ms`,
      failureExplanation: !timingPass ? `Response took ${response.durationMs}ms, exceeding the ${maxResponseTimeMs}ms threshold.` : null
    });
    if (!timingPass) allPassed = false;
  }

  const passedCount = evaluations.filter(e => e.passed).length;
  const totalCount = evaluations.length;

  return {
    passed: allPassed && !hasInconclusive,
    isInconclusive: hasInconclusive,
    inconclusiveReasons,
    passedCount,
    totalCount,
    coveragePercentage: Math.round((passedCount / (totalCount || 1)) * 100),
    evaluations,
    failedInvariants: evaluations.filter(e => !e.passed)
  };
}
