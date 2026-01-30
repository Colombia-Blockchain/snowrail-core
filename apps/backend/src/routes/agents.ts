/**
 * Agent API Routes (ERC-8004)
 * Endpoints for querying agent identities, capabilities, and trust scores
 *
 * @author Colombia Blockchain
 * @license MIT
 */

import { Router, Request, Response } from 'express';
import { createMockERC8004Adapter } from '@snowrail/sentinel';

const router = Router();

// Initialize adapter (mock mode for now - will be upgraded to on-chain)
const agentRegistry = createMockERC8004Adapter();

/**
 * GET /v1/agents/:agentId
 * Get agent information
 *
 * @param agentId - Unique agent identifier
 * @returns Agent descriptor with capabilities, trust score, and budget
 */
router.get('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const agent = await agentRegistry.getDescriptor(agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json({ agent });
  } catch (error: any) {
    console.error('[Agents] Error fetching agent:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /v1/agents/:agentId/capabilities/verify
 * Check if agent has required capabilities
 *
 * @param agentId - Unique agent identifier
 * @body required - Array of required capability strings
 * @returns Whether agent has all required capabilities
 */
router.post('/:agentId/capabilities/verify', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { required } = req.body;

    if (!Array.isArray(required)) {
      return res.status(400).json({ error: 'required must be an array' });
    }

    const hasCapabilities = await agentRegistry.verifyCapabilities(
      agentId,
      required
    );

    return res.json({
      agentId,
      required,
      hasCapabilities
    });
  } catch (error: any) {
    console.error('[Agents] Error verifying capabilities:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /v1/agents/:agentId/can-spend
 * Check if agent can spend specified amount
 *
 * @param agentId - Unique agent identifier
 * @body amount - Amount to spend (USDC)
 * @returns Whether agent can spend amount within budget limits
 */
router.post('/:agentId/can-spend', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { amount } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const canSpend = await agentRegistry.canSpend(agentId, amount);
    const agent = await agentRegistry.getDescriptor(agentId);

    return res.json({
      agentId,
      amount,
      canSpend,
      budget: agent?.budget
    });
  } catch (error: any) {
    console.error('[Agents] Error checking spend:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /v1/agents
 * List all registered agents (development only)
 *
 * @returns Array of all agents
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const agents = agentRegistry.getAllAgents();

    return res.json({
      agents,
      count: agents.length
    });
  } catch (error: any) {
    console.error('[Agents] Error listing agents:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /v1/agents/leaderboard
 * Get top agents by trust score
 *
 * @query limit - Number of agents to return (default: 10)
 * @returns Array of top agents sorted by trust score
 */
router.get('/leaderboard/top', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const agents = agentRegistry.getAllAgents();

    // Sort by trust score descending
    const leaderboard = agents
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, limit)
      .map(agent => ({
        agentId: agent.agentId,
        name: (agent.metadata as any).name,
        trustScore: agent.trustScore,
        paymentsCount: agent.budget.spent > 0 ? Math.floor(agent.budget.spent / 100) : 0,
        totalVolume: agent.budget.spent,
        verified: (agent.metadata as any).verified,
        active: (agent.metadata as any).active
      }));

    return res.json({
      leaderboard,
      count: leaderboard.length
    });
  } catch (error: any) {
    console.error('[Agents] Error fetching leaderboard:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
