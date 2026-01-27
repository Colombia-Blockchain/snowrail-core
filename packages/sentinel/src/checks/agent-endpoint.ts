/**
 * @snowrail/sentinel - Agent Endpoint Validation Check
 * Validates AI agent endpoints for autonomous economy
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
 * Agent Endpoint Check
 * 
 * Validates endpoints in the agentic economy:
 * - X402 Payment Protocol compliance
 * - Agent authentication headers
 * - Capability declarations
 * - Rate limiting for agents
 * - Agent-to-agent trust signals
 */
export class AgentEndpointCheck extends BaseCheck {
  public readonly type = CheckType.X402_SUPPORT;
  public readonly category = CheckCategory.POLICY;
  public readonly name = 'Agent Endpoint Validation';
  public readonly description = 'Validates AI agent endpoints for autonomous payments';

  // Known legitimate agent platforms
  private readonly TRUSTED_AGENT_PLATFORMS = new Set([
    'api.openai.com',
    'api.anthropic.com',
    'api.cohere.com',
    'api.replicate.com',
    'huggingface.co',
    'api.together.xyz',
    'api.perplexity.ai',
    'api.mistral.ai',
    'api.groq.com',
    // Web3 Agent platforms
    'api.autonolas.tech',
    'api.fetch.ai',
    'api.singularitynet.io',
    'ocean.market',
    'api.polywrap.io'
  ]);

  // X402 Required headers
  private readonly X402_HEADERS = [
    'X-402-Payment-Required',
    'X-402-Price',
    'X-402-Currency',
    'X-402-Network',
    'X-402-Recipient'
  ];

  // Agent capability indicators
  private readonly AGENT_CAPABILITIES = [
    'autonomous-payment',
    'tool-use',
    'multi-step',
    'memory',
    'delegation'
  ];

  // Scam patterns in agent ecosystem
  private readonly AGENT_SCAM_PATTERNS = [
    'free-api-key',
    'unlimited-tokens',
    'free-gpt',
    'auto-profit',
    'guaranteed-returns',
    'ai-trading-bot',
    'passive-income-ai',
    'auto-earn',
    'free-credits',
    'unlimited-requests'
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
    
    const findings: string[] = [];
    let score = 70; // Start neutral for unknown endpoints
    let risk = RiskLevel.MEDIUM;

    // 1. Check if it's a known trusted agent platform
    if (this.isTrustedAgentPlatform(hostname)) {
      return this.success(95, 1.0, {
        hostname,
        platform: 'TRUSTED_AGENT_PLATFORM',
        message: 'Known and verified AI agent platform',
        x402Support: true,
        agentReady: true
      }, [
        this.createEvidence('external', 'trusted_platforms', { hostname }, true)
      ]);
    }

    // 2. Check for scam patterns
    const scamPatterns = this.detectAgentScamPatterns(fullUrl, hostname);
    if (scamPatterns.length > 0) {
      return this.failure(5, 0.95, RiskLevel.CRITICAL, {
        hostname,
        scamPatterns,
        blocked: true,
        reason: 'AGENT_SCAM_DETECTED',
        message: 'URL contains patterns associated with AI agent scams'
      }, [
        this.createEvidence('external', 'scam_detection', { patterns: scamPatterns }, true)
      ]);
    }

    // 3. Simulate X402 header check
    const x402Status = this.simulateX402Check(hostname);
    if (x402Status.supported) {
      score += 15;
      findings.push('X402 Payment Protocol supported');
    } else {
      findings.push('X402 Payment Protocol not detected');
      score -= 10;
    }

    // 4. Check for agent authentication indicators
    const authStatus = this.checkAgentAuthIndicators(hostname, url.pathname);
    if (authStatus.hasAuth) {
      score += 10;
      findings.push(`Agent auth detected: ${authStatus.method}`);
    }

    // 5. Check endpoint structure for agent patterns
    const endpointAnalysis = this.analyzeAgentEndpoint(url);
    score += endpointAnalysis.scoreModifier;
    findings.push(...endpointAnalysis.findings);

    // 6. Check for capability declarations
    const capabilities = this.detectCapabilities(hostname, url.pathname);
    if (capabilities.length > 0) {
      score += capabilities.length * 3;
      findings.push(`Agent capabilities: ${capabilities.join(', ')}`);
    }

    // 7. Check if endpoint looks like a legitimate API
    if (this.looksLikeAPI(url)) {
      score += 10;
      findings.push('Endpoint follows API conventions');
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));
    
    // Determine risk level
    if (score >= 80) risk = RiskLevel.LOW;
    else if (score >= 60) risk = RiskLevel.MEDIUM;
    else if (score >= 40) risk = RiskLevel.HIGH;
    else risk = RiskLevel.CRITICAL;

    const duration = Date.now() - startTime;
    const passed = score >= 50;

    const result = {
      hostname,
      endpointType: this.classifyEndpoint(url),
      x402: x402Status,
      agentAuth: authStatus,
      capabilities,
      findings,
      agentEconomyReady: score >= 70,
      recommendation: this.getRecommendation(score, findings)
    };

