"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToHex = void 0;
function convertToHex(str) {
    let hex = "";
    for (let i = 0; i < str.length; i++) {
        hex += "" + str.charCodeAt(i).toString(16);
    }
    return hex;
}
exports.convertToHex = convertToHex;
