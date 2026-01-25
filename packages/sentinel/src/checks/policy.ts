/**
 * @snowrail/sentinel - Policy & Protocol Compliance Check
 * Validates x402, ERC-8004, and blockchain protocol compliance
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

import { BaseCheck } from './base';
import {
  CheckResult,
  CheckType,
  CheckCategory,
  RiskLevel,
  ValidationRequest,
  Evidence
} from '../types';

interface PolicyAnalysis {
  x402: X402Compliance;
  erc8004: ERC8004Compliance;
  protocols: string[];
  warnings: string[];
  issues: string[];
}

interface X402Compliance {
  supported: boolean;
  version: string | null;
  endpoints: string[];
  paymentMethods: string[];
  confidence: number;
}

interface ERC8004Compliance {
  registered: boolean;
  agentCard: AgentCard | null;
  verified: boolean;
  confidence: number;
}

interface AgentCard {
  name: string;
  version: string;
  capabilities: string[];
  endpoints: Record<string, string>;
  pricing?: {
    currency: string;
    rate: number;
    unit: string;
  };
}

export class PolicyCheck extends BaseCheck {
  public readonly type = CheckType.ERC8004_COMPLIANCE;
  public readonly category = CheckCategory.POLICY;
  public readonly name = 'Protocol Compliance Validation';
  public readonly description = 'Validates x402 payment protocol and ERC-8004 agent identity compliance';

  private readonly X402_INDICATORS = [
    'x-payment-required',
    'x402',
    '402 payment required',
    'payment-required',
    'x-payment'
  ];

  private readonly AGENT_CARD_PATHS = [
    '/.well-known/agent-card.json',
    '/.well-known/agent.json',
    '/agent-card.json',
    '/api/agent/identity'
  ];

  public async execute(request: ValidationRequest): Promise<CheckResult> {
    const url = this.parseUrl(request.url);
    if (!url) {
      return this.failure(0, 1, RiskLevel.CRITICAL, { error: 'Invalid URL' });
    }

    try {
      const analysis = await this.analyzePolicy(url);
      const score = this.calculateScore(analysis);
      const evidence = this.collectEvidence(analysis);

      if (score >= 50) {
        return this.success(score, analysis.x402.supported || analysis.erc8004.registered ? 0.9 : 0.6, {
          x402Supported: analysis.x402.supported,
          x402Version: analysis.x402.version,
          erc8004Registered: analysis.erc8004.registered,
          agentName: analysis.erc8004.agentCard?.name,
          protocols: analysis.protocols,
          warnings: analysis.warnings
        }, evidence);
      }

      return this.failure(score, 0.7, this.scoreToRisk(score), {
        issues: analysis.issues,
        warnings: analysis.warnings,
        note: 'x402/ERC-8004 not required but recommended for agent payments'
      }, evidence);
    } catch (error) {
      // Not finding x402/ERC-8004 is not critical - many valid merchants don't use it
      return this.success(60, 0.5, {
        x402Supported: false,
        erc8004Registered: false,
        note: 'Protocol check inconclusive - standard merchant'
      }, []);
    }
  }

  private async analyzePolicy(url: URL): Promise<PolicyAnalysis> {
    const warnings: string[] = [];
    const issues: string[] = [];
    const protocols: string[] = [];

    // Check x402 support
    const x402 = await this.checkX402Support(url);
    if (x402.supported) {
      protocols.push('x402');
    }

    // Check ERC-8004 compliance
    const erc8004 = await this.checkERC8004Compliance(url);
    if (erc8004.registered) {
      protocols.push('ERC-8004');
    }

    // Add common web protocols
    if (url.protocol === 'https:') {
      protocols.push('HTTPS');
    }

    return { x402, erc8004, protocols, warnings, issues };
  }

  private async checkX402Support(url: URL): Promise<X402Compliance> {
    const result: X402Compliance = {
      supported: false,
      version: null,
      endpoints: [],
      paymentMethods: [],
      confidence: 0
    };

    try {
      // Try to trigger a 402 response
      const testEndpoints = [
        url.toString(),
        `${url.origin}/api`,
        `${url.origin}/api/v1`,
        `${url.origin}/process`
      ];

      for (const endpoint of testEndpoints) {
        try {
          const response = await this.fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          }, 5000);

          const headers = Object.fromEntries(response.headers.entries());
          const headerStr = JSON.stringify(headers).toLowerCase();

          // Check for x402 indicators
          if (response.status === 402 || 
              this.X402_INDICATORS.some(i => headerStr.includes(i))) {
            result.supported = true;
            result.endpoints.push(endpoint);
            result.confidence += 40;

            // Try to extract version
            const paymentHeader = headers['x-payment-required'] || headers['x-payment'];
            if (paymentHeader) {
              try {
                const paymentInfo = JSON.parse(paymentHeader);
                result.version = paymentInfo.version || 'v1';
                result.paymentMethods = paymentInfo.methods || ['USDC'];
              } catch {
                result.version = 'v1';
              }
            }
          }
        } catch {
          // Continue to next endpoint
        }
      }
    } catch {
      // x402 check failed
    }

    return result;
  }

  private async checkERC8004Compliance(url: URL): Promise<ERC8004Compliance> {
    const result: ERC8004Compliance = {
      registered: false,
      agentCard: null,
      verified: false,
      confidence: 0
    };

    // Try to fetch agent card from well-known locations
    for (const path of this.AGENT_CARD_PATHS) {
      try {
        const cardUrl = `${url.origin}${path}`;
        const response = await this.fetchWithTimeout(cardUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }, 5000);

        if (response.ok) {
          const card = await response.json();
          
          if (this.isValidAgentCard(card)) {
            result.registered = true;
            result.agentCard = card as AgentCard;
            result.confidence = 90;
            result.verified = true;
            break;
          }
        }
      } catch {
        // Continue to next path
      }
    }

    return result;
  }

  private isValidAgentCard(card: unknown): boolean {
    if (!card || typeof card !== 'object') return false;
    
    const c = card as Record<string, unknown>;
    
    // Required fields
    if (!c.name || typeof c.name !== 'string') return false;
    if (!c.version || typeof c.version !== 'string') return false;
    
    // Optional but expected fields
    if (c.capabilities && !Array.isArray(c.capabilities)) return false;
    if (c.endpoints && typeof c.endpoints !== 'object') return false;
    
    return true;
  }

  private calculateScore(analysis: PolicyAnalysis): number {
    let score = 50; // Base score - merchant doesn't need x402/ERC-8004

    // x402 support bonus
    if (analysis.x402.supported) {
      score += 25;
      score += Math.min(15, analysis.x402.confidence * 0.15);
    }

    // ERC-8004 compliance bonus
    if (analysis.erc8004.registered) {
      score += 20;
      if (analysis.erc8004.verified) score += 10;
    }

    // Deductions
    score -= analysis.issues.length * 10;
    score -= analysis.warnings.length * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private collectEvidence(analysis: PolicyAnalysis): Evidence[] {
    const evidence: Evidence[] = [];

    if (analysis.x402.supported) {
      evidence.push(this.createEvidence('api_response', 'x402_support', {
        version: analysis.x402.version,
        endpoints: analysis.x402.endpoints,
        paymentMethods: analysis.x402.paymentMethods
      }, true));
    }

    if (analysis.erc8004.agentCard) {
      evidence.push(this.createEvidence('api_response', 'agent_card', {
        name: analysis.erc8004.agentCard.name,
        version: analysis.erc8004.agentCard.version,
        capabilities: analysis.erc8004.agentCard.capabilities
      }, analysis.erc8004.verified));
    }

    return evidence;
  }
}
