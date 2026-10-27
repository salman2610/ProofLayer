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

// Ensure directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

let activeKeyId = DEFAULT_KEY_ID;
let privateKeyPem = null;
let publicKeyPem = null;
let trustedKeyRing = {};

/**
 * Initializes or loads the Ed25519 Key Pair
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
      trustedKeyRing = JSON.parse(fs.readFileSync(KEYRING_PATH, 'utf8'));
    } catch (e) {
      trustedKeyRing = {};
    }
  }

  if (!trustedKeyRing[activeKeyId]) {
    trustedKeyRing[activeKeyId] = {
      keyId: activeKeyId,
      algorithm: 'Ed25519',
      publicKey: publicKeyPem,
      createdAt: '2026-10-27T00:00:00.000Z',
      status: 'ACTIVE' // 'ACTIVE' | 'REVOKED' | 'EXPIRED'
    };
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

export function getPublicKey(keyId = activeKeyId) {
  if (!trustedKeyRing[keyId]) {
    initKeys();
  }
  return trustedKeyRing[keyId] || null;
}

export function getAllTrustedKeys() {
  return trustedKeyRing;
}

export function registerKey(keyId, publicKeyPem, status = 'ACTIVE') {
  trustedKeyRing[keyId] = {
    keyId,
    algorithm: 'Ed25519',
    publicKey: publicKeyPem,
    createdAt: new Date().toISOString(),
    status
  };
  fs.writeFileSync(KEYRING_PATH, JSON.stringify(trustedKeyRing, null, 2), 'utf8');
  return trustedKeyRing[keyId];
}

export function revokeKey(keyId, reason = 'Key rotated / compromised', publicKeyPem = null) {
  if (!trustedKeyRing[keyId]) {
    trustedKeyRing[keyId] = {
      keyId,
      algorithm: 'Ed25519',
      publicKey: publicKeyPem || '',
      createdAt: new Date().toISOString(),
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
      revocationReason: reason
    };
  } else {
    trustedKeyRing[keyId].status = 'REVOKED';
    trustedKeyRing[keyId].revokedAt = new Date().toISOString();
    trustedKeyRing[keyId].revocationReason = reason;
  }
  fs.writeFileSync(KEYRING_PATH, JSON.stringify(trustedKeyRing, null, 2), 'utf8');
  return true;
}
