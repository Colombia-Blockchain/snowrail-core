/**
 * SnowRailTreasury Contract Tests
 * Tests for the Treasury contract with x402 payment protocol
 *
 * Run: pnpm hardhat test test/Treasury.test.ts
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { SnowRailTreasury, MockUSDC } from '../typechain-types';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('SnowRailTreasury', function () {
  let treasury: SnowRailTreasury;
  let usdc: MockUSDC;
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let user: SignerWithAddress;
  let recipient: SignerWithAddress;
  let feeCollector: SignerWithAddress;

  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('OPERATOR_ROLE'));
  const AGENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('AGENT_ROLE'));
  const SENTINEL_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SENTINEL_ROLE'));

  beforeEach(async function () {
    [admin, operator, user, recipient, feeCollector] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory('MockUSDC');
    usdc = (await MockUSDC.deploy()) as MockUSDC;
    await usdc.waitForDeployment();

    // Deploy Treasury
    const Treasury = await ethers.getContractFactory('SnowRailTreasury');
    treasury = (await Treasury.deploy(
      await usdc.getAddress(),
      feeCollector.address,
      admin.address
    )) as SnowRailTreasury;
    await treasury.waitForDeployment();

    // Mint USDC to user
    await usdc.mint(user.address, ethers.parseUnits('10000', 6));

    // Approve treasury to spend user's USDC
    await usdc.connect(user).approve(await treasury.getAddress(), ethers.MaxUint256);
  });

  describe('Deployment', function () {
    it('deploys with correct roles', async function () {
      expect(await treasury.hasRole(await treasury.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await treasury.hasRole(OPERATOR_ROLE, admin.address)).to.be.true;
      expect(await treasury.hasRole(SENTINEL_ROLE, admin.address)).to.be.true;
    });

    it('sets correct payment token', async function () {
      expect(await treasury.paymentToken()).to.equal(await usdc.getAddress());
    });

    it('sets correct fee collector', async function () {
      expect(await treasury.feeCollector()).to.equal(feeCollector.address);
    });

    it('reverts with zero address for payment token', async function () {
      const Treasury = await ethers.getContractFactory('SnowRailTreasury');
      await expect(
        Treasury.deploy(ethers.ZeroAddress, feeCollector.address, admin.address)
      ).to.be.revertedWithCustomError(treasury, 'ZeroAddress');
    });

    it('reverts with zero address for fee collector', async function () {
      const Treasury = await ethers.getContractFactory('SnowRailTreasury');
      await expect(
        Treasury.deploy(await usdc.getAddress(), ethers.ZeroAddress, admin.address)
      ).to.be.revertedWithCustomError(treasury, 'ZeroAddress');
    });

    it('reverts with zero address for admin', async function () {
      const Treasury = await ethers.getContractFactory('SnowRailTreasury');
      await expect(
        Treasury.deploy(await usdc.getAddress(), feeCollector.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(treasury, 'ZeroAddress');
    });
  });

  describe('pay()', function () {
    it('transfers USDC correctly', async function () {
      const amount = ethers.parseUnits('100', 6);
      const resourceHash = ethers.keccak256(ethers.toUtf8Bytes('test-resource'));

      const recipientBalanceBefore = await usdc.balanceOf(recipient.address);
      const userBalanceBefore = await usdc.balanceOf(user.address);

      await treasury.connect(user).pay(recipient.address, amount, resourceHash);

      const recipientBalanceAfter = await usdc.balanceOf(recipient.address);
      const userBalanceAfter = await usdc.balanceOf(user.address);
      const feeCollectorBalance = await usdc.balanceOf(feeCollector.address);

      // Calculate expected amounts (0.5% fee)
      const fee = (amount * 50n) / 10000n;
      const netAmount = amount - fee;

      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(netAmount);
      expect(userBalanceBefore - userBalanceAfter).to.equal(amount);
      expect(feeCollectorBalance).to.equal(fee);
    });

    it('emits PaymentExecuted event', async function () {
      const amount = ethers.parseUnits('100', 6);
      const resourceHash = ethers.keccak256(ethers.toUtf8Bytes('test-resource'));

      await expect(treasury.connect(user).pay(recipient.address, amount, resourceHash))
        .to.emit(treasury, 'PaymentExecuted')
        .withArgs(
          (paymentId: string) => paymentId.length === 66, // bytes32
          user.address,
          recipient.address,
          amount,
          (amount * 50n) / 10000n, // fee
          resourceHash
        );
    });

    it('reverts with zero amount', async function () {
      const resourceHash = ethers.keccak256(ethers.toUtf8Bytes('test-resource'));
      await expect(
        treasury.connect(user).pay(recipient.address, 0, resourceHash)
      ).to.be.revertedWithCustomError(treasury, 'InvalidAmount');
    });

    it('reverts with zero address recipient', async function () {
      const amount = ethers.parseUnits('100', 6);
      const resourceHash = ethers.keccak256(ethers.toUtf8Bytes('test-resource'));
      await expect(
        treasury.connect(user).pay(ethers.ZeroAddress, amount, resourceHash)
      ).to.be.revertedWithCustomError(treasury, 'ZeroAddress');
    });

    it('updates payment stats', async function () {
      const amount = ethers.parseUnits('100', 6);
      const resourceHash = ethers.keccak256(ethers.toUtf8Bytes('test-resource'));

      await treasury.connect(user).pay(recipient.address, amount, resourceHash);

      const stats = await treasury.getPaymentStats(user.address);
      expect(stats.totalVolume).to.equal(amount);
      expect(stats.successCount).to.equal(1n);
    });
  });

  describe('executeX402Payment()', function () {
    async function createSignedPayment(
      from: SignerWithAddress,
      to: string,
      amount: bigint,
      deadline: number,
      overrideNonce?: bigint
    ) {
      const nonce = overrideNonce ?? (await treasury.getNonce(from.address));
      const resourceHash = ethers.keccak256(ethers.toUtf8Bytes('x402-payment'));

      const domain = {
        name: 'SnowRailTreasury',
        version: '2.0.0',
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await treasury.getAddress(),
      };

      const types = {
        X402Payment: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'resourceHash', type: 'bytes32' },
        ],
      };

      const value = {
        from: from.address,
        to: to,
        amount: amount,
        token: await usdc.getAddress(),
        nonce: nonce,
        deadline: deadline,
        resourceHash: resourceHash,
      };

      const signature = await from.signTypedData(domain, types, value);

      return { payment: value, signature };
    }

    it('executes valid signature payment successfully', async function () {
      const amount = ethers.parseUnits('100', 6);
      const deadline = (await time.latest()) + 3600; // 1 hour from now

      const { payment, signature } = await createSignedPayment(
        user,
        recipient.address,
        amount,
        deadline
      );

      const recipientBalanceBefore = await usdc.balanceOf(recipient.address);

      await treasury.executeX402Payment(payment, signature);

      const recipientBalanceAfter = await usdc.balanceOf(recipient.address);
      const fee = (amount * 50n) / 10000n;
      const netAmount = amount - fee;

      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(netAmount);
    });

    it('reverts with invalid signature', async function () {
      const amount = ethers.parseUnits('100', 6);
      const deadline = (await time.latest()) + 3600;

      const { payment } = await createSignedPayment(user, recipient.address, amount, deadline);

      // Sign with different signer
      const domain = {
        name: 'SnowRailTreasury',
        version: '2.0.0',
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await treasury.getAddress(),
      };

      const types = {
        X402Payment: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'resourceHash', type: 'bytes32' },
        ],
      };

      const wrongSignature = await operator.signTypedData(domain, types, payment);

      await expect(treasury.executeX402Payment(payment, wrongSignature)).to.be.revertedWithCustomError(
        treasury,
        'InvalidSignature'
      );
    });

    it('reverts with expired deadline', async function () {
      const amount = ethers.parseUnits('100', 6);
      const deadline = (await time.latest()) - 1; // Already expired

      const { payment, signature } = await createSignedPayment(
        user,
        recipient.address,
        amount,
        deadline
      );

      await expect(treasury.executeX402Payment(payment, signature)).to.be.revertedWithCustomError(
        treasury,
        'ExpiredDeadline'
      );
    });

    it('reverts with invalid nonce', async function () {
      const amount = ethers.parseUnits('100', 6);
      const deadline = (await time.latest()) + 3600;

      // Use wrong nonce (current nonce + 1)
      const wrongNonce = (await treasury.getNonce(user.address)) + 1n;
      const { payment, signature } = await createSignedPayment(
        user,
        recipient.address,
        amount,
        deadline,
        wrongNonce
      );

      await expect(treasury.executeX402Payment(payment, signature)).to.be.revertedWithCustomError(
        treasury,
        'InvalidNonce'
      );
    });

    it('increments nonce after successful payment', async function () {
      const amount = ethers.parseUnits('100', 6);
      const deadline = (await time.latest()) + 3600;

      const nonceBefore = await treasury.getNonce(user.address);

      const { payment, signature } = await createSignedPayment(
        user,
        recipient.address,
        amount,
        deadline
      );

      await treasury.executeX402Payment(payment, signature);

      const nonceAfter = await treasury.getNonce(user.address);
      expect(nonceAfter).to.equal(nonceBefore + 1n);
    });
  });

  describe('canPay()', function () {
    it('returns true when no attestation exists', async function () {
      const [canPay, reason] = await treasury.canPay(recipient.address, ethers.parseUnits('100', 6));
      expect(canPay).to.be.true;
      expect(reason).to.equal('No attestation - proceeding with caution');
    });

    it('returns false when trust score is too low', async function () {
      // Record low trust attestation
      await treasury.connect(admin).recordTrustAttestation(
        recipient.address,
        30, // Low trust score
        ethers.parseUnits('1000', 6),
        (await time.latest()) + 3600,
        ethers.keccak256(ethers.toUtf8Bytes('check'))
      );

      const [canPay, reason] = await treasury.canPay(recipient.address, ethers.parseUnits('100', 6));
      expect(canPay).to.be.false;
      expect(reason).to.equal('Trust score too low');
    });

    it('returns false when amount exceeds max', async function () {
      // Record attestation with low max amount
      await treasury.connect(admin).recordTrustAttestation(
        recipient.address,
        80,
        ethers.parseUnits('50', 6), // Max 50 USDC
        (await time.latest()) + 3600,
        ethers.keccak256(ethers.toUtf8Bytes('check'))
      );

      const [canPay, reason] = await treasury.canPay(
        recipient.address,
        ethers.parseUnits('100', 6) // Requesting 100 USDC
      );
      expect(canPay).to.be.false;
      expect(reason).to.equal('Amount exceeds max recommended');
    });

    it('returns true when attestation is valid', async function () {
      await treasury.connect(admin).recordTrustAttestation(
        recipient.address,
        80,
        ethers.parseUnits('1000', 6),
        (await time.latest()) + 3600,
        ethers.keccak256(ethers.toUtf8Bytes('check'))
      );

      const [canPay, reason] = await treasury.canPay(recipient.address, ethers.parseUnits('100', 6));
      expect(canPay).to.be.true;
      expect(reason).to.equal('Approved by SENTINEL');
    });
  });

  describe('Agent Registry', function () {
    it('registers agent correctly', async function () {
      const dailyLimit = ethers.parseUnits('1000', 6);
      const capabilitiesHash = ethers.keccak256(ethers.toUtf8Bytes('agent-capabilities'));

      await treasury.connect(user).registerAgent('TestAgent', '1.0.0', dailyLimit, capabilitiesHash);

      expect(await treasury.registeredAgents(user.address)).to.be.true;
      expect(await treasury.hasRole(AGENT_ROLE, user.address)).to.be.true;

      const card = await treasury.getAgentCard(user.address);
      expect(card.name).to.equal('TestAgent');
      expect(card.version).to.equal('1.0.0');
      expect(card.dailyLimit).to.equal(dailyLimit);
      expect(card.active).to.be.true;
    });

    it('emits AgentRegistered event', async function () {
      const dailyLimit = ethers.parseUnits('1000', 6);
      const capabilitiesHash = ethers.keccak256(ethers.toUtf8Bytes('capabilities'));

      await expect(
        treasury.connect(user).registerAgent('TestAgent', '1.0.0', dailyLimit, capabilitiesHash)
      )
        .to.emit(treasury, 'AgentRegistered')
        .withArgs(user.address, 'TestAgent', dailyLimit);
    });

    it('enforces daily limits for agents', async function () {
      const dailyLimit = ethers.parseUnits('100', 6);
      await treasury
        .connect(user)
        .registerAgent(
          'TestAgent',
          '1.0.0',
          dailyLimit,
          ethers.keccak256(ethers.toUtf8Bytes('cap'))
        );

      // First payment should succeed
      await treasury
        .connect(user)
        .pay(recipient.address, ethers.parseUnits('50', 6), ethers.keccak256(ethers.toUtf8Bytes('r1')));

      // Second payment exceeds daily limit
      await expect(
        treasury
          .connect(user)
          .pay(
            recipient.address,
            ethers.parseUnits('60', 6),
            ethers.keccak256(ethers.toUtf8Bytes('r2'))
          )
      ).to.be.revertedWithCustomError(treasury, 'DailyLimitExceeded');
    });
  });

  describe('Admin Functions', function () {
    it('allows admin to update protocol fee', async function () {
      const newFee = 100; // 1%

      await expect(treasury.connect(admin).setProtocolFee(newFee))
        .to.emit(treasury, 'FeeUpdated')
        .withArgs(50, newFee);

      expect(await treasury.protocolFeeBps()).to.equal(newFee);
    });

    it('reverts if fee too high', async function () {
      await expect(treasury.connect(admin).setProtocolFee(600)).to.be.revertedWithCustomError(
        treasury,
        'FeeTooHigh'
      );
    });

    it('allows operator to pause and unpause', async function () {
      await treasury.connect(admin).pause();
      expect(await treasury.paused()).to.be.true;

      await treasury.connect(admin).unpause();
      expect(await treasury.paused()).to.be.false;
    });

    it('blocks payments when paused', async function () {
      await treasury.connect(admin).pause();

      await expect(
        treasury
          .connect(user)
          .pay(recipient.address, ethers.parseUnits('100', 6), ethers.keccak256(ethers.toUtf8Bytes('r')))
      ).to.be.revertedWithCustomError(treasury, 'EnforcedPause');
    });
  });

  describe('View Functions', function () {
    it('returns correct domain separator', async function () {
      const domainSeparator = await treasury.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.be.a('string');
      expect(domainSeparator).to.have.lengthOf(66); // bytes32
    });

    it('returns nonce for address', async function () {
      const nonce = await treasury.getNonce(user.address);
      expect(nonce).to.equal(0n);
    });

    it('returns trust attestation', async function () {
      await treasury.connect(admin).recordTrustAttestation(
        recipient.address,
        80,
        ethers.parseUnits('1000', 6),
        (await time.latest()) + 3600,
        ethers.keccak256(ethers.toUtf8Bytes('check'))
      );

      const attestation = await treasury.getTrustAttestation(recipient.address);
      expect(attestation.trustScore).to.equal(80n);
    });
  });
});
