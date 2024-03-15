import { RedeemScriptType, LOCKTIME_THRESHOLD } from "./constant";
import { buildStakeTransaction, StakeParams } from "./transaction";
import Bignumber from "bignumber.js";

export const stake = async ({
  witness = false,
  lockTime,
  account,
  amount,
  validatorAddress,
  rewardAddress,
  privateKey,
  publicKey,
  coreNetwork = "mainnet",
  bitcoinNetwork = "mainnet",
  bitcoinRpc = "mempool",
  fee = "avg",
}: Omit<StakeParams, "chainId" | "type">) => {
  if (!lockTime) {
    throw new Error("LockTime should not be empty");
  }

  if (new Bignumber(lockTime).lte(new Bignumber(LOCKTIME_THRESHOLD))) {
    throw new Error("lockTime should be greater than 5*1e8");
  }

  if (!account) {
    throw new Error("Account should not be empty");
  }

  if (!privateKey) {
    throw new Error("privateKey should not be empty");
  }

  if (!amount) {
    throw new Error("Amount should not be empty");
  }

  if (!validatorAddress) {
    throw new Error("validatorAddress should not be empty");
  }

  if (!rewardAddress) {
    throw new Error("rewardAddress should not be empty");
  }

  const { txId, scriptAddress, redeemScript } = await buildStakeTransaction({
    witness,
    lockTime: Number(lockTime),
    account,
    amount,
    validatorAddress,
    rewardAddress,
    type: RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT,
    publicKey,
    privateKey,
    bitcoinNetwork,
    coreNetwork,
    bitcoinRpc,
    fee,
  });
  console.log(`txId: ${txId}`);
  console.log(`address: ${scriptAddress}`);
  console.log(`redeemScript: ${redeemScript}`);
};
