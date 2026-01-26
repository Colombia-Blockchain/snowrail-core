const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("\n" + "=".repeat(60));
  console.log("WALLET INFORMATION");
  console.log("=".repeat(60));
  console.log(`Address: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} AVAX`);

  const network = await hre.ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log("=".repeat(60));

  const minBalance = hre.ethers.parseEther("1");
  if (balance < minBalance) {
    console.log("\n⚠️  WARNING: Insufficient balance for deployment");
    console.log("You need at least 1 AVAX");
    console.log("\nGet testnet AVAX from:");
    console.log("https://core.app/tools/testnet-faucet/");
    process.exit(1);
  } else {
    console.log("\n✅ Sufficient balance for deployment");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
