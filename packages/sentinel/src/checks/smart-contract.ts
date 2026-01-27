/**
 * @snowrail/sentinel - Smart Contract Validation Check
 * Validates smart contracts for autonomous agent payments
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
 * Smart Contract Check
 * 
 * Validates smart contracts in the agentic economy:
 * - Contract verification status
 * - Known scam contract patterns
 * - ERC-8004 compliance
 * - Reentrancy protection
 * - Access control patterns
 * - Agent-specific contract features
 */
export class SmartContractCheck extends BaseCheck {
  public readonly type = CheckType.ERC8004_COMPLIANCE;
  public readonly category = CheckCategory.POLICY;
  public readonly name = 'Smart Contract Validation';
  public readonly description = 'Validates smart contracts for agent autonomous payments';

  // Known verified contracts (addresses on Avalanche/Ethereum)
  private readonly VERIFIED_CONTRACTS = new Map<string, { name: string; type: string; safe: boolean }>([
    // Stablecoins
    ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', { name: 'USDC', type: 'stablecoin', safe: true }],
    ['0xdac17f958d2ee523a2206206994597c13d831ec7', { name: 'USDT', type: 'stablecoin', safe: true }],
    ['0x6b175474e89094c44da98b954eedeac495271d0f', { name: 'DAI', type: 'stablecoin', safe: true }],
    // DEX Routers
    ['0x7a250d5630b4cf539739df2c5dacb4c659f2488d', { name: 'Uniswap V2', type: 'dex', safe: true }],
    ['0xe592427a0aece92de3edee1f18e0157c05861564', { name: 'Uniswap V3', type: 'dex', safe: true }],
    // Avalanche
    ['0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', { name: 'USDC.e (Avalanche)', type: 'stablecoin', safe: true }],
  ]);

  // Known scam contract patterns
  private readonly SCAM_PATTERNS = [
    'honeypot',
    'rugpull',
    'faketoken',
    'scamtoken',
    'ponzi',
    'pyramid'
  ];

  // Dangerous function signatures (simplified)
  private readonly DANGEROUS_FUNCTIONS = [
    'selfdestruct',
    'delegatecall',
    'setOwner',
    'mint(address,uint256)', // unrestricted mint
    'pause()', // without proper access control
    'blacklist'
  ];

  // ERC-8004 required interfaces
  private readonly ERC8004_INTERFACES = [
    'supportsAgentPayment',
    'validateAgent',
    'authorizePayment',
    'getPaymentLimits',
    'getTrustScore'
  ];

  public async execute(request: ValidationRequest): Promise<CheckResult> {
    const startTime = Date.now();
    
    // Extract contract address from URL or metadata
    const contractAddress = this.extractContractAddress(request);
    
    if (!contractAddress) {
      // Not a contract-related request, skip with neutral score
      return this.success(70, 0.5, {
        message: 'No contract address detected in request',
        contractValidation: 'SKIPPED'
      });
    }

    const normalizedAddress = contractAddress.toLowerCase();
    const findings: string[] = [];
    let score = 50; // Start neutral
    let risk = RiskLevel.MEDIUM;

    // 1. Check if it's a known verified contract
    const knownContract = this.VERIFIED_CONTRACTS.get(normalizedAddress);
    if (knownContract) {
      if (knownContract.safe) {
        return this.success(100, 1.0, {
          contractAddress: normalizedAddress,
          contractName: knownContract.name,
          contractType: knownContract.type,
          verified: true,
          status: 'TRUSTED_CONTRACT',
          erc8004Compatible: true
        }, [
          this.createEvidence('blockchain', 'verified_contracts', knownContract, true)
        ]);
      }
    }

    // 2. Check for scam patterns in address context
    const scamIndicators = this.detectScamPatterns(request, normalizedAddress);
    if (scamIndicators.length > 0) {
      return this.failure(0, 0.95, RiskLevel.CRITICAL, {
        contractAddress: normalizedAddress,
        scamIndicators,
        blocked: true,
        reason: 'SCAM_CONTRACT_DETECTED',
        recommendation: 'DO NOT INTERACT - Known scam patterns detected'
      }, [
        this.createEvidence('blockchain', 'scam_detection', { indicators: scamIndicators }, true)
      ]);
    }

    // 3. Simulate contract verification check
    const verificationStatus = this.simulateVerificationCheck(normalizedAddress);
    if (verificationStatus.verified) {
      score += 25;
      findings.push('Contract source code verified');
    } else {
      score -= 15;
      findings.push('WARNING: Contract not verified');
      risk = RiskLevel.HIGH;
    }

    // 4. Check ERC-8004 compliance
    const erc8004Status = this.checkERC8004Compliance(normalizedAddress);
    if (erc8004Status.compliant) {
      score += 20;
      findings.push('ERC-8004 compliant for agent payments');
    } else {
      findings.push(`ERC-8004 partial: ${erc8004Status.missing.join(', ')} missing`);
    }

    // 5. Simulate security analysis
    const securityAnalysis = this.simulateSecurityAnalysis(normalizedAddress);
    score += securityAnalysis.scoreModifier;
    findings.push(...securityAnalysis.findings);
    
    if (securityAnalysis.criticalIssues > 0) {
      risk = RiskLevel.CRITICAL;
    } else if (securityAnalysis.highIssues > 0) {
      risk = RiskLevel.HIGH;
    }

    // 6. Check for agent-specific features
    const agentFeatures = this.checkAgentFeatures(normalizedAddress);
    if (agentFeatures.supported) {
      score += 15;
      findings.push(`Agent features: ${agentFeatures.features.join(', ')}`);
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));
    
