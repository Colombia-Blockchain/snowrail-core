/**
 * @snowrail/sentinel
 * Trust Layer for AI Agent Payments
 * 
 * Pre-payment validation engine for x402 protocol.
 * Validates URLs, merchants, and payment destinations before
 * autonomous agents execute transactions.
 * 
 * @example
 * ```typescript
 * import { Sentinel, createSentinel } from '@snowrail/sentinel';
 * 
 * // Simple usage
 * const sentinel = createSentinel();
 * 
 * if (await sentinel.canPay('https://merchant.com/api')) {
 *   // Safe to proceed with payment
 * }
 * 
 * // With trust score
 * const trust = await sentinel.trust('https://merchant.com/api');
 * console.log(`Trust: ${trust * 100}%`);
 * 
 * // Full decision for agents
 * const decision = await sentinel.decide('https://merchant.com/api', 1000);
 * if (decision.pay && amount <= decision.maxAmount) {
 *   await executePayment();
 * }
 * ```
 * 
 * @author Colombia Blockchain
 * @license MIT
 * @version 2.0.0
 */

// Core
export { Sentinel, createSentinel } from './core/engine';

// Types
export * from './types';

// Ports (Hexagonal Architecture)
export * from './ports';

// Adapters (Port implementations)
export * from './adapters';

// Checks (for extension)
export { BaseCheck } from './checks/base';
export { TLSCheck } from './checks/tls';
export { DNSCheck } from './checks/dns';
export { InfrastructureCheck } from './checks/infrastructure';
export { FIATCheck } from './checks/fiat';
export { PolicyCheck } from './checks/policy';

// Default export
import { createSentinel } from './core/engine';
export default createSentinel;
