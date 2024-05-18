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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRedeemTransaction = exports.buildStakeTransaction = void 0;
const constant_1 = require("./constant");
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bip371_1 = require("bitcoinjs-lib/src/psbt/bip371");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const script_1 = require("./script");
const provider_1 = require("./provider");
const coinselect_segwit_1 = __importDefault(require("coinselect-segwit"));
const split_1 = __importDefault(require("coinselect-segwit/split"));
const ecc = __importStar(require("tiny-secp256k1"));
const ecpair_1 = __importDefault(require("ecpair"));
const constant_2 = require("./constant");
const address_1 = require("./address");
// Initialize the elliptic curve library
const ECPair = (0, ecpair_1.default)(ecc);
// Verify validator's signature
const validatorSignature = (pubkey, msghash, signature) => ECPair.fromPublicKey(pubkey).verify(msghash, signature);
/**
 * Builds a stake transaction
 * @param {StakeParams} params - Stake parameters
 * @returns {Promise<{ txId: string; scriptAddress: string; cltvScript: string; }>} - Transaction ID, script address, and CLTV script
 */
const buildStakeTransaction = (_a) => __awaiter(void 0, [_a], void 0, function* ({ witness, lockTime, account, amount, validatorAddress, rewardAddress, publicKey, privateKey, bitcoinNetwork, coreNetwork, type, bitcoinRpc, fee, redeemScript, }) {
    const chainId = constant_2.CoreChainNetworks[coreNetwork].chainId;
    const network = bitcoinNetwork == "mainnet"
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    let isRestaking = false;
    let preStakeOptions;
    const provider = new provider_1.Provider({
        network,
        bitcoinRpc,
    });
    const bytesFee = yield provider.getFeeRate(fee);
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, "hex"));
    if (!publicKey) {
        publicKey = keyPair.publicKey.toString("hex");
    }
    //We only support  P2PKH  P2WPKH P2SH-P2WPKH P2TR address
    let payment;
    let addressType = (0, address_1.getAddressType)(account, network, redeemScript);
    if (addressType === "p2pkh") {
        payment = bitcoin.payments.p2pkh({
            pubkey: keyPair.publicKey,
            network,
        });
    }
    else if (addressType === "p2wpkh") {
        payment = bitcoin.payments.p2wpkh({
            pubkey: keyPair.publicKey,
            network,
        });
    }
    else if (addressType === "p2sh-p2wpkh") {
        payment = bitcoin.payments.p2sh({
            redeem: bitcoin.payments.p2wpkh({
                pubkey: keyPair.publicKey,
                network,
            }),
            network,
        });
    }
    else if (addressType === "p2tr") {
        bitcoin.initEccLib(ecc);
        payment = bitcoin.payments.p2tr({
            internalPubkey: (0, bip371_1.toXOnly)(keyPair.publicKey),
            network,
        });
    }
    else if (redeemScript) {
        const redeemScriptBuf = Buffer.from(redeemScript.toString("hex"), "hex");
        if (addressType === "p2sh") {
            payment = bitcoin.payments.p2sh({
                redeem: {
                    output: redeemScriptBuf,
                    network,
                },
                network,
            });
        }
        else if (addressType === "p2wsh") {
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
    if ((payment === null || payment === void 0 ? void 0 : payment.address) !== account) {
        throw new Error("payment does not match the account.");
    }
    if (!payment.output) {
        throw new Error("failed to create redeem script");
    }
    //Re-staking
    if (!!redeemScript && (addressType === "p2wsh" || addressType === "p2sh")) {
        try {
            const { options, type } = (0, script_1.parseCLTVScript)({
                cltvScript: redeemScript,
                witness: addressType === "p2wsh",
            });
            if (options.lockTime > 0 &&
                type >= constant_1.RedeemScriptType.PUBLIC_KEY_SCRIPT &&
                type <= constant_1.RedeemScriptType.MULTI_SIG_HASH_SCRIPT) {
                isRestaking = true;
                preStakeOptions = options;
            }
        }
        catch (e) {
            console.log(e);
        }
    }
    // //Check validator and reward address in the case of staking
    // if (!isRestaking) {
    // } else {
    //   //fetch the previous stake options when validator or reward address is empty
    //   if (!rewardAddress || !validatorAddress) {
    //   }
    // }
    const res = yield provider.getUTXOs(account);
    const rawTxMap = {};
    if (addressType === "p2pkh" || addressType === "p2sh") {
        for (let i = 0; i < res.length; i++) {
            const utxo = res[i];
            if (!rawTxMap[utxo.txid]) {
                const hex = yield provider.getRawTransaction(utxo.txid);
                rawTxMap[utxo.txid] = hex;
            }
        }
    }
    const utxos = res.map((utxo) => (Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, utxo), ((addressType.includes("p2pkh") || addressType.includes("p2sh")) && {
        nonWitnessUtxo: Buffer.from(rawTxMap[utxo.txid], "hex"),
    })), ((addressType.includes("p2wpkh") ||
        addressType.includes("p2tr") ||
        addressType.includes("p2wsh")) && {
        witnessUtxo: {
            script: addressType.includes("p2sh")
                ? payment.redeem.output
                : payment.output,
            value: utxo.value,
        },
    })), (addressType.includes("p2sh") && {
        redeemScript: payment.redeem.output,
    })), (addressType.includes("p2wsh") && {
        witnessScript: payment.redeem.output,
    })), (addressType.includes("p2tr") && {
        isTaproot: true,
    })), { sequence: 0xffffffff - 1 })));
    //time lock script
    let script;
    //P2PKH
    if (type === constant_1.RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT) {
        script = script_1.CLTVScript.P2PKH({
            lockTime,
            pubkey: publicKey,
        });
    }
    else {
        //P2PK
        script = script_1.CLTVScript.P2PK({
            lockTime,
            pubkey: publicKey,
        });
    }
    const lockScript = (witness ? bitcoin.payments.p2wsh : bitcoin.payments.p2sh)({
        redeem: {
            output: script,
        },
        network,
    }).output;
    // Address for lock script
    const scriptAddress = bitcoin.address.fromOutputScript(lockScript, network);
    const targets = [
        Object.assign(Object.assign({}, (amount && {
            value: new bignumber_js_1.default(amount).toNumber(),
        })), { script: lockScript }),
        //OP_RETURN
        {
            script: (0, script_1.buildOPReturnScript)({
                chainId,
                validatorAddress,
                rewardAddress, // 20 bytes
                redeemScript: script.toString("hex"),
                coreFee: 0,
                isMultisig: false,
                lockTime,
                redeemScriptType: type,
            }),
            value: 0,
        },
    ];
    let { inputs, outputs } = amount
        ? (0, coinselect_segwit_1.default)(utxos, targets, bytesFee, account)
        : (0, split_1.default)(utxos, targets, bytesFee);
    if (!inputs) {
        throw new Error("insufficient balance");
    }
    if (!outputs) {
        throw new Error("failed to caculate transaction fee");
    }
    if (isRestaking && preStakeOptions) {
        let signatureSize = 0;
        inputs.forEach(() => {
            if (type === constant_1.RedeemScriptType.MULTI_SIG_SCRIPT &&
                preStakeOptions.m &&
                preStakeOptions.m >= 1) {
                signatureSize += (72 * preStakeOptions.m) / (witness ? 4 : 1);
            }
            else if (type === constant_1.RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT) {
                signatureSize += (72 + 66) / (witness ? 4 : 1);
            }
            else if (type === constant_1.RedeemScriptType.PUBLIC_KEY_SCRIPT) {
                signatureSize += 72 / (witness ? 4 : 1);
            }
        });
        const signatureSizeFee = new bignumber_js_1.default(signatureSize)
            .multipliedBy(new bignumber_js_1.default(bytesFee))
            .toNumber();
        outputs[0].value = Math.floor(outputs[0].value - signatureSizeFee);
    }
    const psbt = new bitcoin.Psbt({
        network,
    });
    console.log(preStakeOptions === null || preStakeOptions === void 0 ? void 0 : preStakeOptions.lockTime);
    isRestaking && preStakeOptions && psbt.setLocktime(preStakeOptions === null || preStakeOptions === void 0 ? void 0 : preStakeOptions.lockTime);
    inputs === null || inputs === void 0 ? void 0 : inputs.forEach((input) => psbt.addInput(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ hash: typeof input.txid === "string" ? input.txid : Buffer.from(input.txid), index: input.vout }, (input.nonWitnessUtxo
        ? {
            nonWitnessUtxo: Buffer.from(input.nonWitnessUtxo),
        }
        : {})), (input.witnessUtxo
        ? {
            witnessUtxo: {
                script: Buffer.from(input.witnessUtxo.script),
                value: input.witnessUtxo.value,
            },
        }
        : {})), (input.redeemScript
        ? { redeemScript: Buffer.from(input.redeemScript) }
        : {})), (input.witnessScript
        ? { witnessScript: Buffer.from(input.witnessScript) }
        : {})), (input.isTaproot ? { tapInternalKey: payment.internalPubkey } : {})), { sequence: 0xffffffff - 1 })));
    const changeAddress = account;
    outputs === null || outputs === void 0 ? void 0 : outputs.forEach((output) => {
        var _a;
        if (!output.address && !output.script) {
            output.address = changeAddress;
        }
        psbt.addOutput(Object.assign(Object.assign({}, (output.script
            ? { script: Buffer.from(output.script) }
            : { address: output.address })), { value: (_a = output.value) !== null && _a !== void 0 ? _a : 0 }));
    });
    if (addressType.includes("p2tr")) {
        const signer = keyPair.tweak(bitcoin.crypto.taggedHash("TapTweak", (0, bip371_1.toXOnly)(keyPair.publicKey)));
        psbt.signAllInputs(signer);
    }
    else {
        psbt.signAllInputs(keyPair);
    }
    if (!addressType.includes("p2tr") &&
        !psbt.validateSignaturesOfAllInputs(validatorSignature)) {
        throw new Error("signature is invalid");
    }
    if (isRestaking) {
        psbt.txInputs.forEach((input, idx) => {
            psbt.finalizeInput(idx, script_1.finalCLTVScripts);
        });
    }
    else {
        psbt.finalizeAllInputs();
    }
    const txId = yield provider.broadcast(psbt.extractTransaction().toHex());
    return {
        txId,
        scriptAddress,
        script: script.toString("hex"),
    };
});
exports.buildStakeTransaction = buildStakeTransaction;
/**
 * Builds a redeem transaction
 * @param {RedeemParams} params - Redeem parameters
 * @returns {Promise<{ txId: string }>} - Transaction ID
 */
