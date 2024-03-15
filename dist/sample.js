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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const coinselect_segwit_1 = __importDefault(require("coinselect-segwit"));
const split_1 = __importDefault(require("coinselect-segwit/split"));
const ecc = __importStar(require("tiny-secp256k1"));
const ecpair_1 = __importDefault(require("ecpair"));
const psbtutils_1 = require("bitcoinjs-lib/src/psbt/psbtutils");
const regtest_client_1 = require("regtest-client");
// BTC RPC client
const APIPASS = "satoshi";
const APIURL = "https://regtest.bitbank.cc/1";
const regtestUtils = new regtest_client_1.RegtestUtils({ APIPASS, APIURL });
//private key of the signing address
const privkey = (_a = process.env.PRIVATE_KEY) !== null && _a !== void 0 ? _a : "";
const ECPair = (0, ecpair_1.default)(ecc);
const keyPair = ECPair.fromPrivateKey(Buffer.from(privkey, "hex"));
const pubkey = keyPair.publicKey;
//set network to testnet
const network = bitcoin.networks.regtest;
//set fee rate to 1
const feeRate = 1;
const OPS = bitcoin.script.OPS;
const lockTime = 1710857172; // CLTV timelock
//Stake BTC
function StakeBTC() {
    return __awaiter(this, void 0, void 0, function* () {
        const amount = 3000000; // In SAT
        const account = "2MzCBZ1eZLzeJib6ZJ9A5ZUSDTxg655YwBC"; //The address to send BTC
        const p2wpkhPayment = bitcoin.payments.p2wpkh({
            pubkey: keyPair.publicKey,
            network,
        });
        const p2shPayment = bitcoin.payments.p2sh({
            redeem: p2wpkhPayment,
            network,
        });
        const utxos = (yield regtestUtils.unspents(account)).map((utxo) => {
            var _a;
            return (Object.assign(Object.assign({}, utxo), { txid: utxo.txId, witnessUtxo: {
                    script: p2wpkhPayment.output,
                    value: utxo.value,
                }, redeemScript: (_a = p2shPayment.redeem) === null || _a === void 0 ? void 0 : _a.output }));
        });
        //This is the P2PKH redeem script of the CLTV timelocked UTXO, which will be used when unlock the BTC assets
        const redeemScript = bitcoin.script.compile([
            bitcoin.script.number.encode(lockTime),
            OPS.OP_CHECKLOCKTIMEVERIFY,
            OPS.OP_DROP,
            OPS.OP_DUP,
            OPS.OP_HASH160,
            bitcoin.crypto.hash160(pubkey),
            OPS.OP_EQUALVERIFY,
            OPS.OP_CHECKSIG,
        ]);
        //P2WSH script
        const lockScript = bitcoin.payments.p2wsh({
            redeem: {
                output: redeemScript,
            },
            network,
        }).output;
        const scriptAddress = bitcoin.address.fromOutputScript(lockScript, network);
        //OP_RETURN script
        //P2PKH:{flag}{version}{chainId}{rewardAddress}{validator}{coreFee}{redeemScript}
        const flag = "SAT+"; // Core/SAT+ identifier
        const validatorAddress = "0x0A53B7e0Ffd97357e444B85f4D683c1d8e22879A"; //Validator address to delegate to.
        const rewardAddress = "0xE9B809ea7464c103862F31F234018e5F87BB3D1e"; //Core address to claim CORE rewards.
        const chainId = "1112"; //Chain ID, Devnet 1112, Mainnet 1115
        const version = 1; //Version 1.
        const coreFee = 0; //Fee paid to porters of CORE, who transmit the BTC staking transaction to Core blockchain.
        const flagHex = Buffer.from(flag, "utf-8").toString("hex").padStart(8, "0");
        const versionHex = Number(version).toString(16).padStart(2, "0");
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
        const hex = `${flagHex}${versionHex}${chainIdHex}${rewardAddressHex}${validatorAddressHex}${coreFeeHex}${redeemScript.toString("hex")}`;
        const targets = [
            //CLTV script output
            {
                value: new bignumber_js_1.default(amount).toNumber(),
                script: lockScript,
            },
            //OP_RETURN
            {
                script: bitcoin.payments.embed({
                    data: [Buffer.from(hex, "hex")],
                    network: network,
                }).output,
                value: 0,
            },
        ];
        let { inputs, outputs } = (0, coinselect_segwit_1.default)(utxos, targets, feeRate);
        if (!inputs) {
            throw new Error("insufficient balance");
        }
        const psbt = new bitcoin.Psbt({
            network,
        });
        inputs === null || inputs === void 0 ? void 0 : inputs.forEach((input) => psbt.addInput(Object.assign(Object.assign(Object.assign({ hash: typeof input.txid === "string" ? input.txid : Buffer.from(input.txid), index: input.vout }, (input.witnessUtxo
            ? {
                witnessUtxo: {
                    script: Buffer.from(input.witnessUtxo.script),
                    value: input.witnessUtxo.value,
                },
            }
            : {})), (input.redeemScript
            ? { redeemScript: Buffer.from(input.redeemScript) }
            : {})), { sequence: 0xffffffff - 1 })));
        outputs === null || outputs === void 0 ? void 0 : outputs.forEach((output) => {
            var _a;
            if (!output.address && !output.script) {
                output.address = account;
            }
            psbt.addOutput(Object.assign(Object.assign({}, (output.script
                ? { script: Buffer.from(output.script) }
                : { address: output.address })), { value: (_a = output.value) !== null && _a !== void 0 ? _a : 0 }));
        });
        psbt.signAllInputs(keyPair);
        psbt.finalizeAllInputs();
        const txId = yield regtestUtils.broadcast(psbt.extractTransaction().toHex());
        console.log(`txId:${txId}`);
        console.log(`CLTV script address: ${scriptAddress}`);
        console.log(`redeem script: ${redeemScript.toString("hex")}`);
    });
}
//Redeem BTC
function RedeemBTC() {
    return __awaiter(this, void 0, void 0, function* () {
        //Address derived from the redeemScript.
        const cltvAddress = "bcrt1qyflaa4xrcgadwtp4ma4nlv0mwzmt5evu3aa4a4ewn8ne0weqku6q64wlsv";
        //Redeem script generated during the staking process.
        const redeemScript = "04d49bf965b17576a914a808bc3c1ba547b0ba2df4abf1396f35c4d23b4f88ac";
        const redeemScriptBuf = Buffer.from(redeemScript, "hex");
        //Address for receiving the unlocked BTC
        const destAddress = "2MzCBZ1eZLzeJib6ZJ9A5ZUSDTxg655YwBC";
        //Payment script of P2SH-P2WSH address
        const script = bitcoin.payments.p2wsh({
            redeem: {
                output: redeemScriptBuf,
                network,
            },
            network,
        }).output;
        //P2WSH
        const utxos = (yield regtestUtils.unspents(cltvAddress)).map((utxo) => (Object.assign(Object.assign({}, utxo), { txid: utxo.txId, witnessUtxo: {
                script: script,
                value: utxo.value,
            }, witnessScript: redeemScriptBuf })));
        let { inputs, outputs } = (0, split_1.default)(utxos, [
            {
                address: destAddress,
            },
        ], feeRate);
        //Update transaction fee by re-caculating signatures
        let signatureSize = 0;
        inputs.forEach(() => {
            signatureSize += (72 + 66) / 4;
        });
        const signatureSizeFee = new bignumber_js_1.default(signatureSize)
            .multipliedBy(new bignumber_js_1.default(feeRate))
            .toNumber();
        const newOutValue = outputs[0].value - signatureSizeFee;
        //locked btc can not cover the transaction fee
        if (newOutValue <= 0) {
            return;
        }
        outputs[0].value = Math.floor(outputs[0].value - signatureSizeFee);
        const psbt = new bitcoin.Psbt({
            network,
        });
        //Must set lock time when unlocking
        psbt.setLocktime(lockTime);
        inputs === null || inputs === void 0 ? void 0 : inputs.forEach((input) => psbt.addInput(Object.assign(Object.assign(Object.assign({ hash: typeof input.txid === "string" ? input.txid : Buffer.from(input.txid), index: input.vout }, (input.witnessUtxo
            ? {
                witnessUtxo: {
                    script: Buffer.from(input.witnessUtxo.script),
                    value: input.witnessUtxo.value,
                },
            }
            : {})), (input.witnessScript
            ? { witnessScript: Buffer.from(input.witnessScript) }
            : {})), { 
            //It's crucial to set the sequence less than 0xffffffff, or else the locktime will be disregarded.
            sequence: 0xffffffff - 1 })));
        outputs === null || outputs === void 0 ? void 0 : outputs.forEach((output) => {
            var _a;
            psbt.addOutput(Object.assign(Object.assign({}, (output.script
                ? { script: Buffer.from(output.script) }
                : { address: output.address })), { value: (_a = output.value) !== null && _a !== void 0 ? _a : 0 }));
        });
        inputs.forEach((input, idx) => {
            psbt.signInput(idx, keyPair);
        });
        psbt.txInputs.forEach((input, idx) => {
            psbt.finalizeInput(idx, (inputIndex, input, script) => {
                if (!input.partialSig || !input.partialSig.length) {
                    throw new Error(`tx was not fully signed`);
                }
                //P2PKH type redeemScript
                const paymentParams = {
                    redeem: {
                        input: bitcoin.script.compile([
                            input.partialSig[0].signature,
                            input.partialSig[0].pubkey,
                        ]),
                        output: script,
                        network,
                    },
                    network,
                };
                //P2WSH
                const payment = bitcoin.payments.p2wsh(paymentParams);
                return {
                    finalScriptSig: payment.input,
                    finalScriptWitness: (0, psbtutils_1.witnessStackToScriptWitness)(payment.witness),
                };
            });
        });
        const txId = yield regtestUtils.broadcast(psbt.extractTransaction().toHex());
        console.log(`txId: ${txId}`);
    });
}
