import { ethers, run, network } from "hardhat";
import { GearFight, GearFactory, GearFight__factory } from "../typechain-types";

// Request a weapon from the GearFight contract
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const gearFightAddress = "0xCe17DF2fE8F7d599c8c67C2Fb785B957Ea428950"; // Replace with actual contract address
  const gearFight = GearFight__factory.connect(gearFightAddress, deployer);

  // Create a weapon structure to request
  const weaponToRequest: GearFactory.WeaponStruct = {
    name: "Starter Sword",
    description: "A basic sword for beginners",
    image: "https://gateway.pinata.cloud/ipfs/QmZCvC7CymLx5AZoHCNfH1HBAUULe9bZdWxEGZjT5riY95",
    level: 1,
    stage: 1,
    weaponStats: {
      health: 120,
      speed: 17,
      mind: 10,
      offensiveStats: {
        sharpDamage: 20,
        bluntDamage: 11,
        burnDamage: 18,
        pierce: 7,
        lethality: 4
      },
      defensiveStats: {
        sharpResistance: 22,
        bluntResistance: 18,
        burnResistance: 18,
        guard: 20
      },
      handling: 12
    },
    xp: 0,
    identity: "sword-001",
    abilities: ["Slice", "Heavy slash", "Quick bash", "Dragon curse"]
  };

  // Request a weapon with the proper parameter
  const requestTx = await gearFight.requestWeapon(weaponToRequest);
  console.log("Requesting weapon... Transaction hash:", requestTx.hash);

  // Wait for the transaction to be mined
  await requestTx.wait();
  console.log("Weapon requested successfully!");
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
