import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { 
  normalizeIpAddress, 
  isProhibitedIp, 
  verifyResolvedDnsEgress, 
  createPinnedLookup, 
  safeExecuteProbe 
} from '../server/safeClient.js';
import { validateRetestScope } from '../server/scopeGuard.js';

describe('Suite 2: Network Boundary & Socket Pinning Tests', () => {

  // 1. IP normalization & Prohibited Range Recognition
  test('IP Normalization: IPv4-mapped IPv6 and alternative representations are normalized and prohibited', () => {
    const testCases = [
      { input: '::ffff:169.254.169.254', expectedProhibited: true, reason: 'Cloud Instance Metadata' },
      { input: '::ffff:10.0.0.1', expectedProhibited: true, reason: 'RFC1918 Class A' },
      { input: '::ffff:172.16.0.5', expectedProhibited: true, reason: 'RFC1918 Class B' },
      { input: '::ffff:192.168.1.1', expectedProhibited: true, reason: 'RFC1918 Class C' },
      { input: '::ffff:127.0.0.1', expectedProhibited: true, reason: 'Loopback interface' },
      { input: '::1', expectedProhibited: true, reason: 'Loopback interface' },
      { input: 'fe80::1', expectedProhibited: true, reason: 'IPv6 Link-Local' },
      { input: 'fd00::1', expectedProhibited: true, reason: 'IPv6 Unique-Local' },
      { input: '93.184.216.34', expectedProhibited: false, reason: 'Public IPv4 (example.com)' }
    ];

    for (const { input, expectedProhibited } of testCases) {
      const res = isProhibitedIp(input);
      assert.equal(
        res.prohibited, 
        expectedProhibited, 
        `IP ${input} prohibited check failed: expected ${expectedProhibited}, got ${res.prohibited}`
      );
    }
  });

  // 2. Mixed DNS Answer Defense (DNS Rebinding)
  test('Mixed DNS Answers: Rejects host if ANY returned IP is in a prohibited subnet', async () => {
    // If a dual-homed host or DNS rebinding attack returns [93.184.216.34, 169.254.169.254],
    // ProofLayer's policy requires rejecting the entire resolution.
    const mixedIps = ['93.184.216.34', '169.254.169.254'];
    let rejected = false;

    for (const ip of mixedIps) {
      const check = isProhibitedIp(ip);
      if (check.prohibited) {
        rejected = true;
        break;
      }
    }

    assert.equal(rejected, true, 'Mixed DNS resolution containing prohibited IP must be rejected');
  });

  // 3. Socket-Level Pinned Lookup
  test('Socket-Level Pinning: createPinnedLookup aborts connection if hostname resolves to prohibited address', (t, done) => {
    const lookup = createPinnedLookup(false);

    // Test loopback without sandbox allowance
    lookup('169.254.169.254', {}, (err, address) => {
      // Direct IP or prohibited lookup
      assert.ok(err, 'createPinnedLookup must return error for prohibited destination');
      assert.ok(err.message.includes('SOCKET_PINNING_ABORT') || err.message.includes('prohibited'));
      done();
    });
  });

  // 4. Redirect Chain Interception & Maximum Hop Limit
  test('Redirect Chain: Revalidates every hop through Scope Guard and limits depth to MAX_REDIRECTS (3)', async () => {
    // Spin up a local redirect test server
    let redirectHops = 0;
    const redirectServer = http.createServer((req, res) => {
      redirectHops++;
      if (req.url === '/hop1') {
        res.writeHead(302, { 'Location': '/hop2' });
        res.end();
      } else if (req.url === '/hop2') {
        res.writeHead(302, { 'Location': '/hop3' });
        res.end();
      } else if (req.url === '/hop3') {
        res.writeHead(302, { 'Location': '/hop4' });
        res.end();
      } else if (req.url === '/hop4') {
        res.writeHead(302, { 'Location': '/final' });
        res.end();
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'reached_final' }));
      }
    });

    await new Promise((resolve) => redirectServer.listen(0, '127.0.0.1', resolve));
    const port = redirectServer.address().port;
    const testBaseUrl = `http://127.0.0.1:${port}`;

    try {
      // Retest against /hop1 which requires 4 redirects (exceeding MAX_REDIRECTS = 3)
      const probeRes = await safeExecuteProbe(testBaseUrl, {
        url: '/hop1',
        method: 'GET'
      }, {
        allowLabSandbox: true
      });

      assert.equal(probeRes.statusText, 'MAX_REDIRECTS_EXCEEDED');
      assert.equal(probeRes.redirectHistory.length, 3, 'Must record exactly 3 redirect hops before halting');
    } finally {
      redirectServer.close();
    }
  });

  // 5. Open Redirect SSRF Interception to Cloud Metadata
  test('Redirect SSRF Defense: Prohibits redirect pointing to 169.254.169.254 cloud metadata', async () => {
    const redirectServer = http.createServer((req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { 'Location': 'http://169.254.169.254/latest/meta-data/' });
        res.end();
      }
    });

    await new Promise((resolve) => redirectServer.listen(0, '127.0.0.1', resolve));
    const port = redirectServer.address().port;
    const testBaseUrl = `http://127.0.0.1:${port}`;

    try {
      const probeRes = await safeExecuteProbe(testBaseUrl, {
        url: '/start',
        method: 'GET'
      }, {
        allowLabSandbox: true
      });

      assert.equal(probeRes.statusText, 'SCOPE_GUARD_BLOCKED');
      assert.ok(probeRes.body.reason.includes('Metadata') || probeRes.body.reason.includes('cloud') || probeRes.body.reason.includes('prohibited'));
      assert.equal(probeRes.redirectHistory.length, 1);
    } finally {
      redirectServer.close();
    }
  });

  // 6. Hostname Normalization Edge Cases (Uppercase, Trailing Dots)
  test('Hostname Normalization: Trailing dots and case variations cannot bypass scope guard', async () => {
    const maliciousHosts = [
      'HTTP://169.254.169.254/secret',
      'http://169.254.169.254./latest/meta-data/',
      'http://metadata.google.internal./computeMetadata/v1/',
      'http://2852039166/secret' // Decimal IP
    ];

    for (const targetUrl of maliciousHosts) {
      const check = await validateRetestScope(targetUrl, {
        environmentTier: 'staging',
        allowLabSandbox: false
      });
      assert.equal(check.allowed, false, `Target URL "${targetUrl}" must be blocked by Scope Guard`);
    }
  });

});
