import hre from "hardhat";
import { WeaponType } from "../types/WeaponTypes";
import initialWeaponsData from "../metadata/InitialWeaponsData.json";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();

  console.log(
    "Setting up template with the account:",
    deployer.account.address
  );

  const weaponFactoryAddress = "0xc63b2e0922432ce5ebe5046089bc672d34bdfa57"; // Replace with actual weapon contract address
  const weaponFactory = await hre.viem.getContractAt(
    "WeaponFactory",
    weaponFactoryAddress
  );
  const weaponType = WeaponType.SWORD; // Sword type as per the WeaponType enum

  const initialTemplate = initialWeaponsData[WeaponType.SWORD];

  // Create the weapon template in the factory
  await weaponFactory.write.setWeaponTemplate(
    [
      weaponType,
      initialTemplate.name,
      initialTemplate.description,
      initialTemplate.image,
      initialTemplate.weaponStats,
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