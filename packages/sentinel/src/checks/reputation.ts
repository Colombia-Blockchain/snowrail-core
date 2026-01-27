/**
 * @snowrail/sentinel - Reputation Check
 * Verifies domain reputation using multiple sources
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

// Type definitions
interface TransactionHistory {
  totalTransactions: number;
  successRate: number;
  avgAmount: number;
  disputes: number;
  chargebacks: number;
}

interface ReputationData {
  score: number;
  reports: number;
  malware: boolean;
  phishing: boolean;
  spam: boolean;
  blacklisted: boolean;
  sources: string[];
  txHistory: TransactionHistory | null;
}

/**
 * Reputation Check
 * 
 * Analyzes domain reputation from:
 * - Known malware databases
 * - Spam blacklists
 * - Community reports
 * - Historical transaction data
 */
export class ReputationCheck extends BaseCheck {
  public readonly type = CheckType.HISTORICAL_SCORE;
  public readonly category = CheckCategory.REPUTATION;
  public readonly name = 'Reputation Analysis';
  public readonly description = 'Analyzes domain reputation from multiple sources';

  // Simulated reputation database (in production, use APIs like VirusTotal, Google Safe Browsing)
  private readonly REPUTATION_DB: Record<string, {
    score: number;
    reports: number;
    malware: boolean;
    phishing: boolean;
    spam: boolean;
    lastSeen?: Date;
  }> = {
    // Known good domains
    'paypal.com': { score: 100, reports: 0, malware: false, phishing: false, spam: false },
    'stripe.com': { score: 100, reports: 0, malware: false, phishing: false, spam: false },
    'coinbase.com': { score: 98, reports: 0, malware: false, phishing: false, spam: false },
    'binance.com': { score: 95, reports: 2, malware: false, phishing: false, spam: false },
    'github.com': { score: 100, reports: 0, malware: false, phishing: false, spam: false },
    'cloudflare.com': { score: 100, reports: 0, malware: false, phishing: false, spam: false },
    
    // Known bad domains (examples)
    'malware-test.com': { score: 0, reports: 500, malware: true, phishing: false, spam: true },
    'phishing-example.com': { score: 5, reports: 300, malware: false, phishing: true, spam: false },
  };

  // Spam/blacklist sources (simulated)
  private readonly BLACKLIST_SOURCES = [
    'spamhaus', 'surbl', 'uribl', 'google-safebrowsing', 
    'phishtank', 'openphish', 'urlhaus'
  ];

  // Transaction history (simulated)
  private readonly TRANSACTION_HISTORY: Record<string, TransactionHistory> = {
    'stripe.com': { totalTransactions: 1000000, successRate: 0.99, avgAmount: 150, disputes: 0.001, chargebacks: 0.0005 },
    'paypal.com': { totalTransactions: 5000000, successRate: 0.98, avgAmount: 75, disputes: 0.002, chargebacks: 0.001 },
    'coinbase.com': { totalTransactions: 500000, successRate: 0.995, avgAmount: 500, disputes: 0.0005, chargebacks: 0.0001 },
  };

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
    const rootDomain = this.getRootDomain(hostname);
    
    // Gather reputation data
    const reputationData = await this.gatherReputationData(rootDomain);
    const score = this.calculateReputationScore(reputationData);
    const risk = this.calculateRisk(reputationData, score);
    const duration = Date.now() - startTime;

    const details = {
      domain: rootDomain,
      reputationScore: score,
      sources: reputationData.sources,
      flags: {
        malware: reputationData.malware,
        phishing: reputationData.phishing,
        spam: reputationData.spam,
        blacklisted: reputationData.blacklisted
      },
      communityReports: reputationData.reports,
      transactionHistory: reputationData.txHistory ? {
        transactions: reputationData.txHistory.totalTransactions,
        successRate: `${(reputationData.txHistory.successRate * 100).toFixed(1)}%`,
        disputeRate: `${(reputationData.txHistory.disputes * 100).toFixed(2)}%`
      } : null,
      verdict: this.getVerdict(score, reputationData)
    };

    // Check for critical flags
    if (reputationData.malware || reputationData.phishing) {
      return {
        ...this.failure(0, 1.0, RiskLevel.CRITICAL, {
          ...details,
          blocked: true,
          reason: reputationData.malware ? 'MALWARE_DETECTED' : 'PHISHING_DETECTED',
          recommendation: 'DO NOT PROCEED - Domain flagged as malicious'
        }, [
          this.createEvidence('external', 'reputation_db', reputationData, true)
        ]),
        duration
      };
    }

    const passed = score >= 50 && risk !== RiskLevel.CRITICAL && !reputationData.blacklisted;

