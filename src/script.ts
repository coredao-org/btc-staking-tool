import * as bitcoin from "bitcoinjs-lib";
import { RedeemScriptType } from "./constant";
import { convertToHex } from "./utils";
import { PsbtInput } from "bip174/src/lib/interfaces";
import { witnessStackToScriptWitness } from "bitcoinjs-lib/src/psbt/psbtutils";

const network = bitcoin.networks.testnet;
type PublicKey = string | Buffer;
const OPS = bitcoin.script.OPS;

export const Script = {
  //<pubKey> OP_CHECKSIG
  P2PK: ({ pubkey }: { pubkey: PublicKey }) => {
    const { output } = bitcoin.payments.p2pk({
      pubkey: Buffer.from(pubkey.toString("hex"), "hex"),
      network,
    });
    if (!output) {
      throw new Error("failed to build P2PK script");
    }
    return output;
  },
  //OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
  P2PKH: ({ pubkey }: { pubkey: PublicKey }) => {
    const { output } = bitcoin.payments.p2pkh({
      pubkey: Buffer.from(pubkey.toString("hex"), "hex"),
      network,
    });

    if (!output) {
      throw new Error("failed to build P2PKH script");
    }
    return output;
  },
  //OP_HASH160 <scriptHash> OP_EQUAL
  P2SH: ({ hash }: { hash: Buffer | string }) => {
    const { output } = bitcoin.payments.p2sh({
      hash: Buffer.from(hash.toString("hex"), "hex"),
      network,
    });
    if (!output) {
      throw new Error("failed to build P2SH script");
    }
    return output;
  },
  //OP_<M> <pubKey>...<pubKey> OP_<N> OP_CHECKMULTISIG
  P2MS: ({
    pubkeys,
    m = 1,
    n,
  }: {
    pubkeys: PublicKey[];
    m?: number;
    n: number;
  }) => {
    const buffers: Buffer[] = [];
    pubkeys.map((pubkey: PublicKey) =>
      buffers.push(Buffer.from(pubkey.toString("hex"), "hex"))
    );
    const { output } = bitcoin.payments.p2ms({
      pubkeys: buffers,
      m,
      n,
    });
    if (!output) {
      throw new Error("failed to build P2MS script");
    }
    return output;
  },
  P2WPHK: () => {},

  EMBED: (hex: string) => {
    if (!(hex.length > 0)) throw new Error("invalid data in hex");
    const embed = bitcoin.payments.embed({
      data: [Buffer.from(hex, "hex")],
      network: network,
    });
    return embed.output!;
  },
};

export type CLTVScriptOptions = {
  lockTime: number;
  pubkeys?: PublicKey[];
  pubkey?: PublicKey;
  m?: number;
  n?: number;
  witness?: boolean;
  network?: bitcoin.Network;
};

export const buildCLTVScript = ({
  lockTime,
  buffer,
}: {
  lockTime: number;
  buffer: Buffer;
}) => {
  return Buffer.concat([
    bitcoin.script.compile([
      bitcoin.script.number.encode(lockTime),
      OPS.OP_CHECKLOCKTIMEVERIFY,
      OPS.OP_DROP,
    ]),
    buffer,
  ]);
};

export function parseCLTVScript({
  cltvScript,
  witness,
}: {
  cltvScript: string | Buffer;
  witness: boolean;
}): {
  options: CLTVScriptOptions;
  type: RedeemScriptType;
} {
  const unlockScript = Buffer.from(cltvScript.toString("hex"), "hex");
  const OPS = bitcoin.script.OPS;
  const options: CLTVScriptOptions = {
    lockTime: 0,
    witness,
  };
  let redeemScriptType = RedeemScriptType.PUBLIC_KEY_SCRIPT;

  try {
    const decompiled = bitcoin.script.decompile(unlockScript);
    if (
      decompiled &&
      decompiled.length > 4 &&
      decompiled[1] === OPS.OP_CHECKLOCKTIMEVERIFY &&
      decompiled[2] === OPS.OP_DROP
    ) {
      options.lockTime = bitcoin.script.number.decode(decompiled[0] as Buffer);
      if (
        decompiled[decompiled.length - 1] === OPS.OP_CHECKMULTISIG &&
        decompiled.length > 5
      ) {
        const n = +decompiled[decompiled.length - 6] - OPS.OP_RESERVED;
        const m = +decompiled[3] - OPS.OP_RESERVED;
        const publicKeys: any[] = decompiled.slice(4, 4 + n);
        let isValidatePublicKey = true;
        publicKeys.forEach((key: any) => {
          if (key.length !== 33) {
            isValidatePublicKey = false;
          }
        });
        if (m < n && isValidatePublicKey) {
          redeemScriptType = RedeemScriptType.MULTI_SIG_SCRIPT;
          options.n = n;
          options.m = m;
          options.pubkeys = publicKeys;
        }
      } else if (decompiled[decompiled.length - 1] === OPS.OP_CHECKSIG) {
        if (decompiled.length === 5) {
          redeemScriptType = RedeemScriptType.PUBLIC_KEY_SCRIPT;
          options.pubkey = decompiled[3] as any;
        } else if (
          decompiled.length === 8 &&
          decompiled[3] === OPS.OP_DUP &&
          decompiled[4] === OPS.OP_HASH160 &&
          decompiled[6] === OPS.OP_EQUALVERIFY
        ) {
          redeemScriptType = RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT;
        }
      }
    }
    return {
      options,
      type: redeemScriptType,
    };
  } catch (error: any) {
    throw new Error(`Check MultisigScript: ${error}`);
  }
}

