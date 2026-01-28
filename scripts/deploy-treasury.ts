/**
 * @title Deploy Treasury and Mixer Script
 * @description Deploys SnowRailTreasury and SnowRailMixer contracts to Avalanche Fuji.
 *
 *              SnowRailTreasury is the core payment system with:
 *              - X402 payment protocol support
 *              - SENTINEL trust validation
 *              - ERC-8004 agent identity
 *              - Role-based access control
 *
 *              SnowRailMixer is the ZK privacy layer with:
 *              - Merkle tree commitments
 *              - Fixed denominations (100, 1000, 10000 USDC)
 *              - Nullifier-based double-spend prevention
 *
 * @usage pnpm contracts:deploy:treasury
 * @network Avalanche Fuji (chainId: 43113)
 *
 * @prerequisites
 *   - MockUSDC deployed (run deploy-usdc.ts first)
 *   - PRIVATE_KEY in .env
 *   - Testnet AVAX for gas
 *
 * @outputs
 *   - Deploys SnowRailTreasury contract
 *   - Deploys SnowRailMixer contract
 *   - Links Mixer to Treasury
 *   - Saves addresses to config/deployments.json
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/** Path to the deployments configuration file */
const DEPLOYMENTS_PATH = path.join(__dirname, "../config/deployments.json");

function loadDeployments(): Record<string, Record<string, string>> {
  if (fs.existsSync(DEPLOYMENTS_PATH)) {
    return JSON.parse(fs.readFileSync(DEPLOYMENTS_PATH, "utf8"));
  }
  return {};
}

function saveDeployments(deployments: Record<string, Record<string, string>>): void {
  const dir = path.dirname(DEPLOYMENTS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DEPLOYMENTS_PATH, JSON.stringify(deployments, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 43113n ? "fuji" : network.chainId === 43114n ? "avalanche" : "localhost";

  console.log("=".repeat(60));
  console.log("DEPLOYING SnowRailTreasury");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
  console.log("=".repeat(60));

  // Load deployments to get USDC address
  const deployments = loadDeployments();
  const networkDeployments = deployments[networkName] || {};

  // Get USDC address from deployments or environment
  const usdcAddress = networkDeployments.usdc || process.env.ASSET_ADDRESS;
  if (!usdcAddress) {
    console.error("❌ MockUSDC address not found!");
    console.error("Please run deploy-usdc.ts first or set ASSET_ADDRESS in .env");
    process.exit(1);
  }
  console.log(`\n📋 Using MockUSDC: ${usdcAddress}`);

  // Deploy SnowRailTreasury
  console.log("\n📦 Deploying SnowRailTreasury...");
  const Treasury = await ethers.getContractFactory("SnowRailTreasury");
  const treasury = await Treasury.deploy(
    usdcAddress,        // payment token
    deployer.address,   // fee collector
    deployer.address    // admin
  );
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log(`✅ SnowRailTreasury deployed: ${treasuryAddress}`);

  // Deploy SnowRailMixer
  console.log("\n📦 Deploying SnowRailMixer...");
  const Mixer = await ethers.getContractFactory("SnowRailMixer");
  const mixer = await Mixer.deploy(
    usdcAddress,         // token
    ethers.ZeroAddress,  // verifier (set later with ZK setup)
    deployer.address     // owner
  );
  await mixer.waitForDeployment();
  const mixerAddress = await mixer.getAddress();
  console.log(`✅ SnowRailMixer deployed: ${mixerAddress}`);

  // Link mixer to treasury
  console.log("\n🔗 Linking Mixer to Treasury...");
  const linkTx = await treasury.setZKMixer(mixerAddress);
  await linkTx.wait();
  console.log("✅ Mixer linked to Treasury");

  // Save deployments
  networkDeployments.usdc = usdcAddress;
  networkDeployments.treasury = treasuryAddress;
  networkDeployments.mixer = mixerAddress;
  networkDeployments.deployer = deployer.address;
  deployments[networkName] = networkDeployments;
  saveDeployments(deployments);
  console.log(`\n💾 Saved to config/deployments.json`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`MockUSDC:          ${usdcAddress}`);
  console.log(`SnowRailTreasury:  ${treasuryAddress}`);
  console.log(`SnowRailMixer:     ${mixerAddress}`);
  console.log(`Fee Collector:     ${deployer.address}`);
  console.log(`Admin:             ${deployer.address}`);
  console.log("=".repeat(60));

  // Verification commands
  console.log("\n📝 To verify on Snowtrace:");
  console.log(`pnpm hardhat verify --network ${networkName} ${treasuryAddress} ${usdcAddress} ${deployer.address} ${deployer.address}`);
  console.log(`pnpm hardhat verify --network ${networkName} ${mixerAddress} ${usdcAddress} ${ethers.ZeroAddress} ${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
