"use strict";
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
exports.stake = void 0;
const constant_1 = require("./constant");
const transaction_1 = require("./transaction");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const stake = (_a) => __awaiter(void 0, [_a], void 0, function* ({ witness = false, lockTime, account, amount, validatorAddress, rewardAddress, privateKey, publicKey, coreNetwork = "mainnet", bitcoinNetwork = "mainnet", bitcoinRpc = "mempool", fee = "avg", }) {
    if (!lockTime) {
        throw new Error("LockTime should not be empty");
    }
    if (new bignumber_js_1.default(lockTime).lte(new bignumber_js_1.default(constant_1.LOCKTIME_THRESHOLD))) {
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
    const { txId, scriptAddress, redeemScript } = yield (0, transaction_1.buildStakeTransaction)({
        witness,
        lockTime: Number(lockTime),
        account,
        amount,
        validatorAddress,
        rewardAddress,
        type: constant_1.RedeemScriptType.PUBLIC_KEY_HASH_SCRIPT,
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
});
exports.stake = stake;
