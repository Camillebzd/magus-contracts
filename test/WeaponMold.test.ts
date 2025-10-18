import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import initialWeaponsData from "../metadata/InitialWeaponsData.json";
import type { WeaponType } from "../types/WeaponTypes";

describe("Weapon Mold", function () {
  async function deployWeaponSystemFixture() {
    const [owner] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // Deploy WeaponMold
    const weaponMold = await hre.viem.deployContract("WeaponMold", [
      owner.account.address,
    ]);

    // Helper function to setup the initial templates in the mold
    const setupInitialWeaponTemplates = async (weaponType: WeaponType, account: any = owner.account) => {
      // Get the initial template data for the specified weapon type
      const initialTemplate = initialWeaponsData[weaponType];

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
    };

    return {
      weaponMold,
      owner,
      publicClient,
      setupInitialWeaponTemplates,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner for the weapon mold", async function () {
      const { weaponMold, owner } = await loadFixture(
        deployWeaponSystemFixture
      );

      expect((await weaponMold.read.owner()).toLowerCase()).to.equal(owner.account.address);
    });

    it("Should have 0 weapon types configured at start", async function () {
      const { weaponMold } = await loadFixture(deployWeaponSystemFixture);
      const weaponTypeCount = await weaponMold.read.getWeaponTypeCount();
      const configuredTypes =
        await weaponMold.read.getConfiguredWeaponTypes();

      expect(weaponTypeCount).to.equal(0n);
      expect(configuredTypes.length).to.equal(0);
    });
  });

  describe("Setup & usage", function () {
    it("Should set up the sword default weapon template", async function () {
      const { weaponMold, setupInitialWeaponTemplates } = await loadFixture(
        deployWeaponSystemFixture
      );

      await setupInitialWeaponTemplates("sword");

      // Check that the sword template is set up correctly
      const swordTemplateOnChain = await weaponMold.read.getWeaponTemplate([
        "sword",
      ]);
      const swordTemplateOffChain = initialWeaponsData["sword"];

      expect(swordTemplateOnChain.name).to.equal(swordTemplateOffChain.name);
      expect(swordTemplateOnChain.description).to.equal(
        swordTemplateOffChain.description
      );
      expect(swordTemplateOnChain.image).to.equal(swordTemplateOffChain.image);
      expect(swordTemplateOnChain.level).to.equal(1);
      expect(swordTemplateOnChain.tier).to.equal(1);
      expect(swordTemplateOnChain.xp).to.equal(0);
      expect(swordTemplateOnChain.weaponType).to.equal("sword");
      expect(swordTemplateOnChain.stats).to.deep.equal(
        swordTemplateOffChain.stats
      );
      expect(swordTemplateOnChain.abilities).to.deep.equal(
        swordTemplateOffChain.abilities
      );

      const weaponTypeCount = await weaponMold.read.getWeaponTypeCount();
      const configuredTypes =
        await weaponMold.read.getConfiguredWeaponTypes();

      expect(weaponTypeCount).to.equal(1n);
      expect(configuredTypes.length).to.equal(1);
      expect(configuredTypes[0]).to.equal("sword");
    });

    it("Should create (return) weapons", async function () {
      const { weaponMold, setupInitialWeaponTemplates } = await loadFixture(
        deployWeaponSystemFixture
      );

      await setupInitialWeaponTemplates("sword");

      const weapon = await weaponMold.read.createWeapon(["sword"]);
      const swordTemplateOffChain = initialWeaponsData["sword"];

      expect(weapon.name).to.equal(swordTemplateOffChain.name);
      expect(weapon.description).to.equal(swordTemplateOffChain.description);
      expect(weapon.image).to.equal(swordTemplateOffChain.image);
      expect(weapon.level).to.equal(1);
      expect(weapon.tier).to.equal(1);
      expect(weapon.xp).to.equal(0);
      expect(weapon.weaponType).to.equal("sword");
      expect(weapon.stats).to.deep.equal(
        swordTemplateOffChain.stats
      );
      expect(weapon.abilities).to.deep.equal(swordTemplateOffChain.abilities);
    });

    it("Should not allow creating a weapon with an unconfigured type", async function () {
      const { weaponMold } = await loadFixture(deployWeaponSystemFixture);

      await expect(
        weaponMold.read.createWeapon(["gm"]) // Invalid weapon type
      ).to.be.rejected;
    });

    it("Should not allow setting a weapon template if not owner", async function () {
      const { setupInitialWeaponTemplates } = await loadFixture(deployWeaponSystemFixture);
      const [_, nonOwner] = await hre.viem.getWalletClients();

      await expect(
        setupInitialWeaponTemplates("sword", nonOwner.account)
      ).to.be.rejected;
    });
  });
});
