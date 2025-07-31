import * as bitcoin from "bitcoinjs-lib";

export function getAddressType(
  address: string,
  network = bitcoin.networks.bitcoin,
  redeemScript?: Buffer | string
) {
  if (address.startsWith(`${network.bech32}1p`)) {
    bitcoin.address.fromBech32(address);
    return "p2tr";
  }
  if (address.startsWith(network.bech32)) {
    const decodeBech32 = bitcoin.address.fromBech32(address);
    if (decodeBech32.data.length === 20) return "p2wpkh";
    if (decodeBech32.data.length === 32) return "p2wsh";
  }
  const base58Data = bitcoin.address.fromBase58Check(address);
  if (base58Data.version === Number(network.scriptHash)) {
    if (redeemScript) {
      return "p2sh";
    }
    return "p2sh-p2wpkh";
  }
  if (base58Data.version === Number(network.pubKeyHash)) {
    return "p2pkh";
  }

  throw new Error("invalid address");
}
