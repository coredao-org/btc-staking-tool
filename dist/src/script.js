"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalCLTVScripts = exports.buildOPReturnScript = exports.CLTVScript = exports.parseCLTVScript = exports.buildCLTVScript = exports.Script = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const constant_1 = require("./constant");
const utils_1 = require("./utils");
const psbtutils_1 = require("bitcoinjs-lib/src/psbt/psbtutils");
const network = bitcoin.networks.testnet;
const OPS = bitcoin.script.OPS;
exports.Script = {
    //<pubKey> OP_CHECKSIG
    P2PK: ({ pubkey }) => {
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
    P2PKH: ({ pubkey }) => {
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
    P2SH: ({ hash }) => {
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
    P2MS: ({ pubkeys, m = 1, n, }) => {
        const buffers = [];
        pubkeys.map((pubkey) => buffers.push(Buffer.from(pubkey.toString("hex"), "hex")));
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
    P2WPHK: () => { },
    EMBED: (hex) => {
        if (!(hex.length > 0))
            throw new Error("invalid data in hex");
        const embed = bitcoin.payments.embed({
            data: [Buffer.from(hex, "hex")],
            network: network,
        });
        return embed.output;
    },
};
const buildCLTVScript = ({ lockTime, buffer, }) => {
    return Buffer.concat([
        bitcoin.script.compile([
            bitcoin.script.number.encode(lockTime),
            OPS.OP_CHECKLOCKTIMEVERIFY,
            OPS.OP_DROP,
        ]),
        buffer,
    ]);
};
exports.buildCLTVScript = buildCLTVScript;
function parseCLTVScript({ cltvScript, witness, }) {
    const unlockScript = Buffer.from(cltvScript.toString("hex"), "hex");
    const OPS = bitcoin.script.OPS;
    const options = {
        lockTime: 0,
        witness,
    };
    let redeemScriptType = constant_1.RedeemScriptType.PUBLIC_KEY_SCRIPT;
    try {
        const decompiled = bitcoin.script.decompile(unlockScript);
        if (decompiled &&
            decompiled.length > 4 &&
            decompiled[1] === OPS.OP_CHECKLOCKTIMEVERIFY &&
            decompiled[2] === OPS.OP_DROP) {
            options.lockTime = bitcoin.script.number.decode(decompiled[0]);
            if (decompiled[decompiled.length - 1] === OPS.OP_CHECKMULTISIG &&
                decompiled.length > 5) {
                const n = +decompiled[decompiled.length - 6] - OPS.OP_RESERVED;
                const m = +decompiled[3] - OPS.OP_RESERVED;
                const publicKeys = decompiled.slice(4, 4 + n);
                let isValidatePublicKey = true;
                publicKeys.forEach((key) => {
                    if (key.length !== 33) {
                        isValidatePublicKey = false;
                    }
                });
                if (m < n && isValidatePublicKey) {
                    redeemScriptType = constant_1.RedeemScriptType.MULTI_SIG_SCRIPT;
                    options.n = n;
                    options.m = m;
                    options.pubkeys = publicKeys;
                }
            }
            else if (decompiled[decompiled.length - 1] === OPS.OP_CHECKSIG) {
                if (decompiled.length === 5) {
                    redeemScriptType = constant_1.RedeemScriptType.PUBLIC_KEY_SCRIPT;
                    options.pubkey = decompiled[3];
                }
                else if (decompiled.length === 8 &&
                    decompiled[3] === OPS.OP_DUP &&
                    decompiled[4] === OPS.OP_HASH160 &&
                    decompiled[6] === OPS.OP_EQUALVERIFY) {
                    redeemScriptType = constant_1.RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT;
                }
            }
        }
        return {
            options,
            type: redeemScriptType,
        };
    }
    catch (error) {
        throw new Error(`Check MultisigScript: ${error}`);
    }
}
exports.parseCLTVScript = parseCLTVScript;
exports.CLTVScript = {
    //LockTime OP_CHECKLOCKTIMEVERIFY OP_DROP <pubKey> OP_CHECKSIG
    P2PK: (options) => {
        const { lockTime, pubkey } = options;
        if (!pubkey || !pubkey.length) {
            throw new Error("publickey should not be empty");
        }
        return (0, exports.buildCLTVScript)({
            lockTime,
            buffer: exports.Script.P2PK({ pubkey }),
        });
    },
    //LockTime OP_CHECKLOCKTIMEVERIFY OP_DROP OP_DUP OP_HASH160 hash160(<pubKey>) OP_EQUALVERIFY OP_CHECKSIG
    P2PKH: (options) => {
        const { pubkey, lockTime } = options;
        if (!pubkey || !pubkey.length) {
            throw new Error("publickey should not be empty");
        }
        return (0, exports.buildCLTVScript)({
            lockTime,
            buffer: exports.Script.P2PKH({ pubkey: pubkey }),
        });
    },
    //LockTime OP_CHECKLOCKTIMEVERIFY OP_DROP OP_<M> <pubKey>...<pubKey> OP_<N> OP_CHECKMULTISIG
    P2MS: (options) => {
        const { pubkeys, n, m, lockTime } = options;
        if (!pubkeys || pubkeys.length !== n) {
            throw new Error("publickey should not be empty");
        }
        return (0, exports.buildCLTVScript)({
            lockTime,
            buffer: exports.Script.P2MS({ pubkeys, m, n }),
        });
    },
};
const buildOPReturnScript = ({ chainId, validatorAddress, rewardAddress, // 20 bytes
redeemScript, coreFee, isMultisig, lockTime, redeemScriptType, }) => {
    const flagHex = (0, utils_1.convertToHex)("SAT+").padStart(8, "0");
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
    const hex = `${flagHex}${versionHex}${chainIdHex}${rewardAddressHex}${validatorAddressHex}${coreFeeHex}${redeemScriptType === constant_1.RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT && !isMultisig
        ? redeemScript.toString("hex")
        : lockTimeHex}`;
    return exports.Script.EMBED(hex);
};
exports.buildOPReturnScript = buildOPReturnScript;
const finalCLTVScripts = (inputIndex, input, script, isSegwit, isP2SH, isP2WSH) => {
    var _a, _b;
    try {
        const { options, type } = parseCLTVScript({
            cltvScript: script,
            witness: isSegwit || isP2WSH,
        });
        const isMultisig = type === constant_1.RedeemScriptType.MULTI_SIG_HASH_SCRIPT ||
            type === constant_1.RedeemScriptType.MULTI_SIG_SCRIPT;
        const { m } = options;
        const sigNumber = (_b = (_a = input.partialSig) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
        if (!input.partialSig || !input.partialSig.length) {
            throw new Error(`Tx was not fully signed`);
        }
        if ((isMultisig && sigNumber !== m) || sigNumber < 1) {
            throw new Error(`Tx using multi-sig should have at least ${m} signed`);
        }
        const sigScript = [];
        switch (type) {
            case constant_1.RedeemScriptType.MULTI_SIG_SCRIPT: {
                sigScript.push(OPS.OP_0);
                for (let i = 0; i < sigNumber; i += 1) {
                    sigScript.push(input.partialSig[i].signature);
                }
                break;
            }
            case constant_1.RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT: {
                sigScript.push(input.partialSig[0].signature);
                sigScript.push(input.partialSig[0].pubkey);
                break;
            }
            case constant_1.RedeemScriptType.PUBLIC_KEY_SCRIPT: {
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
            finalScriptWitness: payment.witness && payment.witness.length > 0
                ? (0, psbtutils_1.witnessStackToScriptWitness)(payment.witness)
                : undefined,
        };
    }
    catch (error) {
        throw new Error(error);
    }
};
exports.finalCLTVScripts = finalCLTVScripts;
