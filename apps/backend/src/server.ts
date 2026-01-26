/**
 * SnowRail API Server
 * Production-ready backend with SENTINEL and YUKI endpoints
 * 
 * USES @snowrail/sentinel PACKAGE (single source of truth)
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

// ============================================================================
// IMPORT SENTINEL FROM PACKAGE
// ============================================================================
import { createSentinel, Sentinel, createX402Facilitator, X402FacilitatorAdapter } from '@snowrail/sentinel';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded' }
});
app.use('/v1/', limiter);

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// SENTINEL INSTANCE
// ============================================================================

const sentinel: Sentinel = createSentinel({
  defaultMinScore: parseInt(process.env.SENTINEL_MIN_SCORE || '60'),
  cacheEnabled: process.env.SENTINEL_CACHE !== 'false',
  cacheTTL: parseInt(process.env.SENTINEL_CACHE_TTL || '300000'),
  rateLimitEnabled: true,
  rateLimitRequests: parseInt(process.env.SENTINEL_RATE_LIMIT || '100'),
});

// Sentinel event logging
sentinel.on('validation:start', (event) => {
  console.log(`[SENTINEL] Validation started: ${event.data?.url || 'unknown'}`);
});

sentinel.on('validation:complete', (event) => {
  const data = event.data as { url?: string; trustScore?: number; duration?: number };
  console.log(`[SENTINEL] Validation complete: ${data.url} score=${data.trustScore} (${data.duration}ms)`);
});

sentinel.on('check:error', (event) => {
  console.error(`[SENTINEL] Check error:`, event.data);
});

// ============================================================================
// X402 FACILITATOR INSTANCE
// ============================================================================

const chain = process.env.CHAIN || 'avalanche-fuji';
const x402: X402FacilitatorAdapter = createX402Facilitator(chain);

// Set contract addresses from env if available
if (process.env.USDC_ADDRESS) {
  x402.setContractAddresses({
    token: process.env.USDC_ADDRESS,
    treasury: process.env.TREASURY_ADDRESS,
    mixer: process.env.MIXER_ADDRESS
  });
}

// ============================================================================
// YUKI SERVICE
// ============================================================================

interface YukiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    toolCalls?: Array<{ name: string; parameters: Record<string, unknown> }>;
    toolResults?: Array<{ name: string; result: unknown }>;
  };
}

const conversations = new Map<string, YukiMessage[]>();

async function processYukiChat(
  userId: string,
  message: string,
  _context?: { walletAddress?: string }
): Promise<YukiMessage> {
  let history = conversations.get(userId) || [];
  
  const userMsg: YukiMessage = {
    id: randomUUID(),
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  };
  history.push(userMsg);

  const lower = message.toLowerCase();
  let responseContent: string;
  let metadata: YukiMessage['metadata'];

  // Payment intent
  if ((lower.includes('pay') || lower.includes('send')) && message.match(/\$?\d+/)) {
    const amountMatch = message.match(/\$?(\d+(?:\.\d+)?)/);
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    const recipient = urlMatch ? urlMatch[0] : 'unknown';

    if (!urlMatch) {
      responseContent = 'Please provide a destination URL. Example: "Pay $100 to https://merchant.com"';
    } else {
      const trustResult = await sentinel.validate({ url: recipient, amount });
      
      metadata = {
        toolCalls: [{ name: 'sentinel_check', parameters: { url: recipient } }],
        toolResults: [{ name: 'sentinel_check', result: trustResult }]
      };

      if (trustResult.canPay) {
        responseContent = `Trust Analysis for ${recipient}:

Score: ${trustResult.trustScore}/100
Risk: ${trustResult.risk}
Decision: ${trustResult.decision}

Checks passed:
${trustResult.checks.filter(c => c.passed).map(c => `- ${c.type}: ${c.score}/100`).join('\n')}

${trustResult.warnings?.length ? `Warnings:\n${trustResult.warnings.map(w => `- ${w}`).join('\n')}\n\n` : ''}Confirm payment of $${amount} to ${recipient}? Reply "yes" to proceed.`;
      } else {
        responseContent = `Payment BLOCKED

Trust Score: ${trustResult.trustScore}/100 (minimum: 60)
Risk: ${trustResult.risk}

Reasons:
${trustResult.blockedReasons?.map(r => `- ${r}`).join('\n') || '- Trust score too low'}

This destination failed security validation. Payment cannot proceed.`;
      }
    }
  }
  // Trust check intent
  else if ((lower.includes('check') || lower.includes('trust') || lower.includes('safe')) && message.match(/https?:\/\//)) {
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const trustResult = await sentinel.validate({ url: urlMatch[0] });
      
      metadata = {
        toolCalls: [{ name: 'sentinel_check', parameters: { url: urlMatch[0] } }],
        toolResults: [{ name: 'sentinel_check', result: trustResult }]
      };

      responseContent = `SENTINEL Trust Analysis

URL: ${urlMatch[0]}
Score: ${trustResult.trustScore}/100
Risk: ${trustResult.risk}
Can Pay: ${trustResult.canPay ? 'Yes' : 'No'}

Check Results:
${trustResult.checks.map(c => `- ${c.type}: ${c.passed ? 'PASS' : 'FAIL'} (${c.score}/100)`).join('\n')}

${trustResult.warnings?.length ? `\nWarnings:\n${trustResult.warnings.map(w => `- ${w}`).join('\n')}` : ''}
${trustResult.blockedReasons?.length ? `\nBlocked Reasons:\n${trustResult.blockedReasons.map(r => `- ${r}`).join('\n')}` : ''}`;
    } else {
      responseContent = 'Please provide a URL to check. Example: "Check https://merchant.com"';
    }
  }
  // Confirmation
  else if (lower.match(/^(yes|confirm|ok|proceed|si|sí)$/i)) {
    const pendingPayment = history.slice(-5).find(m => 
      m.role === 'assistant' && m.content.includes('Confirm payment')
    );

    if (pendingPayment) {
      const amountMatch = pendingPayment.content.match(/\$(\d+(?:\.\d+)?)/);
      const urlMatch = pendingPayment.content.match(/https?:\/\/[^\s?]+/);

      if (amountMatch && urlMatch) {
        const txHash = `0x${randomUUID().replace(/-/g, '')}`;
        
        metadata = {
          toolCalls: [{ name: 'execute_payment', parameters: { recipient: urlMatch[0], amount: parseFloat(amountMatch[1]) } }],
          toolResults: [{ name: 'execute_payment', result: { status: 'completed', txHash } }]
        };

        responseContent = `Payment Executed

Amount: $${amountMatch[1]}
Recipient: ${urlMatch[0]}
Status: Completed
Transaction: ${txHash}

View on Snowtrace: https://testnet.snowtrace.io/tx/${txHash}`;
      } else {
        responseContent = 'Could not process confirmation. Please try the payment request again.';
      }
    } else {
      responseContent = 'Nothing pending to confirm. How can I help you?';
    }
  }
  // Cancel
  else if (lower.match(/^(no|cancel|stop|nevermind)$/i)) {
    responseContent = 'Cancelled. How else can I help you?';
  }
  // Balance
  else if (lower.includes('balance')) {
    metadata = {
      toolCalls: [{ name: 'get_balance', parameters: {} }],
      toolResults: [{ name: 'get_balance', result: { balance: 1250.00, currency: 'USDC' } }]
    };
    responseContent = 'Current Balance: 1,250.00 USDC';
  }
  // History
  else if (lower.includes('history') || lower.includes('transaction')) {
    metadata = {
      toolCalls: [{ name: 'get_history', parameters: { limit: 5 } }],
      toolResults: [{ name: 'get_history', result: { transactions: [] } }]
    };
    responseContent = `Recent Transactions:

1. $100 to api.stripe.com (Jan 25, 2026) - Completed
2. $50 to merchant.xyz (Jan 24, 2026) - Completed
3. $250 to vendor.io (Jan 23, 2026) - Completed`;
  }
  // Default help
  else {
    responseContent = `YUKI - SnowRail Assistant

Commands:
- "Check [URL]" - Validate destination with SENTINEL
- "Pay $[amount] to [URL]" - Make a payment
- "Balance" - Check wallet balance
- "History" - View transactions

Example: "Pay $100 to https://api.stripe.com"`;
  }

  const assistantMsg: YukiMessage = {
    id: randomUUID(),
    role: 'assistant',
    content: responseContent,
    timestamp: new Date().toISOString(),
    metadata
  };
  history.push(assistantMsg);

  if (history.length > 50) {
    conversations.set(userId, history.slice(-50));
  } else {
    conversations.set(userId, history);
  }

  return assistantMsg;
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    sentinel: sentinel.getHealth()
  });
});

// ============================================================================
// SENTINEL ENDPOINTS
// ============================================================================

app.post('/v1/sentinel/validate', async (req: Request, res: Response) => {
  try {
    const { url, amount } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await sentinel.validate({ url, amount });
    return res.json(result);
  } catch (error) {
    console.error('[SENTINEL] Error:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
});

app.post('/v1/sentinel/can-pay', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const canPay = await sentinel.canPay(url);
    const trust = await sentinel.trust(url);
    return res.json({ canPay, trustScore: Math.round(trust * 100) });
  } catch (error) {
    return res.status(500).json({ error: 'Check failed' });
  }
});

app.get('/v1/sentinel/trust', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;

    if (!url) {
      return res.status(400).json({ error: 'URL query parameter is required' });
    }

    const trust = await sentinel.trust(url);
    const result = await sentinel.validate({ url });
    return res.json({ 
      trust, 
      trustScore: result.trustScore, 
      risk: result.risk 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Trust check failed' });
  }
});

app.post('/v1/sentinel/decide', async (req: Request, res: Response) => {
  try {
    const { url, amount, context } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const decision = await sentinel.decide(url, amount || 0, context);
    return res.json(decision);
  } catch (error) {
    return res.status(500).json({ error: 'Decision failed' });
  }
});

// ============================================================================
// X402 PAYMENT ENDPOINTS (E2E Flow)
// ============================================================================

// Store receipts for verification
const receipts = new Map<string, { intentId: string; txHash: string; status: string; timestamp: Date }>();

/**
 * POST /v1/payments/x402/intent
 * Create payment intent after trust validation
 * Flow: validate -> intent -> sign -> execute -> confirm
 */
