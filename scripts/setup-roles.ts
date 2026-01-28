/**
 * @title Setup Roles Script
 * @description Configures access control roles on the SnowRailTreasury contract.
 *
 *              Roles configured:
 *              - SENTINEL_ROLE: Allows recording trust attestations
 *              - OPERATOR_ROLE: Allows pausing/unpausing the contract
 *
 *              The ADMIN_ROLE is automatically granted during Treasury deployment.
 *
 * @usage pnpm contracts:setup:roles
 * @network Avalanche Fuji (chainId: 43113)
 *
 * @prerequisites
 *   - SnowRailTreasury deployed (run deploy-treasury.ts first)
 *   - PRIVATE_KEY in .env (must be admin of Treasury)
 *
 * @env
 *   BACKEND_WALLET - Optional. Address to grant roles to (defaults to deployer)
 *
 * @outputs
 *   - Grants SENTINEL_ROLE to backend wallet
 *   - Grants OPERATOR_ROLE to backend wallet
 *   - Verifies role assignment
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

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 43113n ? "fuji" : network.chainId === 43114n ? "avalanche" : "localhost";

  console.log("=".repeat(60));
  console.log("SETTING UP ROLES");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("=".repeat(60));

  // Load deployments
  const deployments = loadDeployments();
  const networkDeployments = deployments[networkName];

  if (!networkDeployments?.treasury) {
    console.error("❌ Treasury address not found!");
    console.error("Please run deploy-treasury.ts first");
    process.exit(1);
  }

  // Get Treasury contract
  const treasuryAddress = networkDeployments.treasury;
  console.log(`\n📋 Treasury: ${treasuryAddress}`);

  const Treasury = await ethers.getContractFactory("SnowRailTreasury");
  const treasury = Treasury.attach(treasuryAddress);

  // Get role hashes
  const SENTINEL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SENTINEL_ROLE"));
  const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
  const ADMIN_ROLE = await treasury.DEFAULT_ADMIN_ROLE();

  console.log("\n📋 Role Hashes:");
  console.log(`SENTINEL_ROLE: ${SENTINEL_ROLE}`);
  console.log(`OPERATOR_ROLE: ${OPERATOR_ROLE}`);
  console.log(`ADMIN_ROLE:    ${ADMIN_ROLE}`);

  // Backend wallet address (use deployer or environment variable)
  const backendWallet = process.env.BACKEND_WALLET || deployer.address;
  console.log(`\n👤 Backend Wallet: ${backendWallet}`);

  // Check current roles
  console.log("\n🔍 Checking current roles...");
  const hasSentinel = await treasury.hasRole(SENTINEL_ROLE, backendWallet);
  const hasOperator = await treasury.hasRole(OPERATOR_ROLE, backendWallet);
  const hasAdmin = await treasury.hasRole(ADMIN_ROLE, backendWallet);

  console.log(`Has SENTINEL_ROLE: ${hasSentinel}`);
  console.log(`Has OPERATOR_ROLE: ${hasOperator}`);
  console.log(`Has ADMIN_ROLE:    ${hasAdmin}`);

  // Grant SENTINEL_ROLE if not already granted
  if (!hasSentinel) {
    console.log("\n🔐 Granting SENTINEL_ROLE...");
    const tx = await treasury.grantRole(SENTINEL_ROLE, backendWallet);
    await tx.wait();
    console.log(`✅ SENTINEL_ROLE granted to ${backendWallet}`);
  } else {
    console.log("\n✅ SENTINEL_ROLE already granted");
  }

  // Grant OPERATOR_ROLE if not already granted
  if (!hasOperator) {
    console.log("\n🔐 Granting OPERATOR_ROLE...");
    const tx = await treasury.grantRole(OPERATOR_ROLE, backendWallet);
    await tx.wait();
    console.log(`✅ OPERATOR_ROLE granted to ${backendWallet}`);
  } else {
    console.log("\n✅ OPERATOR_ROLE already granted");
  }

  // Verify roles are granted
  console.log("\n🔍 Verifying roles...");
  const finalSentinel = await treasury.hasRole(SENTINEL_ROLE, backendWallet);
  const finalOperator = await treasury.hasRole(OPERATOR_ROLE, backendWallet);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("ROLE SETUP COMPLETE");
  console.log("=".repeat(60));
  console.log(`Backend Wallet: ${backendWallet}`);
  console.log(`SENTINEL_ROLE:  ${finalSentinel ? "✅ GRANTED" : "❌ FAILED"}`);
  console.log(`OPERATOR_ROLE:  ${finalOperator ? "✅ GRANTED" : "❌ FAILED"}`);
  console.log("=".repeat(60));

  if (!finalSentinel || !finalOperator) {
    console.error("\n❌ Some roles failed to grant!");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
