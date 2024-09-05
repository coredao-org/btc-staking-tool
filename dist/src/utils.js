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
exports.convertToHex = convertToHex;
exports.isMultisigScript = isMultisigScript;
const bitcoin = __importStar(require("bitcoinjs-lib"));
function convertToHex(str) {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
        hex += "" + str.charCodeAt(i).toString(16);
    }
    return hex;
}
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
