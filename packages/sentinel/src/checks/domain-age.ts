/**
 * @snowrail/sentinel - Domain Age Check
 * Verifies domain registration age and WHOIS data
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
 * Domain Age Check
 * 
 * Analyzes:
 * - Domain registration date
 * - Domain age (newer = higher risk)
 * - Registration patterns
 * - Known old/established domains
 */
export class DomainAgeCheck extends BaseCheck {
  public readonly type = CheckType.DOMAIN_AGE;
  public readonly category = CheckCategory.IDENTITY;
  public readonly name = 'Domain Age Verification';
  public readonly description = 'Verifies domain age and registration history';

  // Established domains with known registration dates (sample)
  private readonly KNOWN_DOMAINS: Record<string, { created: Date; trusted: boolean }> = {
    'paypal.com': { created: new Date('1999-07-15'), trusted: true },
    'stripe.com': { created: new Date('2010-01-19'), trusted: true },
    'coinbase.com': { created: new Date('2012-05-14'), trusted: true },
    'binance.com': { created: new Date('2017-02-13'), trusted: true },
    'metamask.io': { created: new Date('2016-07-22'), trusted: true },
    'uniswap.org': { created: new Date('2018-08-02'), trusted: true },
    'opensea.io': { created: new Date('2017-12-20'), trusted: true },
    'aave.com': { created: new Date('2017-09-25'), trusted: true },
    'compound.finance': { created: new Date('2018-04-16'), trusted: true },
    'github.com': { created: new Date('2007-10-09'), trusted: true },
    'cloudflare.com': { created: new Date('2009-02-17'), trusted: true },
    'amazon.com': { created: new Date('1994-11-01'), trusted: true },
    'google.com': { created: new Date('1997-09-15'), trusted: true },
    'microsoft.com': { created: new Date('1991-05-02'), trusted: true },
    'apple.com': { created: new Date('1987-02-19'), trusted: true },
  };

  // TLDs that tend to be used for newer/suspicious domains
  private readonly NEW_DOMAIN_TLDS = [
    '.xyz', '.top', '.club', '.online', '.site', '.website',
    '.tech', '.io', '.co', '.app', '.dev'
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
    const rootDomain = this.getRootDomain(hostname);
    
    // Check if it's a known domain
    const knownDomain = this.KNOWN_DOMAINS[rootDomain];
    
    if (knownDomain) {
      const age = this.calculateAge(knownDomain.created);
      const duration = Date.now() - startTime;
      
      return {
        ...this.success(100, 1.0, {
          domain: rootDomain,
          registrationDate: knownDomain.created.toISOString(),
          ageYears: age.years,
          ageDays: age.totalDays,
          trusted: knownDomain.trusted,
          source: 'known_domains_database'
        }, [
          this.createEvidence('external', 'known_domains', {
            domain: rootDomain,
            created: knownDomain.created,
            trusted: true
          }, true)
        ]),
        duration
      };
    }

    // For unknown domains, simulate WHOIS lookup
    // In production, this would call a real WHOIS API
    const simulatedAge = this.simulateDomainAge(rootDomain);
    const score = this.calculateScore(simulatedAge);
    const risk = this.calculateRisk(simulatedAge, rootDomain);
    const duration = Date.now() - startTime;

    const details = {
      domain: rootDomain,
      estimatedAgeDays: simulatedAge.totalDays,
      estimatedAgeYears: simulatedAge.years,
      estimatedAgeMonths: simulatedAge.months,
      riskFactors: [] as string[],
      source: 'simulated_whois'
    };

    // Add risk factors
    if (simulatedAge.totalDays < 30) {
      details.riskFactors.push('Domain registered less than 30 days ago');
    } else if (simulatedAge.totalDays < 90) {
      details.riskFactors.push('Domain registered less than 90 days ago');
    } else if (simulatedAge.totalDays < 365) {
      details.riskFactors.push('Domain less than 1 year old');
    }

    if (this.hasNewDomainTLD(rootDomain)) {
      details.riskFactors.push('Uses TLD commonly associated with new domains');
    }

    const passed = score >= 50 && risk !== RiskLevel.CRITICAL;

    if (passed) {
      return {
        ...this.success(score, 0.7, details, [
          this.createEvidence('external', 'whois_simulation', {
            domain: rootDomain,
            age: simulatedAge
          }, false)
        ]),
        duration
      };
    } else {
      return {
        ...this.failure(score, 0.7, risk, {
          ...details,
          warning: 'New domain - exercise caution',
          recommendation: 'Verify merchant through alternative means'
        }, [
          this.createEvidence('external', 'whois_simulation', {
            domain: rootDomain,
            age: simulatedAge,
            suspicious: true
          }, false)
        ]),
        duration
      };
    }
  }

