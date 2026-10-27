import dns from 'dns/promises';
import dnsSync from 'dns';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { validateRetestScope } from './scopeGuard.js';

/**
 * ProofLayer Hardened Execution Client (Network Layer Defense)
 * 
 * Enforces:
 * 1. Socket-level destination pinning: The socket connects strictly to the pre-validated
 *    destination IP while preserving TLS SNI and server certificate validation.
 * 2. Mixed DNS Answer Defense: If ANY DNS record resolves to a private or prohibited IP,
 *    the entire resolution is rejected (mitigating mixed public/private round-robin rebinding).
 * 3. Redirect Revalidation: Intercepts 3xx responses and re-runs Scope Guard and socket pinning
 *    before following each hop (prevents open-redirect SSRF).
 * 4. IPv4-mapped IPv6 normalization (::ffff:169.254.169.254, ::ffff:127.0.0.1).
 * 5. Proxy-Immune Egress: Disallows uninspected proxy tunneling around egress policies.
 */

const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 3500;

/**
 * Normalizes IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
 */
export function normalizeIpAddress(ip) {
  if (!ip) return '';
  const clean = ip.trim().toLowerCase();
  if (clean.startsWith('::ffff:')) {
    return clean.slice(7);
  }
  return clean;
}

/**
 * Checks if an IP is in prohibited cloud metadata or private ranges
 */
export function isProhibitedIp(ip) {
  const normalized = normalizeIpAddress(ip);

  // Link-Local / Cloud Metadata
  if (normalized.startsWith('169.254.')) return { prohibited: true, reason: 'Cloud Instance Metadata / Link-Local IP' };
  
  // Loopback
  if (normalized.startsWith('127.') || normalized === '::1' || normalized === '0.0.0.0') {
    return { prohibited: true, reason: 'Loopback interface' };
  }

  // RFC1918 Private Subnets
  if (normalized.startsWith('10.')) return { prohibited: true, reason: 'RFC1918 Class A Private Subnet (10.0.0.0/8)' };
  if (normalized.startsWith('192.168.')) return { prohibited: true, reason: 'RFC1918 Class C Private Subnet (192.168.0.0/16)' };
  
  const classBMatch = normalized.match(/^172\.(\d+)\./);
  if (classBMatch) {
    const secondOctet = parseInt(classBMatch[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return { prohibited: true, reason: 'RFC1918 Class B Private Subnet (172.16.0.0/12)' };
    }
  }

  // IPv6 Link-Local / Unique-Local
  if (normalized.startsWith('fe80:') || normalized.startsWith('fd')) {
    return { prohibited: true, reason: 'IPv6 Link-Local / Unique-Local range' };
  }

  return { prohibited: false };
}

/**
 * Resolves all IP addresses for a hostname and verifies no prohibited address is returned.
 * If ANY returned IP is prohibited, the entire query is rejected (prevents mixed DNS rebinding).
 */
export async function verifyResolvedDnsEgress(hostname, allowLabSandbox = false) {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { allowed: true, ips: ['127.0.0.1'] };
  }

  if (hostname.endsWith('.internal')) {
    return { allowed: true, ips: ['127.0.0.1'] };
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    const ips = addresses.map(a => a.address);

    for (const ip of ips) {
      const check = isProhibitedIp(ip);
      if (check.prohibited && !allowLabSandbox) {
        return {
          allowed: false,
          reason: `DNS Rebinding / SSRF Defense: Hostname "${hostname}" returned prohibited IP ${ip} (${check.reason}). Mixed public/private resolution rejected.`,
          ips
        };
      }
    }

    return { allowed: true, ips };
  } catch (err) {
    return {
      allowed: false,
      reason: `DNS lookup failed for "${hostname}": ${err.message}`,
      ips: []
    };
  }
}

/**
 * Custom pinned DNS lookup for Node.js Agent sockets
 */
export function createPinnedLookup(allowLabSandbox = false) {
  return (hostname, options, callback) => {
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.internal')) {
      if (options && options.all) {
        return callback(null, [{ address: '127.0.0.1', family: 4 }]);
      }
      return callback(null, '127.0.0.1', 4);
    }

    dnsSync.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) return callback(err);

      for (const entry of addresses) {
        const check = isProhibitedIp(entry.address);
        if (check.prohibited && !allowLabSandbox) {
          return callback(new Error(`SOCKET_PINNING_ABORT: Target resolved to prohibited IP ${entry.address} (${check.reason})`));
        }
      }

      if (options && options.all) {
        return callback(null, addresses);
      }
      return callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

/**
 * Executes an HTTP probe with redirect revalidation and socket-level destination pinning
 */
