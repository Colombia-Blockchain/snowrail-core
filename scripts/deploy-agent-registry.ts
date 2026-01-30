/**
 * @title Deploy AgentRegistry Script
 * @description Deploys AgentRegistry contract to Avalanche Fuji.
 *
 *              AgentRegistry is the ERC-8004 compliant agent identity system with:
 *              - On-chain agent registration
 *              - Capability management
 *              - Trust score tracking
 *              - Budget enforcement
 *              - Payment history
 *
 * @usage pnpm contracts:deploy:agent-registry
 * @network Avalanche Fuji (chainId: 43113)
 *
 * @prerequisites
 *   - PRIVATE_KEY in .env
 *   - Testnet AVAX for gas
 *
 * @outputs
 *   - Deploys AgentRegistry contract
 *   - Grants VERIFIER_ROLE to deployer
 *   - Saves address to config/deployments.json
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
  console.log("DEPLOYING AgentRegistry (ERC-8004)");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
  console.log("=".repeat(60));

  // Deploy AgentRegistry
  console.log("\n📦 Deploying AgentRegistry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`✅ AgentRegistry deployed: ${registryAddress}`);

  // Grant VERIFIER_ROLE to deployer
  console.log("\n🔑 Granting VERIFIER_ROLE to deployer...");
  const VERIFIER_ROLE = await registry.VERIFIER_ROLE();
  const grantTx = await registry.grantRole(VERIFIER_ROLE, deployer.address);
  await grantTx.wait();
  console.log("✅ VERIFIER_ROLE granted to deployer");

  // Save deployments
  const deployments = loadDeployments();
  const networkDeployments = deployments[networkName] || {};
  networkDeployments.agentRegistry = registryAddress;
  networkDeployments.deployer = deployer.address;
  deployments[networkName] = networkDeployments;
  saveDeployments(deployments);
  console.log(`\n💾 Saved to config/deployments.json`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`AgentRegistry:     ${registryAddress}`);
  console.log(`Admin:             ${deployer.address}`);
  console.log(`Verifier:          ${deployer.address}`);
  console.log("=".repeat(60));

  // Verification command
  console.log("\n📝 To verify on Snowtrace:");
  console.log(`pnpm hardhat verify --network ${networkName} ${registryAddress} ${deployer.address}`);

  // Next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Register demo agents:");
  console.log("   const agentId = ethers.id('agent-demo-001');");
  console.log("   await registry.registerAgent(agentId, 'Demo Agent', 'ipfs://...', maxTx, dailyLimit);");
  console.log("\n2. Add capabilities:");
  console.log("   await registry.addCapability(agentId, 'payment');");
  console.log("\n3. Verify agent:");
  console.log("   await registry.verifyAgent(agentId);");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
