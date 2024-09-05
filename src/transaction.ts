import { RedeemScriptType } from "./constant";
import * as bitcoin from "bitcoinjs-lib";
import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
import Bignumber from "bignumber.js";
import {
  buildOPReturnScript,
  CLTVScript,
  parseCLTVScript,
  finalCLTVScripts,
} from "./script";
import { Provider } from "./provider";
import coinSelect from "coinselect-segwit";
import split from "coinselect-segwit/split";
import * as ecc from "tiny-secp256k1";
import ECPairFactory from "ecpair";
import { CoreChainNetworks, FeeSpeedType } from "./constant";
import { getAddressType } from "./address";
import { redeem } from "./redeem";
import { isMultisigScript } from "./utils";
// Initialize the elliptic curve library
const ECPair = ECPairFactory(ecc);

// Verify validator's signature
const validatorSignature = (
  pubkey: Buffer,
  msghash: Buffer,
  signature: Buffer
): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature);

/**
 * Interface for fee parameters
 */
export interface FeeParams {
  fee?: FeeSpeedType | string; // Fee rate for the transaction
}

/**
 * Interface for network parameters
 */
export interface NetworkParams {
  bitcoinNetwork: string; // Bitcoin network type
  coreNetwork: string; // Core Chain network type
  bitcoinRpc: string; // Bitcoin RPC endpoint
}

/**
 * Interface for stake parameters
 */
export type StakeParams = {
  amount: string; // Amount to stake
  lockTime: number; // Lock time for the transaction
  validatorAddress: string; // Validator's address
  rewardAddress: string; // Reward address
  type: RedeemScriptType; // Redeem script type
  privateKey: string[]; // Private key
  publicKey?: string[]; // Public key fro lock script
  witness?: boolean; // Whether to use witness
  account: string; // Account address
  redeemScript?: Buffer | string; // Redeem script
  m?: number; //The minimum number of signatures required to authorize a transaction from the set of n public keys.
} & NetworkParams &
  FeeParams;

/**
 * Builds a stake transaction
 * @param {StakeParams} params - Stake parameters
 * @returns {Promise<{ txId: string; scriptAddress: string; cltvScript: string; }>} - Transaction ID, script address, and CLTV script
 */
