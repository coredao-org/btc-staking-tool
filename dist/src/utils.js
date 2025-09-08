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
exports.encodeVarInt = exports.validateChannelID = exports.isMultisigScript = exports.convertToHex = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
function convertToHex(str) {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
        hex += "" + str.charCodeAt(i).toString(16);
    }
    return hex;
}
exports.convertToHex = convertToHex;
function isMultisigScript(scriptBuffer) {
    const decompiled = bitcoin.script.decompile(scriptBuffer);
    if (decompiled === null)
        return false;
    const lastOpcode = decompiled[decompiled.length - 1];
    if (lastOpcode !== bitcoin.opcodes.OP_CHECKMULTISIG &&
        lastOpcode !== bitcoin.opcodes.OP_CHECKMULTISIGVERIFY) {
        return false;
    }
    const mOpcode = decompiled[0];
    const nOpcode = decompiled[decompiled.length - 2];
    if (!bitcoin.script.isPushOnly([mOpcode]) ||
        !bitcoin.script.isPushOnly([nOpcode])) {
        return false;
    }
    const pubKeys = decompiled.slice(1, -2);
    // 检查公钥数量是否与nOpcode匹配
    if (pubKeys.length !== Number(nOpcode) - bitcoin.opcodes.OP_RESERVED) {
        return false;
    }
    return true;
}
exports.isMultisigScript = isMultisigScript;
function validateChannelID(channelID) {
    // Validate and convert string input
    if (typeof channelID === "string") {
        // Check if string is a valid number
        if (!/^\d+$/.test(channelID.trim())) {
            throw new Error("Invalid string format: must be a numeric string");
        }
    }
    let bigValue;
    try {
        bigValue = BigInt(channelID);
    }
    catch (error) {
        throw new Error("Invalid value format: cannot convert to BigInt");
    }
    // Validate input range
    if (bigValue < BigInt(1) || bigValue > BigInt("0xFFFFFFFFFFFFFFFF")) {
        throw new Error("Value out of range for VarInt encoding");
    }
}
exports.validateChannelID = validateChannelID;
/**
 * Convert a channelId value to VarInt format according to Bitcoin protocol
 * @param value - The value to convert (0 to 18,446,744,073,709,551,615)
 * @returns Hex string containing the VarInt encoded value (e.g., '0xFDXXXX')
 */
function encodeVarInt(value) {
    if (typeof value === "string") {
        validateChannelID(value);
    }
    let bigValue;
    try {
        bigValue = BigInt(value);
    }
    catch (error) {
        throw new Error("Invalid value format: cannot convert to BigInt");
    }
    // Validate input range
    if (bigValue < BigInt(1) || bigValue > BigInt("0xFFFFFFFFFFFFFFFF")) {
        throw new Error("Value out of range for VarInt encoding");
    }
    // 0 <= Value <= 252 (0xFC) - 1 byte
    if (bigValue <= BigInt(0xfc)) {
        const hex = Number(bigValue).toString(16).padStart(2, "0");
        return "0x" + hex;
    }
    // 253 <= Value <= 65,535 (0xFFFF) - 0xFD + uint16_t (little endian)
    if (bigValue <= BigInt(0xffff)) {
        const buffer = Buffer.allocUnsafe(3);
        buffer.writeUInt8(0xfd, 0);
        buffer.writeUInt16LE(Number(bigValue), 1);
        return "0x" + buffer.toString("hex");
    }
    // 65,536 <= Value <= 4,294,967,295 (0xFFFFFFFF) - 0xFE + uint32_t (little endian)
    if (bigValue <= BigInt(0xffffffff)) {
        const buffer = Buffer.allocUnsafe(5);
        buffer.writeUInt8(0xfe, 0);
        buffer.writeUInt32LE(Number(bigValue), 1);
        return "0x" + buffer.toString("hex");
    }
    // 4,294,967,296 <= value <= 18,446,744,073,709,551,615 (0xFFFFFFFFFFFFFFFF) - 0xFF + uint64_t (little endian)
    const buffer = Buffer.allocUnsafe(9);
    buffer.writeUInt8(0xff, 0);
    // Write 64-bit value as two 32-bit values (little endian)
    const low32 = Number(bigValue & BigInt(0xffffffff));
    const high32 = Number(bigValue >> BigInt(32));
    buffer.writeUInt32LE(low32, 1);
    buffer.writeUInt32LE(high32, 5);
    return "0x" + buffer.toString("hex");
}
exports.encodeVarInt = encodeVarInt;
