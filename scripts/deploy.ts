import hre from "hardhat";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();

  console.log("Deploying contracts with the account:", deployer.account.address);

  // Deploy the WeaponMold contract first
  console.log("\nDeploying WeaponMold...");
  const weaponMold = await hre.viem.deployContract("WeaponMold", [deployer.account.address]);
  console.log("WeaponMold deployed to:", weaponMold.address);

  // Deploy the Weapon contract with the WeaponMold address
  console.log("\nDeploying Weapon contract...");
  const weapon = await hre.viem.deployContract("Weapon", [
    deployer.account.address, // initialOwner
    weaponMold.address,    // weaponFactoryAddress  
    deployer.account.address  // serverAddress (using deployer as server for now)
  ]);
  console.log("Weapon contract deployed to:", weapon.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });