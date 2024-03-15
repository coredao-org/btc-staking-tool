#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const commander = __importStar(require("commander"));
const stake_1 = require("./src/stake");
const redeem_1 = require("./src/redeem");
const constant_1 = require("./src/constant");
const program = new commander.Command();
program
    .version("1.0.0")
    .description("Core chain self custody BTC staking command line tool.");
program
    .command("stake")
    .description("Stake BTC")
    .requiredOption("-acc, --account <account>", "The Bitcon address used to stake.")
    .requiredOption("-privkey, --privatekey <privatekey>", "The private key used to sign the transaction, which should be associated with --account. Hex format.")
    .requiredOption("-amt, --amount <amount>", "Amount of BTC to stake, measured in SAT.")
    .option("-bn, --bitcoinnetwork <bitcoinnetwork>", "The Bitcoin network to operate on, choose between 1~2. 1)Mainnet 2)Testnet, default to 1)Mainnet.")
    .option("-cn, --corenetwork <corenetwork>", "The Core network to transmit the stake transaction to, choose between 1~3. 1)Mainnet 2)Devnet 3)Testnet, default to 1)Mainnet.")
    .requiredOption("-lt, --locktime <locktime>", "The unix timestamp in seconds to lock the BTC assets up to. e.g. 1711983981")
    .option("-pubkey, --publickey <publickey>", "The public key used to redeem the BTC assets when locktime expires. Default to the public key associated with --privatekey.")
    .requiredOption("-raddr, --rewardaddress <rewardaddress>", "Core address used to claim staking rewards.")
    .requiredOption("-vaddr, --validatoraddress <validatoraddress>", "Core validator address to stake to.")
    .option("-w, --witness", "Use segwit or not.")
    .option("-br, --bitcoinrpc <bitcoinrpc>", "The Bitcoin RPC service to use, default to https://mempool.space/. ")
    .option("--fee <fee>", "Transaction fee s)slow a)average f)fast, please choose in (s, a ,f) OR a customized number in SAT, default to a)average.")
    .action((args) => __awaiter(void 0, void 0, void 0, function* () {
    const bitcoinnetwork = constant_1.BitcoinNetworkMap[args.bitcoinnetwork];
    const corenetwork = constant_1.CoreNetworkMap[args.corenetwork];
    const fee = constant_1.FeeSpeedMap[args.fee];
    yield (0, stake_1.stake)({
        lockTime: args.locktime,
        amount: args.amount,
        validatorAddress: args.validatoraddress,
        rewardAddress: args.rewardaddress,
        publicKey: args.publickey,
        account: args.account,
        bitcoinNetwork: bitcoinnetwork,
        coreNetwork: corenetwork,
        privateKey: args.privatekey,
        witness: args.witness,
        bitcoinRpc: args.bitcoinrpc,
        fee: fee || args.fee,
    });
}));
program
    .command("redeem")
    .description("Redeem BTC")
    .requiredOption("-acc, --account <account>", "The locked P2SH/P2WSH script address.")
    .requiredOption("-r, --redeemscript <redeemscript>", "The redeem script which was returned in the stake action.")
    .requiredOption("-privkey, --privatekey <privatekey>", "The private key associated --publickey in the stake action. Hex format.")
    .requiredOption("-d, --destaddress <destaddress>", "The Bitcoin address to receive the redeemed BTC assets.")
    .option("-br, --bitcoinrpc <bitcoinrpc>", "The Bitcoin RPC service to use, default to https://mempool.space/. ")
    .option("--fee <fee>", "Transaction fee s)slow a)average f)fast, please choose in (s, a ,f) OR a customized number in SAT, default to a)average.")
    .action((args) => __awaiter(void 0, void 0, void 0, function* () {
    const fee = constant_1.FeeSpeedMap[args.fee];
    yield (0, redeem_1.redeem)({
        account: args.account,
        redeemScript: args.redeemscript,
        privateKey: args.privatekey,
        destAddress: args.destaddress,
        bitcoinRpc: args.bitcoinRpc,
        fee: fee || args.fee,
    });
}));
program.parse(process.argv);
