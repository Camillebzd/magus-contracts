import hre from "hardhat";
import type { WeaponType } from "../types/WeaponTypes";
import initialWeaponsData from "../metadata/InitialWeaponsData.json";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();

  console.log(
    "Setting up template with the account:",
    deployer.account.address
  );

  const weaponMoldAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3"; // Replace with actual weaponMold contract address
  const weaponMold = await hre.viem.getContractAt(
    "WeaponMold",
    weaponMoldAddress
  );
  const weaponType: WeaponType = "sword";

  const initialTemplate = initialWeaponsData[weaponType];

  // Create the weapon template in the factory
  await weaponMold.write.setWeaponTemplate(
    [
      weaponType,
      initialTemplate.name,
      initialTemplate.description,
      initialTemplate.image,
      initialTemplate.stats,
      initialTemplate.abilities,
    ],
  );

  console.log("Weapon template set successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });