/**
 * @snowrail/sentinel - Core Validation Engine
 * High-performance, extensible trust validation engine
 * 
 * @author Colombia Blockchain
 * @license MIT
 * @version 2.0.0
 */

import { createHash, randomUUID } from 'crypto';
import {
  ValidationRequest,
  ValidationResult,
  ValidationOptions,
  CheckResult,
  CheckType,
  RiskLevel,
  Decision,
  SentinelConfig,
  SentinelHooks,
  EventHandler,
  EventType,
  SentinelEvent,
  CacheEntry,
  RateLimitState,
  HealthStatus,
  SentinelError,
  ValidationError,
  AgentContext,
  AgentDecision
} from '../types';

import { BaseCheck } from '../checks/base';
import { TLSCheck } from '../checks/tls';
import { DNSCheck } from '../checks/dns';
import { InfrastructureCheck } from '../checks/infrastructure';
import { FIATCheck } from '../checks/fiat';
import { PolicyCheck } from '../checks/policy';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SentinelConfig = {
  apiVersion: '2.0.0',
  defaultTimeout: 10000,
  defaultMinScore: 60,
  defaultMaxRisk: RiskLevel.MEDIUM,
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  cacheMaxSize: 1000,
  rateLimitEnabled: true,
  rateLimitRequests: 100,
  rateLimitWindow: 60000, // 1 minute
  enabledChecks: [
    CheckType.TLS_CERTIFICATE,
    CheckType.DNS_SECURITY,
    CheckType.CLOUD_PROVIDER,
    CheckType.SECURITY_HEADERS,
    CheckType.PAYMENT_PROCESSOR,
    CheckType.ERC8004_COMPLIANCE,
    CheckType.X402_SUPPORT
  ],
  checkWeights: {
    [CheckType.TLS_CERTIFICATE]: 1.5,
    [CheckType.DNS_SECURITY]: 1.2,
    [CheckType.PAYMENT_PROCESSOR]: 1.3,
    [CheckType.ERC8004_COMPLIANCE]: 1.4,
    [CheckType.X402_SUPPORT]: 1.4
  },
  providers: {
    dns: {
      servers: ['8.8.8.8', '1.1.1.1'],
      timeout: 5000
    },
    ssl: {
      verifyChain: true,
      minGrade: 'B'
    }
  },
  logLevel: 'info',
  logFormat: 'json'
};

// ============================================================================
// SENTINEL ENGINE
// ============================================================================

export class Sentinel {
  private config: SentinelConfig;
  private checks: Map<CheckType, BaseCheck>;
  private cache: Map<string, CacheEntry<ValidationResult>>;
  private rateLimit: Map<string, RateLimitState>;
  private eventHandlers: Map<EventType, Set<EventHandler>>;
  private hooks: SentinelHooks;
  private startTime: Date;
  private stats: {
    validations: number;
    cacheHits: number;
    cacheMisses: number;
  };

