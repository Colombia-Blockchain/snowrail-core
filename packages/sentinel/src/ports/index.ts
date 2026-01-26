/**
 * @snowrail/sentinel - Port Interfaces
 * Hexagonal architecture ports for external integrations
 * 
 * These interfaces define contracts that adapters must implement.
 * The core NEVER imports from apps/* - only these port interfaces.
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

// ============================================================================
// X402 FACILITATOR PORT
// ============================================================================

export interface PaymentIntentRequest {
  url: string;
  amount: number;
  currency: string;
  token: string;           // Must be USDC address
  chain: string;
  sender: string;
  recipient: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntent {
  id: string;
  status: 'pending' | 'ready' | 'expired';
  amount: number;
  currency: string;
  token: string;
  chain: string;
  sender: string;
  recipient: string;
  expiresAt: Date;
  authorization?: AuthorizationData;
}

export interface AuthorizationData {
  type: 'eip712' | 'eip2612' | 'transferWithAuthorization';
  domain: Record<string, unknown>;
  message: Record<string, unknown>;
  signature?: string;
}

export interface PaymentReceipt {
  intentId: string;
  txHash: string;
  status: 'confirmed' | 'failed' | 'pending';
  amount: number;
  token: string;
  chain: string;
  blockNumber?: number;
  timestamp: Date;
}

/**
 * X402 Facilitator Port
 * Adapter must implement this interface to integrate payment facilitation
 */
export interface X402FacilitatorPort {
  /**
   * Create a payment intent after trust validation passes
   */
  createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent>;
  
  /**
   * Sign authorization for USDC transfer (EIP-712 or similar)
   */
  signAuthorization(intent: PaymentIntent): Promise<AuthorizationData>;
  
  /**
   * Verify a payment receipt after execution
   */
  verifyReceipt(receipt: PaymentReceipt): Promise<boolean>;
  
  /**
   * Get intent status
   */
  getIntentStatus(intentId: string): Promise<PaymentIntent>;
}

// ============================================================================
// USDC RAIL PORT
// ============================================================================

export interface USDCConfig {
  chainId: number;
  chainName: string;
  tokenAddress: string;
  decimals: number;
  treasuryAddress?: string;
  mixerAddress?: string;
}

export interface TransferRequest {
  from: string;
  to: string;
  amount: number;
  chain: string;
}

export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: number;
}

/**
 * USDC Rail Port
 * Adapter must implement this interface for USDC transfers
 */
export interface USDCRailPort {
  /**
   * Get USDC configuration for a chain
   */
  getConfig(chain: string): USDCConfig;
  
  /**
   * Get supported chains
   */
  getSupportedChains(): string[];
  
  /**
   * Check balance
   */
  getBalance(address: string, chain: string): Promise<number>;
  
  /**
   * Execute transfer (requires signer)
   */
  transfer(request: TransferRequest, signer: unknown): Promise<TransferResult>;
  
  /**
   * Check if address is valid
   */
  isValidAddress(address: string): boolean;
}

// ============================================================================
// ERC-8004 AGENT DESCRIPTOR PORT
// ============================================================================

export interface AgentDescriptor {
  agentId: string;
  owner: string;
  capabilities: string[];
  trustScore: number;
  budget: {
    maxTransaction: number;
    dailyLimit: number;
    spent: number;
  };
  metadata: Record<string, unknown>;
  registeredAt: Date;
  lastActive: Date;
}

/**
 * ERC-8004 Agent Descriptor Port
 * Adapter must implement this interface for agent identity verification
 */
export interface AgentDescriptorPort {
  /**
   * Get agent descriptor by ID
   */
  getDescriptor(agentId: string): Promise<AgentDescriptor | null>;
  
  /**
   * Verify agent capabilities
   */
  verifyCapabilities(agentId: string, required: string[]): Promise<boolean>;
  
  /**
   * Check if agent can spend amount
   */
  canSpend(agentId: string, amount: number): Promise<boolean>;
  
  /**
   * Record spend (update budget tracking)
   */
  recordSpend(agentId: string, amount: number): Promise<void>;
}

// ============================================================================
// REPUTATION PROVIDER PORT
// ============================================================================

export interface ReputationData {
  url: string;
  score: number;
  confidence: number;
  sources: string[];
  reports: {
    positive: number;
    negative: number;
    neutral: number;
  };
  lastUpdated: Date;
}

/**
 * Reputation Provider Port
 * Adapter must implement this interface for external reputation data
 */
export interface ReputationProviderPort {
  /**
   * Get reputation data for a URL
   */
  getReputation(url: string): Promise<ReputationData | null>;
  
  /**
   * Report a URL (positive/negative)
   */
  report(url: string, type: 'positive' | 'negative', details?: string): Promise<void>;
  
  /**
   * Check if URL is blacklisted
   */
  isBlacklisted(url: string): Promise<boolean>;
}

// ============================================================================
// TELEMETRY PORT
// ============================================================================

export interface TelemetryEvent {
  type: string;
  timestamp: Date;
  data: Record<string, unknown>;
  correlationId?: string;
}

/**
 * Telemetry Port
 * Adapter must implement this interface for observability
 */
export interface TelemetryPort {
  /**
   * Record an event
   */
  record(event: TelemetryEvent): void;
  
  /**
   * Record a metric
   */
  metric(name: string, value: number, tags?: Record<string, string>): void;
  
  /**
   * Start a trace span
   */
  startSpan(name: string, parentId?: string): string;
  
  /**
   * End a trace span
   */
  endSpan(spanId: string): void;
}