export const buildStakeTransaction = async ({
  witness,
  lockTime,
  account,
  amount,
  validatorAddress,
  rewardAddress,
  publicKey,
  privateKey,
  bitcoinNetwork,
  coreNetwork,
  bitcoinRpc,
  fee,
  redeemScript,
  m,
  type,
}: StakeParams): Promise<{
  txId: string;
  scriptAddress: string;
  script: string;
}> => {
  const chainId = CoreChainNetworks[coreNetwork].chainId;
  const network =
    bitcoinNetwork == "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;
  let isRestaking = false;
  let preStakeOptions;
  let preStakeType;
  const provider = new Provider({
    network,
    bitcoinRpc,
  });

  const bytesFee = await provider.getFeeRate(fee);

  const keyPairs = privateKey.map((priv) =>
    ECPair.fromPrivateKey(Buffer.from(priv, "hex"))
  );

  if (!publicKey || !publicKey.length) {
    publicKey = keyPairs.map((keyPair) => keyPair.publicKey.toString("hex"));
  }

  const keyPair = keyPairs[0];

  let payment;

  let addressType = getAddressType(account, network, redeemScript);

  if (addressType === "p2pkh") {
    payment = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network,
    });
  } else if (addressType === "p2wpkh") {
    payment = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network,
    });
  } else if (addressType === "p2sh-p2wpkh") {
    payment = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network,
      }),
      network,
    });
  } else if (addressType === "p2tr") {
    bitcoin.initEccLib(ecc);
    payment = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(keyPair.publicKey),
      ...(redeemScript
        ? {
            scriptTree: {
              output: Buffer.from(redeemScript.toString("hex"), "hex"),
            },
          }
        : {}),
      network,
    });
  } else if (redeemScript) {
    //p2sh/p2wsh
    const redeemScriptBuf = Buffer.from(redeemScript.toString("hex"), "hex");
    if (addressType === "p2sh") {
      payment = bitcoin.payments.p2sh({
        redeem: {
          output: redeemScriptBuf,
          network,
        },
        network,
      });
    } else if (addressType === "p2wsh") {
      payment = bitcoin.payments.p2wsh({
        redeem: {
          output: redeemScriptBuf,
          network,
        },
      });
    }
  }

  if (!payment) {
    throw new Error("payment is undefined");
  }

  if (payment?.address !== account) {
    throw new Error("payment does not match the account.");
  }

  if (!payment.output) {
    throw new Error("failed to create redeem script");
  }

  const isCommonMultiSig =
    redeemScript &&
    isMultisigScript(Buffer.from(redeemScript.toString("hex"), "hex"));

  //Re-staking
  if (
    !!redeemScript &&
    (addressType === "p2wsh" || addressType === "p2sh") &&
    !isCommonMultiSig
  ) {
    try {
      const { options, type } = parseCLTVScript({
        cltvScript: redeemScript,
        witness: addressType === "p2wsh",
      });
      if (
        options.lockTime > 0 &&
        type >= RedeemScriptType.PUBLIC_KEY_SCRIPT &&
        type <= RedeemScriptType.MULTI_SIG_SCRIPT
      ) {
        isRestaking = true;
        preStakeOptions = options;
        preStakeType = type;
      }
    } catch (e) {
      console.log(e);
    }
  }

  const res = await provider.getUTXOs(account!);

  const rawTxMap: Record<string, string> = {};

  if (addressType === "p2pkh" || addressType === "p2sh") {
    for (let i = 0; i < res.length; i++) {
      const utxo = res[i];
      if (!rawTxMap[utxo.txid]) {
        const hex = await provider.getRawTransaction(utxo.txid);
        rawTxMap[utxo.txid] = hex;
      }
    }
  }

  const utxos = res.map((utxo) => ({
    ...utxo,
    ...((addressType.includes("p2pkh") || addressType === "p2sh") && {
      nonWitnessUtxo: Buffer.from(rawTxMap[utxo.txid], "hex"),
    }),
    ...((addressType.includes("p2wpkh") ||
      addressType.includes("p2tr") ||
      addressType.includes("p2wsh")) && {
      witnessUtxo: {
        script: addressType.includes("p2sh")
          ? payment!.redeem!.output!
          : payment!.output!,
        value: utxo.value,
      },
    }),
    ...(addressType.includes("p2sh") && {
      redeemScript: payment!.redeem!.output,
    }),
    ...(addressType.includes("p2wsh") && {
      witnessScript: payment!.redeem!.output,
    }),
    ...(addressType.includes("p2tr") && {
      isTaproot: true,
    }),
    sequence: 0xffffffff - 1,
  }));

  //time lock script
  let script;

  //P2PKH
  if (type === RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT) {
    script = CLTVScript.P2PKH({
      lockTime,
      pubkey: publicKey[0],
    });
  }
  if (
    type === RedeemScriptType.MULTI_SIG_SCRIPT &&
    !!m &&
    publicKey.length >= 2
  ) {
    //P2MS
    const n = publicKey.length;
    if (m > n) {
      throw new Error("Invalid m");
    }
    script = CLTVScript.P2MS({
      m: Number(m),
      pubkeys: publicKey,
      lockTime,
      n: publicKey.length,
    });
  } else {
    //P2PK
    script = CLTVScript.P2PK({
      lockTime,
      pubkey: publicKey[0],
    });
  }

  const lockScript = (witness ? bitcoin.payments.p2wsh : bitcoin.payments.p2sh)(
    {
      redeem: {
        output: script,
      },
      network,
    }
  ).output;

  // Address for lock script
  const scriptAddress: string = bitcoin.address.fromOutputScript(
    lockScript!,
    network
  );

  const targets = [
    //time lock output
    {
      ...(amount && {
        value: new Bignumber(amount).toNumber(),
      }),
      script: lockScript,
    },
    //OP_RETURN
    {
      script: buildOPReturnScript({
        chainId,
        validatorAddress,
        rewardAddress, // 20 bytes
        redeemScript: script.toString("hex"),
        coreFee: 0,
        isMultisig: type === RedeemScriptType.MULTI_SIG_SCRIPT,
        lockTime,
        redeemScriptType: type,
      }),
      value: 0,
    },
  ];

  let { inputs, outputs } = amount
    ? coinSelect(utxos, targets, bytesFee, account)
    : split(utxos, targets, bytesFee);

  if (!inputs) {
    throw new Error("insufficient balance");
  }
  if (!outputs) {
    throw new Error("failed to caculate transaction fee");
  }

  let signatureSize = 0;
  if (isRestaking && preStakeOptions && preStakeType) {
    inputs!.forEach(() => {
      if (
        preStakeType === RedeemScriptType.MULTI_SIG_SCRIPT &&
        preStakeOptions.m &&
        preStakeOptions.m >= 1
      ) {
        signatureSize += (72 * preStakeOptions.m) / (witness ? 4 : 1);
      } else if (preStakeType === RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT) {
        signatureSize += (72 + 66) / (witness ? 4 : 1);
      } else if (preStakeType === RedeemScriptType.PUBLIC_KEY_SCRIPT) {
        signatureSize += 72 / (witness ? 4 : 1);
      }
    });
  } else if (isCommonMultiSig) {
    inputs!.forEach(() => {
      signatureSize += (72 * privateKey.length) / (witness ? 4 : 1);
    });
  }

  const signatureSizeFee = new Bignumber(signatureSize)
    .multipliedBy(new Bignumber(bytesFee))
    .toNumber();

  outputs[0].value = Math.floor(outputs[0].value! - signatureSizeFee);

  const psbt = new bitcoin.Psbt({
    network,
  });

  isRestaking && preStakeOptions && psbt.setLocktime(preStakeOptions?.lockTime);

  inputs?.forEach((input) =>
    psbt.addInput({
      hash:
        typeof input.txid === "string" ? input.txid : Buffer.from(input.txid),
      index: input.vout,
      ...(input.nonWitnessUtxo
        ? {
            nonWitnessUtxo: Buffer.from(input.nonWitnessUtxo),
          }
        : {}),
      ...(input.witnessUtxo
        ? {
            witnessUtxo: {
              script: Buffer.from(input.witnessUtxo.script),
              value: input.witnessUtxo.value,
            },
          }
        : {}),
      ...(input.redeemScript
        ? { redeemScript: Buffer.from(input.redeemScript) }
        : {}),
      ...(input.witnessScript
        ? { witnessScript: Buffer.from(input.witnessScript) }
        : {}),
      ...(input.isTaproot
        ? {
            tapInternalKey: payment!.internalPubkey,
            ...(redeemScript ? { tapMerkleRoot: payment.hash } : {}),
          }
        : {}),
      sequence: 0xffffffff - 1,
    })
  );
  const changeAddress = account;
  outputs?.forEach((output) => {
    if (!output.address && !output.script) {
      output.address = changeAddress;
    }
    psbt.addOutput({
      ...(output.script
        ? { script: Buffer.from(output.script) }
        : { address: output.address! }),
      value: output.value ?? 0,
    });
  });

  keyPairs.forEach((keyPair) => {
    if (addressType.includes("p2tr")) {
      const signer = keyPair.tweak(
        bitcoin.crypto.taggedHash("TapTweak", toXOnly(keyPair.publicKey))
      );
      psbt.signAllInputs(signer);
    } else {
      psbt.signAllInputs(keyPair);
    }
  });

  if (
    !addressType.includes("p2tr") &&
    !psbt.validateSignaturesOfAllInputs(validatorSignature)
  ) {
    throw new Error("signature is invalid");
  }

  if (isRestaking) {
    psbt.txInputs.forEach((input, idx) => {
      psbt.finalizeInput(idx, finalCLTVScripts);
    });
  } else {
    psbt.finalizeAllInputs();
  }

  const txId = await provider.broadcast(psbt.extractTransaction().toHex());

  return {
    txId,
    scriptAddress,
    script: script.toString("hex"),
  };
};

