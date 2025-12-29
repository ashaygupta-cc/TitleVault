require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const resolverAddress = process.env.RESOLVER_ADDRESS;
  const registrar = process.env.REGISTRAR_ADDRESS;

  const RegistryResolver = await hre.ethers.getContractFactory("RegistryResolver");
  const resolver = RegistryResolver.attach(resolverAddress);

  const tx = await resolver.grantRegistrar(registrar);
  await tx.wait();

  console.log("✅ Registrar granted:", registrar);
}

main().catch(console.error);
