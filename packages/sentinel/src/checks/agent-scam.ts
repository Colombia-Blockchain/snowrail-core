/**
 * @snowrail/sentinel - Agent Economy Scam Detection
 * Detects scams specific to AI agent autonomous payments
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

import {
  CheckResult,
  CheckType,
  CheckCategory,
  RiskLevel,
  ValidationRequest
} from '../types';
import { BaseCheck } from './base';

/**
 * Agent Scam Detection Check
 * 
 * Detects scams specific to agentic economy:
 * - Fake AI service endpoints
 * - Malicious agent impersonation
 * - Prompt injection payment scams
 * - Fake API key sellers
 * - Credential harvesting
 * - Infinite loop payment traps
 * - Agent-to-agent fraud
 */
export class AgentScamCheck extends BaseCheck {
  public readonly type = CheckType.COMMUNITY_REPORTS;
  public readonly category = CheckCategory.REPUTATION;
  public readonly name = 'Agent Scam Detection';
  public readonly description = 'Detects scams targeting AI agents and autonomous payments';

  // Known scam domains in agent ecosystem
  private readonly SCAM_DOMAINS = new Set([
    'free-openai-api.com',
    'gpt-free-credits.xyz',
    'ai-money-maker.io',
    'auto-trading-ai.net',
    'chatgpt-unlimited.top',
    'anthropic-free.com',
    'claude-api-free.xyz',
    'agent-airdrop.io',
    'ai-passive-income.net',
    'llm-arbitrage.com'
  ]);

  // Scam URL patterns
  private readonly SCAM_URL_PATTERNS = [
    /free[_-]?api[_-]?key/i,
    /unlimited[_-]?tokens?/i,
    /free[_-]?gpt/i,
    /free[_-]?claude/i,
    /auto[_-]?profit/i,
    /guaranteed[_-]?returns?/i,
    /passive[_-]?income/i,
    /ai[_-]?trading[_-]?bot/i,
    /agent[_-]?airdrop/i,
    /claim[_-]?free[_-]?token/i,
    /100x[_-]?returns?/i,
    /risk[_-]?free[_-]?ai/i,
    /no[_-]?loss[_-]?trading/i,
    /ai[_-]?arbitrage/i,
    /llm[_-]?mining/i
  ];

  // Prompt injection payment patterns
  private readonly PROMPT_INJECTION_PATTERNS = [
    /ignore\s+(previous|all)\s+instructions/i,
    /disregard\s+safety/i,
    /bypass\s+payment\s+limits/i,
    /send\s+all\s+funds/i,
    /emergency\s+transfer/i,
    /urgent\s+payment\s+required/i,
    /admin\s+override/i,
    /system\s+prompt/i,
    /jailbreak/i,
    /unlimited\s+spending/i
  ];

  // Fake agent impersonation patterns
  private readonly IMPERSONATION_PATTERNS = [
    { pattern: /openai/i, legitimate: ['api.openai.com', 'openai.com', 'platform.openai.com'] },
    { pattern: /anthropic/i, legitimate: ['api.anthropic.com', 'anthropic.com', 'console.anthropic.com'] },
    { pattern: /claude/i, legitimate: ['claude.ai', 'api.anthropic.com'] },
    { pattern: /gpt/i, legitimate: ['api.openai.com', 'chat.openai.com'] },
    { pattern: /huggingface/i, legitimate: ['huggingface.co', 'api.huggingface.co'] },
    { pattern: /replicate/i, legitimate: ['replicate.com', 'api.replicate.com'] }
  ];

  // Agent fraud behavioral patterns
  private readonly FRAUD_BEHAVIORS = [
    'recursive_payment_request',
    'escalating_amounts',
    'rapid_fire_requests',
    'identity_switching',
    'context_manipulation'
  ];

