// hardhat/scripts/root_anchor.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const registrar = process.env.REGISTRAR_ADDRESS;

  const RootAnchor = await hre.ethers.getContractFactory("RegistryRootAnchor");
  const rootAnchor = await RootAnchor.deploy(registrar);

  await rootAnchor.waitForDeployment();

  console.log("✅ RegistryRootAnchor deployed at:", await rootAnchor.getAddress());
  console.log("👤 Registrar:", registrar);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
