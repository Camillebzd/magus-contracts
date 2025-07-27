import { expect } from "chai";
import { ethers } from "hardhat";
import { GearFactory, GearFight, GearFight__factory } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

type Attribute = {
  trait_type: string;
  value: string | string[];
};

type NFTMetadata = {
  name: string;
  description: string;
  image: string;
  attributes: Attribute[];
};

function getDataFromMetadata(attributes: Attribute[], trait_type: string) {
  for (let i = 0; i < attributes.length; i++) {
    if (attributes[i].trait_type === trait_type) return attributes[i].value;
  }
  return "";
}

describe("GearFight", function () {
  async function deployFixture() {
    const GearFactory = await ethers.getContractFactory("GearFactory");
    const gearFactory = await GearFactory.deploy();
    const libAddress = await gearFactory.getAddress();
    const GearFight: GearFight__factory = (await ethers.getContractFactory(
      "GearFight",
      {
        libraries: {
          GearFactory: libAddress,
        },
      }
    )) as unknown as GearFight__factory;
    const gearFight: GearFight = await GearFight.deploy();
    const basicSword: GearFactory.WeaponStruct = {
      name: "Basic Sword",
      description: "Little sword, perfect to train.",
      image:
        "https://gateway.pinata.cloud/ipfs/QmZCvC7CymLx5AZoHCNfH1HBAUULe9bZdWxEGZjT5riY95",
      level: 1,
      stage: 1,
      weaponStats: {
        health: 113,
        speed: 24,
        mind: 8,
        offensiveStats: {
          sharpDamage: 22,
          bluntDamage: 8,
          burnDamage: 13,
          pierce: 8,
          lethality: 17,
        },
        defensiveStats: {
          sharpResistance: 21,
          bluntResistance: 8,
          burnResistance: 16,
          guard: 21,
        },
        handling: 21,
      },
      abilities: ["Ability1", "Ability2", "Ability3", "Ability4"],
      xp: 0,
      identity: "excalibur",
    };
    const lvlUpStats: GearFactory.WeaponStatsStruct = {
      health: 4,
      speed: 2,
      mind: 1,
      offensiveStats: {
        sharpDamage: 2,
        bluntDamage: 1,
        burnDamage: 1,
        pierce: 1,
        lethality: 2,
      },
      defensiveStats: {
        sharpResistance: 2,
        bluntResistance: 1,
        burnResistance: 2,
        guard: 2,
      },
      handling: 2,
    };
    let newAbilities: string[] = ["Ability5", "Ability6"];
    return { gearFight, basicSword, lvlUpStats, newAbilities };
  }

  it("Should request weapon with valid URI", async function () {
    const {
      gearFight,
      basicSword,
    }: { gearFight: GearFight; basicSword: GearFactory.WeaponStruct } =
      await loadFixture(deployFixture);

    await gearFight.requestWeapon(basicSword);
    let weaponURI = await gearFight.tokenURI(0);
    expect(weaponURI.length).to.be.above(0);

    let swordObj: NFTMetadata = JSON.parse(
      Buffer.from(weaponURI.substring(29), "base64").toString("utf-8")
    );
    expect(swordObj.name).to.be.equal(basicSword.name);
    expect(swordObj.description).to.be.equal(basicSword.description);
    expect(swordObj.image).to.be.equal(basicSword.image);
    expect(getDataFromMetadata(swordObj.attributes, "Level")).to.be.equal(
      basicSword.level.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Health")).to.be.equal(
      basicSword.weaponStats.health.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Speed")).to.be.equal(
      basicSword.weaponStats.speed.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Mind")).to.be.equal(
      basicSword.weaponStats.mind.toString()
    );
    expect(
      getDataFromMetadata(swordObj.attributes, "Sharp Damage")
    ).to.be.equal(basicSword.weaponStats.offensiveStats.sharpDamage.toString());
    expect(
      getDataFromMetadata(swordObj.attributes, "Blunt Damage")
    ).to.be.equal(basicSword.weaponStats.offensiveStats.bluntDamage.toString());
    expect(getDataFromMetadata(swordObj.attributes, "Burn Damage")).to.be.equal(
      basicSword.weaponStats.offensiveStats.burnDamage.toString()
    );
    expect(
      getDataFromMetadata(swordObj.attributes, "Sharp Resistance")
    ).to.be.equal(
      basicSword.weaponStats.defensiveStats.sharpResistance.toString()
    );
    expect(
      getDataFromMetadata(swordObj.attributes, "Blunt Resistance")
    ).to.be.equal(
      basicSword.weaponStats.defensiveStats.bluntResistance.toString()
    );
    expect(
      getDataFromMetadata(swordObj.attributes, "Burn Resistance")
    ).to.be.equal(
      basicSword.weaponStats.defensiveStats.burnResistance.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Guard")).to.be.equal(
      basicSword.weaponStats.defensiveStats.guard.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Pierce")).to.be.equal(
      basicSword.weaponStats.offensiveStats.pierce.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Lethality")).to.be.equal(
      basicSword.weaponStats.offensiveStats.lethality.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Handling")).to.be.equal(
      basicSword.weaponStats.handling.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Stage")).to.be.equal(
      basicSword.stage.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Experience")).to.be.equal(
      basicSword.xp.toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Identity")).to.be.equal(
      basicSword.identity
    );
    let abilities: string[] = getDataFromMetadata(
      swordObj.attributes,
      "Abilities"
    ) as string[];
    for (let i = 0; i < basicSword.abilities.length; i++)
      expect(abilities[i]).to.be.equal(basicSword.abilities[i]);
  });

  it("Should prevent from requesting to many weapon", async function () {
    const {
      gearFight,
      basicSword,
    }: { gearFight: GearFight; basicSword: GearFactory.WeaponStruct } =
      await loadFixture(deployFixture);

    await gearFight.requestWeapon(basicSword);
    await expect(gearFight.requestWeapon(basicSword)).to.be.reverted;
  });

  it("Should change request number", async function () {
    const {
      gearFight,
      basicSword,
    }: { gearFight: GearFight; basicSword: GearFactory.WeaponStruct } =
      await loadFixture(deployFixture);

    await gearFight.requestWeapon(basicSword);
    await gearFight.setWeaponsRequest(2);
    await expect(gearFight.requestWeapon(basicSword)).not.to.be.reverted;
  });

  it("Should stop the change request weapon number by somebody else than the owner", async function () {
    const { gearFight } = await loadFixture(deployFixture);
    const [owner, notOwner] = await ethers.getSigners();

    gearFight.connect(notOwner);
    expect(gearFight.setWeaponsRequest(2)).to.be.revertedWith("");
  });

  it("Should create an uri with valid JSON", async function () {
    const {
      gearFight,
      basicSword,
    }: { gearFight: GearFight; basicSword: GearFactory.WeaponStruct } =
      await loadFixture(deployFixture);

    await gearFight.requestWeapon(basicSword);
    let weaponURI = await gearFight.tokenURI(0);
    expect(weaponURI.length).to.be.above(0);
    let swordObj = JSON.parse(
      Buffer.from(weaponURI.substring(29), "base64").toString("utf-8")
    );
    expect(swordObj.name).to.equal("Basic Sword");
    expect(Number(swordObj.attributes[2].value)).to.equal(
      basicSword.weaponStats.health
    );
  });

  it("Should gain xp", async function () {
    const {
      gearFight,
      basicSword,
    }: { gearFight: GearFight; basicSword: GearFactory.WeaponStruct } =
      await loadFixture(deployFixture);

    await gearFight.requestWeapon(basicSword);
    await gearFight.gainXP(0, 1);
    let weapon = await gearFight.weapons(0);
    expect(weapon.xp).to.equal(1);
    await gearFight.gainXP(0, 2);
    weapon = await gearFight.weapons(0);
    expect(weapon.xp).to.equal(3);

    // Check the upgrade stats from URI
    let weaponURI = await gearFight.tokenURI(0);
    let swordObj: NFTMetadata = JSON.parse(
      Buffer.from(weaponURI.substring(29), "base64").toString("utf-8")
    );
    expect(getDataFromMetadata(swordObj.attributes, "Experience")).to.be.equal(
      "3"
    );
  });

  it("Should revert if gain xp on non-existing weapon", async function () {
    const { gearFight }: { gearFight: GearFight } = await loadFixture(
      deployFixture
    );

    await expect(gearFight.gainXP(0, 1)).to.be.reverted;
  });

  it("Should gain 2 levels and set xp", async function () {
    const {
      gearFight,
      basicSword,
      lvlUpStats,
      newAbilities,
    }: {
      gearFight: GearFight;
      basicSword: GearFactory.WeaponStruct;
      lvlUpStats: GearFactory.WeaponStatsStruct;
      newAbilities: string[];
    } = await loadFixture(deployFixture);

    await gearFight.requestWeapon(basicSword);
    let weapon = await gearFight.weapons(0);
    expect(weapon.level).to.be.equal(1);
    await gearFight.levelUp(0, 3, lvlUpStats, newAbilities, 1);
    weapon = await gearFight.weapons(0);
    expect(weapon.level).to.be.equal(3);
    expect(weapon.xp).to.be.equal(1);

    // Check the upgrade stats from URI
    let weaponURI = await gearFight.tokenURI(0);
    let swordObj: NFTMetadata = JSON.parse(
      Buffer.from(weaponURI.substring(29), "base64").toString("utf-8")
    );
    expect(swordObj.name).to.be.equal(basicSword.name);
    expect(swordObj.description).to.be.equal(basicSword.description);
    expect(swordObj.image).to.be.equal(basicSword.image);
    expect(getDataFromMetadata(swordObj.attributes, "Level")).to.be.equal("3");
    expect(getDataFromMetadata(swordObj.attributes, "Experience")).to.be.equal(
      "1"
    );
    expect(getDataFromMetadata(swordObj.attributes, "Health")).to.be.equal(
      (
        (basicSword.weaponStats.health as number) +
        (lvlUpStats.health as number)
      ).toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Speed")).to.be.equal(
      (
        (basicSword.weaponStats.speed as number) + (lvlUpStats.speed as number)
      ).toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Mind")).to.be.equal(
      (
        (basicSword.weaponStats.mind as number) + (lvlUpStats.mind as number)
      ).toString()
    );
    expect(
      getDataFromMetadata(swordObj.attributes, "Sharp Damage")
    ).to.be.equal(
      (
        (basicSword.weaponStats.offensiveStats.sharpDamage as number) +
        (lvlUpStats.offensiveStats.sharpDamage as number)
      ).toString()
    );
    expect(
      getDataFromMetadata(swordObj.attributes, "Blunt Damage")
    ).to.be.equal(
      (
        (basicSword.weaponStats.offensiveStats.bluntDamage as number) +
        (lvlUpStats.offensiveStats.bluntDamage as number)
      ).toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Burn Damage")).to.be.equal(
      (
        (basicSword.weaponStats.offensiveStats.burnDamage as number) +
        (lvlUpStats.offensiveStats.burnDamage as number)
      ).toString()
    );
    expect(
      getDataFromMetadata(swordObj.attributes, "Sharp Resistance")
    ).to.be.equal(
      (
        (basicSword.weaponStats.defensiveStats.sharpResistance as number) +
        (lvlUpStats.defensiveStats.sharpResistance as number)
      ).toString()
    );
    expect(
      getDataFromMetadata(swordObj.attributes, "Blunt Resistance")
    ).to.be.equal(
      (
        (basicSword.weaponStats.defensiveStats.bluntResistance as number) +
        (lvlUpStats.defensiveStats.bluntResistance as number)
      ).toString()
    );
    expect(
      getDataFromMetadata(swordObj.attributes, "Burn Resistance")
    ).to.be.equal(
      (
        (basicSword.weaponStats.defensiveStats.burnResistance as number) +
        (lvlUpStats.defensiveStats.burnResistance as number)
      ).toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Guard")).to.be.equal(
      (
        (basicSword.weaponStats.defensiveStats.guard as number) +
        (lvlUpStats.defensiveStats.guard as number)
      ).toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Pierce")).to.be.equal(
      (
        (basicSword.weaponStats.offensiveStats.pierce as number) +
        (lvlUpStats.offensiveStats.pierce as number)
      ).toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Lethality")).to.be.equal(
      (
        (basicSword.weaponStats.offensiveStats.lethality as number) +
        (lvlUpStats.offensiveStats.lethality as number)
      ).toString()
    );
    expect(getDataFromMetadata(swordObj.attributes, "Handling")).to.be.equal(
      (
        (basicSword.weaponStats.handling as number) +
        (lvlUpStats.handling as number)
      ).toString()
    );
    let abilities: string[] = getDataFromMetadata(
      swordObj.attributes,
      "Abilities"
    ) as string[];
    let abilitiesToCompare: string[] =
      basicSword.abilities.concat(newAbilities);
    for (let i = 0; i < abilitiesToCompare.length; i++)
      expect(abilities[i]).to.be.equal(abilitiesToCompare[i]);
  });

  it("Should revert if gain level up on non-existing weapon", async function () {
    const {
      gearFight,
      lvlUpStats,
      newAbilities,
    }: {
      gearFight: GearFight;
      lvlUpStats: GearFactory.WeaponStatsStruct;
      newAbilities: string[];
    } = await loadFixture(deployFixture);

    await expect(gearFight.levelUp(0, 2, lvlUpStats, newAbilities, 1)).to.be
      .reverted;
  });
});
