import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { maxUint256 } from "viem";
import levelTemplates from "../metadata/LevelTemplates.json";
import upgradeTemplates from "../metadata/UpgradeTemplates.json";
import { setWeaponTemplate } from "../scripts/utils/SetupMold";
import { setTierTemplate, setUpgradeTemplate } from "../scripts/utils/SetupAnvil";

describe("WeaponAnvil", function () {
  async function deployFixture() {
    const [owner, user] = await hre.viem.getWalletClients();

    // Deploy the WeaponMold contract first
    const weaponMold = await hre.viem.deployContract("WeaponMold", [
      owner.account.address,
    ]);

    // Deploy the WeaponAnvil contract
    const weaponAnvil = await hre.viem.deployContract("WeaponAnvil", [
      owner.account.address,
    ]);

    // Deploy the Weapon contract
    const weapon = await hre.viem.deployContract("Weapon", [
      owner.account.address, // initialOwner
      owner.account.address, // serverAddress (using owner as server for testing)
      weaponMold.address, // weaponMoldAddress
      weaponAnvil.address, // weaponAnvilAddress
    ]);

    // Set the weapon contract on Anvil
    await weaponAnvil.write.setWeapon(
      [weapon.address],
      { account: owner.account }
    );

    // Create material tokens for testing
    const swordShard = await hre.viem.deployContract("SwordShard", [
      owner.account.address,
    ]);
    const rareSwordShard = await hre.viem.deployContract("SwordShard", [
      owner.account.address,
    ]);

    // Create a sword for user
    // 1. Set up a weapon template in the mold
    await setWeaponTemplate(weaponMold.address, owner.account, "sword");
    // 2. Mint a weapon using the template
    await weapon.write.requestWeapon(["sword"], {
      account: user.account,
    });

    // Setup Anvil
    await setTierTemplate(weaponAnvil.address, owner.account, "sword", "1", swordShard.address);
    await setUpgradeTemplate(weaponAnvil.address, owner.account, "sword", "1", rareSwordShard.address);

    return {
      weapon,
      weaponMold,
      weaponAnvil,
      swordShard,
      rareSwordShard,
      owner,
      user,
    };
  }

  describe("Template Management", function () {
    it("Should have set the correct weapon", async function () {
      const { weaponAnvil, weapon } = await loadFixture(deployFixture);
      const anvilWeaponAddress = await weaponAnvil.read.weapon();

      expect(anvilWeaponAddress.toLowerCase()).to.equal(weapon.address.toLowerCase());
    });

    it("Should be able to set a new weapon", async function () {
      const { weaponAnvil, weapon } = await loadFixture(deployFixture);
      const anvilWeaponAddress = await weaponAnvil.read.weapon();
      const newWeapon = "0x000000000000000000000000000000000000dEaD";

      // Set new weapon
      await weaponAnvil.write.setWeapon(
        [newWeapon]
      );
      expect((await weaponAnvil.read.weapon()).toLowerCase()).to.equal(newWeapon.toLowerCase());
    });

    it("Should prevent non-owners from setting a new weapon", async function () {
      const { weaponAnvil, user } = await loadFixture(deployFixture);
      const newWeapon = "0x000000000000000000000000000000000000dEaD";

      await expect(
        weaponAnvil.write.setWeapon(
          [newWeapon],
          { account: user.account }
        )
      ).to.be.rejectedWith(Error);
    });

    it("Should allow owner to set enhancement templates", async function () {
      const { weaponAnvil, owner } = await loadFixture(deployFixture);
      const dummyMaterial = "0x000000000000000000000000000000000000dEaD";

      // Tier 2 is not set yet
      const tier2Before = await weaponAnvil.read.tierTemplates([ "sword", 2 ]);
      expect(tier2Before[2]).to.equal("0x0000000000000000000000000000000000000000");

      await setTierTemplate(weaponAnvil.address, owner.account, "sword", "2", dummyMaterial)

      const tier2After = await weaponAnvil.read.tierTemplates([ "sword", 2 ]);
      expect(tier2After[2]).to.equal(dummyMaterial);
    });

    it("Should prevent non-owners from setting enhancement templates", async function () {
      const { weaponAnvil, user } = await loadFixture(deployFixture);
      const dummyMaterial = "0x000000000000000000000000000000000000dEaD";

      await expect(
        setTierTemplate(weaponAnvil.address, user.account, "sword", "2", dummyMaterial)
      ).to.be.rejectedWith(Error);
    });

    it("Should allow owner to set upgrade templates", async function () {
      const { weaponAnvil, owner } = await loadFixture(deployFixture);
      const dummyMaterial = "0x000000000000000000000000000000000000dEaD";

      // Upgrade Tier 2 is not set yet
      const upgrade2Before = await weaponAnvil.read.tierUpgradeTemplates([ "sword", 2 ]);
      expect(upgrade2Before[1]).to.equal("0x0000000000000000000000000000000000000000");

      await setUpgradeTemplate(weaponAnvil.address, owner.account, "sword", "2", dummyMaterial)

      const upgrade2After = await weaponAnvil.read.tierUpgradeTemplates([ "sword", 2 ]);
      expect(upgrade2After[1]).to.equal(dummyMaterial);
    });

    it("Should prevent non-owners from setting upgrade templates", async function () {
      const { weaponAnvil, user } = await loadFixture(deployFixture);
      const dummyMaterial = "0x000000000000000000000000000000000000dEaD";

      await expect(
        setUpgradeTemplate(weaponAnvil.address, user.account, "sword", "2", dummyMaterial)
      ).to.be.rejectedWith(Error);
    });
  });

  describe("Level Up", function () {
    it("Should allow weapon owner to level up weapon and increase all stats correctly", async function () {
      const { weapon, weaponAnvil, swordShard, user } = await loadFixture(deployFixture);

      // Get template data for tier 1 sword (this is what we expect to be applied)
      const tier1Template = levelTemplates.sword["1"];
      const expectedXpCost = tier1Template.xpRequiredPerLevel;
      const expectedMaterialCost = tier1Template.materialCost;
      const expectedStatBonus = tier1Template.baseStatBonus;

      // Give user some sword shards
      await swordShard.write.mint([user.account.address, maxUint256]);

      // Approve Anvil to spend sword shards
      await swordShard.write.approve([weaponAnvil.address, maxUint256], { account: user.account });

      // Get weapon data before leveling up
      const weaponDataBefore = await weapon.read.getWeapon([0n]);
      
      // give xp to weapon (required XP + extra to test remaining XP calculation)
      let weaponDataToModify = await weapon.read.getWeapon([0n]);
      const initialXp = expectedXpCost + 50; // Required XP + 50 extra
      weaponDataToModify.xp = initialXp;
      await weapon.write.updateWeapon([0n, weaponDataToModify]);

      // Balance of sword shards before leveling up
      const balanceBefore = await swordShard.read.balanceOf([user.account.address]);
      expect(balanceBefore).to.equal(maxUint256);

      // Level up weapon
      await weaponAnvil.write.levelUp([0n], { account: user.account });

      // Check weapon after leveling up
      const weaponDataAfter = await weapon.read.getWeapon([0n]);
      
      // Level should increase by 1
      expect(weaponDataAfter.level).to.equal(weaponDataBefore.level + 1);

      // XP should be reduced by the required amount from template
      const expectedRemainingXp = initialXp - expectedXpCost;
      expect(weaponDataAfter.xp).to.equal(expectedRemainingXp);
      
      // Check base stats increased correctly using template data
      expect(weaponDataAfter.stats.health).to.equal(weaponDataBefore.stats.health + expectedStatBonus.health);
      expect(weaponDataAfter.stats.speed).to.equal(weaponDataBefore.stats.speed + expectedStatBonus.speed);
      expect(weaponDataAfter.stats.mind).to.equal(weaponDataBefore.stats.mind + expectedStatBonus.mind);
      expect(weaponDataAfter.stats.handling).to.equal(weaponDataBefore.stats.handling + expectedStatBonus.handling);
      
      // Check offensive stats increased correctly using template data
      expect(weaponDataAfter.stats.offensiveStats.sharpDamage).to.equal(
        weaponDataBefore.stats.offensiveStats.sharpDamage + expectedStatBonus.offensiveStats.sharpDamage
      );
      expect(weaponDataAfter.stats.offensiveStats.bluntDamage).to.equal(
        weaponDataBefore.stats.offensiveStats.bluntDamage + expectedStatBonus.offensiveStats.bluntDamage
      );
      expect(weaponDataAfter.stats.offensiveStats.burnDamage).to.equal(
        weaponDataBefore.stats.offensiveStats.burnDamage + expectedStatBonus.offensiveStats.burnDamage
      );
      expect(weaponDataAfter.stats.offensiveStats.pierce).to.equal(
        weaponDataBefore.stats.offensiveStats.pierce + expectedStatBonus.offensiveStats.pierce
      );
      expect(weaponDataAfter.stats.offensiveStats.lethality).to.equal(
        weaponDataBefore.stats.offensiveStats.lethality + expectedStatBonus.offensiveStats.lethality
      );
      
      // Check defensive stats increased correctly using template data
      expect(weaponDataAfter.stats.defensiveStats.sharpResistance).to.equal(
        weaponDataBefore.stats.defensiveStats.sharpResistance + expectedStatBonus.defensiveStats.sharpResistance
      );
      expect(weaponDataAfter.stats.defensiveStats.bluntResistance).to.equal(
        weaponDataBefore.stats.defensiveStats.bluntResistance + expectedStatBonus.defensiveStats.bluntResistance
      );
      expect(weaponDataAfter.stats.defensiveStats.burnResistance).to.equal(
        weaponDataBefore.stats.defensiveStats.burnResistance + expectedStatBonus.defensiveStats.burnResistance
      );
      expect(weaponDataAfter.stats.defensiveStats.guard).to.equal(
        weaponDataBefore.stats.defensiveStats.guard + expectedStatBonus.defensiveStats.guard
      );

      // Balance of sword shards after leveling up should be reduced by materialCost from template
      const balanceAfter = await swordShard.read.balanceOf([user.account.address]);
      expect(balanceAfter).to.equal(balanceBefore - BigInt(expectedMaterialCost));
    });

    it("Should fail to level up weapon with insufficient XP", async function () {
      const { weapon, weaponAnvil, swordShard, user } = await loadFixture(deployFixture);

      // Get template data for tier 1 sword
      const tier1Template = levelTemplates.sword["1"];
      const expectedXpCost = tier1Template.xpRequiredPerLevel;

      // Give user some sword shards
      await swordShard.write.mint([user.account.address, maxUint256]);
      await swordShard.write.approve([weaponAnvil.address, maxUint256], { account: user.account });

      // Set weapon XP to less than required
      let weaponDataToModify = await weapon.read.getWeapon([0n]);
      weaponDataToModify.xp = expectedXpCost - 1; // 1 XP short
      await weapon.write.updateWeapon([0n, weaponDataToModify]);

      // Try to level up weapon - should fail
      await expect(
        weaponAnvil.write.levelUp([0n], { account: user.account })
      ).to.be.rejectedWith("InsufficientXP");
    });

    it("Should fail to level up weapon with insufficient materials", async function () {
      const { weapon, weaponAnvil, swordShard, user } = await loadFixture(deployFixture);

      // Get template data for tier 1 sword
      const tier1Template = levelTemplates.sword["1"];
      const expectedXpCost = tier1Template.xpRequiredPerLevel;
      const expectedMaterialCost = tier1Template.materialCost;

      // Give user insufficient sword shards (less than material cost)
      await swordShard.write.mint([user.account.address, BigInt(expectedMaterialCost) - 1n]);
      await swordShard.write.approve([weaponAnvil.address, maxUint256], { account: user.account });

      // Set weapon XP to enough for leveling up
      let weaponDataToModify = await weapon.read.getWeapon([0n]);
      weaponDataToModify.xp = expectedXpCost + 10;
      await weapon.write.updateWeapon([0n, weaponDataToModify]);

      // Try to level up weapon - should fail due to insufficient materials
      await expect(
        weaponAnvil.write.levelUp([0n], { account: user.account })
      ).to.be.rejectedWith(Error);
    });

    it("Should fail to level up weapon if not the owner", async function () {
      const { weapon, weaponAnvil, swordShard, user, owner } = await loadFixture(deployFixture);

      // Get template data for tier 1 sword
      const tier1Template = levelTemplates.sword["1"];
      const expectedXpCost = tier1Template.xpRequiredPerLevel;

      // Give owner some sword shards (owner is not the weapon owner)
      await swordShard.write.mint([owner.account.address, maxUint256]);
      await swordShard.write.approve([weaponAnvil.address, maxUint256], { account: owner.account });

      // Set weapon XP to enough for leveling up
      let weaponDataToModify = await weapon.read.getWeapon([0n]);
      weaponDataToModify.xp = expectedXpCost + 10;
      await weapon.write.updateWeapon([0n, weaponDataToModify]);

      // Try to level up weapon as owner (not weapon owner) - should fail
      await expect(
        weaponAnvil.write.levelUp([0n], { account: owner.account })
      ).to.be.rejectedWith("NotWeaponOwner");
    });
  });

  describe("Tier Upgrade", function () {
    it("Should allow weapon owner to upgrade tier successfully", async function () {
      const { weapon, weaponAnvil, rareSwordShard, user } = await loadFixture(deployFixture);

      // Get upgrade template data for tier 1 sword (upgrade from tier 1 to tier 2)
      const upgradeTemplate = upgradeTemplates.sword["1"];
      const expectedMaterialCost = upgradeTemplate.materialCost;
      const expectedStatBonus = upgradeTemplate.baseStatBonus;

      // Give user some rare sword shards for upgrade
      await rareSwordShard.write.mint([user.account.address, maxUint256]);
      await rareSwordShard.write.approve([weaponAnvil.address, maxUint256], { account: user.account });

      // Set weapon to max level of tier 1 (level 10) and tier 1
      let weaponDataToModify = await weapon.read.getWeapon([0n]);
      weaponDataToModify.level = 10; // Max level of tier 1
      weaponDataToModify.tier = 1;
      weaponDataToModify.xp = 100; // Some XP to verify it gets reset
      await weapon.write.updateWeapon([0n, weaponDataToModify]);

      // Get weapon data before upgrade
      const weaponDataBefore = await weapon.read.getWeapon([0n]);
      const balanceBefore = await rareSwordShard.read.balanceOf([user.account.address]);

      // Upgrade tier
      await weaponAnvil.write.upgradeTier([0n], { account: user.account });

      // Check weapon after upgrade
      const weaponDataAfter = await weapon.read.getWeapon([0n]);
      
      // Level should increase by 1 (to 11, start of tier 2)
      expect(weaponDataAfter.level).to.equal(11);
      
      // Tier should increase by 1
      expect(weaponDataAfter.tier).to.equal(2);
      
      // XP should be reset to 0
      expect(weaponDataAfter.xp).to.equal(0);

      // Check that name and image are updated (if specified in template)
      if (upgradeTemplate.newName && upgradeTemplate.newName !== "") {
        expect(weaponDataAfter.name).to.equal(upgradeTemplate.newName);
      }
      if (upgradeTemplate.newImage && upgradeTemplate.newImage !== "") {
        expect(weaponDataAfter.image).to.equal(upgradeTemplate.newImage);
      }

      // Check base stats increased correctly using upgrade template data
      expect(weaponDataAfter.stats.health).to.equal(weaponDataBefore.stats.health + expectedStatBonus.health);
      expect(weaponDataAfter.stats.speed).to.equal(weaponDataBefore.stats.speed + expectedStatBonus.speed);
      expect(weaponDataAfter.stats.mind).to.equal(weaponDataBefore.stats.mind + expectedStatBonus.mind);
      expect(weaponDataAfter.stats.handling).to.equal(weaponDataBefore.stats.handling + expectedStatBonus.handling);
      
      // Check offensive stats increased correctly using upgrade template data
      expect(weaponDataAfter.stats.offensiveStats.sharpDamage).to.equal(
        weaponDataBefore.stats.offensiveStats.sharpDamage + expectedStatBonus.offensiveStats.sharpDamage
      );
      expect(weaponDataAfter.stats.offensiveStats.bluntDamage).to.equal(
        weaponDataBefore.stats.offensiveStats.bluntDamage + expectedStatBonus.offensiveStats.bluntDamage
      );
      expect(weaponDataAfter.stats.offensiveStats.burnDamage).to.equal(
        weaponDataBefore.stats.offensiveStats.burnDamage + expectedStatBonus.offensiveStats.burnDamage
      );
      expect(weaponDataAfter.stats.offensiveStats.pierce).to.equal(
        weaponDataBefore.stats.offensiveStats.pierce + expectedStatBonus.offensiveStats.pierce
      );
      expect(weaponDataAfter.stats.offensiveStats.lethality).to.equal(
        weaponDataBefore.stats.offensiveStats.lethality + expectedStatBonus.offensiveStats.lethality
      );
      
      // Check defensive stats increased correctly using upgrade template data
      expect(weaponDataAfter.stats.defensiveStats.sharpResistance).to.equal(
        weaponDataBefore.stats.defensiveStats.sharpResistance + expectedStatBonus.defensiveStats.sharpResistance
      );
      expect(weaponDataAfter.stats.defensiveStats.bluntResistance).to.equal(
        weaponDataBefore.stats.defensiveStats.bluntResistance + expectedStatBonus.defensiveStats.bluntResistance
      );
      expect(weaponDataAfter.stats.defensiveStats.burnResistance).to.equal(
        weaponDataBefore.stats.defensiveStats.burnResistance + expectedStatBonus.defensiveStats.burnResistance
      );
      expect(weaponDataAfter.stats.defensiveStats.guard).to.equal(
        weaponDataBefore.stats.defensiveStats.guard + expectedStatBonus.defensiveStats.guard
      );

      // Check that new abilities are added (if any)
      if (upgradeTemplate.newAbilities && upgradeTemplate.newAbilities.length > 0) {
        // Verify that all old abilities are still there plus the new ones
        expect(weaponDataAfter.abilities.length).to.equal(
          weaponDataBefore.abilities.length + upgradeTemplate.newAbilities.length
        );
        
        // Check that new abilities are included
        for (const newAbility of upgradeTemplate.newAbilities) {
          expect(weaponDataAfter.abilities).to.include(newAbility);
        }
      }

      // Balance should be reduced by material cost
      const balanceAfter = await rareSwordShard.read.balanceOf([user.account.address]);
      expect(balanceAfter).to.equal(balanceBefore - BigInt(expectedMaterialCost));
    });

    it("Should fail to upgrade tier if not the owner", async function () {
      const { weapon, weaponAnvil, rareSwordShard, user, owner } = await loadFixture(deployFixture);

      // Give owner some rare sword shards
      await rareSwordShard.write.mint([owner.account.address, maxUint256]);
      await rareSwordShard.write.approve([weaponAnvil.address, maxUint256], { account: owner.account });

      // Set weapon to max level of tier 1
      let weaponDataToModify = await weapon.read.getWeapon([0n]);
      weaponDataToModify.level = 10;
      weaponDataToModify.tier = 1;
      await weapon.write.updateWeapon([0n, weaponDataToModify]);

      // Try to upgrade tier as owner (not weapon owner) - should fail
      await expect(
        weaponAnvil.write.upgradeTier([0n], { account: owner.account })
      ).to.be.rejectedWith("NotWeaponOwner");
    });

    it("Should fail to upgrade tier if not at max level of current tier", async function () {
      const { weapon, weaponAnvil, rareSwordShard, user } = await loadFixture(deployFixture);

      // Give user some rare sword shards
      await rareSwordShard.write.mint([user.account.address, maxUint256]);
      await rareSwordShard.write.approve([weaponAnvil.address, maxUint256], { account: user.account });

      // Set weapon to level 5 (not max level of tier 1)
      let weaponDataToModify = await weapon.read.getWeapon([0n]);
      weaponDataToModify.level = 5;
      weaponDataToModify.tier = 1;
      await weapon.write.updateWeapon([0n, weaponDataToModify]);

      // Try to upgrade tier - should fail
      await expect(
        weaponAnvil.write.upgradeTier([0n], { account: user.account })
      ).to.be.rejectedWith(Error);
    });

    it("Should fail to upgrade tier with insufficient materials", async function () {
      const { weapon, weaponAnvil, rareSwordShard, user } = await loadFixture(deployFixture);

      // Get upgrade template data
      const upgradeTemplate = upgradeTemplates.sword["1"];
      const expectedMaterialCost = upgradeTemplate.materialCost;

      // Give user insufficient rare sword shards
      await rareSwordShard.write.mint([user.account.address, BigInt(expectedMaterialCost) - 1n]);
      await rareSwordShard.write.approve([weaponAnvil.address, maxUint256], { account: user.account });

      // Set weapon to max level of tier 1
      let weaponDataToModify = await weapon.read.getWeapon([0n]);
      weaponDataToModify.level = 10;
      weaponDataToModify.tier = 1;
      await weapon.write.updateWeapon([0n, weaponDataToModify]);

      // Try to upgrade tier - should fail due to insufficient materials
      await expect(
        weaponAnvil.write.upgradeTier([0n], { account: user.account })
      ).to.be.rejectedWith(Error);
    });
  });
});
