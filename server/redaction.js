import crypto from 'crypto';

/**
 * ProofLayer Automated Secret & PII Redaction Engine
 * Ensures evidence stored in ProofLayer complies with strict data retention & non-leakage policies.
 */

// Generate short deterministic hash signature for redacted items to prove consistency without exposing data
function hashSecret(secret) {
  if (!secret) return '';
  const hash = crypto.createHash('sha256').update(String(secret)).digest('hex');
  return hash.slice(0, 8);
}

// Sensitive header names to redact
const SENSITIVE_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'x-session-token',
  'api-key',
  'apikey',
  'secret-key'
];

// Sensitive JSON keys
const SENSITIVE_JSON_KEYS = [
  'password',
  'passwd',
  'secret',
  'secret_key',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'private_key',
  'ssn',
  'social_security_number',
  'credit_card',
  'card_number',
  'cvv',
  'token'
];

/**
 * Redacts sensitive headers
 */
export function redactHeaders(headers = {}) {
  const cleanHeaders = {};
  for (const [key, val] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.includes(lowerKey)) {
      if (typeof val === 'string') {
        if (lowerKey === 'authorization' && val.toLowerCase().startsWith('bearer ')) {
          const token = val.slice(7).trim();
          cleanHeaders[key] = `Bearer [REDACTED_JWT_TOKEN:sha256:${hashSecret(token)}]`;
        } else if (lowerKey === 'authorization' && val.toLowerCase().startsWith('basic ')) {
          const b64 = val.slice(6).trim();
          cleanHeaders[key] = `Basic [REDACTED_BASIC_AUTH:sha256:${hashSecret(b64)}]`;
        } else if (lowerKey === 'cookie' || lowerKey === 'set-cookie') {
          // Redact cookie values while preserving cookie names
          const redactedCookies = val.split(';').map(c => {
            const parts = c.split('=');
            const cName = parts[0].trim();
            const cVal = parts.slice(1).join('=');
            return `${cName}=[REDACTED_COOKIE:sha256:${hashSecret(cVal)}]`;
          }).join('; ');
          cleanHeaders[key] = redactedCookies;
        } else {
          cleanHeaders[key] = `[REDACTED_SECRET:sha256:${hashSecret(val)}]`;
        }
      } else {
        cleanHeaders[key] = '[REDACTED_SECRET]';
      }
    } else {
      cleanHeaders[key] = val;
    }
  }
  return cleanHeaders;
}

/**
 * Redacts string text patterns (AWS keys, Private keys, Credit cards, query param secrets)
 */
export function redactText(text = '') {
  if (typeof text !== 'string') return text;

  let redacted = text;

  // AWS Access Key ID
  redacted = redacted.replace(/AKIA[0-9A-Z]{16}/g, (match) => `AKIA[REDACTED_AWS_KEY:sha256:${hashSecret(match)}]`);

  // Private Keys (RSA, EC, OpenSSH)
  redacted = redacted.replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+ PRIVATE KEY-----/g, 
    (match) => `-----BEGIN PRIVATE KEY-----\n[REDACTED_CRYPTO_KEY:sha256:${hashSecret(match)}]\n-----END PRIVATE KEY-----`);

  // Credit Card Numbers (13-19 digits with dashes/spaces)
  redacted = redacted.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, (match) => `****-****-****-${match.replace(/\D/g, '').slice(-4)}`);

  // Query parameter secrets like ?token=xyz or &api_key=xyz
  redacted = redacted.replace(/([?&](?:token|access_token|api_key|apikey|secret|password)=)([^&]+)/gi, 
    (match, prefix, secretVal) => `${prefix}[REDACTED_PARAM:sha256:${hashSecret(secretVal)}]`);

  // Bearer tokens in raw bodies or strings
  redacted = redacted.replace(/Bearer\s+([A-Za-z0-9\-_.~+/]+=*)/gi, (match, token) => {
    if (token.startsWith('[REDACTED')) return match;
    return `Bearer [REDACTED_TOKEN:sha256:${hashSecret(token)}]`;
  });

  return redacted;
}

/**
 * Deep redaction for JSON payloads
 */
export function redactJson(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') {
    if (typeof data === 'string') return redactText(data);
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactJson(item));
  }

  const clean = {};
  for (const [k, v] of Object.entries(data)) {
    const lowerKey = k.toLowerCase();
    const isSensitive = SENSITIVE_JSON_KEYS.some(sk => lowerKey === sk || lowerKey.includes(sk));

    if (isSensitive && (typeof v === 'string' || typeof v === 'number')) {
      clean[k] = `[REDACTED_${k.toUpperCase()}:sha256:${hashSecret(v)}]`;
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = redactJson(v);
    } else if (typeof v === 'string') {
      clean[k] = redactText(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Redacts full HTTP request/response evidence packet
 */
export function redactEvidence(evidence = {}) {
  if (!evidence) return evidence;

  const clean = { ...evidence };

  if (clean.request) {
    clean.request = {
      ...clean.request,
      url: redactText(clean.request.url || ''),
      headers: redactHeaders(clean.request.headers || {}),
      body: typeof clean.request.body === 'object' && clean.request.body !== null 
        ? redactJson(clean.request.body) 
        : redactText(String(clean.request.body || ''))
    };
  }

  if (clean.response) {
    clean.response = {
      ...clean.response,
      headers: redactHeaders(clean.response.headers || {}),
      body: typeof clean.response.body === 'object' && clean.response.body !== null 
        ? redactJson(clean.response.body) 
        : redactText(String(clean.response.body || ''))
    };
  }

  return clean;
}
