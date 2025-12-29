require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("\n========================================");
  console.log(" Deploying RegistryResolver Contract");
  console.log(" Deployer Address :", deployer.address);
  console.log(" Registrar Address:", process.env.REGISTRAR_ADDRESS);
  console.log(" Network          :", hre.network.name);
  console.log("========================================\n");

  const initialRegistrar = process.env.REGISTRAR_ADDRESS;
  if (!initialRegistrar) {
    throw new Error("❌ REGISTRAR_ADDRESS missing in .env");
  }

  const RegistryResolver = await hre.ethers.getContractFactory(
    "RegistryResolver",
    deployer
  );

  console.log("⏳ Deploying RegistryResolver...");

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

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
