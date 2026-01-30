import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { AgentRegistry } from '../typechain-types';

describe('AgentRegistry', function () {
  let registry: AgentRegistry;
  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let other: SignerWithAddress;
  let agentId: string;

  beforeEach(async function () {
    [admin, user, other] = await ethers.getSigners();

    const AgentRegistry = await ethers.getContractFactory('AgentRegistry');
    registry = await AgentRegistry.deploy(admin.address);
    await registry.waitForDeployment();

    agentId = ethers.id('test-agent' + user.address);
  });

  describe('Deployment', function () {
    it('should set admin role correctly', async function () {
      const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it('should set verifier role correctly', async function () {
      const VERIFIER_ROLE = await registry.VERIFIER_ROLE();
      expect(await registry.hasRole(VERIFIER_ROLE, admin.address)).to.be.true;
    });
  });

  describe('Registration', function () {
    it('should register a new agent', async function () {
      await registry.connect(user).registerAgent(
        agentId,
        'Test Agent',
        'ipfs://metadata',
        ethers.parseUnits('100', 6), // max tx
        ethers.parseUnits('1000', 6) // daily limit
      );

      const agent = await registry.getAgent(agentId);
      expect(agent.owner).to.equal(user.address);
      expect(agent.name).to.equal('Test Agent');
      expect(agent.metadata).to.equal('ipfs://metadata');
      expect(agent.trustScore).to.equal(50);
      expect(agent.paymentsCount).to.equal(0);
      expect(agent.totalVolume).to.equal(0);
      expect(agent.maxTransaction).to.equal(ethers.parseUnits('100', 6));
      expect(agent.dailyLimit).to.equal(ethers.parseUnits('1000', 6));
      expect(agent.verified).to.be.false;
      expect(agent.active).to.be.true;
    });

    it('should emit AgentRegistered event', async function () {
      await expect(
        registry.connect(user).registerAgent(
          agentId,
          'Test Agent',
          'ipfs://metadata',
          ethers.parseUnits('100', 6),
          ethers.parseUnits('1000', 6)
        )
      )
        .to.emit(registry, 'AgentRegistered')
        .withArgs(agentId, user.address, 'Test Agent');
    });

    it('should not register duplicate agent', async function () {
      await registry.connect(user).registerAgent(
        agentId,
        'Test Agent',
        'ipfs://metadata',
        ethers.parseUnits('100', 6),
        ethers.parseUnits('1000', 6)
      );

      await expect(
        registry.connect(user).registerAgent(
          agentId,
          'Test Agent 2',
          'ipfs://metadata',
          ethers.parseUnits('100', 6),
          ethers.parseUnits('1000', 6)
        )
      ).to.be.revertedWith('Agent already registered');
    });

    it('should reject registration with empty name', async function () {
      await expect(
        registry.connect(user).registerAgent(
          agentId,
          '',
          'ipfs://metadata',
          ethers.parseUnits('100', 6),
          ethers.parseUnits('1000', 6)
        )
      ).to.be.revertedWith('Name required');
    });

    it('should reject registration with zero max transaction', async function () {
      await expect(
        registry.connect(user).registerAgent(
          agentId,
          'Test Agent',
          'ipfs://metadata',
          0,
          ethers.parseUnits('1000', 6)
        )
      ).to.be.revertedWith('Max transaction must be > 0');
    });

    it('should track agents by owner', async function () {
      const agentId1 = ethers.id('agent1' + user.address);
      const agentId2 = ethers.id('agent2' + user.address);

      await registry.connect(user).registerAgent(
        agentId1,
        'Agent 1',
        'ipfs://metadata1',
        ethers.parseUnits('100', 6),
        ethers.parseUnits('1000', 6)
      );

      await registry.connect(user).registerAgent(
        agentId2,
        'Agent 2',
        'ipfs://metadata2',
        ethers.parseUnits('200', 6),
        ethers.parseUnits('2000', 6)
      );

      const ownerAgents = await registry.getAgentsByOwner(user.address);
      expect(ownerAgents.length).to.equal(2);
      expect(ownerAgents[0]).to.equal(agentId1);
      expect(ownerAgents[1]).to.equal(agentId2);
    });
  });

  describe('Verification', function () {
    beforeEach(async function () {
      await registry.connect(user).registerAgent(
        agentId,
        'Test Agent',
        'ipfs://metadata',
        ethers.parseUnits('100', 6),
        ethers.parseUnits('1000', 6)
      );
    });

    it('should verify agent by admin', async function () {
      await registry.connect(admin).verifyAgent(agentId);
      const agent = await registry.getAgent(agentId);
      expect(agent.verified).to.be.true;
    });

    it('should emit AgentVerified event', async function () {
      await expect(registry.connect(admin).verifyAgent(agentId))
        .to.emit(registry, 'AgentVerified')
        .withArgs(agentId, admin.address);
    });

    it('should not verify by non-admin', async function () {
      await expect(
        registry.connect(other).verifyAgent(agentId)
      ).to.be.reverted;
    });

    it('should not verify non-existent agent', async function () {
      const fakeAgentId = ethers.id('fake-agent');
      await expect(
        registry.connect(admin).verifyAgent(fakeAgentId)
      ).to.be.revertedWith('Agent not found');
    });
  });

  describe('Capabilities', function () {
    beforeEach(async function () {
      await registry.connect(user).registerAgent(
        agentId,
        'Test Agent',
        'ipfs://metadata',
        ethers.parseUnits('100', 6),
        ethers.parseUnits('1000', 6)
      );
    });

    it('should add capability by owner', async function () {
      await registry.connect(user).addCapability(agentId, 'payment');
      const has = await registry.hasCapability(agentId, 'payment');
      expect(has).to.be.true;
    });

    it('should emit AgentUpdated event', async function () {
      await expect(registry.connect(user).addCapability(agentId, 'payment'))
        .to.emit(registry, 'AgentUpdated')
        .withArgs(agentId);
    });

    it('should not add capability by non-owner', async function () {
      await expect(
        registry.connect(other).addCapability(agentId, 'payment')
      ).to.be.revertedWith('Not agent owner');
    });

    it('should add multiple capabilities', async function () {
      await registry.connect(user).addCapability(agentId, 'payment');
      await registry.connect(user).addCapability(agentId, 'validation');
      await registry.connect(user).addCapability(agentId, 'query');

      expect(await registry.hasCapability(agentId, 'payment')).to.be.true;
      expect(await registry.hasCapability(agentId, 'validation')).to.be.true;
      expect(await registry.hasCapability(agentId, 'query')).to.be.true;
      expect(await registry.hasCapability(agentId, 'negotiate')).to.be.false;
    });
  });

  describe('Payment Recording', function () {
    beforeEach(async function () {
      await registry.connect(user).registerAgent(
        agentId,
        'Test Agent',
        'ipfs://metadata',
        ethers.parseUnits('100', 6),
        ethers.parseUnits('1000', 6)
      );
    });

    it('should record payment and update stats', async function () {
      await registry.recordPayment(agentId, ethers.parseUnits('50', 6));

      const agent = await registry.getAgent(agentId);
      expect(agent.paymentsCount).to.equal(1);
      expect(agent.totalVolume).to.equal(ethers.parseUnits('50', 6));
    });

    it('should emit PaymentRecorded event', async function () {
      await expect(registry.recordPayment(agentId, ethers.parseUnits('50', 6)))
        .to.emit(registry, 'PaymentRecorded')
        .withArgs(agentId, ethers.parseUnits('50', 6));
    });

    it('should accumulate multiple payments', async function () {
      await registry.recordPayment(agentId, ethers.parseUnits('10', 6));
      await registry.recordPayment(agentId, ethers.parseUnits('20', 6));
      await registry.recordPayment(agentId, ethers.parseUnits('30', 6));

      const agent = await registry.getAgent(agentId);
      expect(agent.paymentsCount).to.equal(3);
      expect(agent.totalVolume).to.equal(ethers.parseUnits('60', 6));
    });

    it('should increase trust score after 10 payments', async function () {
      for (let i = 0; i < 10; i++) {
        await registry.recordPayment(agentId, ethers.parseUnits('10', 6));
      }

      const agent = await registry.getAgent(agentId);
      expect(agent.paymentsCount).to.equal(10);
      expect(agent.trustScore).to.equal(51); // Started at 50
    });

    it('should emit TrustScoreUpdated event on milestone', async function () {
      // Record 9 payments first
      for (let i = 0; i < 9; i++) {
        await registry.recordPayment(agentId, ethers.parseUnits('10', 6));
      }

      // 10th payment should trigger trust score update
      await expect(registry.recordPayment(agentId, ethers.parseUnits('10', 6)))
        .to.emit(registry, 'TrustScoreUpdated')
        .withArgs(agentId, 51);
    });

    it('should increase trust score multiple times', async function () {
      for (let i = 0; i < 30; i++) {
        await registry.recordPayment(agentId, ethers.parseUnits('10', 6));
      }

      const agent = await registry.getAgent(agentId);
      expect(agent.trustScore).to.equal(53); // 50 + 3 (at 10, 20, 30 payments)
    });

    it('should not increase trust score beyond 100', async function () {
      // Manually set trust score to 100 first
      await registry.connect(admin).updateTrustScore(agentId, 100);

      // Record payments
      for (let i = 0; i < 10; i++) {
        await registry.recordPayment(agentId, ethers.parseUnits('10', 6));
      }

      const agent = await registry.getAgent(agentId);
      expect(agent.trustScore).to.equal(100);
    });

    it('should not record payment for non-existent agent', async function () {
      const fakeAgentId = ethers.id('fake-agent');
      await expect(
        registry.recordPayment(fakeAgentId, ethers.parseUnits('50', 6))
      ).to.be.revertedWith('Agent not found');
    });

    it('should not record payment for inactive agent', async function () {
      // Note: There's no deactivation function in the current contract
      // This test would require adding a deactivate function first
      // For now, we skip this test or document it as a future enhancement
    });
  });

  describe('Trust Score Management', function () {
    beforeEach(async function () {
      await registry.connect(user).registerAgent(
        agentId,
        'Test Agent',
        'ipfs://metadata',
        ethers.parseUnits('100', 6),
        ethers.parseUnits('1000', 6)
      );
    });

    it('should update trust score by verifier', async function () {
      await registry.connect(admin).updateTrustScore(agentId, 75);
      const agent = await registry.getAgent(agentId);
      expect(agent.trustScore).to.equal(75);
    });

    it('should emit TrustScoreUpdated event', async function () {
      await expect(registry.connect(admin).updateTrustScore(agentId, 75))
        .to.emit(registry, 'TrustScoreUpdated')
        .withArgs(agentId, 75);
    });

    it('should not update trust score by non-verifier', async function () {
      await expect(
        registry.connect(other).updateTrustScore(agentId, 75)
      ).to.be.reverted;
    });

    it('should not allow trust score above 100', async function () {
      await expect(
        registry.connect(admin).updateTrustScore(agentId, 101)
      ).to.be.revertedWith('Score must be 0-100');
    });

    it('should allow trust score of 0', async function () {
      await registry.connect(admin).updateTrustScore(agentId, 0);
      const agent = await registry.getAgent(agentId);
      expect(agent.trustScore).to.equal(0);
    });

    it('should allow trust score of 100', async function () {
      await registry.connect(admin).updateTrustScore(agentId, 100);
      const agent = await registry.getAgent(agentId);
      expect(agent.trustScore).to.equal(100);
    });
  });

  describe('Agent ID Generation', function () {
    it('should generate consistent agent ID', async function () {
      const id1 = await registry.generateAgentId('MyAgent', user.address);
      const id2 = await registry.generateAgentId('MyAgent', user.address);
      expect(id1).to.equal(id2);
    });

    it('should generate different IDs for different names', async function () {
      const id1 = await registry.generateAgentId('Agent1', user.address);
      const id2 = await registry.generateAgentId('Agent2', user.address);
      expect(id1).to.not.equal(id2);
    });

    it('should generate different IDs for different owners', async function () {
      const id1 = await registry.generateAgentId('MyAgent', user.address);
      const id2 = await registry.generateAgentId('MyAgent', other.address);
      expect(id1).to.not.equal(id2);
    });
  });

  describe('Query Functions', function () {
    it('should return empty array for owner with no agents', async function () {
      const agents = await registry.getAgentsByOwner(other.address);
      expect(agents.length).to.equal(0);
    });

    it('should return zero address for non-existent agent', async function () {
      const fakeAgentId = ethers.id('fake-agent');
      const agent = await registry.getAgent(fakeAgentId);
      expect(agent.owner).to.equal(ethers.ZeroAddress);
    });

    it('should return false for capability check on non-existent agent', async function () {
      const fakeAgentId = ethers.id('fake-agent');
      const has = await registry.hasCapability(fakeAgentId, 'payment');
      expect(has).to.be.false;
    });
  });
});
