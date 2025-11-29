import { type WalletClient, type PublicClient } from "viem";

// Helper function to sign XP messages for weapons
export const signWeaponXP = async (
  server: WalletClient,
  weapon: any, // Weapon contract instance
  publicClient: PublicClient,
  tokenId: bigint,
  amount: bigint
) => {
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