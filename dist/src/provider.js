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
exports.Provider = exports.MempoolRpcUrl = void 0;
const axios_1 = __importDefault(require("axios"));
exports.MempoolRpcUrl = {
    testnet: "https://mempool.space/testnet/api",
    testnet4: "https://mempool.space/testnet4/api",
    mainnet: "https://mempool.space/api",
};
class Provider {
    constructor({ network, bitcoinRpc, }) {
        if (bitcoinRpc === "mempool") {
            this.apiUrl = exports.MempoolRpcUrl[network];
        }
        else {
            this.apiUrl = bitcoinRpc;
        }
        this.feeApiUrl = exports.MempoolRpcUrl[network];
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
