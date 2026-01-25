/**
 * @snowrail/sentinel - Infrastructure Security Check
 * Validates cloud provider, security headers, WAF, and infrastructure best practices
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

interface InfraAnalysis {
  cloudProvider: CloudProvider | null;
  region: string | null;
  headers: SecurityHeaders;
  waf: WAFDetection;
  serverInfo: ServerInfo;
  score: number;
  warnings: string[];
  issues: string[];
}

interface CloudProvider {
  name: string;
  confidence: number;
  indicators: string[];
}

interface SecurityHeaders {
  present: string[];
  missing: string[];
  values: Record<string, string>;
  score: number;
}

interface WAFDetection {
  detected: boolean;
  provider: string | null;
  confidence: number;
}

interface ServerInfo {
  server: string | null;
  poweredBy: string | null;
  technology: string[];
}

export class InfrastructureCheck extends BaseCheck {
  public readonly type = CheckType.CLOUD_PROVIDER;
  public readonly category = CheckCategory.INFRASTRUCTURE;
  public readonly name = 'Infrastructure Security Analysis';
  public readonly description = 'Validates cloud provider, security headers, and infrastructure configuration';

  private readonly REQUIRED_HEADERS = [
    'strict-transport-security',
    'x-content-type-options',
    'x-frame-options',
    'content-security-policy'
  ];

  private readonly RECOMMENDED_HEADERS = [
    'x-xss-protection',
    'referrer-policy',
    'permissions-policy',
    'cross-origin-opener-policy',
    'cross-origin-resource-policy'
  ];

  private readonly CLOUD_INDICATORS: Record<string, { patterns: string[]; headers: string[] }> = {
    'AWS': {
      patterns: ['amazonaws.com', 'awscdn', 'cloudfront'],
      headers: ['x-amz-', 'x-amzn-']
    },
    'Cloudflare': {
      patterns: ['cloudflare'],
      headers: ['cf-ray', 'cf-cache-status', 'cf-request-id']
    },
    'Google Cloud': {
      patterns: ['googleapis', 'googleusercontent', 'cloud.google'],
      headers: ['x-goog-', 'x-cloud-']
    },
    'Azure': {
      patterns: ['azure', 'azureedge', 'windows.net'],
      headers: ['x-azure-', 'x-ms-']
    },
    'Vercel': {
      patterns: ['vercel'],
      headers: ['x-vercel-']
    },
    'Netlify': {
      patterns: ['netlify'],
      headers: ['x-nf-']
    },
    'Fastly': {
      patterns: ['fastly'],
      headers: ['x-served-by', 'x-cache', 'fastly-']
    },
    'Akamai': {
      patterns: ['akamai', 'edgekey'],
      headers: ['x-akamai-']
    }
  };

  private readonly WAF_SIGNATURES: Record<string, string[]> = {
    'Cloudflare': ['cf-ray', '__cfduid', 'cf-cache-status'],
    'AWS WAF': ['x-amzn-waf-', 'awswaf'],
    'Akamai': ['akamai-grn', 'x-akamai-'],
    'Imperva': ['x-iinfo', 'incap_ses_'],
    'Sucuri': ['x-sucuri-', 'sucuri-'],
    'ModSecurity': ['mod_security', 'modsec']
  };

  public async execute(request: ValidationRequest): Promise<CheckResult> {
    const url = this.parseUrl(request.url);
    if (!url) {
      return this.failure(0, 1, RiskLevel.CRITICAL, {
        error: 'Invalid URL format'
      });
    }

    try {
      const analysis = await this.analyzeInfrastructure(url.toString());
      const score = this.calculateScore(analysis);
      const evidence = this.collectEvidence(analysis);

      if (score >= 60) {
        return this.success(score, 0.85, {
          cloudProvider: analysis.cloudProvider?.name || 'Unknown',
          cloudConfidence: analysis.cloudProvider?.confidence || 0,
          wafDetected: analysis.waf.detected,
          wafProvider: analysis.waf.provider,
          headersScore: analysis.headers.score,
          missingHeaders: analysis.headers.missing,
          warnings: analysis.warnings
        }, evidence);
      } else {
        return this.failure(score, 0.8, this.scoreToRisk(score), {
          issues: analysis.issues,
          missingHeaders: analysis.headers.missing,
          warnings: analysis.warnings
        }, evidence);
      }
    } catch (error) {
      return this.failure(30, 0.5, RiskLevel.MEDIUM, {
        error: 'Infrastructure analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async analyzeInfrastructure(url: string): Promise<InfraAnalysis> {
    const warnings: string[] = [];
    const issues: string[] = [];

    // Fetch headers
    const response = await this.fetchWithTimeout(url, {
      method: 'HEAD',
      redirect: 'follow'
    }, 10000);

    const headers = Object.fromEntries(response.headers.entries());

    // Analyze security headers
    const securityHeaders = this.analyzeSecurityHeaders(headers);

    // Detect cloud provider
    const cloudProvider = this.detectCloudProvider(url, headers);

    // Detect WAF
    const waf = this.detectWAF(headers);

    // Extract server info
    const serverInfo = this.extractServerInfo(headers);

    // Generate warnings
    if (securityHeaders.missing.length > 0) {
      warnings.push(`Missing security headers: ${securityHeaders.missing.join(', ')}`);
    }

    if (!waf.detected) {
      warnings.push('No WAF detected - consider adding one');
    }

    if (serverInfo.server && serverInfo.server.includes('/')) {
      warnings.push('Server version exposed in headers');
    }

    if (serverInfo.poweredBy) {
      warnings.push(`X-Powered-By header exposes technology: ${serverInfo.poweredBy}`);
    }

    // Check HSTS
    const hsts = headers['strict-transport-security'];
    if (hsts) {
      if (!hsts.includes('includeSubDomains')) {
        warnings.push('HSTS does not include subdomains');
      }
      if (!hsts.includes('preload')) {
        warnings.push('HSTS preload not enabled');
      }
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      if (maxAgeMatch && parseInt(maxAgeMatch[1]) < 31536000) {
        warnings.push('HSTS max-age less than 1 year');
      }
    }

    return {
      cloudProvider,
      region: null,
      headers: securityHeaders,
      waf,
      serverInfo,
      score: 0,
      warnings,
      issues
    };
  }

  private analyzeSecurityHeaders(headers: Record<string, string>): SecurityHeaders {
    const headerKeys = Object.keys(headers).map(k => k.toLowerCase());
    const values: Record<string, string> = {};
    const present: string[] = [];
    const missing: string[] = [];

    // Check required headers
    for (const header of this.REQUIRED_HEADERS) {
      if (headerKeys.includes(header)) {
        present.push(header);
        values[header] = headers[header] || headers[header.toLowerCase()] || '';
      } else {
        missing.push(header);
      }
    }

    // Check recommended headers
    for (const header of this.RECOMMENDED_HEADERS) {
      if (headerKeys.includes(header)) {
        present.push(header);
        values[header] = headers[header] || headers[header.toLowerCase()] || '';
      }
    }

    // Calculate score
    const requiredPresent = this.REQUIRED_HEADERS.filter(h => headerKeys.includes(h)).length;
    const recommendedPresent = this.RECOMMENDED_HEADERS.filter(h => headerKeys.includes(h)).length;
    
    const score = Math.round(
      (requiredPresent / this.REQUIRED_HEADERS.length) * 70 +
      (recommendedPresent / this.RECOMMENDED_HEADERS.length) * 30
    );

    return { present, missing, values, score };
  }

  private detectCloudProvider(url: string, headers: Record<string, string>): CloudProvider | null {
    const headerKeys = Object.keys(headers).map(k => k.toLowerCase());
    const headerStr = JSON.stringify(headers).toLowerCase();
    const urlLower = url.toLowerCase();

    for (const [name, config] of Object.entries(this.CLOUD_INDICATORS)) {
      const indicators: string[] = [];
      let confidence = 0;

      // Check URL patterns
      for (const pattern of config.patterns) {
        if (urlLower.includes(pattern)) {
          indicators.push(`URL contains '${pattern}'`);
          confidence += 30;
        }
      }

      // Check headers
      for (const headerPrefix of config.headers) {
        if (headerKeys.some(k => k.startsWith(headerPrefix)) || 
            headerStr.includes(headerPrefix)) {
          indicators.push(`Header prefix '${headerPrefix}' found`);
          confidence += 25;
        }
      }

      if (confidence > 0) {
        return {
          name,
          confidence: Math.min(100, confidence),
          indicators
        };
      }
    }

    return null;
  }

  private detectWAF(headers: Record<string, string>): WAFDetection {
    const headerStr = JSON.stringify(headers).toLowerCase();

    for (const [provider, signatures] of Object.entries(this.WAF_SIGNATURES)) {
      for (const sig of signatures) {
        if (headerStr.includes(sig.toLowerCase())) {
          return {
            detected: true,
            provider,
            confidence: 90
          };
        }
      }
    }

    // Check for generic WAF indicators
    if (headerStr.includes('waf') || headerStr.includes('firewall')) {
      return {
        detected: true,
        provider: 'Unknown WAF',
        confidence: 60
      };
    }

    return {
      detected: false,
      provider: null,
      confidence: 0
    };
  }

  private extractServerInfo(headers: Record<string, string>): ServerInfo {
    const technology: string[] = [];
    
    // Detect common technologies from headers
    const techIndicators: Record<string, string> = {
      'x-powered-by': 'Framework',
      'x-aspnet-version': 'ASP.NET',
      'x-drupal-cache': 'Drupal',
      'x-generator': 'Generator',
      'x-shopify-stage': 'Shopify'
    };

    for (const [header, tech] of Object.entries(techIndicators)) {
      if (headers[header]) {
        technology.push(`${tech}: ${headers[header]}`);
      }
    }

    return {
      server: headers['server'] || null,
      poweredBy: headers['x-powered-by'] || null,
      technology
    };
  }

  private calculateScore(analysis: InfraAnalysis): number {
    let score = 50; // Base score

    // Headers score (0-100) contributes 40%
    score += (analysis.headers.score / 100) * 40;

    // Cloud provider bonus
    if (analysis.cloudProvider) {
      score += analysis.cloudProvider.confidence * 0.1;
    }

    // WAF bonus
    if (analysis.waf.detected) {
      score += 15;
    }

    // Deductions
    score -= analysis.issues.length * 10;
    score -= analysis.warnings.length * 3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private collectEvidence(analysis: InfraAnalysis): Evidence[] {
    return [
      this.createEvidence('header', 'security_headers', {
        present: analysis.headers.present,
        missing: analysis.headers.missing,
        score: analysis.headers.score
      }, true),
      this.createEvidence('header', 'cloud_detection', {
        provider: analysis.cloudProvider?.name,
        confidence: analysis.cloudProvider?.confidence,
        indicators: analysis.cloudProvider?.indicators
      }, analysis.cloudProvider !== null),
      this.createEvidence('header', 'waf_detection', {
        detected: analysis.waf.detected,
        provider: analysis.waf.provider
      }, true)
    ];
  }
}
