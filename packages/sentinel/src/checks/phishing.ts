/**
 * @snowrail/sentinel - Phishing Detection Check
 * Detects known phishing domains and suspicious patterns
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
 * Phishing Detection Check
 * 
 * Analyzes URLs for:
 * - Known phishing domains (blacklist)
 * - Suspicious patterns (typosquatting, homograph attacks)
 * - URL structure anomalies
 */
export class PhishingCheck extends BaseCheck {
  public readonly type = CheckType.COMMUNITY_REPORTS; // Using existing type for reputation
  public readonly category = CheckCategory.REPUTATION;
  public readonly name = 'Phishing Detection';
  public readonly description = 'Detects known phishing sites and suspicious URL patterns';

  // Known phishing indicators
  private readonly PHISHING_KEYWORDS = [
    'login', 'signin', 'verify', 'secure', 'account', 'update', 'confirm',
    'banking', 'password', 'credential', 'suspended', 'locked', 'urgent'
  ];

  // Legitimate domains that are often impersonated
  private readonly IMPERSONATION_TARGETS = [
    'paypal', 'stripe', 'coinbase', 'binance', 'metamask', 'opensea',
    'uniswap', 'aave', 'compound', 'apple', 'google', 'microsoft',
    'amazon', 'netflix', 'facebook', 'instagram', 'twitter', 'bank'
  ];

  // Known malicious TLDs
  private readonly SUSPICIOUS_TLDS = [
    '.xyz', '.top', '.club', '.work', '.click', '.link', '.info',
    '.online', '.site', '.website', '.space', '.tech', '.loan',
    '.win', '.bid', '.stream', '.download', '.racing', '.review',
    '.accountant', '.science', '.party', '.date', '.faith', '.gq',
    '.ml', '.tk', '.cf', '.ga'
  ];

  // Known phishing domains (sample blacklist - in production, use external API)
  private readonly BLACKLISTED_DOMAINS = new Set([
    'paypa1.com', 'paypai.com', 'paypal-secure.com', 'paypal-login.com',
    'stripe-verify.com', 'str1pe.com', 'coinbase-wallet.net',
    'metamask-io.com', 'metamask-connect.com', 'uniswap-app.com',
    'opensea-nft.com', 'binance-us.net', 'crypto-airdrop.com',
    'free-crypto.net', 'wallet-connect.io', 'eth-giveaway.com'
  ]);

  // Legitimate domains whitelist
  private readonly WHITELIST = new Set([
    'paypal.com', 'stripe.com', 'coinbase.com', 'binance.com',
    'binance.us', 'metamask.io', 'opensea.io', 'uniswap.org',
    'aave.com', 'compound.finance', 'apple.com', 'google.com',
    'microsoft.com', 'amazon.com', 'github.com', 'cloudflare.com'
  ]);

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
    
    // Check results accumulator
    const findings: string[] = [];
    let score = 100;
    let risk = RiskLevel.NONE;

    // 1. Check blacklist
    if (this.isBlacklisted(hostname)) {
      return this.failure(0, 1.0, RiskLevel.CRITICAL, {
        reason: 'BLACKLISTED_DOMAIN',
        hostname,
        message: 'Domain is on known phishing blacklist'
      }, [
        this.createEvidence('external', 'phishing_blacklist', { hostname, matched: true }, true)
      ]);
    }

    // 2. Check whitelist (fast path for known good domains)
    if (this.isWhitelisted(hostname)) {
      return this.success(100, 1.0, {
        reason: 'WHITELISTED_DOMAIN',
        hostname,
        message: 'Domain is on trusted whitelist'
      }, [
        this.createEvidence('external', 'trusted_whitelist', { hostname }, true)
      ]);
    }

    // 3. Check for typosquatting
    const typosquatResult = this.detectTyposquatting(hostname);
    if (typosquatResult.detected) {
      findings.push(`Possible typosquatting of ${typosquatResult.target}`);
      score -= 40;
      risk = RiskLevel.HIGH;
    }

    // 4. Check for homograph attacks (IDN/punycode)
    if (this.detectHomographAttack(hostname)) {
      findings.push('Possible homograph attack detected (IDN spoofing)');
      score -= 50;
      risk = RiskLevel.CRITICAL;
    }

    // 5. Check suspicious TLD
    if (this.hasSuspiciousTLD(hostname)) {
      findings.push('Domain uses suspicious TLD');
      score -= 20;
      if (risk === RiskLevel.NONE) risk = RiskLevel.MEDIUM;
    }

    // 6. Check phishing keywords in URL
    const keywordMatches = this.findPhishingKeywords(fullUrl);
    if (keywordMatches.length > 0) {
      findings.push(`Phishing keywords found: ${keywordMatches.join(', ')}`);
      score -= keywordMatches.length * 10;
      if (risk === RiskLevel.NONE) risk = RiskLevel.MEDIUM;
    }

    // 7. Check URL structure anomalies
    const anomalies = this.detectUrlAnomalies(url);
    if (anomalies.length > 0) {
      findings.push(...anomalies);
      score -= anomalies.length * 15;
      if (risk === RiskLevel.NONE) risk = RiskLevel.LOW;
    }

    // 8. Check for excessive subdomains
    const subdomainCount = hostname.split('.').length - 2;
    if (subdomainCount > 3) {
      findings.push(`Excessive subdomains (${subdomainCount})`);
      score -= 15;
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));
    
    // Update risk based on final score
    if (score < 30) risk = RiskLevel.CRITICAL;
    else if (score < 50) risk = RiskLevel.HIGH;
    else if (score < 70) risk = RiskLevel.MEDIUM;
    else if (score < 90) risk = RiskLevel.LOW;

    const duration = Date.now() - startTime;
    const passed = score >= 60 && risk !== RiskLevel.CRITICAL;

    if (passed) {
      return {
        ...this.success(score, 0.85, {
          hostname,
          findings: findings.length > 0 ? findings : ['No phishing indicators detected'],
          analysisComplete: true
        }),
        duration
      };
    } else {
      return {
        ...this.failure(score, 0.9, risk, {
          hostname,
          findings,
          recommendation: 'Do not proceed - high phishing risk'
        }),
        duration
      };
    }
  }

  private isBlacklisted(hostname: string): boolean {
    // Check exact match
    if (this.BLACKLISTED_DOMAINS.has(hostname)) return true;
    
    // Check if any blacklisted domain is a substring
    for (const bad of this.BLACKLISTED_DOMAINS) {
      if (hostname.includes(bad.replace('.com', '').replace('.net', ''))) {
        return true;
      }
    }
    return false;
  }

  private isWhitelisted(hostname: string): boolean {
    // Check exact match or subdomain of whitelisted domain
    for (const good of this.WHITELIST) {
      if (hostname === good || hostname.endsWith('.' + good)) {
        return true;
      }
    }
    return false;
  }

  private detectTyposquatting(hostname: string): { detected: boolean; target?: string } {
    // Remove TLD for comparison
    const baseName = hostname.split('.').slice(0, -1).join('.');
    
    for (const target of this.IMPERSONATION_TARGETS) {
      // Check common typosquatting patterns
      const patterns = [
        target.replace('a', '4'),
        target.replace('e', '3'),
        target.replace('i', '1'),
        target.replace('o', '0'),
        target.replace('l', '1'),
        target.replace('s', '5'),
        target + 's',
        target + '-secure',
        target + '-login',
        target + '-verify',
        target + 'wallet',
        target + 'app',
        'get' + target,
        'my' + target,
        target.slice(0, -1), // missing last char
        target + target[target.length - 1] // doubled last char
      ];

      for (const pattern of patterns) {
        if (baseName.includes(pattern) && !baseName.includes(target + '.')) {
          return { detected: true, target };
        }
      }

      // Check Levenshtein distance (simple version)
      if (this.levenshteinDistance(baseName, target) <= 2 && baseName !== target) {
        return { detected: true, target };
      }
    }

    return { detected: false };
  }

  private detectHomographAttack(hostname: string): boolean {
    // Check for punycode (xn--)
    if (hostname.includes('xn--')) {
      return true;
    }

    // Check for mixed scripts (simplified)
    const cyrillicPattern = /[\u0400-\u04FF]/;
    const latinPattern = /[a-zA-Z]/;
    
    if (cyrillicPattern.test(hostname) && latinPattern.test(hostname)) {
      return true;
    }

    return false;
  }

  private hasSuspiciousTLD(hostname: string): boolean {
    for (const tld of this.SUSPICIOUS_TLDS) {
      if (hostname.endsWith(tld)) {
        return true;
      }
    }
    return false;
  }

  private findPhishingKeywords(url: string): string[] {
    const found: string[] = [];
    const urlLower = url.toLowerCase();
    
    for (const keyword of this.PHISHING_KEYWORDS) {
      if (urlLower.includes(keyword)) {
        found.push(keyword);
      }
    }
    
    return found;
  }

  private detectUrlAnomalies(url: URL): string[] {
    const anomalies: string[] = [];
    
    // Check for IP address instead of domain
    const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipPattern.test(url.hostname)) {
      anomalies.push('Uses IP address instead of domain');
    }

    // Check for @ symbol (URL obfuscation)
    if (url.href.includes('@')) {
      anomalies.push('Contains @ symbol (possible URL obfuscation)');
    }

    // Check for suspicious port
    if (url.port && !['80', '443', ''].includes(url.port)) {
      anomalies.push(`Unusual port: ${url.port}`);
    }

    // Check for data URI
    if (url.protocol === 'data:') {
      anomalies.push('Data URI detected');
    }

    // Check for excessive path depth
    const pathDepth = url.pathname.split('/').filter(Boolean).length;
    if (pathDepth > 5) {
      anomalies.push(`Deep URL path (${pathDepth} levels)`);
    }

    // Check for double extensions
    if (/\.[a-z]+\.[a-z]+$/i.test(url.pathname)) {
      anomalies.push('Double file extension detected');
    }

    return anomalies;
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

/**
 * Factory function
 */
export function createPhishingCheck(config: import('../types').SentinelConfig): PhishingCheck {
  return new PhishingCheck(config);
}
