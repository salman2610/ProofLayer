import dns from 'dns/promises';
import { URL } from 'url';

/**
 * ProofLayer Retest Execution Engine Hardening & Scope Guard
 * 
 * Enforces strict network boundaries, target allowlists, cloud metadata blocking,
 * and production environment safeguards.
 */

// Cloud metadata and link-local IP addresses that must NEVER be accessed during arbitrary retests
const RESTRICTED_IP_RANGES = [
  /^169\.254\./,              // AWS / Azure / GCP link-local metadata (169.254.0.0/16)
  /^127\./,                   // Loopback (127.0.0.0/8)
  /^10\./,                    // RFC1918 Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // RFC1918 Private Class B
  /^192\.168\./,              // RFC1918 Private Class C
  /^0\./,                     // Current network
  /^::1$/,                    // IPv6 Loopback
  /^fe80:/i,                  // IPv6 Link-Local
  /^fd/i                      // IPv6 Unique Local
];

// Authorized domain patterns permitted for retesting
const DEFAULT_AUTHORIZED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  /\.staging\.acmecloud\.internal$/,
  /\.preprod\.acmecloud\.internal$/,
  /\.sandbox\.prooflayer\.internal$/
];

/**
 * Validates a target URL against allowlists, SSRF risks, and environment tier policies.
 * 
 * @param {string} targetUrl The target URL to test
 * @param {object} options Options including environmentTier, allowLabSandbox, productionAuthToken
 */
export async function validateRetestScope(targetUrl, options = {}) {
  const {
    environmentTier = 'staging',
    allowLabSandbox = false,
    productionAuthToken = null,
    customAllowlist = []
  } = options;

  // 1. URL Structure Validation
  let parsed;
  try {
    if (targetUrl.startsWith('/api/sandbox')) {
      // Local internal sandbox routes are explicitly safe when allowLabSandbox or default
      return {
        allowed: true,
        reason: 'Authorized internal sandbox fixture',
        isSandbox: true,
        sanitizedUrl: targetUrl
      };
    }
    parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`);
  } catch (err) {
    return {
      allowed: false,
      reason: `Malformed target URL: ${err.message}`,
      category: 'INVALID_URL'
    };
  }

  // 2. Protocol Check
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      allowed: false,
      reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted for retests.`,
      category: 'DISALLOWED_PROTOCOL'
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Cloud Metadata & Private Network Egress Guard (SSRF Defense)
  // Check if literal hostname matches cloud metadata or loopback
  const isMetadataLiteral = hostname === '169.254.169.254' || 
                            hostname === 'metadata.google.internal' ||
                            hostname === '169.254.169.250' ||
                            hostname === '2852039166'; // Decimal IP for 169.254.169.254

  if (isMetadataLiteral) {
    if (allowLabSandbox) {
      // Allowed only when explicitly simulating an SSRF invariant inside an authorized lab fixture
      return {
        allowed: true,
        reason: 'Authorized SSRF lab simulation fixture',
        isSandbox: true,
        sanitizedUrl: parsed.toString()
      };
    }
    return {
      allowed: false,
      reason: 'SECURITY VIOLATION: Retest target attempts to access cloud instance metadata (169.254.169.254 / metadata.google.internal). Request blocked by ProofLayer Scope Guard.',
      category: 'CLOUD_METADATA_BLOCKED'
    };
  }

  // 4. Domain Allowlist Verification
  const combinedAllowlist = [...DEFAULT_AUTHORIZED_DOMAINS, ...customAllowlist];
  const isAllowlisted = combinedAllowlist.some(pattern => {
    if (typeof pattern === 'string') {
      return hostname === pattern || hostname.endsWith(`.${pattern}`);
    } else if (pattern instanceof RegExp) {
      return pattern.test(hostname);
    }
    return false;
  });

  if (!isAllowlisted && !allowLabSandbox) {
    return {
      allowed: false,
      reason: `Target host "${hostname}" is not in the authorized retesting allowlist. To prevent unauthorized scanning, add it to your organization's authorized scope.`,
      category: 'UNAUTHORIZED_TARGET_DOMAIN'
    };
  }

  // 5. Production Safety Policy (Enforce before network egress)
  if (environmentTier.toLowerCase() === 'production') {
    if (!productionAuthToken) {
      return {
        allowed: false,
        reason: 'PRODUCTION RETEST DENIED: Running verification against live production environments requires explicit authorization and an approved Production Retest Token.',
        category: 'PRODUCTION_AUTH_REQUIRED'
      };
    }

    // Verify method is non-destructive
    if (options.method && ['DELETE', 'DROP', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
      if (!options.allowMutatingProduction) {
        return {
          allowed: false,
          reason: `Destructive HTTP method "${options.method}" blocked against production target. Only safe, non-mutating invariant probes are authorized in production.`,
          category: 'DESTRUCTIVE_METHOD_BLOCKED'
        };
      }
    }
  }

  // 6. Pre-flight DNS Resolution & Egress IP Verification (Prevents DNS Rebinding)
  // Skip live DNS lookup for localhost or internal development mock domains (*.internal)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.endsWith('.internal')) {
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const addr of addresses) {
        const isRestricted = RESTRICTED_IP_RANGES.some(range => range.test(addr.address));
        if (isRestricted && !allowLabSandbox) {
          return {
            allowed: false,
            reason: `Target domain "${hostname}" resolves to private/internal IP (${addr.address}). Direct egress to internal networks is restricted by policy.`,
            category: 'INTERNAL_IP_RESTRICTED'
          };
        }
      }
    } catch (dnsErr) {
      return {
        allowed: false,
        reason: `Target host "${hostname}" could not be resolved via DNS: ${dnsErr.message}`,
        category: 'DNS_RESOLUTION_FAILURE'
      };
    }
  }

  return {
    allowed: true,
    reason: `Target authorized for ${environmentTier} tier execution`,
    isSandbox: false,
    sanitizedUrl: parsed.toString()
  };
}
