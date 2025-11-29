import { WeaponType } from "../../types/WeaponTypes";
import initialData from "../../metadata/InitialWeaponsData.json";
import { Account } from "viem";
import hre from "hardhat";

export const setWeaponTemplate = async (weaponMoldAddress: `0x${string}`, account: Account, weaponType: WeaponType) => {
  const weaponMold = await hre.viem.getContractAt("WeaponMold", weaponMoldAddress);
  const initialTemplate = initialData[weaponType];

  // Create the weapon template in the mold
  await weaponMold.write.setWeaponTemplate(
    [
      weaponType,
      initialTemplate.name,
      initialTemplate.description,
      initialTemplate.image,
      initialTemplate.stats,
      initialTemplate.abilities,
    ],
    { account: account }
  );
}