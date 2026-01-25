/**
 * @snowrail/sentinel - Base Check Implementation
 * Abstract base class for all security checks
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

import {
  CheckResult,
  CheckType,
  CheckCategory,
  RiskLevel,
  Evidence,
  ValidationRequest,
  SentinelConfig
} from '../types';

export abstract class BaseCheck {
  public abstract readonly type: CheckType;
  public abstract readonly category: CheckCategory;
  public abstract readonly name: string;
  public abstract readonly description: string;

  protected config: SentinelConfig;

  constructor(config: SentinelConfig) {
    this.config = config;
  }

  /**
   * Execute the check and return results
   */
  public abstract execute(request: ValidationRequest): Promise<CheckResult>;

  /**
   * Create a successful check result
   */
  protected success(
    score: number,
    confidence: number,
    details: Record<string, unknown>,
    evidence: Evidence[] = []
  ): CheckResult {
    return {
      type: this.type,
      category: this.category,
      passed: true,
      score: Math.min(100, Math.max(0, score)),
      confidence: Math.min(1, Math.max(0, confidence)),
      risk: this.scoreToRisk(score),
      details,
      evidence,
      timestamp: new Date(),
      duration: 0
    };
  }

  /**
   * Create a failed check result
   */
  protected failure(
    score: number,
    confidence: number,
    risk: RiskLevel,
    details: Record<string, unknown>,
    evidence: Evidence[] = []
  ): CheckResult {
    return {
      type: this.type,
      category: this.category,
      passed: false,
      score: Math.min(100, Math.max(0, score)),
      confidence: Math.min(1, Math.max(0, confidence)),
      risk,
      details,
      evidence,
      timestamp: new Date(),
      duration: 0
    };
  }

  /**
   * Create evidence entry
   */
  protected createEvidence(
    type: Evidence['type'],
    source: string,
    data: unknown,
    verified: boolean = true
  ): Evidence {
    return { type, source, data, verified };
  }

  /**
   * Convert score to risk level
   */
  protected scoreToRisk(score: number): RiskLevel {
    if (score >= 90) return RiskLevel.NONE;
    if (score >= 70) return RiskLevel.LOW;
    if (score >= 50) return RiskLevel.MEDIUM;
    if (score >= 30) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  /**
   * Parse URL safely
   */
  protected parseUrl(url: string): URL | null {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  }

  /**
   * Fetch with timeout
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = 5000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
