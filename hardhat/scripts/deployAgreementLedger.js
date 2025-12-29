const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const REGISTRAR_ADDRESS = process.env.REGISTRAR_ADDRESS;
  if (!REGISTRAR_ADDRESS) {
    throw new Error("❌ REGISTRAR_ADDRESS not set in .env");
  }

  console.log("\n========================================");
  console.log("🚀 Deploying AgreementLedger");
  console.log("👤 Deployer (Admin):", deployer.address);
  console.log("🖊️  Registrar      :", REGISTRAR_ADDRESS);
  console.log("🌐 Network         :", hre.network.name);
  console.log("========================================\n");

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");

  const AgreementLedger = await hre.ethers.getContractFactory("AgreementLedger");

  // ✅ DEPLOY WITH ADMIN = deployer
  const agreementLedger = await AgreementLedger.deploy(deployer.address);
  await agreementLedger.waitForDeployment();

  const address = agreementLedger.target;
  console.log("\n✅ AgreementLedger deployed at:");
  console.log("📍", address);

  // ----------------------------------------
  // ✅ GRANT REGISTRAR ROLE IMMEDIATELY
  // ----------------------------------------
  const role = await agreementLedger.REGISTRAR_ROLE();

  console.log("\n🔑 Granting REGISTRAR_ROLE...");
  const tx = await agreementLedger.grantRole(role, REGISTRAR_ADDRESS);
  await tx.wait();

  console.log("✅ REGISTRAR_ROLE granted to:", REGISTRAR_ADDRESS);
  console.log("\n🚀 Deployment + Role setup complete\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });