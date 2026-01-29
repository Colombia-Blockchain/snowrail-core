/**
 * SnowRailMixer Contract Tests
 * Tests for the ZK Mixer contract with Merkle tree commitments
 *
 * Run: pnpm hardhat test test/Mixer.test.ts
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { SnowRailMixer, MockUSDC } from '../typechain-types';

describe('SnowRailMixer', function () {
  let mixer: SnowRailMixer;
  let usdc: MockUSDC;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let relayer: SignerWithAddress;
  let verifier: SignerWithAddress;

  const DENOMINATION_SMALL = ethers.parseUnits('100', 6); // 100 USDC
  const DENOMINATION_MEDIUM = ethers.parseUnits('1000', 6); // 1,000 USDC
  const DENOMINATION_LARGE = ethers.parseUnits('10000', 6); // 10,000 USDC

  beforeEach(async function () {
    [owner, user, relayer, verifier] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory('MockUSDC');
    usdc = (await MockUSDC.deploy()) as MockUSDC;
    await usdc.waitForDeployment();

    // Deploy Mixer
    const Mixer = await ethers.getContractFactory('SnowRailMixer');
    mixer = (await Mixer.deploy(
      await usdc.getAddress(),
      verifier.address,
      owner.address
    )) as SnowRailMixer;
    await mixer.waitForDeployment();

    // Mint USDC to user
    await usdc.mint(user.address, ethers.parseUnits('100000', 6));

    // Approve mixer
    await usdc.connect(user).approve(await mixer.getAddress(), ethers.MaxUint256);
  });

  describe('Deployment', function () {
    it('deploys with correct token', async function () {
      expect(await mixer.token()).to.equal(await usdc.getAddress());
    });

    it('deploys with correct verifier', async function () {
      expect(await mixer.verifier()).to.equal(verifier.address);
    });

    it('deploys with correct owner', async function () {
      expect(await mixer.owner()).to.equal(owner.address);
    });

    it('initializes pools correctly', async function () {
      const smallPool = await mixer.getPool(DENOMINATION_SMALL);
      expect(smallPool.denomination).to.equal(DENOMINATION_SMALL);
      expect(smallPool.active).to.be.true;

      const mediumPool = await mixer.getPool(DENOMINATION_MEDIUM);
      expect(mediumPool.denomination).to.equal(DENOMINATION_MEDIUM);
      expect(mediumPool.active).to.be.true;

      const largePool = await mixer.getPool(DENOMINATION_LARGE);
      expect(largePool.denomination).to.equal(DENOMINATION_LARGE);
      expect(largePool.active).to.be.true;
    });

    it('initializes Merkle tree with correct root', async function () {
      const root = await mixer.getLastRoot();
      expect(root).to.not.equal(ethers.ZeroHash);
    });
  });

  describe('deposit()', function () {
    it('adds commitment to merkle tree', async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes('secret-commitment-1'));

      const tx = await mixer.connect(user).deposit(commitment, DENOMINATION_SMALL);
      const receipt = await tx.wait();

      // Check event was emitted
      const event = receipt?.logs.find(
        (log) => mixer.interface.parseLog(log as any)?.name === 'Deposit'
      );
      expect(event).to.not.be.undefined;

      // Verify commitment is tracked
      expect(await mixer.commitments(commitment)).to.be.true;
    });

    it('emits Deposit event with correct parameters', async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes('secret-commitment-2'));

      await expect(mixer.connect(user).deposit(commitment, DENOMINATION_SMALL))
        .to.emit(mixer, 'Deposit')
        .withArgs(commitment, DENOMINATION_SMALL, 0, (timestamp: bigint) => timestamp > 0);
    });

    it('transfers tokens from user to mixer', async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes('secret-commitment-3'));

      const userBalanceBefore = await usdc.balanceOf(user.address);
      const mixerBalanceBefore = await usdc.balanceOf(await mixer.getAddress());

      await mixer.connect(user).deposit(commitment, DENOMINATION_SMALL);

      const userBalanceAfter = await usdc.balanceOf(user.address);
      const mixerBalanceAfter = await usdc.balanceOf(await mixer.getAddress());

      expect(userBalanceBefore - userBalanceAfter).to.equal(DENOMINATION_SMALL);
      expect(mixerBalanceAfter - mixerBalanceBefore).to.equal(DENOMINATION_SMALL);
    });

    it('updates pool stats on deposit', async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes('secret-commitment-4'));

      const poolBefore = await mixer.getPool(DENOMINATION_SMALL);
      await mixer.connect(user).deposit(commitment, DENOMINATION_SMALL);
      const poolAfter = await mixer.getPool(DENOMINATION_SMALL);

      expect(poolAfter.totalDeposits - poolBefore.totalDeposits).to.equal(DENOMINATION_SMALL);
    });

    it('reverts with invalid denomination', async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes('secret'));
      const invalidDenomination = ethers.parseUnits('50', 6); // Invalid

      await expect(
        mixer.connect(user).deposit(commitment, invalidDenomination)
      ).to.be.revertedWithCustomError(mixer, 'InvalidDenomination');
    });

    it('reverts if commitment already exists', async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes('duplicate-commitment'));

      await mixer.connect(user).deposit(commitment, DENOMINATION_SMALL);

      await expect(
        mixer.connect(user).deposit(commitment, DENOMINATION_SMALL)
      ).to.be.revertedWithCustomError(mixer, 'CommitmentAlreadyExists');
    });

    it('reverts if pool is not active', async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes('inactive-pool-commitment'));

      // Deactivate pool
      await mixer.connect(owner).setPoolActive(DENOMINATION_SMALL, false);

      await expect(
        mixer.connect(user).deposit(commitment, DENOMINATION_SMALL)
      ).to.be.revertedWithCustomError(mixer, 'PoolNotActive');
    });

    it('increments nextIndex after deposit', async function () {
      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes('commitment-a'));
      const commitment2 = ethers.keccak256(ethers.toUtf8Bytes('commitment-b'));

      const indexBefore = await mixer.nextIndex();
      await mixer.connect(user).deposit(commitment1, DENOMINATION_SMALL);
      const indexAfter1 = await mixer.nextIndex();
      await mixer.connect(user).deposit(commitment2, DENOMINATION_SMALL);
      const indexAfter2 = await mixer.nextIndex();

      expect(indexAfter1).to.equal(indexBefore + 1n);
      expect(indexAfter2).to.equal(indexBefore + 2n);
    });

    it('supports all denomination tiers', async function () {
      const commitmentSmall = ethers.keccak256(ethers.toUtf8Bytes('small'));
      const commitmentMedium = ethers.keccak256(ethers.toUtf8Bytes('medium'));
      const commitmentLarge = ethers.keccak256(ethers.toUtf8Bytes('large'));

      await expect(mixer.connect(user).deposit(commitmentSmall, DENOMINATION_SMALL)).to.not.be
        .reverted;
      await expect(mixer.connect(user).deposit(commitmentMedium, DENOMINATION_MEDIUM)).to.not.be
        .reverted;
      await expect(mixer.connect(user).deposit(commitmentLarge, DENOMINATION_LARGE)).to.not.be
        .reverted;
    });
  });

  describe('withdraw()', function () {
    let commitment: string;
    let nullifierHash: string;
    let root: string;

    beforeEach(async function () {
      commitment = ethers.keccak256(ethers.toUtf8Bytes('secret-for-withdraw'));
      nullifierHash = ethers.keccak256(ethers.toUtf8Bytes('nullifier-hash'));

      // Make a deposit first
      await mixer.connect(user).deposit(commitment, DENOMINATION_SMALL);
      root = await mixer.getLastRoot();
    });

    it('succeeds with valid proof', async function () {
      // Create a dummy proof (in production this would be a real ZK proof)
      const proof = ethers.toUtf8Bytes('valid-zk-proof');
      const fee = ethers.parseUnits('1', 6); // 1 USDC fee

      const recipientBalanceBefore = await usdc.balanceOf(relayer.address);

      await mixer.connect(relayer).withdraw(
        proof,
        root,
        nullifierHash,
        relayer.address, // recipient
        relayer.address, // relayer (gets fee)
        fee,
        DENOMINATION_SMALL
      );

      const recipientBalanceAfter = await usdc.balanceOf(relayer.address);
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(DENOMINATION_SMALL);
    });

    it('emits Withdrawal event', async function () {
      const proof = ethers.toUtf8Bytes('valid-proof');
      const fee = ethers.parseUnits('1', 6);

      await expect(
        mixer.connect(relayer).withdraw(
          proof,
          root,
          nullifierHash,
          relayer.address,
          relayer.address,
          fee,
          DENOMINATION_SMALL
        )
      )
        .to.emit(mixer, 'Withdrawal')
        .withArgs(relayer.address, nullifierHash, relayer.address, fee);
    });

    it('marks nullifier as used (prevents double spend)', async function () {
      const proof = ethers.toUtf8Bytes('proof');
      const fee = 0n;

      expect(await mixer.nullifierHashes(nullifierHash)).to.be.false;

      await mixer
        .connect(relayer)
        .withdraw(proof, root, nullifierHash, relayer.address, ethers.ZeroAddress, fee, DENOMINATION_SMALL);

      expect(await mixer.nullifierHashes(nullifierHash)).to.be.true;
    });

    it('reverts on double spend (same nullifier)', async function () {
      const proof = ethers.toUtf8Bytes('proof');
      const fee = 0n;

      // First withdrawal succeeds
      await mixer
        .connect(relayer)
        .withdraw(proof, root, nullifierHash, relayer.address, ethers.ZeroAddress, fee, DENOMINATION_SMALL);

      // Second withdrawal with same nullifier fails
      await expect(
        mixer
          .connect(relayer)
          .withdraw(
            proof,
            root,
            nullifierHash,
            relayer.address,
            ethers.ZeroAddress,
            fee,
            DENOMINATION_SMALL
          )
      ).to.be.revertedWithCustomError(mixer, 'NullifierAlreadyUsed');
    });

    it('reverts with invalid merkle root', async function () {
      const proof = ethers.toUtf8Bytes('proof');
      const invalidRoot = ethers.keccak256(ethers.toUtf8Bytes('invalid-root'));
      const fee = 0n;

      await expect(
        mixer
          .connect(relayer)
          .withdraw(proof, invalidRoot, nullifierHash, relayer.address, ethers.ZeroAddress, fee, DENOMINATION_SMALL)
      ).to.be.revertedWithCustomError(mixer, 'InvalidMerkleRoot');
    });

    it('reverts with invalid denomination', async function () {
      const proof = ethers.toUtf8Bytes('proof');
      const invalidDenom = ethers.parseUnits('50', 6);
      const fee = 0n;

      await expect(
        mixer
          .connect(relayer)
          .withdraw(proof, root, nullifierHash, relayer.address, ethers.ZeroAddress, fee, invalidDenom)
      ).to.be.revertedWithCustomError(mixer, 'InvalidDenomination');
    });

    it('reverts with empty proof (invalid proof)', async function () {
      const emptyProof = '0x';
      const fee = 0n;

      await expect(
        mixer
          .connect(relayer)
          .withdraw(
            emptyProof,
            root,
            nullifierHash,
            relayer.address,
            ethers.ZeroAddress,
            fee,
            DENOMINATION_SMALL
          )
      ).to.be.revertedWithCustomError(mixer, 'InvalidProof');
    });

    it('pays relayer fee correctly', async function () {
      const proof = ethers.toUtf8Bytes('proof');
      const fee = ethers.parseUnits('5', 6); // 5 USDC fee

      const relayerBalanceBefore = await usdc.balanceOf(relayer.address);
      const recipientBalanceBefore = await usdc.balanceOf(owner.address);

      await mixer.connect(relayer).withdraw(
        proof,
        root,
        nullifierHash,
        owner.address, // recipient
        relayer.address, // relayer
        fee,
        DENOMINATION_SMALL
      );

      const relayerBalanceAfter = await usdc.balanceOf(relayer.address);
      const recipientBalanceAfter = await usdc.balanceOf(owner.address);

      expect(relayerBalanceAfter - relayerBalanceBefore).to.equal(fee);
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(DENOMINATION_SMALL - fee);
    });
  });

  describe('Merkle Tree', function () {
    it('isKnownRoot returns true for current root', async function () {
      const root = await mixer.getLastRoot();
      expect(await mixer.isKnownRoot(root)).to.be.true;
    });

    it('isKnownRoot returns false for zero root', async function () {
      expect(await mixer.isKnownRoot(ethers.ZeroHash)).to.be.false;
    });

    it('isKnownRoot returns true for historical roots', async function () {
      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes('c1'));
      const commitment2 = ethers.keccak256(ethers.toUtf8Bytes('c2'));

      const root1 = await mixer.getLastRoot();
      await mixer.connect(user).deposit(commitment1, DENOMINATION_SMALL);

      const root2 = await mixer.getLastRoot();
      await mixer.connect(user).deposit(commitment2, DENOMINATION_SMALL);

      // Both historical roots should still be valid
      expect(await mixer.isKnownRoot(root1)).to.be.true;
      expect(await mixer.isKnownRoot(root2)).to.be.true;
    });

    it('updates root on each deposit', async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes('new-deposit'));

      const rootBefore = await mixer.getLastRoot();
      await mixer.connect(user).deposit(commitment, DENOMINATION_SMALL);
      const rootAfter = await mixer.getLastRoot();

      expect(rootAfter).to.not.equal(rootBefore);
    });
  });

  describe('Admin Functions', function () {
    it('allows owner to update verifier', async function () {
      const newVerifier = relayer.address;

      await expect(mixer.connect(owner).setVerifier(newVerifier))
        .to.emit(mixer, 'VerifierUpdated')
        .withArgs(verifier.address, newVerifier);

      expect(await mixer.verifier()).to.equal(newVerifier);
    });

    it('reverts if non-owner tries to update verifier', async function () {
      await expect(mixer.connect(user).setVerifier(relayer.address)).to.be.revertedWithCustomError(
        mixer,
        'OwnableUnauthorizedAccount'
      );
    });

    it('reverts if setting verifier to zero address', async function () {
      await expect(mixer.connect(owner).setVerifier(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        mixer,
        'InvalidVerifier'
      );
    });

    it('allows owner to activate/deactivate pools', async function () {
      // Deactivate
      await mixer.connect(owner).setPoolActive(DENOMINATION_SMALL, false);
      let pool = await mixer.getPool(DENOMINATION_SMALL);
      expect(pool.active).to.be.false;

      // Reactivate
      await mixer.connect(owner).setPoolActive(DENOMINATION_SMALL, true);
      pool = await mixer.getPool(DENOMINATION_SMALL);
      expect(pool.active).to.be.true;
    });

    it('reverts if setting invalid denomination pool active', async function () {
      const invalidDenom = ethers.parseUnits('50', 6);
      await expect(
        mixer.connect(owner).setPoolActive(invalidDenom, false)
      ).to.be.revertedWithCustomError(mixer, 'InvalidDenomination');
    });
  });

  describe('View Functions', function () {
    it('returns correct pool info', async function () {
      const pool = await mixer.getPool(DENOMINATION_MEDIUM);
      expect(pool.denomination).to.equal(DENOMINATION_MEDIUM);
      expect(pool.totalDeposits).to.equal(0n);
      expect(pool.totalWithdrawals).to.equal(0n);
      expect(pool.active).to.be.true;
    });

    it('tracks deposits and withdrawals in pool', async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes('track-test'));
      const nullifierHash = ethers.keccak256(ethers.toUtf8Bytes('track-nullifier'));

      await mixer.connect(user).deposit(commitment, DENOMINATION_SMALL);

      let pool = await mixer.getPool(DENOMINATION_SMALL);
      expect(pool.totalDeposits).to.equal(DENOMINATION_SMALL);

      // Withdraw
      const root = await mixer.getLastRoot();
      await mixer.connect(relayer).withdraw(
        ethers.toUtf8Bytes('proof'),
        root,
        nullifierHash,
        relayer.address,
        ethers.ZeroAddress,
        0n,
        DENOMINATION_SMALL
      );

      pool = await mixer.getPool(DENOMINATION_SMALL);
      expect(pool.totalWithdrawals).to.equal(DENOMINATION_SMALL);
    });
  });
});
