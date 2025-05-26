import * as bitcoin from "bitcoinjs-lib";

export function convertToHex(str: string) {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += "" + str.charCodeAt(i).toString(16);
  }
  return hex;
}
export function isMultisigScript(scriptBuffer: Buffer) {
  const decompiled = bitcoin.script.decompile(scriptBuffer);
  if (decompiled === null) return false;

  const lastOpcode = decompiled[decompiled.length - 1];

  if (
    lastOpcode !== bitcoin.opcodes.OP_CHECKMULTISIG &&
    lastOpcode !== bitcoin.opcodes.OP_CHECKMULTISIGVERIFY
  ) {
    return false;
  }

  const mOpcode = decompiled[0];
  const nOpcode = decompiled[decompiled.length - 2];

  if (
    !bitcoin.script.isPushOnly([mOpcode]) ||
    !bitcoin.script.isPushOnly([nOpcode])
  ) {
    return false;
  }

  const pubKeys = decompiled.slice(1, -2);

  // 检查公钥数量是否与nOpcode匹配
  if (pubKeys.length !== Number(nOpcode) - bitcoin.opcodes.OP_RESERVED) {
    return false;
  }

  return true;
}
