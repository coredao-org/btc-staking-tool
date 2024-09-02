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
  redeemScript,
  m,
}: Omit<StakeParams, "chainId" | "type" | "privateKey" | "publicKey"> & {
  privateKey: string;
  publicKey?: string;
}) => {
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

  if (!validatorAddress) {
    throw new Error("validatorAddress should not be empty");
  }

  if (!rewardAddress) {
    throw new Error("rewardAddress should not be empty");
  }
  const publicKeys = publicKey?.split(",").map((item: string) => item.trim());
  const privateKeys = privateKey.split(",").map((item: string) => item.trim());
  const isLockToMultiSig = publicKeys && publicKeys?.length >= 2 && !!m;

  const { txId, scriptAddress, script } = await buildStakeTransaction({
    witness,
    lockTime: Number(lockTime),
    account,
    amount,
    validatorAddress,
    rewardAddress,
    publicKey: publicKeys,
    privateKey: privateKeys,
    bitcoinNetwork,
    coreNetwork,
    bitcoinRpc,
    fee,
    redeemScript,
    type: isLockToMultiSig
      ? RedeemScriptType.MULTI_SIG_HASH_SCRIPT
      : RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT,
  });
  console.log(`txId: ${txId}`);
  console.log(`address: ${scriptAddress}`);
  console.log(`redeemScript: ${script}`);
};