    if (passed) {
      return {
        ...this.success(score, 0.8, details, [
          this.createEvidence('external', 'reputation_aggregated', reputationData, true)
        ]),
        duration
      };
    } else {
      return {
        ...this.failure(score, 0.8, risk, {
          ...details,
          recommendation: 'Proceed with caution - reputation concerns detected'
        }, [
          this.createEvidence('external', 'reputation_aggregated', reputationData, true)
        ]),
        duration
      };
    }
  }

  private getRootDomain(hostname: string): string {
    const parts = hostname.split('.');
    const specialTLDs = ['co.uk', 'com.br', 'com.au', 'co.jp', 'co.kr'];
    
    for (const special of specialTLDs) {
      if (hostname.endsWith(special)) {
        return parts.slice(-3).join('.');
      }
    }
    
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    
    return hostname;
  }

  private async gatherReputationData(domain: string): Promise<ReputationData> {
    // Check known database
    const known = this.REPUTATION_DB[domain];
    
    if (known) {
      return {
        score: known.score,
        reports: known.reports,
        malware: known.malware,
        phishing: known.phishing,
        spam: known.spam,
        blacklisted: known.malware || known.phishing,
        sources: ['sentinel_db', 'community_reports'],
        txHistory: this.TRANSACTION_HISTORY[domain] || null
      };
    }

    // Simulate reputation lookup for unknown domains
    const simulated = this.simulateReputationLookup(domain);
    
    return {
      ...simulated,
      sources: ['simulated_lookup'],
      txHistory: null
    };
  }

  private simulateReputationLookup(domain: string): {
    score: number;
    reports: number;
    malware: boolean;
    phishing: boolean;
    spam: boolean;
    blacklisted: boolean;
  } {
    // Generate deterministic reputation based on domain characteristics
    const hash = this.hashDomain(domain);
    
    // Check for suspicious patterns
    const suspicious = 
      domain.includes('-') && domain.split('-').length > 2 ||
      domain.length > 25 ||
      /\d{3,}/.test(domain) || // Multiple consecutive numbers
      domain.includes('secure') ||
      domain.includes('verify') ||
      domain.includes('login');

    // Check for very suspicious TLDs
    const badTLD = ['.xyz', '.top', '.click', '.loan', '.tk', '.ml', '.ga', '.cf', '.gq']
      .some(tld => domain.endsWith(tld));

    let baseScore = 70;
    
    if (suspicious) baseScore -= 25;
    if (badTLD) baseScore -= 20;
    
    // Add some randomness based on hash
    baseScore += (hash % 20) - 10;
    baseScore = Math.max(20, Math.min(90, baseScore));

    const reports = suspicious ? Math.floor(hash % 50) : Math.floor(hash % 5);
    const malware = suspicious && badTLD && (hash % 10 === 0);
    const phishing = suspicious && (hash % 7 === 0);
    const spam = badTLD && (hash % 5 === 0);

    return {
      score: malware || phishing ? 0 : baseScore,
      reports,
      malware,
      phishing,
      spam,
      blacklisted: malware || phishing
    };
  }

  private hashDomain(domain: string): number {
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      const char = domain.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private calculateReputationScore(data: ReputationData): number {
    let score = data.score;

    // Adjust for reports
    if (data.reports > 100) score -= 30;
    else if (data.reports > 50) score -= 20;
    else if (data.reports > 10) score -= 10;
    else if (data.reports > 0) score -= 5;

    // Adjust for spam
    if (data.spam) score -= 15;

    // Boost for good transaction history
    if (data.txHistory) {
      if (data.txHistory.successRate > 0.98) score += 10;
      if (data.txHistory.disputes < 0.001) score += 5;
      if (data.txHistory.totalTransactions > 10000) score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateRisk(data: ReputationData, score: number): RiskLevel {
    if (data.malware || data.phishing) return RiskLevel.CRITICAL;
    if (data.blacklisted) return RiskLevel.CRITICAL;
    if (data.reports > 50 || data.spam) return RiskLevel.HIGH;
    if (score < 40) return RiskLevel.HIGH;
    if (score < 60 || data.reports > 10) return RiskLevel.MEDIUM;
    if (score < 80) return RiskLevel.LOW;
    return RiskLevel.NONE;
  }

  private getVerdict(score: number, data: ReputationData): string {
    if (data.malware) return 'BLOCKED - Malware detected';
    if (data.phishing) return 'BLOCKED - Phishing detected';
    if (data.blacklisted) return 'BLOCKED - Domain blacklisted';
    if (score >= 90) return 'EXCELLENT - Highly trusted domain';
    if (score >= 70) return 'GOOD - Trusted domain';
    if (score >= 50) return 'MODERATE - Proceed with caution';
    if (score >= 30) return 'POOR - High risk detected';
    return 'CRITICAL - Do not proceed';
  }
}

/**
 * Factory function
 */
export function createReputationCheck(config: import('../types').SentinelConfig): ReputationCheck {
  return new ReputationCheck(config);
}
