import { buildRedeemTransaction, RedeemParams } from "./transaction";

export const redeem = async ({
  account,
  redeemScript,
  privateKey,
  destAddress,
  bitcoinRpc = "mempool",
  fee = "avg",
}: RedeemParams) => {
  if (!account) {
    throw new Error("account should not be empty");
  }

  if (!redeemScript) {
    throw new Error("redeemScript should not be empty");
  }

  if (!privateKey) {
    throw new Error("privateKey should not be empty");
  }

  if (!destAddress) {
    throw new Error("destAddress should not be empty");
  }

  const { txId } = await buildRedeemTransaction({
    account,
    redeemScript,
    privateKey,
    destAddress,
    bitcoinRpc,
    fee,
  });
  console.log(`txId: ${txId}`);
};
