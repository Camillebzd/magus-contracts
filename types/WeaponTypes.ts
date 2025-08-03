/**
 * TypeScript representation of the WeaponType enum from WeaponTypes.sol
 * This mirrors the Solidity enum: enum WeaponType { SWORD, AXE, BOW, STAFF, DAGGER, HAMMER, SPEAR, WAND }
 */
export enum WeaponType {
  SWORD = 0,
//   AXE = 1,
//   BOW = 2,
//   STAFF = 3,
//   DAGGER = 4,
//   HAMMER = 5,
//   SPEAR = 6,
//   WAND = 7
}

/**
 * Helper function to get all weapon type values as an array
 */
export function getAllWeaponTypes(): WeaponType[] {
  return Object.values(WeaponType).filter(value => typeof value === 'number') as WeaponType[];
}

/**
 * Helper function to get weapon type name from value
 */
export function getWeaponTypeName(weaponType: WeaponType): string {
  return WeaponType[weaponType];
}

/**
 * Type guard to check if a number is a valid weapon type
 */
export function isValidWeaponType(value: number): value is WeaponType {
  return value >= 0 && value <= 7 && Number.isInteger(value);
}

export type Attribute = {
  trait_type: string;
  value: string | string[];
};

export type NFTMetadata = {
  name: string;
  description: string;
  image: string;
  attributes: Attribute[];
};