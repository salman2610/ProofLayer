import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYS_DIR = path.resolve(__dirname, '../keys');

const DEFAULT_KEY_ID = 'pl-ed25519-2026-k1';
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'ed25519_private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'ed25519_public.pem');
const KEYRING_PATH = path.join(KEYS_DIR, 'trusted_keyring.json');
const ROOT_TRUST_ANCHOR_SECRET = process.env.ROOT_TRUST_ANCHOR || 'prooflayer_master_root_anchor_2026';

if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

let activeKeyId = DEFAULT_KEY_ID;
let privateKeyPem = null;
let publicKeyPem = null;
let trustedKeyRing = { keys: {}, integritySeal: '' };

/**
 * Computes an integrity HMAC seal over the trusted keyring to detect unauthorized local tampering
 */
function sealKeyring(keysObj) {
  const canonicalStr = JSON.stringify(keysObj, Object.keys(keysObj).sort());
  return crypto.createHmac('sha256', ROOT_TRUST_ANCHOR_SECRET).update(canonicalStr).digest('hex');
}

/**
 * Initializes or loads the Ed25519 Key Pair and Keyring
 */
export function initKeys() {
  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    publicKeyPem = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  } else {
    // Generate fresh Ed25519 Keypair (RFC 8032)
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' }
    });

    privateKeyPem = privateKey;
    publicKeyPem = publicKey;

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKeyPem, { mode: 0o600 });
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKeyPem, { mode: 0o644 });
  }

  // Load or initialize key ring
  if (fs.existsSync(KEYRING_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(KEYRING_PATH, 'utf8'));
      trustedKeyRing = data.keys ? data : { keys: data, integritySeal: sealKeyring(data) };
    } catch (e) {
      trustedKeyRing = { keys: {}, integritySeal: '' };
    }
  }

  if (!trustedKeyRing.keys[activeKeyId]) {
    trustedKeyRing.keys[activeKeyId] = {
      keyId: activeKeyId,
      algorithm: 'Ed25519',
      publicKey: publicKeyPem,
      createdAt: '2026-10-27T00:00:00.000Z',
      status: 'ACTIVE' // 'ACTIVE' | 'RETIRED' | 'REVOKED'
    };
    trustedKeyRing.integritySeal = sealKeyring(trustedKeyRing.keys);
    fs.writeFileSync(KEYRING_PATH, JSON.stringify(trustedKeyRing, null, 2), 'utf8');
  }

  return { activeKeyId, publicKeyPem };
}

// Initialize on module load
initKeys();

export function getSigningPrivateKey() {
  if (!privateKeyPem) initKeys();
  return {
    keyId: activeKeyId,
    privateKey: privateKeyPem
  };
}

/**
 * Resolves public key and verifies that keyring itself hasn't been locally tampered with
 */
export function getPublicKey(keyId = activeKeyId) {
  if (!trustedKeyRing.keys[keyId]) {
    initKeys();
  }

  // Verify Keyring Integrity Seal
  const expectedSeal = sealKeyring(trustedKeyRing.keys);
  const sealValid = trustedKeyRing.integritySeal === expectedSeal;
  if (!sealValid) {
    return {
      error: 'KEYRING_TAMPER_DETECTED: Local trusted keyring has been modified outside authorized key management workflow.',
      tampered: true
    };
  }

  return trustedKeyRing.keys[keyId] || null;
}

export function getAllTrustedKeys() {
  return trustedKeyRing.keys;
}

/**
 * Registers an arbitrary key into the keyring
 */
export function registerKey(keyId, publicKeyPem, status = 'ACTIVE', options = {}) {
  trustedKeyRing.keys[keyId] = {
    keyId,
    algorithm: 'Ed25519',
    publicKey: publicKeyPem,
    createdAt: options.createdAt || new Date().toISOString(),
    status,
    retiredAt: options.retiredAt || null,
    revokedAt: options.revokedAt || null,
    revocationReason: options.revocationReason || null
  };
  trustedKeyRing.integritySeal = sealKeyring(trustedKeyRing.keys);
  fs.writeFileSync(KEYRING_PATH, JSON.stringify(trustedKeyRing, null, 2), 'utf8');
  return trustedKeyRing.keys[keyId];
}

/**
 * Rotates / retires a key normally (Historical records remain valid prior to retirement date)
 */
export function retireKey(keyId, retiredAt = new Date().toISOString()) {
  if (!trustedKeyRing.keys[keyId]) {
    registerKey(keyId, '', 'RETIRED', { retiredAt });
  } else {
    trustedKeyRing.keys[keyId].status = 'RETIRED';
    trustedKeyRing.keys[keyId].retiredAt = retiredAt;
    trustedKeyRing.integritySeal = sealKeyring(trustedKeyRing.keys);
    fs.writeFileSync(KEYRING_PATH, JSON.stringify(trustedKeyRing, null, 2), 'utf8');
  }
  return true;
}

/**
 * Revokes a key due to compromise (ALL historical records signed by this key are invalidated)
 */
export function revokeKey(keyId, reason = 'Compromise suspected', publicKey = null) {
  if (!trustedKeyRing.keys[keyId]) {
    registerKey(keyId, publicKey || '', 'REVOKED', { revokedAt: new Date().toISOString(), revocationReason: reason });
  } else {
    trustedKeyRing.keys[keyId].status = 'REVOKED';
    trustedKeyRing.keys[keyId].revokedAt = new Date().toISOString();
    trustedKeyRing.keys[keyId].revocationReason = reason;
    trustedKeyRing.integritySeal = sealKeyring(trustedKeyRing.keys);
    fs.writeFileSync(KEYRING_PATH, JSON.stringify(trustedKeyRing, null, 2), 'utf8');
  }
  return true;
}
