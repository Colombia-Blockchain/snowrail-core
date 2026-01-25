/**
 * @snowrail/yuki - AI Assistant Types
 * Type definitions for YUKI conversational AI
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

// ============================================================================
// CONVERSATION
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  intent?: Intent;
  entities?: Entity[];
  confidence?: number;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: Message[];
  context: ConversationContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationContext {
  agentId?: string;
  walletAddress?: string;
  currentBalance?: number;
  pendingTransactions?: number;
  lastPayment?: PaymentSummary;
  preferences?: UserPreferences;
}

// ============================================================================
// INTENTS & ENTITIES
// ============================================================================

export type IntentType = 
  | 'payment_request'
  | 'balance_check'
  | 'transaction_history'
  | 'trust_check'
  | 'help'
  | 'greeting'
  | 'confirmation'
  | 'cancellation'
  | 'settings'
  | 'unknown';

export interface Intent {
  type: IntentType;
  confidence: number;
  slots: Record<string, unknown>;
}

export interface Entity {
  type: 'amount' | 'currency' | 'address' | 'url' | 'date' | 'merchant';
  value: string;
  normalized?: unknown;
  start: number;
  end: number;
  confidence: number;
}

// ============================================================================
// TOOLS
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolProperty>;
  required?: string[];
}

export interface ToolProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ToolProperty;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface PaymentRequest {
  recipient: string;
  amount: number;
  currency: string;
  memo?: string;
  private?: boolean;
}

export interface PaymentSummary {
  id: string;
  amount: number;
  currency: string;
  recipient: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  txHash?: string;
}

// ============================================================================
// USER
// ============================================================================

export interface UserPreferences {
  language: string;
  confirmPayments: boolean;
  maxAutoApprove: number;
  defaultCurrency: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  payments: boolean;
  security: boolean;
  marketing: boolean;
}

// ============================================================================
// MEMORY
// ============================================================================

export interface Memory {
  id: string;
  userId: string;
  type: 'fact' | 'preference' | 'relationship' | 'event';
  content: string;
  embedding?: number[];
  importance: number;
  accessCount: number;
  lastAccessed: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface MemoryQuery {
  userId: string;
  query?: string;
  type?: Memory['type'];
  limit?: number;
  minImportance?: number;
}

// ============================================================================
// VOICE
// ============================================================================

export interface VoiceConfig {
  enabled: boolean;
  provider: 'whisper' | 'web-speech';
  ttsProvider: 'elevenlabs' | 'openai' | 'web-speech';
  voiceId?: string;
  language: string;
  speed: number;
}

export interface VoiceInput {
  audio: ArrayBuffer | Blob;
  format: 'webm' | 'mp3' | 'wav';
  language?: string;
}

export interface VoiceOutput {
  audio: ArrayBuffer;
  format: 'mp3' | 'wav';
  duration: number;
}

// ============================================================================
// CONFIG
// ============================================================================

export interface YukiConfig {
  // LLM
  llmProvider: 'openai' | 'anthropic' | 'local';
  llmModel: string;
  llmApiKey?: string;
  
  // Memory
  memoryEnabled: boolean;
  memoryProvider: 'postgres' | 'pinecone' | 'memory';
  
  // Voice
  voice: VoiceConfig;
  
  // Tools
  enabledTools: string[];
  
  // Behavior
  systemPrompt?: string;
  maxTokens: number;
  temperature: number;
  
  // Rate limiting
  maxMessagesPerMinute: number;
}

// ============================================================================
// EVENTS
// ============================================================================

export type YukiEventType = 
  | 'message:received'
  | 'message:sent'
  | 'tool:called'
  | 'tool:completed'
  | 'payment:requested'
  | 'payment:approved'
  | 'payment:rejected'
  | 'error';

export interface YukiEvent {
  type: YukiEventType;
  timestamp: Date;
  data: unknown;
}

export type YukiEventHandler = (event: YukiEvent) => void | Promise<void>;
