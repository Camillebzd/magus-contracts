import { WeaponType } from "../../types/WeaponTypes";
import levelTemplates from "../../metadata/LevelTemplates.json";
import upgradeTemplates from "../../metadata/UpgradeTemplates.json";
import { Account } from "viem";
import hre from "hardhat";
import { Tier } from "../../types/Tiers";

export const setTierTemplate = async (weaponAnvilAddress: `0x${string}`, account: Account, weaponType: WeaponType, tier: Tier, material?: `0x${string}`) => {
  const weaponAnvil = await hre.viem.getContractAt("WeaponAnvil", weaponAnvilAddress);
  const tierTemplate = levelTemplates[weaponType][tier];

  await weaponAnvil.write.setTierTemplate(
    [
      weaponType,
      Number(tier),
      {...tierTemplate, materialCost: BigInt(tierTemplate.materialCost), materialToken: material ? material : tierTemplate.materialToken as `0x${string}` } // Convert materialCost and materialToken to BigInt
    ],
    { account: account }
  );
}

export const setUpgradeTemplate = async (weaponAnvilAddress: `0x${string}`, account: Account, weaponType: WeaponType, tier: Tier, material?: `0x${string}`) => {
  const weaponAnvil = await hre.viem.getContractAt("WeaponAnvil", weaponAnvilAddress);
  const upgradeTemplate = upgradeTemplates[weaponType][tier];

  await weaponAnvil.write.setTierUpgradeTemplate(
    [
      weaponType,
      Number(tier),
      {...upgradeTemplate, materialCost: BigInt(upgradeTemplate.materialCost), materialToken: material ? material : upgradeTemplate.materialToken as `0x${string}` }
    ],
    { account: account }
  );
}