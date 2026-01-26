/**
 * @snowrail/sentinel - ERC-8004 Agent Descriptor Adapter
 * Stub implementation for agent identity verification
 * 
 * This adapter can be replaced with a real on-chain implementation
 * that reads from ERC-8004 compliant contracts.
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

import { AgentDescriptorPort, AgentDescriptor } from '../ports';

// ============================================================================
// MOCK AGENT REGISTRY (Replace with on-chain in production)
// ============================================================================

const mockAgents: Map<string, AgentDescriptor> = new Map([
  ['agent-demo-001', {
    agentId: 'agent-demo-001',
    owner: '0x1234567890123456789012345678901234567890',
    capabilities: ['payment', 'validation', 'query'],
    trustScore: 85,
    budget: {
      maxTransaction: 10000,
      dailyLimit: 50000,
      spent: 0
    },
    metadata: {
      name: 'Demo Agent',
      version: '1.0.0',
      provider: 'SnowRail'
    },
    registeredAt: new Date('2026-01-01'),
    lastActive: new Date()
  }],
  ['agent-autonomous-002', {
    agentId: 'agent-autonomous-002',
    owner: '0x0987654321098765432109876543210987654321',
    capabilities: ['payment', 'validation', 'query', 'negotiate'],
    trustScore: 92,
    budget: {
      maxTransaction: 50000,
      dailyLimit: 200000,
      spent: 15000
    },
    metadata: {
      name: 'Autonomous Trading Agent',
      version: '2.1.0',
      provider: 'External'
    },
    registeredAt: new Date('2025-12-15'),
    lastActive: new Date()
  }]
]);

// ============================================================================
// ERC-8004 ADAPTER
// ============================================================================

export class ERC8004Adapter implements AgentDescriptorPort {
  private agents: Map<string, AgentDescriptor>;
  private dailySpending: Map<string, { date: string; amount: number }> = new Map();

  constructor() {
    // In production, this would connect to on-chain registry
    this.agents = mockAgents;
  }

  /**
   * Get agent descriptor by ID
   * In production: read from ERC-8004 contract
   */
  async getDescriptor(agentId: string): Promise<AgentDescriptor | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    // Update last active
    agent.lastActive = new Date();
    return { ...agent };
  }

  /**
   * Verify agent has required capabilities
   */
  async verifyCapabilities(agentId: string, required: string[]): Promise<boolean> {
    const agent = await this.getDescriptor(agentId);
    if (!agent) return false;

    return required.every(cap => agent.capabilities.includes(cap));
  }

  /**
   * Check if agent can spend amount within budget
   */
  async canSpend(agentId: string, amount: number): Promise<boolean> {
    const agent = await this.getDescriptor(agentId);
    if (!agent) return false;

    // Check transaction limit
    if (amount > agent.budget.maxTransaction) {
      return false;
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const dailyRecord = this.dailySpending.get(agentId);
    
    let todaySpent = 0;
    if (dailyRecord && dailyRecord.date === today) {
      todaySpent = dailyRecord.amount;
    }

    if (todaySpent + amount > agent.budget.dailyLimit) {
      return false;
    }

    return true;
  }

  /**
   * Record spend (update budget tracking)
   */
  async recordSpend(agentId: string, amount: number): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Update total spent
    agent.budget.spent += amount;

    // Update daily spending
    const today = new Date().toISOString().split('T')[0];
    const dailyRecord = this.dailySpending.get(agentId);
    
    if (dailyRecord && dailyRecord.date === today) {
      dailyRecord.amount += amount;
    } else {
      this.dailySpending.set(agentId, { date: today, amount });
    }

    agent.lastActive = new Date();
  }

  /**
   * Register a new agent (for testing)
   * In production: this would be an on-chain transaction
   */
  registerAgent(descriptor: AgentDescriptor): void {
    this.agents.set(descriptor.agentId, descriptor);
  }

  /**
   * Get all registered agents (for debugging)
   */
  getAllAgents(): AgentDescriptor[] {
    return Array.from(this.agents.values());
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createERC8004Adapter(): ERC8004Adapter {
  return new ERC8004Adapter();
}
