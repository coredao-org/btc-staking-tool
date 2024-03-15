import * as bitcoin from "bitcoinjs-lib";

export function getAddressType(
  address: string,
  network = bitcoin.networks.bitcoin
) {
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
