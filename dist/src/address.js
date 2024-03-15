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
exports.getAddressType = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
function getAddressType(address, network = bitcoin.networks.bitcoin) {
    if (address.startsWith(`${network.bech32}1p`)) {
        bitcoin.address.fromBech32(address);
        return "p2tr";
    }
    if (address.startsWith(network.bech32)) {
        bitcoin.address.fromBech32(address);
        return "p2wpkh";
    }
    const base58Data = bitcoin.address.fromBase58Check(address);
    if (base58Data.version === Number(network.scriptHash)) {
        return "p2sh-p2wpkh";
    }
    if (base58Data.version === Number(network.pubKeyHash)) {
        return "p2pkh";
    }
    throw new Error("invalid address");
}
exports.getAddressType = getAddressType;