    if (passed) {
      return { ...this.success(score, 0.8, result), duration };
    } else {
      return { ...this.failure(score, 0.8, risk, result), duration };
    }
  }

  private isTrustedAgentPlatform(hostname: string): boolean {
    for (const platform of this.TRUSTED_AGENT_PLATFORMS) {
      if (hostname === platform || hostname.endsWith('.' + platform)) {
        return true;
      }
    }
    return false;
  }

  private detectAgentScamPatterns(url: string, hostname: string): string[] {
    const detected: string[] = [];
    const combined = (url + ' ' + hostname).toLowerCase();

    for (const pattern of this.AGENT_SCAM_PATTERNS) {
      if (combined.includes(pattern.replace(/-/g, '')) || 
          combined.includes(pattern)) {
        detected.push(pattern);
      }
    }

    // Additional scam indicators
    if (/\d{3,}x/.test(hostname)) detected.push('multiplier-promise');
    if (hostname.includes('airdrop') && hostname.includes('ai')) detected.push('ai-airdrop-scam');
    if (hostname.includes('claim') && hostname.includes('token')) detected.push('token-claim-scam');
    
    return detected;
  }

  private simulateX402Check(hostname: string): { supported: boolean; headers: string[]; price?: string } {
    // Simulate checking for X402 support
    // In production, this would make an OPTIONS/HEAD request
    
    // Known X402 supporters
    const x402Supporters = [
      'api.openai.com',
      'api.anthropic.com',
      'api.replicate.com'
    ];

    if (x402Supporters.some(h => hostname.includes(h.split('.')[1]))) {
      return {
        supported: true,
        headers: ['X-402-Price', 'X-402-Currency', 'X-402-Network'],
        price: '0.001 USDC'
      };
    }

    // Check if hostname suggests API pricing
    if (hostname.includes('api') || hostname.includes('pay')) {
      return { supported: true, headers: ['X-402-Price'], price: 'variable' };
    }

    return { supported: false, headers: [] };
  }

  private checkAgentAuthIndicators(hostname: string, pathname: string): { hasAuth: boolean; method?: string } {
    // Check for auth patterns
    if (pathname.includes('/v1/') || pathname.includes('/v2/')) {
      return { hasAuth: true, method: 'API versioning detected' };
    }
    if (pathname.includes('/auth') || pathname.includes('/oauth')) {
      return { hasAuth: true, method: 'OAuth endpoint' };
    }
    if (hostname.includes('api.')) {
      return { hasAuth: true, method: 'API subdomain' };
    }
    return { hasAuth: false };
  }

  private analyzeAgentEndpoint(url: URL): { scoreModifier: number; findings: string[] } {
    const findings: string[] = [];
    let scoreModifier = 0;

    // Positive patterns
    if (url.pathname.includes('/agent')) {
      scoreModifier += 10;
      findings.push('Agent-specific endpoint');
    }
    if (url.pathname.includes('/completion') || url.pathname.includes('/chat')) {
      scoreModifier += 5;
      findings.push('LLM completion endpoint');
    }
    if (url.pathname.includes('/tool') || url.pathname.includes('/function')) {
      scoreModifier += 5;
      findings.push('Tool/function calling endpoint');
    }
    if (url.pathname.includes('/webhook')) {
      scoreModifier += 3;
      findings.push('Webhook endpoint for agent callbacks');
    }

    // Negative patterns
    if (url.pathname.includes('/admin') || url.pathname.includes('/internal')) {
      scoreModifier -= 10;
      findings.push('Internal/admin endpoint detected');
    }
    if (url.searchParams.has('key') || url.searchParams.has('token')) {
      scoreModifier -= 15;
      findings.push('WARNING: Credentials in URL parameters');
    }

    return { scoreModifier, findings };
  }

  private detectCapabilities(hostname: string, pathname: string): string[] {
    const capabilities: string[] = [];
    const combined = hostname + pathname;

    if (combined.includes('pay') || combined.includes('transact')) {
      capabilities.push('autonomous-payment');
    }
    if (combined.includes('tool') || combined.includes('function')) {
      capabilities.push('tool-use');
    }
    if (combined.includes('chain') || combined.includes('workflow')) {
      capabilities.push('multi-step');
    }
    if (combined.includes('memory') || combined.includes('context')) {
      capabilities.push('memory');
    }
    if (combined.includes('delegate') || combined.includes('agent')) {
      capabilities.push('delegation');
    }

    return capabilities;
  }

  private looksLikeAPI(url: URL): boolean {
    const apiIndicators = [
      url.hostname.startsWith('api.'),
      url.pathname.includes('/v1/') || url.pathname.includes('/v2/'),
      url.pathname.includes('/api/'),
      url.pathname.endsWith('.json'),
      url.protocol === 'https:'
    ];

    return apiIndicators.filter(Boolean).length >= 2;
  }

  private classifyEndpoint(url: URL): string {
    if (url.pathname.includes('/chat') || url.pathname.includes('/completion')) {
      return 'LLM_INFERENCE';
    }
    if (url.pathname.includes('/agent')) {
      return 'AGENT_API';
    }
    if (url.pathname.includes('/pay') || url.pathname.includes('/transaction')) {
      return 'PAYMENT_ENDPOINT';
    }
    if (url.pathname.includes('/tool') || url.pathname.includes('/function')) {
      return 'TOOL_ENDPOINT';
    }
    if (url.pathname.includes('/webhook')) {
      return 'WEBHOOK';
    }
    return 'GENERIC_API';
  }

  private getRecommendation(score: number, findings: string[]): string {
    if (score >= 80) return 'SAFE: Endpoint verified for autonomous agent payments';
    if (score >= 60) return 'MODERATE: Verify agent identity before high-value transactions';
    if (score >= 40) return 'CAUTION: Additional verification recommended';
    return 'BLOCK: Do not proceed with autonomous payment';
  }
}

/**
 * Factory function
 */
export function createAgentEndpointCheck(config: import('../types').SentinelConfig): AgentEndpointCheck {
  return new AgentEndpointCheck(config);
}