  constructor(config: Partial<SentinelConfig> = {}, hooks: SentinelHooks = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.hooks = hooks;
    this.checks = new Map();
    this.cache = new Map();
    this.rateLimit = new Map();
    this.eventHandlers = new Map();
    this.startTime = new Date();
    this.stats = { validations: 0, cacheHits: 0, cacheMisses: 0 };

    this.initializeChecks();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private initializeChecks(): void {
    // Identity checks
    this.registerCheck(new TLSCheck(this.config));
    this.registerCheck(new DNSCheck(this.config));
    
    // Infrastructure checks
    this.registerCheck(new InfrastructureCheck(this.config));
    
    // FIAT checks
    this.registerCheck(new FIATCheck(this.config));
    
    // Policy checks
    this.registerCheck(new PolicyCheck(this.config));
  }

  public registerCheck(check: BaseCheck): void {
    this.checks.set(check.type, check);
  }

  // ==========================================================================
  // AGENT-FIRST API (Primary Interface)
  // ==========================================================================

  /**
   * Simple boolean check - Can we safely pay this URL?
   * @example
   * if (await sentinel.canPay('https://api.merchant.com')) {
   *   await processPayment();
   * }
   */
  public async canPay(url: string, options?: ValidationOptions): Promise<boolean> {
    const result = await this.validate({ url, options });
    return result.canPay;
  }

  /**
   * Get trust score (0-1) for a URL
   * @example
   * const trust = await sentinel.trust('https://api.merchant.com');
   * if (trust >= 0.8) { // High trust }
   */
  public async trust(url: string, options?: ValidationOptions): Promise<number> {
    const result = await this.validate({ url, options });
    return result.trustScore / 100;
  }

  /**
   * Full decision with context for autonomous agents
   * @example
   * const decision = await sentinel.decide('https://api.merchant.com', 1000);
   * if (decision.pay && amount <= decision.maxAmount) {
   *   await processPayment();
   * }
   */
  public async decide(
    url: string,
    amount: number,
    context?: AgentContext
  ): Promise<AgentDecision> {
    const result = await this.validate({ url, amount });
    
    const maxAmount = this.calculateMaxAmount(result, amount, context);
    const reasoning = this.generateReasoning(result, amount, maxAmount);
    
    return {
      pay: result.canPay && amount <= maxAmount,
      confidence: result.confidence,
      maxAmount,
      reasoning,
      alternatives: this.generateAlternatives(result, amount)
    };
  }

  // ==========================================================================
  // CORE VALIDATION
  // ==========================================================================

  /**
   * Full validation with all checks and detailed results
   */
  public async validate(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    const id = randomUUID();

    // Apply hooks
    if (this.hooks.beforeValidation) {
      request = await this.hooks.beforeValidation(request);
    }

    this.emit('validation:start', { id, request });

    // Rate limiting
    if (this.config.rateLimitEnabled && !this.checkRateLimit(request.url)) {
      throw new ValidationError('Rate limit exceeded', { url: request.url });
    }

    // Cache check
    const cacheKey = this.getCacheKey(request);
    if (this.config.cacheEnabled && request.options?.cache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        this.emit('cache:hit', { id, key: cacheKey });
        return cached;
      }
      this.stats.cacheMisses++;
      this.emit('cache:miss', { id, key: cacheKey });
    }

    // Run checks
    const checks = await this.runChecks(request);
    
    // Calculate scores
    const { trustScore, confidence, risk } = this.calculateScores(checks);
    
    // Make decision
    const decision = this.makeDecision(trustScore, risk, request.options);
    const canPay = decision === Decision.APPROVE;

    // Build result
    let result: ValidationResult = {
      id,
      url: request.url,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      canPay,
      trustScore,
      confidence,
      risk,
      decision,
      checks,
      checksRun: checks.length,
      checksPassed: checks.filter(c => c.passed).length,
      checksFailed: checks.filter(c => !c.passed).length,
      maxAmount: canPay ? this.calculateMaxAmount({ trustScore, confidence } as any, request.amount || 0) : 0,
      conditions: this.generateConditions(checks),
      warnings: this.generateWarnings(checks),
      blockedReasons: canPay ? undefined : this.generateBlockedReasons(checks),
      hash: this.hashResult(checks),
    };

    // Apply hooks
    if (this.hooks.afterValidation) {
      result = await this.hooks.afterValidation(result);
    }

    // Cache result
    if (this.config.cacheEnabled && request.options?.cache !== false) {
      this.setCache(cacheKey, result, request.options?.cacheTTL);
    }

    this.stats.validations++;
    this.emit('validation:complete', { id, result });

    return result;
  }

  // ==========================================================================
  // CHECK EXECUTION
  // ==========================================================================

  private async runChecks(request: ValidationRequest): Promise<CheckResult[]> {
    const options = request.options || {};
    const enabledChecks = options.checks || this.config.enabledChecks;
    const skipChecks = new Set(options.skipChecks || []);

    const checksToRun = enabledChecks.filter(type => !skipChecks.has(type));
    const timeout = options.timeout || this.config.defaultTimeout;

    if (options.parallel !== false) {
      // Parallel execution (default)
      const results = await Promise.allSettled(
        checksToRun.map(type => this.runSingleCheck(type, request, timeout))
      );

      return results
        .filter((r): r is PromiseFulfilledResult<CheckResult> => r.status === 'fulfilled')
        .map(r => r.value);
    } else {
      // Sequential execution
      const results: CheckResult[] = [];
      for (const type of checksToRun) {
        try {
          const result = await this.runSingleCheck(type, request, timeout);
          results.push(result);
        } catch (error) {
          // Continue on error
        }
      }
      return results;
    }
  }

  private async runSingleCheck(
    type: CheckType,
    request: ValidationRequest,
    timeout: number
  ): Promise<CheckResult> {
    const check = this.checks.get(type);
    if (!check) {
      throw new SentinelError(`Check not found: ${type}`, 'CHECK_NOT_FOUND');
    }

    this.emit('check:start', { type, url: request.url });

    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        check.execute(request),
        this.createTimeout(timeout, type)
      ]);

      const finalResult: CheckResult = {
        ...result,
        duration: Date.now() - startTime
      };

      this.emit('check:complete', { type, result: finalResult });
      
      if (this.hooks.onCheck) {
        await this.hooks.onCheck(finalResult);
      }

      return finalResult;
    } catch (error) {
      this.emit('check:error', { type, error });
      
      if (this.hooks.onError) {
        await this.hooks.onError(error as Error, { type, request });
      }

      throw error;
    }
  }

  private createTimeout(ms: number, type: CheckType): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new SentinelError(`Check timeout: ${type}`, 'TIMEOUT')), ms);
    });
  }

  // ==========================================================================
  // SCORING
  // ==========================================================================

  private calculateScores(checks: CheckResult[]): {
    trustScore: number;
    confidence: number;
    risk: RiskLevel;
  } {
    if (checks.length === 0) {
      return { trustScore: 0, confidence: 0, risk: RiskLevel.CRITICAL };
    }

    // Weighted score calculation
    let totalWeight = 0;
    let weightedScore = 0;
    let confidenceSum = 0;

    for (const check of checks) {
      const weight = this.config.checkWeights[check.type] || 1;
      totalWeight += weight;
      weightedScore += check.score * weight;
      confidenceSum += check.confidence;
    }

    const trustScore = Math.round(weightedScore / totalWeight);
    const confidence = confidenceSum / checks.length;

    // Determine risk level
    let risk: RiskLevel;
    const criticalFailed = checks.some(c => !c.passed && c.risk === RiskLevel.CRITICAL);
    const highFailed = checks.filter(c => !c.passed && c.risk === RiskLevel.HIGH).length;

    if (criticalFailed || trustScore < 20) {
      risk = RiskLevel.CRITICAL;
    } else if (highFailed >= 2 || trustScore < 40) {
      risk = RiskLevel.HIGH;
    } else if (trustScore < 60) {
      risk = RiskLevel.MEDIUM;
    } else if (trustScore < 80) {
      risk = RiskLevel.LOW;
    } else {
      risk = RiskLevel.NONE;
    }

    return { trustScore, confidence, risk };
  }

  private makeDecision(
    trustScore: number,
    risk: RiskLevel,
    options?: ValidationOptions
  ): Decision {
    const minScore = options?.minScore || this.config.defaultMinScore;
    const maxRisk = options?.maxRisk || this.config.defaultMaxRisk;

    const riskOrder = [RiskLevel.NONE, RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const riskIndex = riskOrder.indexOf(risk);
    const maxRiskIndex = riskOrder.indexOf(maxRisk);

    if (risk === RiskLevel.CRITICAL) {
      return Decision.DENY;
    }

    if (trustScore >= minScore && riskIndex <= maxRiskIndex) {
      return Decision.APPROVE;
    }

    if (trustScore >= minScore - 10 && riskIndex <= maxRiskIndex + 1) {
      return Decision.CONDITIONAL;
    }

    if (riskIndex <= maxRiskIndex) {
      return Decision.REVIEW;
    }

    return Decision.DENY;
  }

  // ==========================================================================
  // AGENT HELPERS
  // ==========================================================================

  private calculateMaxAmount(
    result: Partial<ValidationResult>,
    requestedAmount: number,
    context?: AgentContext
  ): number {
    const trustScore = result.trustScore || 0;
    const confidence = result.confidence || 0;

    // Base max from trust
    let maxFromTrust = Infinity;
    if (trustScore >= 90) maxFromTrust = 100000;
    else if (trustScore >= 80) maxFromTrust = 50000;
    else if (trustScore >= 70) maxFromTrust = 10000;
    else if (trustScore >= 60) maxFromTrust = 5000;
    else maxFromTrust = 1000;

    // Adjust for confidence
    maxFromTrust *= confidence;

    // Apply agent budget constraints
    if (context?.budget) {
      const budgetRemaining = Math.min(
        context.budget.maxTransaction,
        context.budget.dailyLimit - context.budget.spent.today,
        context.budget.monthlyLimit - context.budget.spent.thisMonth
      );
      return Math.min(maxFromTrust, budgetRemaining);
    }

    return Math.min(maxFromTrust, requestedAmount * 2);
  }

  private generateReasoning(
    result: ValidationResult,
    amount: number,
    maxAmount: number
  ): string[] {
    const reasons: string[] = [];

    if (result.trustScore >= 80) {
      reasons.push(`High trust score (${result.trustScore}/100) indicates reliable merchant`);
    } else if (result.trustScore >= 60) {
      reasons.push(`Moderate trust score (${result.trustScore}/100) - proceed with caution`);
    } else {
      reasons.push(`Low trust score (${result.trustScore}/100) - elevated risk detected`);
    }

    if (amount > maxAmount) {
      reasons.push(`Requested amount ($${amount}) exceeds safe limit ($${maxAmount})`);
    }

    if (result.warnings && result.warnings.length > 0) {
      reasons.push(...result.warnings);
    }

    return reasons;
  }

  private generateAlternatives(result: ValidationResult, amount: number): any[] {
    const alternatives = [];

    if (!result.canPay && result.trustScore >= 50) {
      alternatives.push({
        action: 'reduce_amount',
        description: `Try with reduced amount ($${Math.floor(amount * 0.5)})`,
        risk: RiskLevel.MEDIUM,
        tradeoffs: ['Lower payment amount', 'May require multiple transactions']
      });
    }

    if (result.decision === Decision.REVIEW) {
      alternatives.push({
        action: 'manual_review',
        description: 'Request human approval before proceeding',
        risk: RiskLevel.LOW,
        tradeoffs: ['Delays transaction', 'Adds human oversight']
      });
    }

    return alternatives;
  }

  private generateConditions(checks: CheckResult[]): string[] {
    const conditions: string[] = [];
    
    const lowScoreChecks = checks.filter(c => c.score < 70 && c.passed);
    for (const check of lowScoreChecks) {
      conditions.push(`Monitor ${check.type.replace('_', ' ')} - score below optimal`);
    }

    return conditions;
  }

  private generateWarnings(checks: CheckResult[]): string[] {
    const warnings: string[] = [];
    
    for (const check of checks) {
      if (check.risk === RiskLevel.MEDIUM && check.passed) {
        warnings.push(`${check.type}: ${JSON.stringify(check.details)}`);
      }
    }

    return warnings;
  }

  private generateBlockedReasons(checks: CheckResult[]): string[] {
    return checks
      .filter(c => !c.passed)
      .map(c => `${c.type}: Failed validation (score: ${c.score})`);
  }

  // ==========================================================================
  // CACHING
  // ==========================================================================

  private getCacheKey(request: ValidationRequest): string {
    const data = JSON.stringify({
      url: request.url,
      checks: request.options?.checks || this.config.enabledChecks
    });
    return createHash('sha256').update(data).digest('hex');
  }

  private getFromCache(key: string): ValidationResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  private setCache(key: string, result: ValidationResult, ttl?: number): void {
    // Enforce max size
    if (this.cache.size >= this.config.cacheMaxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data: result,
      timestamp: new Date(),
      ttl: ttl || this.config.cacheTTL,
      hits: 0
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================

  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    let state = this.rateLimit.get(identifier);

    if (!state || now - state.windowStart.getTime() > this.config.rateLimitWindow) {
      state = {
        requests: 0,
        windowStart: new Date(),
        blocked: false
      };
    }

    state.requests++;

    if (state.requests > this.config.rateLimitRequests) {
      state.blocked = true;
      this.rateLimit.set(identifier, state);
      this.emit('rate:limit', { identifier, state });
      return false;
    }

    this.rateLimit.set(identifier, state);
    return true;
  }

  // ==========================================================================
  // EVENTS
  // ==========================================================================

  public on(event: EventType, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  public off(event: EventType, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(type: EventType, data: unknown): void {
    const event: SentinelEvent = { type, timestamp: new Date(), data };
    this.eventHandlers.get(type)?.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        // Silently ignore handler errors
      }
    });
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private hashResult(checks: CheckResult[]): string {
    const data = JSON.stringify(checks.map(c => ({
      type: c.type,
      passed: c.passed,
      score: c.score
    })));
    return createHash('sha256').update(data).digest('hex');
  }

  public getHealth(): HealthStatus {
    const enabledChecks = Array.from(this.checks.values()).filter(
      c => this.config.enabledChecks.includes(c.type)
    );

    let cacheHitRate = 0;
    if (this.stats.cacheHits + this.stats.cacheMisses > 0) {
      cacheHitRate = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses);
    }

    return {
      healthy: true,
      version: this.config.apiVersion,
      uptime: Date.now() - this.startTime.getTime(),
      checks: {
        total: this.checks.size,
        enabled: enabledChecks.length,
        healthy: enabledChecks.length
      },
      cache: {
        size: this.cache.size,
        hitRate: cacheHitRate
      },
      rateLimit: {
        remaining: this.config.rateLimitRequests,
        resetAt: new Date(Date.now() + this.config.rateLimitWindow)
      }
    };
  }

  public getConfig(): Readonly<SentinelConfig> {
    return Object.freeze({ ...this.config });
  }

  public updateConfig(updates: Partial<SentinelConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createSentinel(
  config?: Partial<SentinelConfig>,
  hooks?: SentinelHooks
): Sentinel {
  return new Sentinel(config, hooks);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default Sentinel;