  public async execute(request: ValidationRequest): Promise<CheckResult> {
    const startTime = Date.now();
    const url = this.parseUrl(request.url);
    
    if (!url) {
      return this.failure(0, 1.0, RiskLevel.CRITICAL, {
        error: 'Invalid URL',
        url: request.url
      });
    }

    const hostname = url.hostname.toLowerCase();
    const fullUrl = request.url.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    
    const findings: string[] = [];
    const threats: string[] = [];
    let score = 80; // Start optimistic
    let risk = RiskLevel.LOW;

    // 1. Check known scam domains
    if (this.SCAM_DOMAINS.has(hostname)) {
      return this.failure(0, 1.0, RiskLevel.CRITICAL, {
        hostname,
        blocked: true,
        reason: 'KNOWN_SCAM_DOMAIN',
        message: 'Domain is on the agent scam blacklist',
        threats: ['known_scam_domain']
      }, [
        this.createEvidence('external', 'scam_blacklist', { hostname }, true)
      ]);
    }

    // 2. Check scam URL patterns
    for (const pattern of this.SCAM_URL_PATTERNS) {
      if (pattern.test(fullUrl)) {
        threats.push('scam_url_pattern');
        findings.push(`Scam pattern detected: ${pattern.source}`);
        score -= 35;
        risk = RiskLevel.CRITICAL;
      }
    }

    // 3. Check for prompt injection attempts
    const injectionAttempt = this.detectPromptInjection(request);
    if (injectionAttempt.detected) {
      threats.push('prompt_injection');
      findings.push(`Prompt injection attempt: ${injectionAttempt.pattern}`);
      score -= 50;
      risk = RiskLevel.CRITICAL;
    }

    // 4. Check for impersonation
    const impersonation = this.detectImpersonation(hostname);
    if (impersonation.detected) {
      threats.push('impersonation');
      findings.push(`Impersonating: ${impersonation.target} (legitimate: ${impersonation.legitimate})`);
      score -= 40;
      risk = RiskLevel.CRITICAL;
    }

    // 5. Check for credential harvesting
    const credentialHarvesting = this.detectCredentialHarvesting(url, pathname);
    if (credentialHarvesting.detected) {
      threats.push('credential_harvesting');
      findings.push(`Credential harvesting: ${credentialHarvesting.type}`);
      score -= 30;
      risk = RiskLevel.HIGH;
    }

    // 6. Check payment context for fraud patterns
    const paymentFraud = this.analyzePaymentContext(request);
    if (paymentFraud.suspicious) {
      threats.push(...paymentFraud.patterns);
      findings.push(...paymentFraud.findings);
      score -= paymentFraud.severity;
      if (paymentFraud.severity >= 30) risk = RiskLevel.HIGH;
    }

    // 7. Check for infinite loop traps
    const loopTrap = this.detectLoopTrap(url, request);
    if (loopTrap.detected) {
      threats.push('infinite_loop_trap');
      findings.push('WARNING: Potential infinite payment loop detected');
      score -= 25;
      risk = RiskLevel.HIGH;
    }

    // 8. Positive signals
    if (threats.length === 0) {
      findings.push('No scam patterns detected');
      if (this.hasPositiveSignals(hostname, url)) {
        score += 10;
        findings.push('Positive trust signals found');
      }
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));
    
    // Final risk assessment
    if (threats.length >= 3 || score < 20) risk = RiskLevel.CRITICAL;
    else if (threats.length >= 2 || score < 40) risk = RiskLevel.HIGH;
    else if (threats.length >= 1 || score < 60) risk = RiskLevel.MEDIUM;
    else if (score >= 80) risk = RiskLevel.NONE;

    const duration = Date.now() - startTime;
    const passed = threats.length === 0 && score >= 50;

    const result = {
      hostname,
      threatsDetected: threats.length,
      threats,
      findings,
      scamProbability: Math.max(0, 100 - score) + '%',
      agentSafe: threats.length === 0 && score >= 70,
      recommendation: this.getScamRecommendation(threats, score)
    };