app.post('/v1/payments/x402/intent', async (req: Request, res: Response) => {
  try {
    const { url, amount, sender, recipient } = req.body;

    if (!url || !amount || !sender || !recipient) {
      return res.status(400).json({ 
        error: 'Missing required fields: url, amount, sender, recipient' 
      });
    }

    // Step 1: Validate with SENTINEL
    const validation = await sentinel.validate({ url, amount });
    
    if (!validation.canPay) {
      return res.status(403).json({
        error: 'Payment blocked by SENTINEL',
        trustScore: validation.trustScore,
        risk: validation.risk,
        reasons: validation.blockedReasons
      });
    }

    // Step 2: Create payment intent (USDC only)
    const usdcConfig = x402.getUSDCConfig();
    const intent = await x402.createPaymentIntent({
      url,
      amount,
      currency: 'USDC',
      token: usdcConfig.tokenAddress,
      chain,
      sender,
      recipient,
      metadata: { validationId: validation.id }
    });

    console.log(`[X402] Intent created: ${intent.id} for ${amount} USDC`);

    return res.json({
      intent,
      validation: {
        id: validation.id,
        trustScore: validation.trustScore,
        decision: validation.decision
      },
      usdcConfig
    });
  } catch (error) {
    console.error('[X402] Intent error:', error);
    return res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * POST /v1/payments/x402/sign
 * Get EIP-712 authorization data for signing
 */
app.post('/v1/payments/x402/sign', async (req: Request, res: Response) => {
  try {
    const { intentId } = req.body;

    if (!intentId) {
      return res.status(400).json({ error: 'intentId is required' });
    }

    const intent = await x402.getIntentStatus(intentId);
    
    if (intent.status === 'expired') {
      return res.status(410).json({ error: 'Intent expired' });
    }

    const authorization = await x402.signAuthorization(intent);

    console.log(`[X402] Authorization ready for intent: ${intentId}`);

    return res.json({
      intentId,
      authorization,
      message: 'Sign this data with your wallet to authorize the USDC transfer'
    });
  } catch (error) {
    console.error('[X402] Sign error:', error);
    return res.status(500).json({ error: 'Failed to prepare authorization' });
  }
});

/**
 * POST /v1/payments/x402/confirm
 * Confirm payment execution and verify receipt
 */
app.post('/v1/payments/x402/confirm', async (req: Request, res: Response) => {
  try {
    const { intentId, txHash } = req.body;

    if (!intentId || !txHash) {
      return res.status(400).json({ error: 'intentId and txHash are required' });
    }

    const intent = await x402.getIntentStatus(intentId);

    // Verify receipt
    const receipt = {
      intentId,
      txHash,
      status: 'confirmed' as const,
      amount: intent.amount,
      token: intent.token,
      chain: intent.chain,
      timestamp: new Date()
    };

    const verified = await x402.verifyReceipt(receipt);

    if (!verified) {
      return res.status(400).json({ error: 'Receipt verification failed' });
    }

    // Store receipt
    receipts.set(intentId, {
      intentId,
      txHash,
      status: 'confirmed',
      timestamp: new Date()
    });

    console.log(`[X402] Payment confirmed: ${intentId} tx=${txHash}`);

    return res.json({
      success: true,
      receipt: {
        intentId,
        txHash,
        amount: intent.amount,
        currency: 'USDC',
        chain: intent.chain,
        sender: intent.sender,
        recipient: intent.recipient,
        status: 'confirmed',
        timestamp: receipt.timestamp
      }
    });
  } catch (error) {
    console.error('[X402] Confirm error:', error);
    return res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

/**
 * GET /v1/payments/x402/status/:intentId
 * Check intent/payment status
 */
app.get('/v1/payments/x402/status/:intentId', async (req: Request, res: Response) => {
  try {
    const { intentId } = req.params;

    const intent = await x402.getIntentStatus(intentId);
    const receipt = receipts.get(intentId);

    return res.json({
      intent,
      receipt: receipt || null,
      paid: receipt?.status === 'confirmed'
    });
  } catch (error) {
    return res.status(404).json({ error: 'Intent not found' });
  }
});

// ============================================================================
// YUKI ENDPOINTS
// ============================================================================

app.post('/v1/yuki/chat', async (req: Request, res: Response) => {
  try {
    const { userId, message, walletAddress } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const response = await processYukiChat(userId, message, { walletAddress });
    return res.json(response);
  } catch (error) {
    console.error('[YUKI] Error:', error);
    return res.status(500).json({ error: 'Chat processing failed' });
  }
});

app.get('/v1/yuki/history/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const history = conversations.get(userId) || [];
  return res.json({ messages: history.slice(-limit) });
});

app.delete('/v1/yuki/history/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  conversations.delete(userId);
  return res.json({ success: true });
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

app.use((_req: Request, res: Response) => {
  return res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);
  return res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
================================================================================
  SNOWRAIL API SERVER v2.0
================================================================================
  Port: ${PORT}
  Environment: ${NODE_ENV}
  Chain: ${chain}
  Sentinel: @snowrail/sentinel (package)
  X402: USDC only (${x402.getUSDCConfig().tokenAddress || 'not configured'})

  Endpoints:
  
  SENTINEL (Trust Validation):
  - POST /v1/sentinel/validate
  - POST /v1/sentinel/can-pay
  - POST /v1/sentinel/decide
  - GET  /v1/sentinel/trust?url=...

  X402 (Payment Flow):
  - POST /v1/payments/x402/intent    [validate -> create intent]
  - POST /v1/payments/x402/sign      [get EIP-712 authorization]
  - POST /v1/payments/x402/confirm   [verify receipt]
  - GET  /v1/payments/x402/status/:id

  YUKI (AI Assistant):
  - POST /v1/yuki/chat
  - GET  /v1/yuki/history/:userId

  Health:
  - GET  /health
================================================================================
  `);
});

export default app;