const buildRedeemTransaction = (_b) => __awaiter(void 0, [_b], void 0, function* ({ account, redeemScript, privateKey, destAddress, bitcoinRpc, fee, }) {
    let network;
    let witness = false;
    if (account.length === 34 || account.length === 35) {
        const addr = bitcoin.address.fromBase58Check(account);
        network =
            addr.version === bitcoin.networks.bitcoin.pubKeyHash ||
                addr.version === bitcoin.networks.bitcoin.scriptHash
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;
    }
    else {
        const addr = bitcoin.address.fromBech32(account);
        network =
            addr.prefix === bitcoin.networks.bitcoin.bech32
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;
        witness = true;
    }
    const { options, type } = (0, script_1.parseCLTVScript)({
        witness,
        cltvScript: redeemScript,
    });
    const provider = new provider_1.Provider({
        network,
        bitcoinRpc,
    });
    const bytesFee = yield provider.getFeeRate(fee);
    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, "hex"));
    //check private key with lock script
    const res = yield provider.getUTXOs(account);
    const redeemScriptBuf = Buffer.from(redeemScript.toString("hex"), "hex");
    const script = (witness ? bitcoin.payments.p2wsh : bitcoin.payments.p2sh)({
        redeem: {
            output: redeemScriptBuf,
            network,
        },
        network,
    }).output;
    const rawTxMap = {};
    if (!witness) {
        for (let i = 0; i < res.length; i++) {
            const utxo = res[i];
            if (!rawTxMap[utxo.txid]) {
                const hex = yield provider.getRawTransaction(utxo.txid);
                rawTxMap[utxo.txid] = hex;
            }
        }
    }
    const utxos = res.map((utxo) => (Object.assign(Object.assign(Object.assign(Object.assign({}, utxo), (!witness && {
        nonWitnessUtxo: Buffer.from(rawTxMap[utxo.txid], "hex"),
    })), (witness && {
        witnessUtxo: {
            script: script,
            value: utxo.value,
        },
    })), (!witness
        ? {
            redeemScript: redeemScriptBuf,
        }
        : {
            witnessScript: redeemScriptBuf,
        }))));
    let { inputs, outputs } = (0, split_1.default)(utxos, [
        {
            address: destAddress,
        },
    ], bytesFee);
    if (!inputs) {
        throw new Error("insufficient balance");
    }
    if (!outputs) {
        throw new Error("failed to caculate transaction fee");
    }
    //Update transaction fee by re-caculating signatures
    let signatureSize = 0;
    inputs.forEach(() => {
        if (type === constant_1.RedeemScriptType.MULTI_SIG_SCRIPT &&
            options.m &&
            options.m >= 1) {
            signatureSize += (72 * options.m) / (witness ? 4 : 1);
        }
        else if (type === constant_1.RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT) {
            signatureSize += (72 + 66) / (witness ? 4 : 1);
        }
        else if (type === constant_1.RedeemScriptType.PUBLIC_KEY_SCRIPT) {
            signatureSize += 72 / (witness ? 4 : 1);
        }
    });
    const signatureSizeFee = new bignumber_js_1.default(signatureSize)
        .multipliedBy(new bignumber_js_1.default(bytesFee))
        .toNumber();
    outputs[0].value = Math.floor(outputs[0].value - signatureSizeFee);
    const psbt = new bitcoin.Psbt({
        network,
    });
    psbt.setLocktime(options.lockTime);
    inputs === null || inputs === void 0 ? void 0 : inputs.forEach((input) => psbt.addInput(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ hash: typeof input.txid === "string" ? input.txid : Buffer.from(input.txid), index: input.vout }, (input.nonWitnessUtxo
        ? {
            nonWitnessUtxo: Buffer.from(input.nonWitnessUtxo),
        }
        : {})), (input.witnessUtxo
        ? {
            witnessUtxo: {
                script: Buffer.from(input.witnessUtxo.script),
                value: input.witnessUtxo.value,
            },
        }
        : {})), (input.redeemScript
        ? { redeemScript: Buffer.from(input.redeemScript) }
        : {})), (input.witnessScript
        ? { witnessScript: Buffer.from(input.witnessScript) }
        : {})), { sequence: 0xffffffff - 1 })));
    outputs === null || outputs === void 0 ? void 0 : outputs.forEach((output) => {
        var _a;
        psbt.addOutput(Object.assign(Object.assign({}, (output.script
            ? { script: Buffer.from(output.script) }
            : { address: output.address })), { value: (_a = output.value) !== null && _a !== void 0 ? _a : 0 }));
    });
    inputs.forEach((input, idx) => {
        psbt.signInput(idx, keyPair);
    });
    if (!psbt.validateSignaturesOfAllInputs(validatorSignature)) {
        throw new Error("signature is invalid");
    }
    psbt.txInputs.forEach((input, idx) => {
        psbt.finalizeInput(idx, script_1.finalCLTVScripts);
    });
    const txId = yield provider.broadcast(psbt.extractTransaction().toHex());
    return {
        txId,
    };
});
exports.buildRedeemTransaction = buildRedeemTransaction;
