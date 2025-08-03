import hre from "hardhat";
import { WeaponType } from "../types/WeaponTypes";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();

  console.log("Requesting weapon with the account:", deployer.account.address);

  const weaponAddress = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"; // Replace with actual weapon contract address
  const weapon = await hre.viem.getContractAt("Weapon", weaponAddress);
  const weaponType: number = WeaponType.SWORD; // Sword type as per the WeaponType enum

  const txHash = await weapon.write.requestWeapon([weaponType]);
  console.log("Transaction hash for requesting weapon:", txHash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });