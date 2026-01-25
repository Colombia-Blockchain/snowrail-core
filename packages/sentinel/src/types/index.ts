/**
 * @snowrail/sentinel - Trust Layer Types
 * Enterprise-grade type definitions for pre-payment validation
 * 
 * @author Colombia Blockchain
 * @license MIT
 * @version 2.0.0
 */

// ============================================================================
// CORE ENUMS
// ============================================================================

export enum CheckCategory {
  IDENTITY = 'identity',
  INFRASTRUCTURE = 'infrastructure',
  FIAT = 'fiat',
  POLICY = 'policy',
  REPUTATION = 'reputation'
}

export enum CheckType {
  // Identity
  TLS_CERTIFICATE = 'tls_certificate',
  DNS_SECURITY = 'dns_security',
  DOMAIN_AGE = 'domain_age',
  WHOIS_PRIVACY = 'whois_privacy',
  
  // Infrastructure
  CLOUD_PROVIDER = 'cloud_provider',
  SECURITY_HEADERS = 'security_headers',
  WAF_DETECTION = 'waf_detection',
  SSL_GRADE = 'ssl_grade',
  
  // FIAT
  PAYMENT_PROCESSOR = 'payment_processor',
  PCI_COMPLIANCE = 'pci_compliance',
  MERCHANT_VERIFICATION = 'merchant_verification',
  
  // Policy
  ERC8004_COMPLIANCE = 'erc8004_compliance',
  X402_SUPPORT = 'x402_support',
  RATE_LIMITS = 'rate_limits',
  
  // Reputation
  HISTORICAL_SCORE = 'historical_score',
  COMMUNITY_REPORTS = 'community_reports',
  TRANSACTION_VOLUME = 'transaction_volume'
}

export enum RiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none'
}

export enum Decision {
  APPROVE = 'approve',
  DENY = 'deny',
  REVIEW = 'review',
  CONDITIONAL = 'conditional'
}

// ============================================================================
// CHECK RESULTS
// ============================================================================

export interface CheckResult {
  type: CheckType;
  category: CheckCategory;
  passed: boolean;
  score: number; // 0-100
  confidence: number; // 0-1
  risk: RiskLevel;
  details: Record<string, unknown>;
  evidence: Evidence[];
  timestamp: Date;
  duration: number; // ms
}

export interface Evidence {
  type: 'certificate' | 'dns_record' | 'header' | 'api_response' | 'blockchain' | 'external';
  source: string;
  data: unknown;
  verified: boolean;
  hash?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationRequest {
  url: string;
  amount?: number;
  currency?: string;
  sender?: string;
  recipient?: string;
  metadata?: Record<string, unknown>;
  options?: ValidationOptions;
}

export interface ValidationOptions {
  timeout?: number;
  checks?: CheckType[];
  skipChecks?: CheckType[];
  minScore?: number;
  maxRisk?: RiskLevel;
  parallel?: boolean;
  cache?: boolean;
  cacheTTL?: number;
}

export interface ValidationResult {
  id: string;
  url: string;
  timestamp: Date;
  duration: number;
  
  // Core results
  canPay: boolean;
  trustScore: number; // 0-100
  confidence: number; // 0-1
  risk: RiskLevel;
  decision: Decision;
  
  // Detailed breakdown
  checks: CheckResult[];
  checksRun: number;
  checksPassed: number;
  checksFailed: number;
  
  // Recommendations
  maxAmount?: number;
  conditions?: string[];
  warnings?: string[];
  blockedReasons?: string[];
  
  // Audit
  hash: string;
  signature?: string;
}

// ============================================================================
// AGENT-FIRST API
// ============================================================================

export interface AgentContext {
  agentId: string;
  agentType: 'autonomous' | 'semi-autonomous' | 'supervised';
  capabilities: string[];
  trustLevel: number;
  budget?: BudgetConstraints;
}

export interface BudgetConstraints {
  maxTransaction: number;
  dailyLimit: number;
  monthlyLimit: number;
  currency: string;
  spent: {
    today: number;
    thisMonth: number;
  };
}

export interface AgentDecision {
  pay: boolean;
  confidence: number;
  maxAmount: number;
  reasoning: string[];
  alternatives?: Alternative[];
}

export interface Alternative {
  action: string;
  description: string;
  risk: RiskLevel;
  tradeoffs: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SentinelConfig {
  // API
  apiVersion: string;
  baseUrl?: string;
  
  // Defaults
  defaultTimeout: number;
  defaultMinScore: number;
  defaultMaxRisk: RiskLevel;
  
  // Caching
  cacheEnabled: boolean;
  cacheTTL: number;
  cacheMaxSize: number;
  
  // Rate limiting
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
  
  // Checks
  enabledChecks: CheckType[];
  checkWeights: Partial<Record<CheckType, number>>;
  
  // Providers
  providers: ProviderConfig;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'text';
}

export interface ProviderConfig {
  dns?: {
    servers: string[];
    timeout: number;
  };
  ssl?: {
    verifyChain: boolean;
    minGrade: string;
  };
  reputation?: {
    sources: string[];
    apiKeys?: Record<string, string>;
  };
}

// ============================================================================
// EVENTS & HOOKS
// ============================================================================

export type EventType = 
  | 'validation:start'
  | 'validation:complete'
  | 'check:start'
  | 'check:complete'
  | 'check:error'
  | 'cache:hit'
  | 'cache:miss'
  | 'rate:limit';

export interface SentinelEvent {
  type: EventType;
  timestamp: Date;
  data: unknown;
}

export type EventHandler = (event: SentinelEvent) => void | Promise<void>;

export interface SentinelHooks {
  beforeValidation?: (request: ValidationRequest) => ValidationRequest | Promise<ValidationRequest>;
  afterValidation?: (result: ValidationResult) => ValidationResult | Promise<ValidationResult>;
  onCheck?: (check: CheckResult) => void | Promise<void>;
  onError?: (error: Error, context: unknown) => void | Promise<void>;
}

// ============================================================================
// ERRORS
// ============================================================================

export class SentinelError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SentinelError';
  }
}

export class ValidationError extends SentinelError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class CheckError extends SentinelError {
  constructor(
    message: string,
    public checkType: CheckType,
    details?: Record<string, unknown>
  ) {
    super(message, 'CHECK_ERROR', details);
    this.name = 'CheckError';
  }
}

export class ConfigError extends SentinelError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  hits: number;
}

export interface RateLimitState {
  requests: number;
  windowStart: Date;
  blocked: boolean;
}

export interface HealthStatus {
  healthy: boolean;
  version: string;
  uptime: number;
  checks: {
    total: number;
    enabled: number;
    healthy: number;
  };
  cache: {
    size: number;
    hitRate: number;
  };
  rateLimit: {
    remaining: number;
    resetAt: Date;
  };
}