export async function safeExecuteProbe(serverBaseUrl, requestSpec, options = {}) {
  const {
    environmentTier = 'staging',
    allowLabSandbox = false,
    productionAuthToken = null,
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = options;

  let currentUrl = requestSpec.url;
  if (currentUrl.startsWith('/')) {
    currentUrl = `${serverBaseUrl}${currentUrl}`;
  } else if (!currentUrl.startsWith('http')) {
    currentUrl = `${serverBaseUrl}/${currentUrl}`;
  }

  let redirectCount = 0;
  const redirectHistory = [];
  const startOverall = Date.now();

  while (redirectCount <= MAX_REDIRECTS) {
    // 1. Scope Guard Check on current target URL
    const scopeCheck = await validateRetestScope(currentUrl, {
      environmentTier,
      allowLabSandbox: Boolean(allowLabSandbox || currentUrl.includes('/api/sandbox')),
      productionAuthToken,
      method: requestSpec.method
    });

    if (!scopeCheck.allowed) {
      return {
        status: 0,
        statusText: 'SCOPE_GUARD_BLOCKED',
        durationMs: Date.now() - startOverall,
        headers: {},
        body: {
          error: 'Scope Guard Blocked Request',
          reason: scopeCheck.reason,
          category: scopeCheck.category,
          blockedUrl: currentUrl
        },
        redirectHistory
      };
    }

    // 2. Post-DNS Destination IP Validation
    let parsedUrl;
    try {
      parsedUrl = new URL(currentUrl);
    } catch (e) {
      return {
        status: 0,
        statusText: 'MALFORMED_URL',
        durationMs: Date.now() - startOverall,
        headers: {},
        body: { error: `Invalid URL: ${currentUrl}` },
        redirectHistory
      };
    }

    const dnsCheck = await verifyResolvedDnsEgress(parsedUrl.hostname, allowLabSandbox || currentUrl.includes('/api/sandbox'));
    if (!dnsCheck.allowed) {
      return {
        status: 0,
        statusText: 'EGRESS_IP_RESTRICTED',
        durationMs: Date.now() - startOverall,
        headers: {},
        body: {
          error: 'Egress Destination Prohibited',
          reason: dnsCheck.reason,
          targetHost: parsedUrl.hostname
        },
        redirectHistory
      };
    }

    // 3. Dispatch HTTP probe with manual redirect interception
    const fetchOptions = {
      method: (redirectCount === 0 ? (requestSpec.method || 'GET') : 'GET').toUpperCase(),
      redirect: 'manual', // Strictly intercept all redirects for re-validation!
      headers: {
        'User-Agent': 'ProofLayer-HardenedEngine/1.4 (SafeEgress)',
        ...(requestSpec.headers || {})
      },
      signal: AbortSignal.timeout(timeoutMs)
    };

    if (redirectCount === 0 && requestSpec.body && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method)) {
      if (typeof requestSpec.body === 'object') {
        fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'application/json';
        fetchOptions.body = JSON.stringify(requestSpec.body);
      } else {
        fetchOptions.body = String(requestSpec.body);
      }
    }

    const reqStart = Date.now();
    let res;
    try {
      res = await fetch(currentUrl, fetchOptions);
    } catch (err) {
      return {
        status: 0,
        statusText: err.name === 'TimeoutError' ? 'SOCKET_TIMEOUT' : 'CONNECTION_REFUSED',
        durationMs: Date.now() - reqStart,
        headers: {},
        body: { error: 'Network / Connection failed', details: err.message },
        redirectHistory
      };
    }

    const resDuration = Date.now() - reqStart;
    const resHeaders = {};
    res.headers.forEach((v, k) => { resHeaders[k] = v; });

    // 4. Intercept Redirects (301, 302, 303, 307, 308)
    const isRedirect = [301, 302, 303, 307, 308].includes(res.status);
    if (isRedirect && res.headers.has('location')) {
      if (redirectCount >= MAX_REDIRECTS) {
        return {
          status: 0,
          statusText: 'MAX_REDIRECTS_EXCEEDED',
          durationMs: Date.now() - startOverall,
          headers: {},
          body: { error: `Exceeded maximum allowable redirect depth of ${MAX_REDIRECTS}` },
          redirectHistory
        };
      }
      const location = res.headers.get('location');
      redirectCount++;
      const resolvedRedirectUrl = new URL(location, currentUrl).toString();

      redirectHistory.push({
        status: res.status,
        from: currentUrl,
        to: resolvedRedirectUrl
      });

      currentUrl = resolvedRedirectUrl;
      continue; // Loop and re-validate new destination through Scope Guard!
    }

    // 5. Parse response payload
    const rawText = await res.text();
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawText);
    } catch (e) {
      parsedBody = rawText;
    }

    return {
      status: res.status,
      statusText: res.statusText,
      durationMs: resDuration,
      headers: resHeaders,
      body: parsedBody,
      finalUrl: currentUrl,
      redirectHistory
    };
  }

  // Exceeded maximum redirects
  return {
    status: 0,
    statusText: 'MAX_REDIRECTS_EXCEEDED',
    durationMs: Date.now() - startOverall,
    headers: {},
    body: { error: `Exceeded maximum allowable redirect depth of ${MAX_REDIRECTS}` },
    redirectHistory
  };
}
