/**
 * ProofLayer Fix Regression & Bypass Permutation Engine
 * 
 * Verifying that a specific exploit payload no longer works is NOT enough:
 * 1. Did the developer only filter the exact test case?
 * 2. Can the authorization check be bypassed with alternate HTTP methods, headers, or encodings?
 * 3. Did the fix break legitimate user functionality?
 */

export function generateBypassPermutations(finding, baselineRequest) {
  const { cwe, category } = finding;
  const permutations = [];

  const baseHeaders = { ...(baselineRequest.headers || {}) };
  const baseUrl = baselineRequest.url || '';
  const baseMethod = (baselineRequest.method || 'GET').toUpperCase();
  const baseBody = baselineRequest.body;

  // 1. Method Swapping & HTTP Verb Tunneling
  if (baseMethod === 'GET') {
    permutations.push({
      id: 'PERM-VERB-POST',
      category: 'Verb Tunneling',
      description: 'Test if route accepts POST with same payload/query without auth check',
      request: {
        method: 'POST',
        url: baseUrl,
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: baseBody || {}
      },
      expectedInvariant: 'Status code 401/403/404 or method not allowed (405)',
      riskIfVulnerable: 'Developer protected GET handler but left POST/ANY unauthenticated'
    });

    permutations.push({
      id: 'PERM-VERB-OVERRIDE',
      category: 'Verb Tunneling',
      description: 'Test X-HTTP-Method-Override header bypass',
      request: {
        method: 'POST',
        url: baseUrl,
        headers: { ...baseHeaders, 'X-HTTP-Method-Override': 'GET' },
        body: baseBody
      },
      expectedInvariant: 'Security invariant enforced despite method override',
      riskIfVulnerable: 'WAF or gateway bypasses route inspection due to override header'
    });
  }

  // 2. Path Normalization & Traversal Variations
  try {
    const parsed = new URL(baseUrl, 'http://localhost');
    const pathname = parsed.pathname;

    // Trailing slash variant
    const trailingSlashUrl = baseUrl.replace(pathname, pathname.endsWith('/') ? pathname.slice(0, -1) : pathname + '/');
    permutations.push({
      id: 'PERM-PATH-TRAILING-SLASH',
      category: 'Path Normalization',
      description: 'Test trailing slash bypass (/endpoint vs /endpoint/)',
      request: {
        method: baseMethod,
        url: trailingSlashUrl,
        headers: baseHeaders,
        body: baseBody
      },
      expectedInvariant: 'Path normalizer enforces authorization invariants uniformly',
      riskIfVulnerable: 'Router matches different controller or skips middleware regex'
    });

    // Dot-segment normalization variant
    const dotSegmentPath = pathname.replace(/\/([^/]+)$/, '/./$1');
    const dotSegmentUrl = baseUrl.replace(pathname, dotSegmentPath);
    permutations.push({
      id: 'PERM-PATH-DOT-SEGMENT',
      category: 'Path Normalization',
      description: 'Test dot-segment normalization (/./segment)',
      request: {
        method: baseMethod,
        url: dotSegmentUrl,
        headers: baseHeaders,
        body: baseBody
      },
      expectedInvariant: 'Framework normalizes path before applying authorization filter',
      riskIfVulnerable: 'Path-based auth filter regex misses dot segments'
    });
  } catch (e) {
    // URL parsing fallback
  }

  // 3. Header Injection / Reverse Proxy Header Spoofing
  permutations.push({
    id: 'PERM-HDR-REWRITE',
    category: 'Header Spoofing',
    description: 'Test X-Original-URL / X-Rewrite-URL path rewrite bypass',
    request: {
      method: baseMethod,
      url: baseUrl,
      headers: {
        ...baseHeaders,
        'X-Original-URL': baseUrl,
        'X-Rewrite-URL': baseUrl
      },
      body: baseBody
    },
    expectedInvariant: 'Upstream gateway headers do not bypass application-level authorization',
    riskIfVulnerable: 'Reverse proxy forwards unverified internal routing headers'
  });

  permutations.push({
    id: 'PERM-HDR-IP-FORWARD',
    category: 'Identity Smuggling',
    description: 'Test X-Forwarded-For: 127.0.0.1 localhost spoofing',
    request: {
      method: baseMethod,
      url: baseUrl,
      headers: {
        ...baseHeaders,
        'X-Forwarded-For': '127.0.0.1, 10.0.0.1',
        'X-Real-IP': '127.0.0.1'
      },
      body: baseBody
    },
    expectedInvariant: 'Fix does not trust client-supplied client IP headers',
    riskIfVulnerable: 'Patch relies on naive IP whitelist trusting spoofable headers'
  });

  // 4. Vulnerability-Specific Bypass Suites (SSRF, BOLA/IDOR, Auth)
  if (cwe === 'CWE-639' || category === 'BOLA' || category === 'IDOR') {
    // Array parameter pollution
    permutations.push({
      id: 'PERM-BOLA-HPP',
      category: 'Parameter Pollution',
      description: 'HTTP Parameter Pollution (id as array or multiple values)',
      request: {
        method: baseMethod,
        url: baseUrl.includes('?') ? `${baseUrl}&id[]=999` : `${baseUrl}?id[]=999`,
        headers: baseHeaders,
        body: baseBody
      },
      expectedInvariant: 'Type-safe parameter validation rejects non-scalar IDs',
      riskIfVulnerable: 'ORM handles array differently than authorization check'
    });

    // Content-Type swapping (JSON vs Form urlencoded)
    permutations.push({
      id: 'PERM-BOLA-ENCTYPE',
      category: 'Content-Type Mismatch',
      description: 'Send request with application/x-www-form-urlencoded or text/plain',
      request: {
        method: baseMethod,
        url: baseUrl,
        headers: { ...baseHeaders, 'Content-Type': 'text/plain' },
        body: typeof baseBody === 'object' ? JSON.stringify(baseBody) : baseBody
      },
      expectedInvariant: 'Authorization checks cannot be bypassed by changing Content-Type',
      riskIfVulnerable: 'Auth filter only decodes JSON body, skipping form-encoded bodies'
    });
  }

  if (cwe === 'CWE-918' || category === 'SSRF') {
    // SSRF Encodings: Decimal IP, Hex, Octal, IPv6, Rebinding
    permutations.push({
      id: 'PERM-SSRF-DECIMAL-IP',
      category: 'SSRF Encoding Bypass',
      description: 'Test decimal IP representation (2852039166 = 169.254.169.254)',
      request: {
        method: baseMethod,
        url: baseUrl,
        headers: baseHeaders,
        body: { target_url: 'http://2852039166/latest/meta-data/' }
      },
      expectedInvariant: 'URL parser resolves IP before blocking internal subnets',
      riskIfVulnerable: 'Patch uses naive string regex matching on "169.254" instead of socket resolution'
    });

    permutations.push({
      id: 'PERM-SSRF-DNS-REBIND',
      category: 'SSRF DNS Wildcard',
      description: 'Test wildcard loopback resolution (127.0.0.1.nip.io)',
      request: {
        method: baseMethod,
        url: baseUrl,
        headers: baseHeaders,
        body: { target_url: 'http://127.0.0.1.nip.io/' }
      },
      expectedInvariant: 'Socket connection blocks resolution to 127.0.0.0/8',
      riskIfVulnerable: 'Domain name resolves to localhost after naive hostname check passes'
    });
  }

  // 5. Positive Control / Functional Regression Test
  // "Test whether the fix broke functionality"
  permutations.push({
    id: 'PERM-FUNC-LEGITIMATE-ACCESS',
    category: 'Functional Regression Check',
    description: 'Verify legitimate authorized user workflow remains functional (200 OK)',
    request: {
      method: baseMethod,
      url: baseUrl.replace(/1001|attacker|9999/, '1000'), // Replace target with legitimate asset
      headers: {
        ...baseHeaders,
        'Authorization': 'Bearer legitimate_tenant_token_alice_prod'
      },
      body: baseBody
    },
    isPositiveControl: true,
    expectedInvariant: 'Status code 200 OK and expected legitimate resource returned',
    riskIfVulnerable: 'Patch broke core business functionality by denying valid users'
  });

  return permutations;
}