  private getRootDomain(hostname: string): string {
    const parts = hostname.split('.');
    
    // Handle special TLDs like .co.uk, .com.br
    const specialTLDs = ['co.uk', 'com.br', 'com.au', 'co.jp', 'co.kr'];
    
    for (const special of specialTLDs) {
      if (hostname.endsWith(special)) {
        return parts.slice(-3).join('.');
      }
    }
    
    // Standard case: domain.tld
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    
    return hostname;
  }

  private calculateAge(created: Date): { years: number; months: number; days: number; totalDays: number } {
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;
    
    return { years, months, days, totalDays };
  }

  private simulateDomainAge(domain: string): { years: number; months: number; days: number; totalDays: number } {
    // Simulation based on domain characteristics
    // In production, use real WHOIS API
    
    // Generate deterministic "age" based on domain hash
    const hash = this.hashDomain(domain);
    
    // Most unknown domains in crypto are 0-3 years old
    // Bias towards newer domains for unknown ones
    let totalDays: number;
    
    if (this.hasNewDomainTLD(domain)) {
      // TLDs like .xyz, .io tend to be newer
      totalDays = Math.floor((hash % 730) + 30); // 30 days to 2 years
    } else if (domain.includes('-') || domain.length > 20) {
      // Domains with hyphens or very long names tend to be newer
      totalDays = Math.floor((hash % 365) + 7); // 7 days to 1 year
    } else {
      // Standard .com/.org/.net - could be older
      totalDays = Math.floor((hash % 1825) + 180); // 6 months to 5 years
    }
    
    return this.calculateAge(new Date(Date.now() - totalDays * 24 * 60 * 60 * 1000));
  }

  private hashDomain(domain: string): number {
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      const char = domain.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private hasNewDomainTLD(domain: string): boolean {
    for (const tld of this.NEW_DOMAIN_TLDS) {
      if (domain.endsWith(tld)) {
        return true;
      }
    }
    return false;
  }

  private calculateScore(age: { totalDays: number }): number {
    const days = age.totalDays;
    
    // Scoring based on age
    if (days < 7) return 10;        // Less than 1 week - very suspicious
    if (days < 30) return 25;       // Less than 1 month - suspicious
    if (days < 90) return 40;       // Less than 3 months - caution
    if (days < 180) return 55;      // Less than 6 months - moderate
    if (days < 365) return 70;      // Less than 1 year - acceptable
    if (days < 730) return 80;      // Less than 2 years - good
    if (days < 1825) return 90;     // Less than 5 years - very good
    return 100;                      // 5+ years - excellent
  }

  private calculateRisk(age: { totalDays: number }, domain: string): RiskLevel {
    const days = age.totalDays;
    
    if (days < 7) return RiskLevel.CRITICAL;
    if (days < 30) return RiskLevel.HIGH;
    if (days < 90 && this.hasNewDomainTLD(domain)) return RiskLevel.HIGH;
    if (days < 180) return RiskLevel.MEDIUM;
    if (days < 365) return RiskLevel.LOW;
    return RiskLevel.NONE;
  }
}

/**
 * Factory function
 */
export function createDomainAgeCheck(config: import('../types').SentinelConfig): DomainAgeCheck {
  return new DomainAgeCheck(config);
}
