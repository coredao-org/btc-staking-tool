export function convertToHex(str: string) {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += "" + str.charCodeAt(i).toString(16);
  }
  return hex;
}
