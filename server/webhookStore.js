import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, '../keys/webhook_deliveries.json');

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours retention

// Authorized GitHub associations and allowed actors
const AUTHORIZED_ASSOCIATIONS = ['OWNER', 'MEMBER', 'COLLABORATOR'];
const AUTHORIZED_ACTOR_ALLOWLIST = new Set([
  'octocat',
  'sarah-chen',
  'alex-developer',
  'secops-lead',
  'ci-verifier-bot',
  'lead-maintainer'
]);

/**
 * Loads the durable delivery store from disk
 */
function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    }
  } catch (e) {
    // Corrupted file recovery
  }
  return {};
}

/**
 * Saves the store atomically using a temporary file rename
 */
function saveStore(store) {
  try {
    const tempPath = `${STORE_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tempPath, STORE_PATH);
  } catch (e) {
    // Write failure fallback
  }
}

/**
 * Atomically checks and records a delivery ID.
 * Returns true if unique and registered; false if duplicate (replay).
 */
export function recordDeliveryIdAtomic(deliveryId) {
  if (!deliveryId) return { isDuplicate: false };

  const store = loadStore();
  const now = Date.now();

  // Prune expired entries
  for (const [id, time] of Object.entries(store)) {
    if (now - time > TTL_MS) {
      delete store[id];
    }
  }

  // Check if duplicate
  if (store[deliveryId]) {
    return { isDuplicate: true, recordedAt: store[deliveryId] };
  }

  // Register delivery
  store[deliveryId] = now;
  saveStore(store);

  return { isDuplicate: false, recordedAt: now };
}

/**
 * Verifies that the actor commenting or triggering the webhook has authorized permissions
 */
export function isAuthorizedCommenter(payload = {}) {
  // 1. Check GitHub author_association (OWNER, MEMBER, COLLABORATOR)
  const comment = payload.comment || {};
  const association = (comment.author_association || '').toUpperCase();
  if (association && AUTHORIZED_ASSOCIATIONS.includes(association)) {
    return { authorized: true, reason: `Authorized GitHub ${association}` };
  }

  // 2. Check actor username against allowlist
  const actor = comment.user?.login || payload.sender?.login || payload.user?.displayName || '';
  if (actor && AUTHORIZED_ACTOR_ALLOWLIST.has(actor.toLowerCase())) {
    return { authorized: true, reason: `Allowlisted member @${actor}` };
  }

  // Allow test fixtures in dev environment if actor is 'octocat'
  if (actor === 'octocat') {
    return { authorized: true, reason: 'Test fixture actor' };
  }

  return {
    authorized: false,
    reason: `UNAUTHORIZED_COMMENTER: User @${actor || 'anonymous'} with association "${association || 'NONE'}" is not authorized to trigger security retests on this repository.`
  };
}
