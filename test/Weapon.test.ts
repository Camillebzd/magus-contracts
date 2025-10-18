import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { type Address, type WalletClient, type PublicClient } from "viem";
import initialWeaponsData from "../metadata/InitialWeaponsData.json";
import type { Attribute, NFTMetadata, WeaponType } from "../types/WeaponTypes";

// Helper function to sign XP messages for weapons
async function signWeaponXP(
  server: WalletClient,
  weapon: any, // Weapon contract instance
  publicClient: PublicClient,
  tokenId: bigint,
  amount: bigint
) {
  // EIP-712 typed data structure
  const domain = {
    name: "XP",
    version: "1.0",
    chainId: await publicClient.getChainId(),
    verifyingContract: weapon.address,
  };
  const types = {
    addXP: [
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const nonce = await weapon.read.nonces([tokenId]);
  const message = {
    tokenId,
    amount,
    nonce,
  };

  return await server.signTypedData({
    account: server.account!,
    domain,
    types,
    primaryType: "addXP",
    message,
  });
}

describe("Weapon", function () {
  async function deployWeaponSystemFixture() {
    const [owner, addr1, addr2, server] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // Deploy WeaponFactory first
    const weaponFactory = await hre.viem.deployContract("WeaponFactory", [
      owner.account.address,
    ]);

    // Deploy Weapon contract with WeaponFactory address
    const weapon = await hre.viem.deployContract("Weapon", [
      owner.account.address,
      weaponFactory.address,
      server.account.address, // Use dedicated server account for XP signing
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
          initialTemplate.stats,
          initialTemplate.abilities,
        ],
        { account: account }
      );
    };

    // Helper function to parse json and retrieve attributes
    const parseWeaponAttributes = (weaponData: string) => {
      const attributes: Attribute[] = JSON.parse(weaponData).attributes;

      return attributes.reduce((acc: { [key: string]: string | string[] }, attr: Attribute) => {
        // Convert abilities string back to array for easier comparison
        if (attr.trait_type === "Abilities" && typeof attr.value === "string" && attr.value !== "None") {
          acc[attr.trait_type] = attr.value.split(", ");
        } else {
          acc[attr.trait_type] = attr.value;
        }
        return acc;
      }, {});
    };

    // Setup initial templates for sword
    await setupInitialWeaponTemplates("sword");

    return {
      weapon,
      weaponFactory,
      owner,
      addr1,
      addr2,
      server,
      publicClient,
      setupInitialWeaponTemplates,
      parseWeaponAttributes,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner for weapon contract", async function () {
      const { weapon, weaponFactory, owner } = await loadFixture(
        deployWeaponSystemFixture
      );

      expect((await weapon.read.owner()).toLowerCase()).to.equal(owner.account.address);
    });

    it("Should have correct name and symbol", async function () {
      const { weapon } = await loadFixture(deployWeaponSystemFixture);

      expect(await weapon.read.name()).to.equal("Weapon");
      expect(await weapon.read.symbol()).to.equal("WPN");
    });

    it("Should link weapon contract to factory", async function () {
      const { weapon, weaponFactory } = await loadFixture(
        deployWeaponSystemFixture
      );

      expect((await weapon.read.getWeaponFactory()).toLowerCase()).to.equal(
        weaponFactory.address
      );
    });
  });

  describe("Weapon Minting", function () {
    it("Should mint weapon from factory by type", async function () {
      const { weapon, addr1 } = await loadFixture(deployWeaponSystemFixture);

      await weapon.write.requestWeapon(["sword"], {
        account: addr1.account,
      }); // SWORD

      expect(await weapon.read.balanceOf([addr1.account.address])).to.equal(1n);
      expect((await weapon.read.ownerOf([0n])).toLowerCase()).to.equal(addr1.account.address);

      const weaponData = await weapon.read.getWeapon([0n]);
      const expectedTemplate = initialWeaponsData["sword"];

      expect(weaponData.name).to.equal(expectedTemplate.name);
      expect(weaponData.description).to.equal(expectedTemplate.description);
      expect(weaponData.image).to.equal(expectedTemplate.image);
      expect(weaponData.level).to.equal(1);
      expect(weaponData.tier).to.equal(1);
      expect(weaponData.xp).to.equal(0);
      expect(weaponData.weaponType).to.equal("sword");
      expect(weaponData.element).to.equal("none");
      expect(weaponData.stats).to.deep.equal(expectedTemplate.stats);
      expect(weaponData.abilities).to.deep.equal(expectedTemplate.abilities);
    });

    it("Should generate correct tokenURI with on-chain metadata", async function () {
      const { weapon, addr1, parseWeaponAttributes } = await loadFixture(deployWeaponSystemFixture);

      await weapon.write.requestWeapon(["sword"], {
        account: addr1.account,
      }); // SWORD

      const tokenURI = await weapon.read.tokenURI([0n]);

      // Check that it's a data URI
      expect(tokenURI).to.include("data:application/json;base64,");

      const expectedData = initialWeaponsData["sword"];

      // Decode and parse the JSON
      const base64Data = tokenURI.split(",")[1];
      const jsonString = Buffer.from(base64Data, "base64").toString();
      const metadata: NFTMetadata = JSON.parse(jsonString);
      const attributes = parseWeaponAttributes(jsonString);

      expect(metadata.name).to.equal(expectedData.name);
      expect(metadata.description).to.equal(expectedData.description);
      expect(metadata.image).to.equal(expectedData.image);
      expect(metadata.attributes).to.be.an("array");
      expect(metadata.attributes.length).to.be.greaterThan(0);
      expect(attributes["Level"]).to.equal(1);
      expect(attributes["Tier"]).to.equal(1);
      expect(attributes["XP"]).to.equal(0);
      expect(attributes["Type"]).to.equal("sword");
      expect(attributes["Health"]).to.equal(expectedData.stats.health);
      expect(attributes["Speed"]).to.equal(expectedData.stats.speed);
      expect(attributes["Mind"]).to.equal(expectedData.stats.mind);
      expect(attributes["Sharp Damage"]).to.equal(expectedData.stats.offensiveStats.sharpDamage);
      expect(attributes["Blunt Damage"]).to.equal(expectedData.stats.offensiveStats.bluntDamage);
      expect(attributes["Burn Damage"]).to.equal(expectedData.stats.offensiveStats.burnDamage);
      expect(attributes["Pierce"]).to.equal(expectedData.stats.offensiveStats.pierce);
      expect(attributes["Lethality"]).to.equal(expectedData.stats.offensiveStats.lethality);
      expect(attributes["Sharp Resistance"]).to.equal(expectedData.stats.defensiveStats.sharpResistance);
      expect(attributes["Blunt Resistance"]).to.equal(expectedData.stats.defensiveStats.bluntResistance);
      expect(attributes["Burn Resistance"]).to.equal(expectedData.stats.defensiveStats.burnResistance);
      expect(attributes["Guard"]).to.equal(expectedData.stats.defensiveStats.guard);
      expect(attributes["Handling"]).to.equal(expectedData.stats.handling);
      expect(attributes["Element"]).to.deep.equal("none");
      expect(attributes["Abilities"]).to.deep.equal(expectedData.abilities);
    });

    it("Should reject invalid weapon types", async function () {
      const { weapon, addr1 } = await loadFixture(deployWeaponSystemFixture);

      await expect(
        weapon.write.requestWeapon(["gm"], { account: addr1.account }) // Invalid type
      ).to.be.rejected;
    });
  });

  describe("Custom Weapons (Owner Only)", function () {
    it("Should allow owner to mint custom weapons", async function () {
      const { weapon } = await loadFixture(deployWeaponSystemFixture);

      const customWeapon = {
        name: "Hacker Sword",
        description: "This sword will hack the game.",
        image: "https://example.com/hack.png",
        level: 100,
        tier: 10,
        stats: {
          health: 9999,
          speed: 9999,
          mind: 9999,
          offensiveStats: {
            sharpDamage: 9999,
            bluntDamage: 9999,
            burnDamage: 9999,
            pierce: 9999,
            lethality: 9999,
          },
          defensiveStats: {
            sharpResistance: 9999,
            bluntResistance: 9999,
            burnResistance: 9999,
            guard: 9999,
          },
          handling: 9999,
        },
        weaponType: "sword",
        element: "godly",
        xp: 9999,
        abilities: ["Hack"],
      };

      await weapon.write.requestCustomWeapon([customWeapon]);

      const weaponData = await weapon.read.getWeapon([0n]);
      expect(weaponData.name).to.equal("Hacker Sword");
      expect(weaponData.description).to.equal("This sword will hack the game.");
      expect(weaponData.image).to.equal("https://example.com/hack.png");
      expect(weaponData.level).to.equal(100);
      expect(weaponData.tier).to.equal(10);
      expect(weaponData.xp).to.equal(9999);
      expect(weaponData.weaponType).to.equal("sword");
      expect(weaponData.element).to.equal("godly");
      expect(weaponData.stats).to.deep.equal(customWeapon.stats);
      expect(weaponData.abilities).to.deep.equal(customWeapon.abilities);
    });

    it("Should not allow non-owner to mint custom weapons", async function () {
      const { weapon, addr1 } = await loadFixture(deployWeaponSystemFixture);

      const customWeapon = {
        name: "Hacker Sword",
        description: "Should not work",
        image: "https://example.com/hack.png",
        level: 100,
        tier: 10,
        stats: {
          health: 9999,
          speed: 9999,
          mind: 9999,
          offensiveStats: {
            sharpDamage: 9999,
            bluntDamage: 9999,
            burnDamage: 9999,
            pierce: 9999,
            lethality: 9999,
          },
          defensiveStats: {
            sharpResistance: 9999,
            bluntResistance: 9999,
            burnResistance: 9999,
            guard: 9999,
          },
          handling: 9999,
        },
        weaponType: "sword",
        element: "godly",
        xp: 9999,
        identity: "Hacked",
        abilities: ["Hack"],
      };

      await expect(
        weapon.write.requestCustomWeapon([customWeapon], {
          account: addr1.account,
        })
      ).to.be.rejected;
    });
  });

  describe("Factory Management", function () {
    it("Should allow owner to update weapon factory", async function () {
      const { weapon, owner } = await loadFixture(deployWeaponSystemFixture);

      // Deploy new factory
      const newFactory = await hre.viem.deployContract("WeaponFactory", [
        owner.account.address,
      ]);

      await weapon.write.setWeaponFactory([newFactory.address]);

      expect((await weapon.read.getWeaponFactory()).toLowerCase()).to.equal(newFactory.address);
    });

    it("Should not allow non-owner to update weapon factory", async function () {
      const { weapon, addr1 } = await loadFixture(deployWeaponSystemFixture);

      await expect(
        weapon.write.setWeaponFactory([addr1.account.address], {
          account: addr1.account,
        })
      ).to.be.rejected;
    });
  });

  // Test only, it will be removed for production
  describe("Weapon Management (only for testing, will be removed in production)", function () {
    it("Should allow owner to update weapon data", async function () {
      const { weapon, addr1 } = await loadFixture(
        deployWeaponSystemFixture
      );

      await weapon.write.requestWeapon(["sword"], {
        account: addr1.account,
      }); // SWORD

      const originalWeapon = await weapon.read.getWeapon([0n]);

      const updatedWeapon = {
        ...originalWeapon,
        name: "Updated Sword",
        level: 5,
      };

      await weapon.write.updateWeapon([0n, updatedWeapon]);

      const weaponData = await weapon.read.getWeapon([0n]);
      expect(weaponData.name).to.equal("Updated Sword");
      expect(weaponData.level).to.equal(5);
    });
  });

  describe("XP System", function () {
    it("Should mint a weapon and add XP to it", async function () {
      const { weapon, server, addr1, publicClient } = await loadFixture(deployWeaponSystemFixture);

      // Player requests a weapon
      await weapon.write.requestWeapon(["sword"], {
        account: addr1.account,
      });

      const tokenId = 0n;

      // Get initial weapon data
      const initialWeapon = await weapon.read.getWeapon([tokenId]);
      expect(initialWeapon.xp).to.equal(0);

      // Server adds XP to the weapon
      const xpAmount = 150n;
      const signature = await signWeaponXP(
        server,
        weapon,
        publicClient,
        tokenId,
        xpAmount
      );

      // Add XP to the weapon
      await weapon.write.addXP([tokenId, xpAmount, 0n, signature]);

      // Get updated weapon data - XP should be stored in WeaponData
      const updatedWeapon = await weapon.read.getWeapon([tokenId]);
      expect(updatedWeapon.xp).to.equal(Number(xpAmount));
    });

    it("Should handle multiple XP additions", async function () {
      const { weapon, server, addr1, publicClient } = await loadFixture(deployWeaponSystemFixture);

      // Player requests a weapon
      await weapon.write.requestWeapon(["sword"], {
        account: addr1.account,
      });

      const tokenId = 0n;

      // First XP addition
      const xpAmount1 = 100n;
      let signature = await signWeaponXP(
        server,
        weapon,
        publicClient,
        tokenId,
        xpAmount1
      );

      await weapon.write.addXP([tokenId, xpAmount1, 0n, signature]);

      // Second XP addition
      const xpAmount2 = 75n;
      signature = await signWeaponXP(
        server,
        weapon,
        publicClient,
        tokenId,
        xpAmount2
      );

      await weapon.write.addXP([tokenId, xpAmount2, 1n, signature]);

      // Verify total XP in WeaponData
      const totalXP = xpAmount1 + xpAmount2;
      const weaponData = await weapon.read.getWeapon([tokenId]);
      expect(weaponData.xp).to.equal(Number(totalXP));
    });

    it("Should prevent XP addition with invalid signature", async function () {
      const { weapon, server, addr1, publicClient } = await loadFixture(deployWeaponSystemFixture);

      // Player requests a weapon
      await weapon.write.requestWeapon(["sword"], {
        account: addr1.account,
      });

      const tokenId = 0n;

      // Create invalid signer
      const invalidPrivateKey = generatePrivateKey();
      const invalidSigner = privateKeyToAccount(invalidPrivateKey);

      const xpAmount = 100n;
      const signature = await signWeaponXP(
        { ...server, account: invalidSigner },
        weapon,
        publicClient,
        tokenId,
        xpAmount
      );

      // Attempt to add XP with invalid signature should fail
      await expect(
        weapon.write.addXP([tokenId, xpAmount, 0n, signature])
      ).to.be.rejected;

      // Verify no XP was added to WeaponData
      const weaponData = await weapon.read.getWeapon([tokenId]);
      expect(weaponData.xp).to.equal(0);
    });

    it("Should prevent XP addition to non-existent weapon", async function () {
      const { weapon, server, publicClient } = await loadFixture(deployWeaponSystemFixture);

      const nonExistentTokenId = 999n;
      const xpAmount = 100n;

      const signature = await signWeaponXP(
        server,
        weapon,
        publicClient,
        nonExistentTokenId,
        xpAmount
      );

      // Attempt to add XP to non-existent weapon should fail
      await expect(
        weapon.write.addXP([nonExistentTokenId, xpAmount, 0n, signature])
      ).to.be.rejected;
    });
  });
});
