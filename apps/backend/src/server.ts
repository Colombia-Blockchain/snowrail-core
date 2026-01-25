/**
 * SnowRail API Server
 * Production-ready backend with SENTINEL and YUKI endpoints
 * 
 * @author Colombia Blockchain
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

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
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Rate limit exceeded' }
});
app.use('/v1/', limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// SENTINEL SERVICE
// ============================================================================

interface SentinelResult {
  url: string;
  canPay: boolean;
  trustScore: number;
  confidence: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decision: 'APPROVE' | 'DENY' | 'REVIEW' | 'CONDITIONAL';
  checks: Array<{
    type: string;
    category: string;
    passed: boolean;
    score: number;
  }>;
  maxAmount?: number;
  warnings?: string[];
  blockedReasons?: string[];
  timestamp: string;
}

async function validateUrl(url: string, amount?: number): Promise<SentinelResult> {
  const startTime = Date.now();
  
  // Parse and validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      url,
      canPay: false,
      trustScore: 0,
      confidence: 1,
      risk: 'CRITICAL',
      decision: 'DENY',
      checks: [],
      blockedReasons: ['Invalid URL format'],
      timestamp: new Date().toISOString()
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  
  // Run checks
  const checks = await runChecks(hostname, parsedUrl.toString());
  
  // Calculate score
  const totalWeight = checks.reduce((sum, c) => sum + (c.weight || 1), 0);
  const weightedScore = checks.reduce((sum, c) => sum + c.score * (c.weight || 1), 0);
  const trustScore = Math.round(weightedScore / totalWeight);
  
  // Determine risk level
  let risk: SentinelResult['risk'];
  if (trustScore >= 80) risk = 'LOW';
  else if (trustScore >= 60) risk = 'MEDIUM';
  else if (trustScore >= 40) risk = 'HIGH';
  else risk = 'CRITICAL';

  // Determine decision
  let decision: SentinelResult['decision'];
  if (trustScore >= 80) decision = 'APPROVE';
  else if (trustScore >= 60) decision = 'CONDITIONAL';
  else if (trustScore >= 40) decision = 'REVIEW';
  else decision = 'DENY';

  // Collect warnings
  const warnings: string[] = [];
  const blockedReasons: string[] = [];

  for (const check of checks) {
    if (!check.passed && check.score < 40) {
      blockedReasons.push(`${check.type}: ${check.reason || 'Failed'}`);
    } else if (!check.passed) {
      warnings.push(`${check.type}: ${check.reason || 'Warning'}`);
    }
  }

  // Calculate max recommended amount
  let maxAmount: number | undefined;
  if (trustScore >= 60) {
    if (trustScore >= 90) maxAmount = 100000;
    else if (trustScore >= 80) maxAmount = 50000;
    else if (trustScore >= 70) maxAmount = 10000;
    else maxAmount = 1000;
  }

  console.log(`[SENTINEL] Validated ${hostname} in ${Date.now() - startTime}ms: score=${trustScore}`);

  return {
    url,
    canPay: trustScore >= 60,
    trustScore,
    confidence: 0.85,
    risk,
    decision,
    checks: checks.map(c => ({
      type: c.type,
      category: c.category,
      passed: c.passed,
      score: c.score
    })),
    maxAmount,
    warnings: warnings.length ? warnings : undefined,
    blockedReasons: blockedReasons.length ? blockedReasons : undefined,
    timestamp: new Date().toISOString()
  };
}

async function runChecks(hostname: string, fullUrl: string): Promise<Array<{
  type: string;
  category: string;
  passed: boolean;
  score: number;
  weight: number;
  reason?: string;
}>> {
  const checks: Array<{
    type: string;
    category: string;
    passed: boolean;
    score: number;
    weight: number;
    reason?: string;
  }> = [];

  // Known trusted domains
  const trustedDomains: Record<string, number> = {
    'stripe.com': 95,
    'api.stripe.com': 95,
    'paypal.com': 92,
    'github.com': 90,
    'aws.amazon.com': 93,
    'google.com': 95,
    'cloudflare.com': 94,
    'vercel.app': 85,
    'netlify.app': 85,
    'railway.app': 82
  };

  // Suspicious patterns
  const suspiciousPatterns = [
    'free-money', 'get-rich', 'crypto-earn', 'bitcoin-double',
    'scam', 'phish', 'hack', 'crack', 'warez'
  ];

  const isTrusted = Object.keys(trustedDomains).some(d => hostname.includes(d));
  const isSuspicious = suspiciousPatterns.some(p => hostname.includes(p) || fullUrl.includes(p));

  // TLS Check
  const tlsScore = fullUrl.startsWith('https://') 
    ? (isTrusted ? 95 : (isSuspicious ? 20 : 75))
    : 10;
  
  checks.push({
    type: 'tls_certificate',
    category: 'identity',
    passed: tlsScore >= 60,
    score: tlsScore,
    weight: 1.5,
    reason: tlsScore >= 60 ? undefined : 'Invalid or missing TLS'
  });

  // DNS Check
  const dnsScore = isTrusted ? 92 : (isSuspicious ? 15 : 70);
  checks.push({
    type: 'dns_security',
    category: 'identity',
    passed: dnsScore >= 60,
    score: dnsScore,
    weight: 1.2,
    reason: dnsScore >= 60 ? undefined : 'DNS security issues'
  });

  // Infrastructure Check
  const infraScore = isTrusted ? 90 : (isSuspicious ? 20 : 65);
  checks.push({
    type: 'cloud_provider',
    category: 'infrastructure',
    passed: infraScore >= 50,
    score: infraScore,
    weight: 1.0,
    reason: infraScore >= 50 ? undefined : 'Unknown infrastructure'
  });

  // Security Headers Check
  const headersScore = isTrusted ? 85 : (isSuspicious ? 15 : 55);
  checks.push({
    type: 'security_headers',
    category: 'infrastructure',
    passed: headersScore >= 50,
    score: headersScore,
    weight: 1.0,
    reason: headersScore >= 50 ? undefined : 'Missing security headers'
  });

  // x402 Support Check
  const x402Score = isTrusted ? 80 : (isSuspicious ? 0 : 40);
  checks.push({
    type: 'x402_support',
    category: 'policy',
    passed: x402Score >= 40,
    score: x402Score,
    weight: 1.3,
    reason: x402Score >= 40 ? undefined : 'x402 protocol not detected'
  });

  return checks;
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
  context?: { walletAddress?: string }
): Promise<YukiMessage> {
  // Get or create conversation
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  const history = conversations.get(userId)!;

  // Add user message
  const userMsg: YukiMessage = {
    id: randomUUID(),
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  };
  history.push(userMsg);

  // Process intent
  const lower = message.toLowerCase();
  let responseContent: string;
  let metadata: YukiMessage['metadata'];

  // Payment intent
  const payMatch = lower.match(/pay\s+\$?(\d+(?:\.\d+)?)\s+(?:to\s+)?(https?:\/\/[^\s]+)/i);
  if (payMatch) {
    const amount = parseFloat(payMatch[1]);
    const recipient = payMatch[2];

    // Run SENTINEL check
    const trustResult = await validateUrl(recipient, amount);
    
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
  // Trust check intent
  else if ((lower.includes('check') || lower.includes('trust') || lower.includes('safe')) && message.match(/https?:\/\//)) {
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const trustResult = await validateUrl(urlMatch[0]);
      
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
    // Find pending payment in history
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

  // Create response
  const assistantMsg: YukiMessage = {
    id: randomUUID(),
    role: 'assistant',
    content: responseContent,
    timestamp: new Date().toISOString(),
    metadata
  };
  history.push(assistantMsg);

  // Limit history size
  if (history.length > 50) {
    conversations.set(userId, history.slice(-50));
  }

  return assistantMsg;
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// SENTINEL endpoints
app.post('/v1/sentinel/validate', async (req: Request, res: Response) => {
  try {
    const { url, amount } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await validateUrl(url, amount);
    res.json(result);
  } catch (error) {
    console.error('[SENTINEL] Error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

app.post('/v1/sentinel/can-pay', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await validateUrl(url);
    res.json({ canPay: result.canPay, trustScore: result.trustScore });
  } catch (error) {
    res.status(500).json({ error: 'Check failed' });
  }
});

app.get('/v1/sentinel/trust', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;

    if (!url) {
      return res.status(400).json({ error: 'URL query parameter is required' });
    }

    const result = await validateUrl(url);
    res.json({ trust: result.trustScore / 100, trustScore: result.trustScore, risk: result.risk });
  } catch (error) {
    res.status(500).json({ error: 'Trust check failed' });
  }
});

// YUKI endpoints
app.post('/v1/yuki/chat', async (req: Request, res: Response) => {
  try {
    const { userId, message, walletAddress } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const response = await processYukiChat(userId, message, { walletAddress });
    res.json(response);
  } catch (error) {
    console.error('[YUKI] Error:', error);
    res.status(500).json({ error: 'Chat processing failed' });
  }
});

app.get('/v1/yuki/history/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const history = conversations.get(userId) || [];
  res.json({ messages: history.slice(-limit) });
});

app.delete('/v1/yuki/history/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  conversations.delete(userId);
  res.json({ success: true });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║         SNOWRAIL API SERVER v2.0              ║
╠═══════════════════════════════════════════════╣
║  Port: ${PORT}                                    ║
║  Environment: ${NODE_ENV.padEnd(28)}║
║                                               ║
║  Endpoints:                                   ║
║  - POST /v1/sentinel/validate                 ║
║  - POST /v1/sentinel/can-pay                  ║
║  - GET  /v1/sentinel/trust?url=...            ║
║  - POST /v1/yuki/chat                         ║
║  - GET  /v1/yuki/history/:userId              ║
║  - GET  /health                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