    if (passed) {
      return { ...this.success(score, 0.85, result), duration };
    } else {
      return { ...this.failure(score, 0.9, risk, result), duration };
    }
  }

  private detectPromptInjection(request: ValidationRequest): { detected: boolean; pattern?: string } {
    const textToCheck = [
      request.url,
      JSON.stringify(request.metadata || {}),
      request.recipient || ''
    ].join(' ');

    for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(textToCheck)) {
        return { detected: true, pattern: pattern.source };
      }
    }

    return { detected: false };
  }

  private detectImpersonation(hostname: string): { detected: boolean; target?: string; legitimate?: string } {
    for (const { pattern, legitimate } of this.IMPERSONATION_PATTERNS) {
      if (pattern.test(hostname)) {
        // Check if it's actually a legitimate domain
        const isLegitimate = legitimate.some(l => 
          hostname === l || hostname.endsWith('.' + l)
        );
        
        if (!isLegitimate) {
          return {
            detected: true,
            target: pattern.source.replace(/[/\\^$*+?.()|[\]{}]/g, ''),
            legitimate: legitimate[0]
          };
        }
      }
    }

    return { detected: false };
  }

  private detectCredentialHarvesting(url: URL, pathname: string): { detected: boolean; type?: string } {
    // Check for API key harvesting
    if (pathname.includes('api-key') || pathname.includes('apikey')) {
      if (!url.hostname.match(/^(api\.|console\.)/)) {
        return { detected: true, type: 'api_key_phishing' };
      }
    }

    // Check for OAuth harvesting
    if (pathname.includes('oauth') || pathname.includes('authorize')) {
      const suspiciousTLDs = ['.xyz', '.top', '.click', '.tk'];
      if (suspiciousTLDs.some(tld => url.hostname.endsWith(tld))) {
        return { detected: true, type: 'oauth_phishing' };
      }
    }

    // Check for wallet connection scams
    if (pathname.includes('connect-wallet') || pathname.includes('wallet-connect')) {
      if (!url.hostname.includes('walletconnect.')) {
        return { detected: true, type: 'wallet_phishing' };
      }
    }

    return { detected: false };
  }

  private analyzePaymentContext(request: ValidationRequest): {
    suspicious: boolean;
    patterns: string[];
    findings: string[];
    severity: number;
  } {
    const patterns: string[] = [];
    const findings: string[] = [];
    let severity = 0;

    // Check amount anomalies
    if (request.amount) {
      if (request.amount > 10000) {
        patterns.push('high_value_transaction');
        findings.push('WARNING: Unusually high transaction amount');
        severity += 15;
      }
      
      // Check for suspicious round numbers
      if (request.amount % 1000 === 0 && request.amount >= 5000) {
        patterns.push('suspicious_round_amount');
        findings.push('Suspicious round number amount');
        severity += 5;
      }
    }

    // Check for urgency manipulation
    const urgencyKeywords = ['urgent', 'immediate', 'now', 'emergency', 'quick'];
    const urlLower = request.url.toLowerCase();
    if (urgencyKeywords.some(k => urlLower.includes(k))) {
      patterns.push('urgency_manipulation');
      findings.push('Urgency language detected');
      severity += 10;
    }

    // Check metadata for fraud signals
    if (request.metadata) {
      const metaStr = JSON.stringify(request.metadata).toLowerCase();
      if (metaStr.includes('guaranteed') || metaStr.includes('risk-free')) {
        patterns.push('false_promises');
        findings.push('False promise language in metadata');
        severity += 15;
      }
    }

    return {
      suspicious: patterns.length > 0,
      patterns,
      findings,
      severity
    };
  }

  private detectLoopTrap(url: URL, request: ValidationRequest): { detected: boolean } {
    // Check for recursive URL patterns
    const pathname = url.pathname;
    
    // Pattern: URLs that might cause infinite callbacks
    if (pathname.includes('/callback/') && pathname.includes('/pay/')) {
      return { detected: true };
    }
    
    // Pattern: Self-referencing payment loops
    if (pathname.match(/\/pay\/.*\/pay\//)) {
      return { detected: true };
    }

    // Check for webhook loops
    if (pathname.includes('/webhook') && pathname.includes('/trigger')) {
      return { detected: true };
    }

    return { detected: false };
  }

  private hasPositiveSignals(hostname: string, url: URL): boolean {
    // Check for positive trust indicators
    const positiveSignals = [
      hostname.startsWith('api.'),
      url.protocol === 'https:',
      hostname.endsWith('.com') || hostname.endsWith('.io') || hostname.endsWith('.ai'),
      url.pathname.includes('/v1/') || url.pathname.includes('/v2/'),
      !hostname.includes('-') || hostname.split('-').length <= 2
    ];

    return positiveSignals.filter(Boolean).length >= 3;
  }

  private getScamRecommendation(threats: string[], score: number): string {
    if (threats.includes('prompt_injection')) {
      return 'CRITICAL: Prompt injection detected - Block all payment requests';
    }
    if (threats.includes('impersonation')) {
      return 'CRITICAL: Service impersonation detected - Do not trust this endpoint';
    }
    if (threats.includes('known_scam_domain')) {
      return 'BLOCKED: Known scam domain - No autonomous payments allowed';
    }
    if (threats.length > 0) {
      return `WARNING: ${threats.length} threat(s) detected - Require human approval`;
    }
    if (score >= 80) {
      return 'SAFE: No scam indicators - Autonomous payment allowed';
    }
    return 'MODERATE: Proceed with caution and verify recipient';
  }
}

/**
 * Factory function
 */
export function createAgentScamCheck(config: import('../types').SentinelConfig): AgentScamCheck {
  return new AgentScamCheck(config);
}
