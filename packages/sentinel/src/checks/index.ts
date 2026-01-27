/**
 * @snowrail/sentinel - Security Checks Index
 * Export all available security checks
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

// Base
export { BaseCheck } from './base';

// Identity Checks
export { TLSCheck } from './tls';
export { DNSCheck } from './dns';
export { DomainAgeCheck, createDomainAgeCheck } from './domain-age';

// Infrastructure Checks
export { InfrastructureCheck } from './infrastructure';

// FIAT Compliance Checks
export { FIATCheck } from './fiat';

// Policy Checks
export { PolicyCheck } from './policy';

// Reputation Checks
export { PhishingCheck, createPhishingCheck } from './phishing';
export { ReputationCheck, createReputationCheck } from './reputation';

// Agent Economy Checks
export { AgentEndpointCheck, createAgentEndpointCheck } from './agent-endpoint';
export { SmartContractCheck, createSmartContractCheck } from './smart-contract';
export { AgentScamCheck, createAgentScamCheck } from './agent-scam';

// All checks for easy registration
export const ALL_CHECKS = [
  'TLSCheck',
  'DNSCheck',
  'DomainAgeCheck',
  'InfrastructureCheck',
  'FIATCheck',
  'PolicyCheck',
  'PhishingCheck',
  'ReputationCheck',
  'AgentEndpointCheck',
  'SmartContractCheck',
  'AgentScamCheck'
] as const;

export type CheckName = typeof ALL_CHECKS[number];
