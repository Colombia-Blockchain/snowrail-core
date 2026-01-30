/**
 * SnowRail Backend API Integration Tests
 * Tests for all API endpoints using supertest
 *
 * Run: pnpm --filter @snowrail/backend test
 */

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock the treasury service before importing app
vi.mock('../services/treasury', () => ({
  getTreasuryService: vi.fn().mockResolvedValue(null),
  TreasuryService: vi.fn(),
}));

// Import app after mocks
import app from '../server';

// ============================================================================
// HEALTH ENDPOINT TESTS
// ============================================================================

describe('Health Endpoint', () => {
  it('GET /health - returns healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.sentinel).toBeDefined();
  });
});

// ============================================================================
// SENTINEL ENDPOINTS TESTS
// ============================================================================

describe('Sentinel API', () => {
  describe('POST /v1/sentinel/validate', () => {
    it('returns trust score for valid URL', async () => {
      const response = await request(app)
        .post('/v1/sentinel/validate')
        .send({ url: 'https://google.com' });

      expect(response.status).toBe(200);
      expect(response.body.trustScore).toBeDefined();
      expect(typeof response.body.trustScore).toBe('number');
      expect(response.body.canPay).toBeDefined();
      expect(response.body.risk).toBeDefined();
      expect(response.body.checks).toBeDefined();
      expect(Array.isArray(response.body.checks)).toBe(true);
    });

    it('rejects request without URL', async () => {
      const response = await request(app)
        .post('/v1/sentinel/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL is required');
    });

    it('validates URL with amount', async () => {
      const response = await request(app)
        .post('/v1/sentinel/validate')
        .send({ url: 'https://stripe.com', amount: 100 });

      expect(response.status).toBe(200);
      expect(response.body.trustScore).toBeDefined();
    });
  });

  describe('POST /v1/sentinel/can-pay', () => {
    it('returns canPay status for URL', async () => {
      const response = await request(app)
        .post('/v1/sentinel/can-pay')
        .send({ url: 'https://google.com' });

      expect(response.status).toBe(200);
      expect(response.body.canPay).toBeDefined();
      expect(typeof response.body.canPay).toBe('boolean');
      expect(response.body.trustScore).toBeDefined();
    });

    it('rejects request without URL', async () => {
      const response = await request(app)
        .post('/v1/sentinel/can-pay')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL is required');
    });
  });

  describe('GET /v1/sentinel/trust', () => {
    it('returns trust score for URL query parameter', async () => {
      const response = await request(app)
        .get('/v1/sentinel/trust')
        .query({ url: 'https://github.com' });

      expect(response.status).toBe(200);
      expect(response.body.trust).toBeDefined();
      expect(response.body.trustScore).toBeDefined();
      expect(response.body.risk).toBeDefined();
    });

    it('rejects request without URL parameter', async () => {
      const response = await request(app).get('/v1/sentinel/trust');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL query parameter is required');
    });
  });

  describe('POST /v1/sentinel/decide', () => {
    it('returns decision for URL', async () => {
      const response = await request(app)
        .post('/v1/sentinel/decide')
        .send({ url: 'https://stripe.com', amount: 50 });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('rejects request without URL', async () => {
      const response = await request(app)
        .post('/v1/sentinel/decide')
        .send({ amount: 50 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL is required');
    });
  });
});

// ============================================================================
// X402 PAYMENT ENDPOINTS TESTS
// ============================================================================

describe('X402 Payment API', () => {
  let _testIntentId: string;

  describe('POST /v1/payments/x402/intent', () => {
    it('creates payment intent for trusted URL', async () => {
      const response = await request(app)
        .post('/v1/payments/x402/intent')
        .send({
          url: 'https://google.com',
          amount: 100,
          sender: '0x1234567890123456789012345678901234567890',
          recipient: '0x0987654321098765432109876543210987654321',
        });

      expect(response.status).toBe(200);
      expect(response.body.intent).toBeDefined();
      expect(response.body.intent.id).toBeDefined();
      expect(response.body.validation).toBeDefined();
      expect(response.body.usdcConfig).toBeDefined();

      _testIntentId = response.body.intent.id;
    });

    it('blocks payment intent for untrusted URL', async () => {
      const response = await request(app)
        .post('/v1/payments/x402/intent')
        .send({
          url: 'https://scam-site.xyz',
          amount: 100,
          sender: '0x1234567890123456789012345678901234567890',
          recipient: '0x0987654321098765432109876543210987654321',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Payment blocked by SENTINEL');
      expect(response.body.trustScore).toBeDefined();
    });

    it('rejects request with missing fields', async () => {
      const response = await request(app)
        .post('/v1/payments/x402/intent')
        .send({ url: 'https://google.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('POST /v1/payments/x402/sign', () => {
    it('returns EIP-712 authorization data', async () => {
      // First create an intent
      const intentResponse = await request(app)
        .post('/v1/payments/x402/intent')
        .send({
          url: 'https://google.com',
          amount: 50,
          sender: '0x1234567890123456789012345678901234567890',
          recipient: '0x0987654321098765432109876543210987654321',
        });

      const intentId = intentResponse.body.intent.id;

      const response = await request(app)
        .post('/v1/payments/x402/sign')
        .send({ intentId });

      expect(response.status).toBe(200);
      expect(response.body.intentId).toBe(intentId);
      expect(response.body.authorization).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('rejects request without intentId', async () => {
      const response = await request(app)
        .post('/v1/payments/x402/sign')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('intentId is required');
    });
  });

  describe('POST /v1/payments/x402/confirm', () => {
    it('rejects request without intentId', async () => {
      const response = await request(app)
        .post('/v1/payments/x402/confirm')
        .send({ txHash: '0x123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('intentId is required');
    });

    it('rejects request without txHash or signature', async () => {
      // First create an intent
      const intentResponse = await request(app)
        .post('/v1/payments/x402/intent')
        .send({
          url: 'https://google.com',
          amount: 50,
          sender: '0x1234567890123456789012345678901234567890',
          recipient: '0x0987654321098765432109876543210987654321',
        });

      const response = await request(app)
        .post('/v1/payments/x402/confirm')
        .send({ intentId: intentResponse.body.intent.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Either txHash or signature is required');
    });

    it('returns 503 when treasury service not available for signature mode', async () => {
      // First create an intent and get authorization
      const intentResponse = await request(app)
        .post('/v1/payments/x402/intent')
        .send({
          url: 'https://google.com',
          amount: 50,
          sender: '0x1234567890123456789012345678901234567890',
          recipient: '0x0987654321098765432109876543210987654321',
        });

      const intentId = intentResponse.body.intent.id;

      // Get sign data first
      await request(app).post('/v1/payments/x402/sign').send({ intentId });

      const response = await request(app).post('/v1/payments/x402/confirm').send({
        intentId,
        signature: '0x' + 'a'.repeat(130),
      });

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Treasury service not available');
    });
  });

  describe('POST /v1/payments/x402/execute', () => {
    it('returns 503 when treasury service not available', async () => {
      const response = await request(app).post('/v1/payments/x402/execute').send({
        to: '0x1234567890123456789012345678901234567890',
        amount: 100,
      });

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Treasury service not available');
    });

    it('rejects request with missing fields', async () => {
      const response = await request(app)
        .post('/v1/payments/x402/execute')
        .send({ to: '0x1234567890123456789012345678901234567890' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('to and amount are required');
    });
  });

  describe('GET /v1/payments/x402/status/:intentId', () => {
    it('returns status for valid intent', async () => {
      // First create an intent
      const intentResponse = await request(app)
        .post('/v1/payments/x402/intent')
        .send({
          url: 'https://google.com',
          amount: 50,
          sender: '0x1234567890123456789012345678901234567890',
          recipient: '0x0987654321098765432109876543210987654321',
        });

      const intentId = intentResponse.body.intent.id;

      const response = await request(app).get(`/v1/payments/x402/status/${intentId}`);

      expect(response.status).toBe(200);
      expect(response.body.intent).toBeDefined();
      expect(response.body.paid).toBe(false);
    });

    it('returns 404 for invalid intent', async () => {
      const response = await request(app).get('/v1/payments/x402/status/invalid-id-123');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Intent not found');
    });
  });
});

// ============================================================================
// YUKI ENDPOINTS TESTS
// ============================================================================

describe('YUKI API', () => {
  const testUserId = 'test-user-' + Date.now();

  describe('POST /v1/yuki/chat', () => {
    it('processes chat message and returns response', async () => {
      const response = await request(app).post('/v1/yuki/chat').send({
        userId: testUserId,
        message: 'Hello',
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.role).toBe('assistant');
      expect(response.body.content).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('detects payment intent', async () => {
      const response = await request(app).post('/v1/yuki/chat').send({
        userId: testUserId,
        message: 'Pay $100 to https://google.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.content).toContain('Trust Analysis');
    });

    it('detects trust check intent', async () => {
      const response = await request(app).post('/v1/yuki/chat').send({
        userId: testUserId,
        message: 'Check https://stripe.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.content).toContain('SENTINEL');
    });

    it('returns balance on balance request', async () => {
      const response = await request(app).post('/v1/yuki/chat').send({
        userId: testUserId,
        message: 'balance',
      });

      expect(response.status).toBe(200);
      expect(response.body.content).toContain('Balance');
    });

    it('rejects request with missing fields', async () => {
      const response = await request(app).post('/v1/yuki/chat').send({
        message: 'Hello',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId and message are required');
    });
  });

  describe('GET /v1/yuki/history/:userId', () => {
    it('returns chat history for user', async () => {
      // First send a message to create history
      await request(app).post('/v1/yuki/chat').send({
        userId: testUserId,
        message: 'Test message for history',
      });

      const response = await request(app).get(`/v1/yuki/history/${testUserId}`);

      expect(response.status).toBe(200);
      expect(response.body.messages).toBeDefined();
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBeGreaterThan(0);
    });

    it('returns empty array for new user', async () => {
      const response = await request(app).get('/v1/yuki/history/non-existent-user');

      expect(response.status).toBe(200);
      expect(response.body.messages).toEqual([]);
    });

    it('respects limit parameter', async () => {
      const response = await request(app)
        .get(`/v1/yuki/history/${testUserId}`)
        .query({ limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.messages.length).toBeLessThanOrEqual(1);
    });
  });

  describe('DELETE /v1/yuki/history/:userId', () => {
    it('deletes chat history for user', async () => {
      const deleteUserId = 'delete-test-user-' + Date.now();

      // Create some history
      await request(app).post('/v1/yuki/chat').send({
        userId: deleteUserId,
        message: 'Test message',
      });

      // Delete history
      const deleteResponse = await request(app).delete(`/v1/yuki/history/${deleteUserId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify history is deleted
      const historyResponse = await request(app).get(`/v1/yuki/history/${deleteUserId}`);

      expect(historyResponse.body.messages).toEqual([]);
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not found');
  });

  it('handles invalid JSON gracefully', async () => {
    const response = await request(app)
      .post('/v1/sentinel/validate')
      .set('Content-Type', 'application/json')
      .send('invalid json');

    // Express body-parser returns 400 for invalid JSON, but the error handler catches it as 500
    expect([400, 500]).toContain(response.status);
  });
});
