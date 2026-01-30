/**
 * @snowrail/sentinel - ERC-8004 Agent Descriptor Adapter
 * On-chain implementation for agent identity verification
 *
 * This adapter connects to the AgentRegistry contract on Avalanche
 * to read agent identities, capabilities, and reputation.
 *
 * @author Colombia Blockchain
 * @license MIT
 */

import { AgentDescriptorPort, AgentDescriptor } from '../ports';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Provider {
  call(transaction: { to: string; data: string }): Promise<string>;
}

// ============================================================================
// MOCK DATA (for development/testing)
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
  private provider?: Provider;
  private contractAddress?: string;
  private abi?: any[];
  private mockMode: boolean;
  private agents: Map<string, AgentDescriptor>;
  private dailySpending: Map<string, { date: string; amount: number }> = new Map();

  constructor(options?: {
    provider?: Provider;
    contractAddress?: string;
    abi?: any[];
  }) {
    // Use mock mode if no provider/contract specified
    this.mockMode = !options?.provider || !options?.contractAddress;

    if (!this.mockMode) {
      this.provider = options!.provider;
      this.contractAddress = options!.contractAddress;
      this.abi = options!.abi;
    }

    this.agents = mockAgents;

    if (this.mockMode) {
      console.log('[ERC8004] Running in MOCK mode (no blockchain connection)');
    } else {
      console.log(`[ERC8004] Connected to AgentRegistry: ${this.contractAddress}`);
    }
  }

  /**
   * Get agent descriptor by ID
   */
  async getDescriptor(agentId: string): Promise<AgentDescriptor | null> {
    if (this.mockMode) {
      return this.getMockDescriptor(agentId);
    }

    try {
      // Convert agentId to bytes32
      const agentIdBytes = this.stringToBytes32(agentId);

      // Call contract
      const agent = await this.callContract('getAgent', [agentIdBytes]);

      if (agent.owner === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      // Get capabilities
      const capabilities = await this.getCapabilities(agentIdBytes);

      return {
        agentId,
        owner: agent.owner,
        capabilities,
        trustScore: Number(agent.trustScore),
        budget: {
          maxTransaction: Number(agent.maxTransaction) / 1e6, // Convert from 6 decimals
          dailyLimit: Number(agent.dailyLimit) / 1e6,
          spent: Number(agent.totalVolume) / 1e6
        },
        metadata: {
          name: agent.name,
          verified: agent.verified,
          active: agent.active
        },
        registeredAt: new Date(Number(agent.registeredAt) * 1000),
        lastActive: new Date()
      };
    } catch (error) {
      console.error('[ERC8004] Error fetching agent:', error);
      return null;
    }
  }

  /**
   * Verify agent has required capabilities
   */
  async verifyCapabilities(agentId: string, required: string[]): Promise<boolean> {
    if (this.mockMode) {
      const agent = await this.getMockDescriptor(agentId);
      if (!agent) return false;
      return required.every(cap => agent.capabilities.includes(cap));
    }

    try {
      const agentIdBytes = this.stringToBytes32(agentId);

      for (const cap of required) {
        const has = await this.callContract('hasCapability', [agentIdBytes, cap]);
        if (!has) return false;
      }

      return true;
    } catch (error) {
      console.error('[ERC8004] Error verifying capabilities:', error);
      return false;
    }
  }

  /**
   * Check if agent can spend amount within budget
   */
  async canSpend(agentId: string, amount: number): Promise<boolean> {
    const agent = await this.getDescriptor(agentId);
    if (!agent) return false;

    // Check transaction limit
    if (amount > agent.budget.maxTransaction) {
      console.log(`[ERC8004] Amount ${amount} exceeds max transaction ${agent.budget.maxTransaction}`);
      return false;
    }

    // Check daily limit (simplified - production needs better tracking)
    if (this.mockMode) {
      const today = new Date().toISOString().split('T')[0];
      const dailyRecord = this.dailySpending.get(agentId);

      let todaySpent = 0;
      if (dailyRecord && dailyRecord.date === today) {
        todaySpent = dailyRecord.amount;
      }

      if (todaySpent + amount > agent.budget.dailyLimit) {
        console.log(`[ERC8004] Daily limit exceeded: ${todaySpent + amount} > ${agent.budget.dailyLimit}`);
        return false;
      }
    } else {
      // In production, daily tracking would be done on-chain or via indexer
      if (agent.budget.spent + amount > agent.budget.dailyLimit) {
        console.log(`[ERC8004] Daily limit exceeded`);
        return false;
      }
    }

    return true;
  }

  /**
   * Record spend (update budget tracking)
   */
  async recordSpend(agentId: string, amount: number): Promise<void> {
    if (this.mockMode) {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      agent.budget.spent += amount;

      const today = new Date().toISOString().split('T')[0];
      const dailyRecord = this.dailySpending.get(agentId);

      if (dailyRecord && dailyRecord.date === today) {
        dailyRecord.amount += amount;
      } else {
        this.dailySpending.set(agentId, { date: today, amount });
      }

      agent.lastActive = new Date();
      console.log(`[ERC8004] Recorded spend: ${agentId} - ${amount} USDC`);
    } else {
      // In production, this would be called by Treasury contract
      // Not directly from adapter
      console.log(`[ERC8004] Spend recorded on-chain: ${agentId} - ${amount} USDC`);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async getMockDescriptor(agentId: string): Promise<AgentDescriptor | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.lastActive = new Date();
    return { ...agent };
  }

  private async getCapabilities(agentIdBytes: string): Promise<string[]> {
    // In production, emit events when capabilities are added
    // and index them off-chain, or use a more efficient structure
    const commonCaps = ['payment', 'validation', 'query', 'negotiate'];
    const caps: string[] = [];

    for (const cap of commonCaps) {
      try {
        const has = await this.callContract('hasCapability', [agentIdBytes, cap]);
        if (has) {
          caps.push(cap);
        }
      } catch (error) {
        // Continue if capability check fails
      }
    }

    return caps;
  }

  private async callContract(_method: string, _params: any[]): Promise<any> {
    if (!this.provider || !this.contractAddress || !this.abi) {
      throw new Error('Contract not configured');
    }

    // This is a simplified implementation
    // In production, use ethers.js Contract instance
    throw new Error('Contract calls require ethers.js integration');
  }

  private stringToBytes32(str: string): string {
    // Simple hash function - in production use ethers.id()
    return '0x' + Buffer.from(str).toString('hex').padEnd(64, '0').slice(0, 64);
  }

  // ============================================================================
  // TESTING METHODS
  // ============================================================================

  /**
   * Register a new agent (for testing/mock mode only)
   */
  registerAgent(descriptor: AgentDescriptor): void {
    if (!this.mockMode) {
      console.warn('[ERC8004] registerAgent only available in mock mode');
      return;
    }
    this.agents.set(descriptor.agentId, descriptor);
  }

  /**
   * Get all registered agents (for debugging)
   */
  getAllAgents(): AgentDescriptor[] {
    if (!this.mockMode) {
      console.warn('[ERC8004] getAllAgents only available in mock mode');
      return [];
    }
    return Array.from(this.agents.values());
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create ERC8004 adapter with optional blockchain integration
 *
 * @param options.provider - Ethers.js provider (optional, uses mock if not provided)
 * @param options.contractAddress - AgentRegistry contract address
 * @param options.abi - Contract ABI
 */
export function createERC8004Adapter(options?: {
  provider?: Provider;
  contractAddress?: string;
  abi?: any[];
}): ERC8004Adapter {
  return new ERC8004Adapter(options);
}

/**
 * Create mock adapter for testing (no blockchain connection)
 */
export function createMockERC8004Adapter(): ERC8004Adapter {
  return new ERC8004Adapter();
}