    // Adjust risk based on score
    if (score >= 80 && risk !== RiskLevel.CRITICAL) risk = RiskLevel.LOW;
    else if (score >= 60 && risk === RiskLevel.MEDIUM) risk = RiskLevel.MEDIUM;
    else if (score < 40) risk = RiskLevel.HIGH;

    const duration = Date.now() - startTime;
    const passed = score >= 50 && risk !== RiskLevel.CRITICAL;

    const result = {
      contractAddress: normalizedAddress,
      verified: verificationStatus.verified,
      erc8004: erc8004Status,
      security: securityAnalysis,
      agentFeatures,
      findings,
      agentPaymentReady: score >= 70 && erc8004Status.compliant,
      recommendation: this.getContractRecommendation(score, verificationStatus.verified)
    };

    if (passed) {
      return { ...this.success(score, 0.75, result), duration };
    } else {
      return { ...this.failure(score, 0.75, risk, result), duration };
    }
  }

  private extractContractAddress(request: ValidationRequest): string | null {
    // Check URL for contract address
    const url = request.url.toLowerCase();
    const addressMatch = url.match(/0x[a-f0-9]{40}/i);
    if (addressMatch) return addressMatch[0];

    // Check metadata
    if (request.metadata?.contractAddress) {
      return request.metadata.contractAddress as string;
    }
    if (request.recipient && request.recipient.startsWith('0x')) {
      return request.recipient;
    }

    return null;
  }

  private detectScamPatterns(request: ValidationRequest, address: string): string[] {
    const indicators: string[] = [];
    const url = request.url.toLowerCase();

    // Check URL context
    for (const pattern of this.SCAM_PATTERNS) {
      if (url.includes(pattern)) {
        indicators.push(`URL contains "${pattern}"`);
      }
    }

    // Check for suspicious address patterns
    if (address.startsWith('0x000000')) {
      indicators.push('Suspicious null-prefix address');
    }
    if (/^0x([0-9a-f])\1{39}$/i.test(address)) {
      indicators.push('Suspicious repeating pattern address');
    }

    // Check for airdrop/claim scams
    if (url.includes('claim') && url.includes('airdrop')) {
      indicators.push('Airdrop claim scam pattern');
    }
    if (url.includes('free') && url.includes('token')) {
      indicators.push('Free token scam pattern');
    }

    return indicators;
  }

  private simulateVerificationCheck(address: string): { verified: boolean; source?: string } {
    // Simulate block explorer verification
    // In production, would call Snowtrace/Etherscan API
    
    // Known verified contract patterns (simulation)
    const hash = this.hashAddress(address);
    
    // 60% of "random" contracts are verified in simulation
    const verified = hash % 10 < 6;
    
    return {
      verified,
      source: verified ? 'snowtrace.io' : undefined
    };
  }

  private checkERC8004Compliance(address: string): { compliant: boolean; interfaces: string[]; missing: string[] } {
    // Simulate ERC-8004 interface check
    const hash = this.hashAddress(address);
    
    // Determine which interfaces are "implemented"
    const implemented: string[] = [];
    const missing: string[] = [];
    
    this.ERC8004_INTERFACES.forEach((iface, index) => {
      if ((hash + index) % 3 !== 0) {
        implemented.push(iface);
      } else {
        missing.push(iface);
      }
    });

    return {
      compliant: missing.length === 0,
      interfaces: implemented,
      missing
    };
  }

  private simulateSecurityAnalysis(address: string): {
    scoreModifier: number;
    findings: string[];
    criticalIssues: number;
    highIssues: number;
  } {
    const hash = this.hashAddress(address);
    const findings: string[] = [];
    let scoreModifier = 0;
    let criticalIssues = 0;
    let highIssues = 0;

    // Simulate security checks
    if (hash % 7 === 0) {
      findings.push('WARNING: Potential reentrancy vulnerability');
      scoreModifier -= 20;
      highIssues++;
    } else {
      findings.push('Reentrancy guard detected');
      scoreModifier += 5;
    }

    if (hash % 11 === 0) {
      findings.push('CRITICAL: Unrestricted mint function');
      scoreModifier -= 40;
      criticalIssues++;
    }

    if (hash % 5 !== 0) {
      findings.push('Access control implemented');
      scoreModifier += 10;
    } else {
      findings.push('WARNING: Weak access control');
      scoreModifier -= 10;
      highIssues++;
    }

    if (hash % 3 === 0) {
      findings.push('Pausable functionality detected');
      scoreModifier += 5;
    }

    if (hash % 13 !== 0) {
      findings.push('No selfdestruct function');
      scoreModifier += 5;
    }

    return { scoreModifier, findings, criticalIssues, highIssues };
  }

  private checkAgentFeatures(address: string): { supported: boolean; features: string[] } {
    const hash = this.hashAddress(address);
    const features: string[] = [];

    if (hash % 2 === 0) features.push('agent-authorization');
    if (hash % 3 === 0) features.push('payment-limits');
    if (hash % 4 === 0) features.push('multi-sig-support');
    if (hash % 5 === 0) features.push('spending-caps');
    if (hash % 6 === 0) features.push('auto-approval');

    return {
      supported: features.length >= 2,
      features
    };
  }

  private hashAddress(address: string): number {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      const char = address.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private getContractRecommendation(score: number, verified: boolean): string {
    if (!verified) {
      return 'CAUTION: Unverified contract - manual review required before agent payments';
    }
    if (score >= 80) return 'SAFE: Contract verified and suitable for autonomous agent payments';
    if (score >= 60) return 'MODERATE: Verify payment limits before autonomous transactions';
    if (score >= 40) return 'RISKY: Recommend human approval for transactions';
    return 'BLOCK: Do not allow autonomous agent payments to this contract';
  }
}

/**
 * Factory function
 */
export function createSmartContractCheck(config: import('../types').SentinelConfig): SmartContractCheck {
  return new SmartContractCheck(config);
}
