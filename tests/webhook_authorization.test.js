import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyWebhookSecurity, handleVCSWebhook } from '../server/integrations.js';
import { recordDeliveryIdAtomic, isAuthorizedCommenter } from '../server/webhookStore.js';

describe('Suite 3: Webhook Authorization & Durable Replay Tests', () => {

  const TEST_SECRET = 'prooflayer_webhook_hmac_secret_2026';

  function signPayload(payloadString) {
    return 'sha256=' + crypto.createHmac('sha256', TEST_SECRET).update(payloadString).digest('hex');
  }

  // 1. Modified Payload Detection (Signature Integrity)
  test('Payload Mutation: Tampered body with genuine signature is rejected', () => {
    const originalBody = JSON.stringify({ action: 'created', comment: { body: '/prooflayer retest PL-FIND-001' } });
    const signature = signPayload(originalBody);

    // Attacker tampers body to target a different finding or command
    const tamperedBody = JSON.stringify({ action: 'created', comment: { body: '/prooflayer retest PL-FIND-999' } });

    const res = verifyWebhookSecurity(
      { 'x-hub-signature-256': signature },
      tamperedBody
    );

    assert.equal(res.valid, false);
    assert.equal(res.code, 'INVALID_SIGNATURE');
    assert.ok(res.error.includes('FORGED_WEBHOOK_REJECTED'));
  });

  // 2. Constant-Time & Length Safety
  test('Constant-Time Comparison: Truncated or elongated signatures fail cleanly without throwing', () => {
    const body = '{"ping": true}';
    const originalSig = signPayload(body);

    const badLengths = [
      'sha256=short',
      originalSig.slice(0, 20),
      originalSig + 'extrabytes',
      'invalid-prefix'
    ];

    for (const badSig of badLengths) {
      const res = verifyWebhookSecurity({ 'x-hub-signature-256': badSig }, body);
      assert.equal(res.valid, false);
      assert.equal(res.code, 'INVALID_SIGNATURE');
    }
  });

  // 3. Stale Timestamp Rejection (> 5 Minutes)
  test('Timestamp Freshness: Events older than 5 minutes are rejected', () => {
    const body = '{"event": "retest"}';
    const sig = signPayload(body);

    const staleTime = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 minutes ago
    const res = verifyWebhookSecurity(
      {
        'x-hub-signature-256': sig,
        'x-prooflayer-timestamp': staleTime
      },
      body
    );

    assert.equal(res.valid, false);
    assert.equal(res.code, 'STALE_TIMESTAMP');
    assert.ok(res.error.includes('STALE_EVENT_REJECTED'));

    // Fresh event (10 seconds ago) succeeds
    const freshTime = new Date(Date.now() - 10 * 1000).toISOString();
    const freshRes = verifyWebhookSecurity(
      {
        'x-hub-signature-256': sig,
        'x-prooflayer-timestamp': freshTime
      },
      body
    );
    assert.equal(freshRes.valid, true);
  });

  // 4. Durable Atomic Replay Defense
  test('Durable Replay Defense: Duplicate delivery IDs are blocked across checks', () => {
    const deliveryId = `test-delivery-${Date.now()}-${Math.random()}`;

    // First delivery attempt
    const firstAttempt = recordDeliveryIdAtomic(deliveryId);
    assert.equal(firstAttempt.isDuplicate, false, 'First delivery must be accepted');

    // Duplicate delivery attempt (Replay attack)
    const replayAttempt = recordDeliveryIdAtomic(deliveryId);
    assert.equal(replayAttempt.isDuplicate, true, 'Replay of same delivery ID must be blocked');

    // Verify through verifyWebhookSecurity wrapper
    const secRes = verifyWebhookSecurity(
      { 'x-github-delivery': deliveryId },
      '{}'
    );
    assert.equal(secRes.valid, false);
    assert.equal(secRes.code, 'REPLAY_REJECTED');
  });

  // 5. Concurrent Replay Attempts
  test('Concurrent Replay: Parallel submissions with identical delivery ID permit only one execution', async () => {
    const concurrentDeliveryId = `concurrent-delivery-${Date.now()}`;
    const attempts = 10;

    const results = await Promise.all(
      Array.from({ length: attempts }).map(async () => {
        return recordDeliveryIdAtomic(concurrentDeliveryId);
      })
    );

    const acceptedCount = results.filter(r => !r.isDuplicate).length;
    const rejectedCount = results.filter(r => r.isDuplicate).length;

    assert.equal(acceptedCount, 1, 'Exactly one concurrent submission must succeed');
    assert.equal(rejectedCount, attempts - 1, 'All other concurrent duplicate submissions must be rejected');
  });

  // 6. Role-Based Commenter Authorization
  test('Role Authorization: Valid cryptographic signature does NOT authorize untrusted commenters', async () => {
    const validBody = {
      action: 'created',
      comment: {
        body: '/prooflayer retest PL-FIND-001',
        user: { login: 'untrusted-external-user' },
        author_association: 'NONE' // Random public commenter
      }
    };
    const bodyString = JSON.stringify(validBody);
    const validSig = signPayload(bodyString);

    const result = await handleVCSWebhook(
      'github',
      validBody,
      'http://localhost:3001',
      {
        'x-hub-signature-256': validSig,
        'x-github-delivery': `delivery-untrusted-${Date.now()}`
      }
    );

    assert.equal(result.success, false);
    assert.equal(result.code, 'UNAUTHORIZED_COMMENTER');
    assert.ok(result.error.includes('UNAUTHORIZED'));
  });

  // 7. Authorized Collaborators Are Accepted
  test('Role Authorization: Authorized MEMBER or COLLABORATOR triggers retest', async () => {
    const authorizedPayload = {
      action: 'created',
      comment: {
        body: '/prooflayer retest PL-FIND-001',
        user: { login: 'sarah-chen' },
        author_association: 'MEMBER'
      }
    };
    const bodyStr = JSON.stringify(authorizedPayload);
    const validSig = signPayload(bodyStr);

    const result = await handleVCSWebhook(
      'github',
      authorizedPayload,
      'http://localhost:3001',
      {
        'x-hub-signature-256': validSig,
        'x-github-delivery': `delivery-authorized-${Date.now()}`
      }
    );

    // Finding PL-FIND-001 exists in findings store and is triggered
    assert.equal(result.success, true);
    assert.equal(result.findingId, 'PL-FIND-001');
    assert.ok(result.retestExecuted);
  });

});
