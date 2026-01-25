import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "AVAX");

  // Deploy Mock USDC (for testnet)
  console.log("\n📦 Deploying Mock USDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("✅ MockUSDC:", await usdc.getAddress());

  // Deploy SnowRailTreasury
  console.log("\n📦 Deploying SnowRailTreasury...");
  const Treasury = await ethers.getContractFactory("SnowRailTreasury");
  const treasury = await Treasury.deploy(
    await usdc.getAddress(),  // payment token
    deployer.address,          // fee collector
    deployer.address           // admin
  );
  await treasury.waitForDeployment();
  console.log("✅ SnowRailTreasury:", await treasury.getAddress());

  // Deploy SnowRailMixer
  console.log("\n📦 Deploying SnowRailMixer...");
  const Mixer = await ethers.getContractFactory("SnowRailMixer");
  const mixer = await Mixer.deploy(
    await usdc.getAddress(),   // token
    ethers.ZeroAddress,        // verifier (set later)
    deployer.address           // owner
  );
  await mixer.waitForDeployment();
  console.log("✅ SnowRailMixer:", await mixer.getAddress());

  // Link mixer to treasury
  console.log("\n🔗 Linking contracts...");
  await treasury.setZKMixer(await mixer.getAddress());
  console.log("✅ Mixer linked to Treasury");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`MockUSDC:          ${await usdc.getAddress()}`);
  console.log(`SnowRailTreasury:  ${await treasury.getAddress()}`);
  console.log(`SnowRailMixer:     ${await mixer.getAddress()}`);
  console.log("=".repeat(60));

  // Verify on explorer
  console.log("\n📝 To verify contracts on Snowtrace:");
  console.log(`npx hardhat verify --network fuji ${await treasury.getAddress()} ${await usdc.getAddress()} ${deployer.address} ${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