export const CLTVScript = {
  //LockTime OP_CHECKLOCKTIMEVERIFY OP_DROP <pubKey> OP_CHECKSIG
  P2PK: (options: CLTVScriptOptions) => {
    const { lockTime, pubkey } = options;
    if (!pubkey || !pubkey.length) {
      throw new Error("publickey should not be empty");
    }

    return buildCLTVScript({
      lockTime,
      buffer: Script.P2PK({ pubkey }),
    });
  },
  //LockTime OP_CHECKLOCKTIMEVERIFY OP_DROP OP_DUP OP_HASH160 hash160(<pubKey>) OP_EQUALVERIFY OP_CHECKSIG
  P2PKH: (options: CLTVScriptOptions) => {
    const { pubkey, lockTime } = options;
    if (!pubkey || !pubkey.length) {
      throw new Error("publickey should not be empty");
    }
    return buildCLTVScript({
      lockTime,
      buffer: Script.P2PKH({ pubkey: pubkey }),
    });
  },

  //LockTime OP_CHECKLOCKTIMEVERIFY OP_DROP OP_<M> <pubKey>...<pubKey> OP_<N> OP_CHECKMULTISIG
  P2MS: (options: CLTVScriptOptions) => {
    const { pubkeys, n, m, lockTime } = options;
    if (!pubkeys || pubkeys.length !== n) {
      throw new Error("publickey should not be empty");
    }

    return buildCLTVScript({
      lockTime,
      buffer: Script.P2MS({ pubkeys, m, n }),
    });
  },
};

export interface OPReturnScriptOption {
  chainId: number | string;
  validatorAddress: string;
  rewardAddress: string;
  redeemScript: string | Buffer;
  coreFee: number;
  isMultisig: boolean;
  lockTime: number;
  redeemScriptType: RedeemScriptType;
}

export const buildOPReturnScript = ({
  chainId,
  validatorAddress,
  rewardAddress, // 20 bytes
  redeemScript,
  coreFee,
  isMultisig,
  lockTime,
  redeemScriptType,
}: OPReturnScriptOption) => {
  const flagHex = convertToHex("SAT+").padStart(8, "0");
  const versionHex = Number(1).toString(16).padStart(2, "0");
  const chainIdHex = Number(chainId).toString(16).padStart(4, "0");
  const rewardAddressHex = rewardAddress
    .replace("0x", "")
    .toLowerCase()
    .padStart(40, "0");
  const validatorAddressHex = validatorAddress
    .replace("0x", "")
    .toLowerCase()
    .padStart(40, "0");
  const coreFeeHex = Number(coreFee).toString(16).padStart(2, "0");
  const lockTimeHex = bitcoin.script.number
    .encode(lockTime)
    .toString("hex")
    .padStart(8, "0");

  const hex = `${flagHex}${versionHex}${chainIdHex}${rewardAddressHex}${validatorAddressHex}${coreFeeHex}${
    redeemScriptType === RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT && !isMultisig
      ? redeemScript.toString("hex")
      : lockTimeHex
  }`;
  return Script.EMBED(hex);
};

export const finalCLTVScripts = (
  inputIndex: number,
  input: PsbtInput,
  script: Buffer,
  isSegwit: boolean,
  isP2SH: boolean,
  isP2WSH: boolean
) => {
  try {
    const { options, type } = parseCLTVScript({
      cltvScript: script,
      witness: isSegwit || isP2WSH,
    });
    const isMultisig =
      type === RedeemScriptType.MULTI_SIG_HASH_SCRIPT ||
      type === RedeemScriptType.MULTI_SIG_SCRIPT;
    const { m } = options;

    const sigNumber = input.partialSig?.length ?? 0;

    if (!input.partialSig || !input.partialSig.length) {
      throw new Error(`Tx was not fully signed`);
    }

    if ((isMultisig && sigNumber !== m!) || sigNumber < 1) {
      throw new Error(`Tx using multi-sig should have at least ${m} signed`);
    }

    const sigScript: (Buffer | number)[] = [];

    switch (type) {
      case RedeemScriptType.MULTI_SIG_SCRIPT: {
        sigScript.push(OPS.OP_0);
        for (let i = 0; i < sigNumber; i += 1) {
          sigScript.push(input.partialSig[i].signature);
        }
        break;
      }
      case RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT: {
        sigScript.push(input.partialSig[0].signature);
        sigScript.push(input.partialSig[0].pubkey);
        break;
      }
      case RedeemScriptType.PUBLIC_KEY_SCRIPT: {
        sigScript.push(input.partialSig[0].signature);
        break;
      }
      default:
        throw new Error("Failed to create script");
    }

    const paymentParams = {
      redeem: {
        input: bitcoin.script.compile(sigScript),
        output: script,
        network,
      },
      network,
    };
    const payment = isP2WSH
      ? bitcoin.payments.p2wsh(paymentParams)
      : bitcoin.payments.p2sh(paymentParams);

    return {
      finalScriptSig: payment.input,
      finalScriptWitness:
        payment.witness && payment.witness.length > 0
          ? witnessStackToScriptWitness(payment.witness)
          : undefined,
    };
  } catch (error: any) {
    throw new Error(error);
  }
};
