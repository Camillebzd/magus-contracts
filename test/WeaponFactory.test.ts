import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import initialWeaponsData from "../metadata/InitialWeaponsData.json";
import { WeaponType } from "../types/WeaponTypes";

describe("Weapon Factory", function () {
  async function deployWeaponSystemFixture() {
    const [owner] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // Deploy WeaponFactory
    const weaponFactory = await hre.viem.deployContract("WeaponFactory", [
      owner.account.address,
    ]);

    // Helper function to setup the initial templates in the factory
    const setupInitialWeaponTemplates = async (weaponType: WeaponType, account: any = owner.account) => {
      // Get the initial template data for the specified weapon type
      const initialTemplate = initialWeaponsData[weaponType];

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
        { account: account }
      );
    };

    return {
      weaponFactory,
      owner,
      publicClient,
      setupInitialWeaponTemplates,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner for the weapon factory", async function () {
      const { weaponFactory, owner } = await loadFixture(
        deployWeaponSystemFixture
      );

      expect((await weaponFactory.read.owner()).toLowerCase()).to.equal(owner.account.address);
    });

    it("Should have 0 weapon types configured at start", async function () {
      const { weaponFactory } = await loadFixture(deployWeaponSystemFixture);
      const weaponTypeCount = await weaponFactory.read.getWeaponTypeCount();
      const configuredTypes =
        await weaponFactory.read.getConfiguredWeaponTypes();

      expect(weaponTypeCount).to.equal(0n);
      expect(configuredTypes.length).to.equal(0);
    });
  });

  describe("Setup & usage", function () {
    it("Should set up the sword default weapon template", async function () {
      const { weaponFactory, setupInitialWeaponTemplates } = await loadFixture(
        deployWeaponSystemFixture
      );

      await setupInitialWeaponTemplates(WeaponType.SWORD);

      // Check that the sword template is set up correctly
      const swordTemplateOnChain = await weaponFactory.read.getWeaponTemplate([
        WeaponType.SWORD,
      ]);
      const swordTemplateOffChain = initialWeaponsData[WeaponType.SWORD];

      expect(swordTemplateOnChain.name).to.equal(swordTemplateOffChain.name);
      expect(swordTemplateOnChain.description).to.equal(
        swordTemplateOffChain.description
      );
      expect(swordTemplateOnChain.image).to.equal(swordTemplateOffChain.image);
      expect(swordTemplateOnChain.level).to.equal(1);
      expect(swordTemplateOnChain.stage).to.equal(1);
      expect(swordTemplateOnChain.xp).to.equal(0);
      expect(swordTemplateOnChain.weaponStats).to.deep.equal(
        swordTemplateOffChain.weaponStats
      );
      expect(swordTemplateOnChain.abilities).to.deep.equal(
        swordTemplateOffChain.abilities
      );

      const weaponTypeCount = await weaponFactory.read.getWeaponTypeCount();
      const configuredTypes =
        await weaponFactory.read.getConfiguredWeaponTypes();

      expect(weaponTypeCount).to.equal(1n);
      expect(configuredTypes.length).to.equal(1);
      expect(configuredTypes[0]).to.equal(WeaponType.SWORD);
    });

    it("Should create (return) weapons", async function () {
      const { weaponFactory, setupInitialWeaponTemplates } = await loadFixture(
        deployWeaponSystemFixture
      );

      await setupInitialWeaponTemplates(WeaponType.SWORD);

      const weapon = await weaponFactory.read.createWeapon([WeaponType.SWORD]);
      const swordTemplateOffChain = initialWeaponsData[WeaponType.SWORD];

      expect(weapon.name).to.equal(swordTemplateOffChain.name);
      expect(weapon.description).to.equal(swordTemplateOffChain.description);
      expect(weapon.image).to.equal(swordTemplateOffChain.image);
      expect(weapon.level).to.equal(1);
      expect(weapon.stage).to.equal(1);
      expect(weapon.xp).to.equal(0);
      expect(weapon.weaponStats).to.deep.equal(
        swordTemplateOffChain.weaponStats
      );
      expect(weapon.abilities).to.deep.equal(swordTemplateOffChain.abilities);
    });

    it("Should not allow creating a weapon with an unconfigured type", async function () {
      const { weaponFactory } = await loadFixture(deployWeaponSystemFixture);

      await expect(
        weaponFactory.read.createWeapon([99]) // Invalid weapon type
      ).to.be.rejected;
    });

    it("Should not allow setting a weapon template if not owner", async function () {
      const { setupInitialWeaponTemplates } = await loadFixture(deployWeaponSystemFixture);
      const [_, nonOwner] = await hre.viem.getWalletClients();

      await expect(
        setupInitialWeaponTemplates(WeaponType.SWORD, nonOwner.account)
      ).to.be.rejected;
    });
  });
});
