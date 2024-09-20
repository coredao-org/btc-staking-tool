import { buildClaimTransaction, ClaimParams } from "./transaction";

export const claim = async ({
  privateKey,
  coreNetwork = "mainnet",
}: ClaimParams) => {
  if (!privateKey) {
    throw new Error("privateKey should not be empty");
  }

  const { txId } = await buildClaimTransaction({
    privateKey,
    coreNetwork,
  });
  console.log(`txId: ${txId}`);
};