/**
 * Interface for redeem parameters
 */
export type RedeemParams = {
  account: string; // Source address
  redeemScript: Buffer | string; // Redeem script
  privateKey: string[]; // Private key
  destAddress: string; // Destination address
  bitcoinRpc: string; // Bitcoin RPC endpoint
} & FeeParams;

/**
 * Builds a redeem transaction
 * @param {RedeemParams} params - Redeem parameters
 * @returns {Promise<{ txId: string }>} - Transaction ID
 */
export const buildRedeemTransaction = async ({
  account,
  redeemScript,
  privateKey,
  destAddress,
  bitcoinRpc,
  fee,
}: RedeemParams) => {
  let network;
  let witness = false;

  if (account.length === 34 || account.length === 35) {
    const addr = bitcoin.address.fromBase58Check(account);
    network =
      addr.version === bitcoin.networks.bitcoin.pubKeyHash ||
      addr.version === bitcoin.networks.bitcoin.scriptHash
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
  } else {
    const addr = bitcoin.address.fromBech32(account);
    network =
      addr.prefix === bitcoin.networks.bitcoin.bech32
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    witness = true;
  }

  const { options, type } = parseCLTVScript({
    witness,
    cltvScript: redeemScript,
  });

  const provider = new Provider({
    network,
    bitcoinRpc,
  });

  const bytesFee = await provider.getFeeRate(fee);

  const keyPairs = privateKey.map((priv) =>
    ECPair.fromPrivateKey(Buffer.from(priv, "hex"))
  );

  //check private key with lock script
  const res = await provider.getUTXOs(account);

  const redeemScriptBuf = Buffer.from(redeemScript.toString("hex"), "hex");

  const script = (witness ? bitcoin.payments.p2wsh : bitcoin.payments.p2sh)({
    redeem: {
      output: redeemScriptBuf,
      network,
    },
    network,
  }).output;

  const rawTxMap: Record<string, string> = {};

  if (!witness) {
    for (let i = 0; i < res.length; i++) {
      const utxo = res[i];
      if (!rawTxMap[utxo.txid]) {
        const hex = await provider.getRawTransaction(utxo.txid);
        rawTxMap[utxo.txid] = hex;
      }
    }
  }

  const utxos = res.map((utxo) => ({
    ...utxo,
    ...(!witness && {
      nonWitnessUtxo: Buffer.from(rawTxMap[utxo.txid], "hex"),
    }),
    ...(witness && {
      witnessUtxo: {
        script: script!,
        value: utxo.value,
      },
    }),
    ...(!witness
      ? {
          redeemScript: redeemScriptBuf,
        }
      : {
          witnessScript: redeemScriptBuf,
        }),
  }));

  let { inputs, outputs } = split(
    utxos,
    [
      {
        address: destAddress,
      },
    ],
    bytesFee
  );

  if (!inputs) {
    throw new Error("insufficient balance");
  }

  if (!outputs) {
    throw new Error("failed to caculate transaction fee");
  }

  //Update transaction fee by re-caculating signatures
  let signatureSize = 0;
  inputs!.forEach(() => {
    if (
      type === RedeemScriptType.MULTI_SIG_SCRIPT &&
      options.m &&
      options.m >= 1
    ) {
      signatureSize += (72 * options.m) / (witness ? 4 : 1);
    } else if (type === RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT) {
      signatureSize += (72 + 66) / (witness ? 4 : 1);
    } else if (type === RedeemScriptType.PUBLIC_KEY_SCRIPT) {
      signatureSize += 72 / (witness ? 4 : 1);
    }
  });
  const signatureSizeFee = new Bignumber(signatureSize)
    .multipliedBy(new Bignumber(bytesFee))
    .toNumber();

  outputs[0].value = Math.floor(outputs[0].value! - signatureSizeFee);

  const psbt = new bitcoin.Psbt({
    network,
  });

  psbt.setLocktime(options.lockTime);

  inputs?.forEach((input) =>
    psbt.addInput({
      hash:
        typeof input.txid === "string" ? input.txid : Buffer.from(input.txid),
      index: input.vout,
      ...(input.nonWitnessUtxo
        ? {
            nonWitnessUtxo: Buffer.from(input.nonWitnessUtxo),
          }
        : {}),
      ...(input.witnessUtxo
        ? {
            witnessUtxo: {
              script: Buffer.from(input.witnessUtxo.script),
              value: input.witnessUtxo.value,
            },
          }
        : {}),
      ...(input.redeemScript
        ? { redeemScript: Buffer.from(input.redeemScript) }
        : {}),
      ...(input.witnessScript
        ? { witnessScript: Buffer.from(input.witnessScript) }
        : {}),
      sequence: 0xffffffff - 1,
    })
  );

  outputs?.forEach((output) => {
    psbt.addOutput({
      ...(output.script
        ? { script: Buffer.from(output.script) }
        : { address: output.address! }),
      value: output.value ?? 0,
    });
  });

  keyPairs.forEach((keyPair) => {
    psbt.signAllInputs(keyPair);
  });

  if (!psbt.validateSignaturesOfAllInputs(validatorSignature)) {
    throw new Error("signature is invalid");
  }

  psbt.txInputs.forEach((input, idx) => {
    psbt.finalizeInput(idx, finalCLTVScripts);
  });

  const txId = await provider.broadcast(psbt.extractTransaction().toHex());

  return {
    txId,
  };
};
