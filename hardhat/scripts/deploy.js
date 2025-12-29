const hre = require("hardhat");

async function main() {
  // Get deployer from configured network (Sepolia / localhost)
  const [deployer] = await hre.ethers.getSigners();

  console.log("\n========================================");
  console.log(" Deploying RegistryResolver Contract");
  console.log(" Deployer Address :", deployer.address);
  console.log(" Network          :", hre.network.name);
  console.log("========================================\n");

  // Initial registrar (change later if needed)
  const initialRegistrar = deployer.address;

  // Contract factory
  const RegistryResolver = await hre.ethers.getContractFactory(
    "RegistryResolver",
    deployer
  );

  console.log("⏳ Deploying RegistryResolver...");

  // Deploy contract
  const resolver = await RegistryResolver.deploy(initialRegistrar);

  console.log("⏳ Waiting for deployment confirmation...");
  await resolver.waitForDeployment();

  const contractAddress = await resolver.getAddress();

  console.log("\n----------------------------------------");
  console.log(" ✅ RegistryResolver Deployed Successfully!");
  console.log(" 📍 Contract Address :", contractAddress);
  console.log("----------------------------------------\n");

  console.log("📦 ABI output path : backend/contracts/");
  console.log("🚀 Deployment complete.\n");
}

// Proper error handling
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
