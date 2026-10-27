import crypto from 'crypto';

/**
 * ProofLayer Hardened Secret, PII & Injection Redaction Engine
 * 
 * Protects against:
 * - Plaintext secrets (Bearer tokens, AWS keys, passwords, cookies, credit cards)
 * - Base64-encoded JWT tokens and secrets
 * - URL-encoded secret parameters
 * - Terminal ANSI escape sequence log injection (\x1b[...)
 * - Recursive JSON nesting stack exhaustion attacks (max depth limit)
 * - Oversized evidence payload memory exhaustion attacks
 */

const MAX_JSON_DEPTH = 25;
const MAX_EVIDENCE_BYTES = 256 * 1024; // 256 KB max payload bound

// Generate short deterministic hash signature for redacted items to prove consistency without exposing data
export function hashSecret(secret) {
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
 * Strips ANSI terminal escape sequences to prevent log forgery / terminal injection
 */
export function stripAnsiEscapes(str = '') {
  if (typeof str !== 'string') return str;
  // Regex matches ANSI escape sequences e.g. \x1b[2K, \x1b[31m, \u001b...
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

/**
 * Redacts sensitive headers
 */
export function redactHeaders(headers = {}) {
  const cleanHeaders = {};
  for (const [key, val] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.includes(lowerKey)) {
      if (typeof val === 'string') {
        const cleanVal = stripAnsiEscapes(val);
        if (lowerKey === 'authorization' && cleanVal.toLowerCase().startsWith('bearer ')) {
          const token = cleanVal.slice(7).trim();
          cleanHeaders[key] = `Bearer [REDACTED_JWT_TOKEN:sha256:${hashSecret(token)}]`;
        } else if (lowerKey === 'authorization' && cleanVal.toLowerCase().startsWith('basic ')) {
          const b64 = cleanVal.slice(6).trim();
          cleanHeaders[key] = `Basic [REDACTED_BASIC_AUTH:sha256:${hashSecret(b64)}]`;
        } else if (lowerKey === 'cookie' || lowerKey === 'set-cookie') {
          const redactedCookies = cleanVal.split(';').map(c => {
            const parts = c.split('=');
            const cName = parts[0].trim();
            const cVal = parts.slice(1).join('=');
            return `${cName}=[REDACTED_COOKIE:sha256:${hashSecret(cVal)}]`;
          }).join('; ');
          cleanHeaders[key] = redactedCookies;
        } else {
          cleanHeaders[key] = `[REDACTED_SECRET:sha256:${hashSecret(cleanVal)}]`;
        }
      } else {
        cleanHeaders[key] = '[REDACTED_SECRET]';
      }
    } else {
      cleanHeaders[key] = typeof val === 'string' ? stripAnsiEscapes(val) : val;
    }
  }
  return cleanHeaders;
}

/**
 * Redacts string text patterns (AWS keys, Private keys, Credit cards, query param secrets, Base64 secrets)
 */
export function redactText(text = '') {
  if (typeof text !== 'string') return text;

  // 1. Strip Terminal Injection Escapes
  let redacted = stripAnsiEscapes(text);

  // 2. Enforce Payload Bound
  if (redacted.length > MAX_EVIDENCE_BYTES) {
    redacted = redacted.slice(0, MAX_EVIDENCE_BYTES) + '\n[TRUNCATED: Exceeded max evidence bound of 256KB]';
  }

  // 3. AWS Access Key ID (Plaintext & URL-encoded)
  redacted = redacted.replace(/AKIA[0-9A-Z]{16}/g, (match) => `AKIA[REDACTED_AWS_KEY:sha256:${hashSecret(match)}]`);
  redacted = redacted.replace(/%41%4b%49%41[0-9A-Za-z%]{16,40}/gi, (match) => `AKIA[REDACTED_ENCODED_AWS_KEY:sha256:${hashSecret(match)}]`);

  // 4. Private Keys (RSA, EC, OpenSSH)
  redacted = redacted.replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+ PRIVATE KEY-----/g, 
    (match) => `-----BEGIN PRIVATE KEY-----\n[REDACTED_CRYPTO_KEY:sha256:${hashSecret(match)}]\n-----END PRIVATE KEY-----`);

  // 5. Credit Card Numbers (13-19 digits with dashes/spaces)
  redacted = redacted.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, (match) => `****-****-****-${match.replace(/\D/g, '').slice(-4)}`);

  // 6. Query parameter secrets like ?token=xyz or &api_key=xyz
  redacted = redacted.replace(/([?&](?:token|access_token|api_key|apikey|secret|password)=)([^&]+)/gi, 
    (match, prefix, secretVal) => `${prefix}[REDACTED_PARAM:sha256:${hashSecret(secretVal)}]`);

  // 7. Bearer tokens in raw bodies or strings
  redacted = redacted.replace(/Bearer\s+([A-Za-z0-9\-_.~+/]+=*)/gi, (match, token) => {
    if (token.startsWith('[REDACTED')) return match;
    return `Bearer [REDACTED_TOKEN:sha256:${hashSecret(token)}]`;
  });

  // 8. Raw Base64-encoded JWT Token Detection (Starts with eyJhbGciOi or eyJraWQi)
  redacted = redacted.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, (match) => {
    return `[REDACTED_RAW_JWT:sha256:${hashSecret(match)}]`;
  });

  return redacted;
}

/**
 * Deep redaction for JSON payloads with recursion depth guard
 */
export function redactJson(data, currentDepth = 0) {
  if (data === null || data === undefined) return data;
  if (currentDepth > MAX_JSON_DEPTH) {
    return '[TRUNCATED: Exceeded max JSON nesting depth]';
  }

  if (typeof data !== 'object') {
    if (typeof data === 'string') return redactText(data);
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactJson(item, currentDepth + 1));
  }

  const clean = {};
  for (const [k, v] of Object.entries(data)) {
    const cleanKey = stripAnsiEscapes(k);
    const lowerKey = cleanKey.toLowerCase();
    const isSensitive = SENSITIVE_JSON_KEYS.some(sk => lowerKey === sk || lowerKey.includes(sk));

    if (isSensitive && (typeof v === 'string' || typeof v === 'number')) {
      clean[cleanKey] = `[REDACTED_${cleanKey.toUpperCase()}:sha256:${hashSecret(v)}]`;
    } else if (typeof v === 'object' && v !== null) {
      clean[cleanKey] = redactJson(v, currentDepth + 1);
    } else if (typeof v === 'string') {
      clean[cleanKey] = redactText(v);
    } else {
      clean[cleanKey] = v;
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
