/**
 * @snowrail/sentinel - FIAT Payment Processor Check
 * Validates payment processor integration and PCI compliance indicators
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

interface FIATAnalysis {
  processors: ProcessorDetection[];
  pciIndicators: PCIIndicators;
  securityFeatures: string[];
  warnings: string[];
  issues: string[];
}

interface ProcessorDetection {
  name: string;
  confidence: number;
  type: 'primary' | 'secondary' | 'crypto';
  indicators: string[];
}

interface PCIIndicators {
  httpsOnly: boolean;
  secureIframe: boolean;
  tokenization: boolean;
  noCardStorage: boolean;
  score: number;
}

export class FIATCheck extends BaseCheck {
  public readonly type = CheckType.PAYMENT_PROCESSOR;
  public readonly category = CheckCategory.FIAT;
  public readonly name = 'Payment Processor Validation';
  public readonly description = 'Validates FIAT payment processor integration and security compliance';

  private readonly PROCESSOR_SIGNATURES: Record<string, { patterns: string[]; type: 'primary' | 'secondary' | 'crypto' }> = {
    'Stripe': { patterns: ['stripe.com', 'js.stripe.com', 'stripe-js'], type: 'primary' },
    'PayPal': { patterns: ['paypal.com', 'paypalobjects.com'], type: 'primary' },
    'Square': { patterns: ['squareup.com', 'squarecdn.com'], type: 'primary' },
    'Adyen': { patterns: ['adyen.com', 'adyencheckout'], type: 'primary' },
    'Braintree': { patterns: ['braintreegateway.com'], type: 'primary' },
    'Coinbase Commerce': { patterns: ['commerce.coinbase.com'], type: 'crypto' },
    'Circle': { patterns: ['circle.com', 'usdc'], type: 'crypto' },
    'Ramp Network': { patterns: ['ramp.network'], type: 'crypto' },
    'MoonPay': { patterns: ['moonpay.com'], type: 'crypto' }
  };

  public async execute(request: ValidationRequest): Promise<CheckResult> {
    const url = this.parseUrl(request.url);
    if (!url) {
      return this.failure(0, 1, RiskLevel.CRITICAL, { error: 'Invalid URL' });
    }

    try {
      const analysis = await this.analyzeFIAT(url.toString());
      const score = this.calculateScore(analysis);
      const evidence = this.collectEvidence(analysis);

      if (analysis.processors.length === 0) {
        return this.success(70, 0.6, {
          message: 'No FIAT processors detected - may be crypto-only',
          pciScore: analysis.pciIndicators.score
        }, evidence);
      }

      if (score >= 60) {
        return this.success(score, 0.85, {
          processors: analysis.processors.map(p => ({ name: p.name, type: p.type })),
          pciScore: analysis.pciIndicators.score,
          securityFeatures: analysis.securityFeatures
        }, evidence);
      }

      return this.failure(score, 0.8, this.scoreToRisk(score), {
        issues: analysis.issues
      }, evidence);
    } catch (error) {
      return this.failure(50, 0.5, RiskLevel.MEDIUM, {
        error: 'FIAT analysis incomplete'
      });
    }
  }

  private async analyzeFIAT(url: string): Promise<FIATAnalysis> {
    const warnings: string[] = [];
    const issues: string[] = [];
    const securityFeatures: string[] = [];
    let pageContent = '';

    try {
      const response = await this.fetchWithTimeout(url, { method: 'GET' }, 15000);
      pageContent = await response.text();
    } catch { pageContent = ''; }

    const processors = this.detectProcessors(pageContent, url);
    const pciIndicators = this.analyzePCI(pageContent, url);

    if (pciIndicators.httpsOnly) securityFeatures.push('HTTPS enforced');
    if (pciIndicators.tokenization) securityFeatures.push('Tokenization detected');

    return { processors, pciIndicators, securityFeatures, warnings, issues };
  }

  private detectProcessors(content: string, url: string): ProcessorDetection[] {
    const processors: ProcessorDetection[] = [];
    const combined = (content + url).toLowerCase();

    for (const [name, config] of Object.entries(this.PROCESSOR_SIGNATURES)) {
      const indicators: string[] = [];
      let confidence = 0;

      for (const pattern of config.patterns) {
        if (combined.includes(pattern)) {
          indicators.push(pattern);
          confidence += 35;
        }
      }

      if (confidence > 0) {
        processors.push({ name, type: config.type, confidence: Math.min(100, confidence), indicators });
      }
    }

    return processors.sort((a, b) => b.confidence - a.confidence);
  }

  private analyzePCI(content: string, url: string): PCIIndicators {
    const lower = content.toLowerCase();
    const httpsOnly = url.startsWith('https://');
    const secureIframe = lower.includes('iframe') && (lower.includes('stripe') || lower.includes('braintree'));
    const tokenization = lower.includes('token') || lower.includes('createpaymentmethod');
    const noCardStorage = !lower.includes('cardnumber') || lower.includes('data-stripe');

    let score = 50;
    if (httpsOnly) score += 20;
    if (secureIframe) score += 15;
    if (tokenization) score += 10;
    if (noCardStorage) score += 5;

    return { httpsOnly, secureIframe, tokenization, noCardStorage, score: Math.min(100, score) };
  }

  private calculateScore(analysis: FIATAnalysis): number {
    let score = 50;
    if (analysis.processors.length > 0) {
      score += Math.min(30, analysis.processors[0].confidence * 0.3);
      const major = ['Stripe', 'PayPal', 'Square', 'Adyen'];
      if (major.includes(analysis.processors[0].name)) score += 10;
    }
    score += (analysis.pciIndicators.score / 100) * 20;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private collectEvidence(analysis: FIATAnalysis): Evidence[] {
    return [
      this.createEvidence('api_response', 'processors', { processors: analysis.processors }, true),
      this.createEvidence('api_response', 'pci', { indicators: analysis.pciIndicators }, true)
    ];
  }
}
