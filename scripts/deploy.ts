import hre from "hardhat";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();

  console.log("Deploying contracts with the account:", deployer.account.address);

  // Deploy the WeaponFactory contract first
  console.log("\nDeploying WeaponFactory...");
  const weaponFactory = await hre.viem.deployContract("WeaponFactory", [deployer.account.address]);
  console.log("WeaponFactory deployed to:", weaponFactory.address);

  // Deploy the Weapon contract with the WeaponFactory address
  console.log("\nDeploying Weapon contract...");
  const weapon = await hre.viem.deployContract("Weapon", [deployer.account.address, weaponFactory.address]);
  console.log("Weapon contract deployed to:", weapon.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });