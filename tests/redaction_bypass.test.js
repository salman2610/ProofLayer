import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { redactText, redactJson, redactEvidence, stripAnsiEscapes, hashSecret } from '../server/redaction.js';

describe('Suite 4: Redaction Bypass & Secret Sanitization Tests', () => {

  // 1. Unicode Normalization: Full-Width Variants
  test('Unicode Normalization: Full-width and compatibility characters are normalized and redacted', () => {
    // Full-width ASCII: ＡＫＩＡＩＯＳＦＯＤＮＮ７ＥＸＡＭＰＬＥ (U+FF21 U+FF2B ...)
    const fullWidthKey = '\uFF21\uFF2B\uFF29\uFF21\uFF29\uFF2F\uFF33\uFF26\uFF2F\uFF24\uFF2E\uFF2E\uFF17\uFF25\uFF38\uFF21\uFF2D\uFF30\uFF2C\uFF25';
    const textWithFullWidth = `AWS configuration: aws_access_key_id = ${fullWidthKey}`;

    const sanitized = redactText(textWithFullWidth);
    assert.ok(!sanitized.includes('AKIAIOSFODNN7EXAMPLE'), 'Sanitized text must not contain plaintext full key');
    assert.ok(!sanitized.includes(fullWidthKey), 'Sanitized text must not contain full-width key');
    assert.ok(sanitized.includes('REDACTED_AWS_KEY'), 'Should contain REDACTED_AWS_KEY marker');
  });

  // 2. URL-Encoded Variants
  test('URL-Encoded Secrets: Percent-encoded AWS keys are detected and redacted', () => {
    const encodedKey = '%41%4b%49%41%49%4f%53%46%4f%44%4e%4e%37%45%58%41%4d%50%4c%45'; // %41%4b%49%41 = AKIA
    const text = `GET /download?key=${encodedKey}`;

    const sanitized = redactText(text);
    assert.ok(!sanitized.includes('%41%4b%49%41'), 'Encoded AKIA prefix must be redacted');
    assert.ok(sanitized.includes('REDACTED_ENCODED_AWS_KEY'));
  });

  // 3. Secrets in Error Messages and Stack Traces
  test('Error Objects: Secrets in exception messages, stacks, and nested error properties are redacted', () => {
    const errorPayload = {
      error: 'AuthenticationException',
      message: 'Failed to authenticate with secret: super_secret_token_12345',
      details: {
        rawToken: 'secret_in_key_field',
        unlabeledBlob: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozG4B1s_I_test',
        connectionString: 'postgres://admin:super_secret_db_pass@db.internal:5432/prod',
        cause: {
          code: 'AUTH_FAIL',
          debugInfo: 'Target rejected Bearer test_secret_bearer_token_xyz'
        }
      }
    };

    const redacted = redactJson(errorPayload);
    const jsonStr = JSON.stringify(redacted);

    assert.ok(!jsonStr.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'JWT in error detail must be masked');
    assert.ok(!jsonStr.includes('test_secret_bearer_token_xyz'), 'Bearer token in error debugInfo must be masked');
    assert.ok(!jsonStr.includes('super_secret_token_12345'), 'Secret in exception message must be redacted');
    assert.ok(jsonStr.includes('REDACTED_RAWTOKEN') || jsonStr.includes('REDACTED_RAW_JWT'));
    assert.ok(jsonStr.includes('REDACTED_RAW_JWT'));
    assert.ok(jsonStr.includes('REDACTED_TOKEN'));
  });

  // 4. Nested JSON & Stack Depth Bounds
  test('Nested JSON: Deeply nested object hierarchy (depth > 25) is safely bounded without stack overflow', () => {
    let deepObject = { secret: 'innermost_password_123' };
    for (let i = 0; i < 40; i++) {
      deepObject = { layer: i, nested: deepObject };
    }

    // Should complete cleanly and terminate recursion safely
    const sanitized = redactJson(deepObject);
    const jsonStr = JSON.stringify(sanitized);

    assert.ok(!jsonStr.includes('innermost_password_123'), 'Innermost secret must not be exposed');
    assert.ok(jsonStr.includes('TRUNCATED: Exceeded max JSON nesting depth'));
  });

  // 5. Malformed & Extreme Payloads (256KB Boundary)
  test('Oversized Payload: Text exceeding MAX_EVIDENCE_BYTES (256KB) is truncated', () => {
    const hugeSecret = 'A'.repeat(300 * 1024); // 300 KB
    const sanitized = redactText(hugeSecret);

    assert.ok(sanitized.length <= 265 * 1024);
    assert.ok(sanitized.includes('TRUNCATED: Exceeded max evidence bound of 256KB'));
  });

  // 6. Terminal ANSI Escape Injection Defense
  test('ANSI Escape Injection: Control sequences attempting to forge terminal log outputs are stripped', () => {
    // An attacker sends ANSI sequences: \x1b[2K\x1b[1G\x1b[32m[VERIFIED_REMEDIATED]\x1b[0m to alter console rendering
    const maliciousLog = 'Real status: FAILED\x1b[2K\r\x1b[32m[VERIFIED_REMEDIATED]\x1b[0m';
    const cleaned = stripAnsiEscapes(maliciousLog);

    assert.ok(!cleaned.includes('\x1b['), 'All ANSI escape controls must be stripped');
    assert.equal(cleaned, 'Real status: FAILED\r[VERIFIED_REMEDIATED]');
  });

  // 7. Full Request/Response Evidence Packet Sanitization
  test('Full Evidence Packet: Request and response headers, query parameters, cookies, and bodies are sanitized before persistence', () => {
    const rawEvidence = {
      timestamp: '2026-10-27T12:00:00.000Z',
      request: {
        url: 'https://staging.acmecloud.internal/api/checkout?token=sensitive_query_token_99',
        headers: {
          'Authorization': 'Bearer test_raw_access_token_888',
          'Cookie': 'sessionId=abc123xyz; secret_tracker=top_secret_cookie',
          'X-Api-Key': 'apikey_live_secret_444'
        },
        body: {
          account: '1001',
          credit_card: '4532-1111-2222-3333',
          password: 'super_secret_user_password'
        }
      },
      response: {
        headers: {
          'Set-Cookie': 'session=authenticated_secret_sess_555; Path=/'
        },
        body: {
          status: 'success',
          awsKey: 'AKIAIOSFODNN7EXAMPLE',
          privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0...\n-----END RSA PRIVATE KEY-----'
        }
      }
    };

    const sanitized = redactEvidence(rawEvidence);
    const sanitizedStr = JSON.stringify(sanitized);

    // Verify all sensitive elements are redacted
    assert.ok(!sanitizedStr.includes('test_raw_access_token_888'), 'Bearer token in header must be redacted');
    assert.ok(!sanitizedStr.includes('sensitive_query_token_99'), 'Query parameter token must be redacted');
    assert.ok(!sanitizedStr.includes('top_secret_cookie'), 'Cookie secret must be redacted');
    assert.ok(!sanitizedStr.includes('apikey_live_secret_444'), 'X-Api-Key header must be redacted');
    assert.ok(!sanitizedStr.includes('4532-1111-2222-3333'), 'Credit card must be masked');
    assert.ok(!sanitizedStr.includes('super_secret_user_password'), 'Password in body must be redacted');
    assert.ok(!sanitizedStr.includes('AKIAIOSFODNN7EXAMPLE'), 'AWS Key in body must be redacted');
    assert.ok(!sanitizedStr.includes('MIIEowIBAAKCAQEA0'), 'Private key body must be redacted');
  });

});
