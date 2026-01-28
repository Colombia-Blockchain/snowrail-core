/**
 * @title Deploy MockUSDC Script
 * @description Deploys the MockUSDC test token to Avalanche Fuji testnet.
 *              MockUSDC is an ERC-20 token with 6 decimals that mimics USDC.
 *              1 billion tokens are minted to the deployer on deployment.
 *
 * @usage pnpm contracts:deploy:usdc
 * @network Avalanche Fuji (chainId: 43113)
 *
 * @prerequisites
 *   - PRIVATE_KEY in .env (wallet with testnet AVAX)
 *   - Testnet AVAX for gas (get from https://core.app/tools/testnet-faucet/)
 *
 * @outputs
 *   - Deploys MockUSDC contract
 *   - Saves address to config/deployments.json
 *   - Prints verification command
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
  console.log("DEPLOYING MockUSDC");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
  console.log("=".repeat(60));

  // Deploy MockUSDC
  console.log("\n📦 Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`✅ MockUSDC deployed: ${usdcAddress}`);

  // Check initial balance (1B USDC minted to deployer)
  const balance = await usdc.balanceOf(deployer.address);
  console.log(`💰 Deployer USDC balance: ${ethers.formatUnits(balance, 6)} USDC`);

  // Save deployment
  const deployments = loadDeployments();
  deployments[networkName] = deployments[networkName] || {};
  deployments[networkName].usdc = usdcAddress;
  deployments[networkName].deployer = deployer.address;
  saveDeployments(deployments);
  console.log(`\n💾 Saved to config/deployments.json`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`MockUSDC: ${usdcAddress}`);
  console.log("=".repeat(60));

  // Verification command
  console.log("\n📝 To verify on Snowtrace:");
  console.log(`pnpm hardhat verify --network ${networkName} ${usdcAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
