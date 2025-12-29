const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // ---------------------------------
  // 🔐 REGISTRAR ADDRESS FROM CONFIG
  // ---------------------------------
  const REGISTRAR_ADDRESS = process.env.REGISTRAR_ADDRESS;

  if (!REGISTRAR_ADDRESS) {
    throw new Error("❌ REGISTRAR_ADDRESS not set in environment");
  }

  console.log("\n========================================");
  console.log("🚀 Deploying AgreementMerkleAnchor");
  console.log("👤 Deployer (Admin):", deployer.address);
  console.log("🧾 Registrar        :", REGISTRAR_ADDRESS);
  console.log("🌐 Network          :", hre.network.name);
  console.log("========================================\n");

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");

  const AgreementMerkleAnchor = await hre.ethers.getContractFactory(
    "AgreementMerkleAnchor"
  );

  // --------------------------------------------------
  // 🚀 DEPLOY
  // --------------------------------------------------
  console.log("\n⏳ Sending deployment transaction...");

  const anchor = await AgreementMerkleAnchor.deploy(
    deployer.address, // DEFAULT_ADMIN_ROLE
    {
      gasLimit: 1_800_000,
      maxPriorityFeePerGas: hre.ethers.parseUnits("1", "gwei"),
      maxFeePerGas: hre.ethers.parseUnits("12", "gwei"),
    }
  );

  console.log("📨 TX Hash:", anchor.deploymentTransaction().hash);
  console.log("⏳ Waiting for confirmation (1 block)...");

  await anchor.deploymentTransaction().wait(1);

  console.log("\n✅ AgreementMerkleAnchor deployed!");
  console.log("📍 Address:", anchor.target);

  // --------------------------------------------------
  // 🔑 GRANT REGISTRAR ROLE (FROM CONFIG)
  // --------------------------------------------------
  const REGISTRAR_ROLE = await anchor.REGISTRAR_ROLE();

  console.log("\n🔑 Granting REGISTRAR_ROLE to backend registrar...");

  const grantTx = await anchor.grantRole(
    REGISTRAR_ROLE,
    REGISTRAR_ADDRESS,
    {
      gasLimit: 100_000,
      maxPriorityFeePerGas: hre.ethers.parseUnits("1", "gwei"),
      maxFeePerGas: hre.ethers.parseUnits("12", "gwei"),
    }
  );

  console.log("📨 GrantRole TX:", grantTx.hash);
  await grantTx.wait(1);

  // --------------------------------------------------
  // 🔍 VERIFY ROLE
  // --------------------------------------------------
  const hasRole = await anchor.hasRole(
    REGISTRAR_ROLE,
    REGISTRAR_ADDRESS
  );

  if (!hasRole) {
    throw new Error("❌ Registrar role grant failed");
  }

  console.log("🔎 Registrar has role:", hasRole);
  console.log("\n========================================");
  console.log("🎉 Deployment + role setup COMPLETE");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deployment failed:", err);
    process.exit(1);
  });
