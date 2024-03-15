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
exports.Provider = exports.MempoolRpcUrl = void 0;
const axios_1 = __importDefault(require("axios"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
exports.MempoolRpcUrl = {
    testnet: "https://mempool.space/testnet/api",
    mainnet: "https://mempool.space/api",
};
class Provider {
    constructor({ network, bitcoinRpc, }) {
        if (bitcoinRpc === "mempool") {
            this.apiUrl =
                network === bitcoin.networks.testnet
                    ? exports.MempoolRpcUrl["testnet"]
                    : exports.MempoolRpcUrl["mainnet"];
        }
        else {
            this.apiUrl = bitcoinRpc;
        }
        this.feeApiUrl =
            network === bitcoin.networks.testnet
                ? exports.MempoolRpcUrl["testnet"]
                : exports.MempoolRpcUrl["mainnet"];
    }
    getFeeRate(feeRate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!isNaN(Number(feeRate))) {
                    return Number(feeRate);
                }
                const response = yield axios_1.default.get(`${this.feeApiUrl}/v1/fees/recommended`);
                const data = response.data;
                if (feeRate === "slow") {
                    return data.hourFee;
                }
                else if (feeRate === "fast") {
                    return data.fastestFee;
                }
                else {
                    return data.halfHourFee;
                }
            }
            catch (error) {
                throw new Error(`Failed to get fee rate: ${error}`);
            }
        });
    }
    getUTXOs(address) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.apiUrl}/address/${address}/utxo`);
                return response.data;
            }
            catch (error) {
                throw new Error(`Failed to get UTXOs for address ${address}: ${error}`);
            }
        });
    }
    getRawTransaction(txid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.apiUrl}/tx/${txid}/hex`);
                return response.data;
            }
            catch (error) {
                throw new Error(`Failed to get transaction ${txid}: ${error}`);
            }
        });
    }
    broadcast(hex) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.post(`${this.apiUrl}/tx`, hex, {
                    headers: {
                        "Content-Type": "text/plain",
                    },
                });
                return response.data;
            }
            catch (error) {
                throw new Error(`Failed to broadcast transaction: ${(_a = error.response.data) !== null && _a !== void 0 ? _a : error}`);
            }
        });
    }
}
exports.Provider = Provider;
