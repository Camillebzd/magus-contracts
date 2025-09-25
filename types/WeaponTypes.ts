/**
 * Weapon type keys. It is a list of string constants representing different weapon types.
 */
export type WeaponType = "sword";

/**
 * Helper function to get all weapon type values as an array
 */
export function getAllWeaponTypes(): WeaponType[] {
  return [
    "sword"
  ];
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