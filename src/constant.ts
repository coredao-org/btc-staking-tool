export enum CreateTxnType {
  CREATE_UNSIGNED_TRANSACTION_BY_WALLET,
  CREATE_UNSIGNED_TRANSACTION_BY_ADDRESS,
  CREATE_UNSIGNED_REDEEM_TRANSACTION_BY_SCRIPT,
}

export enum RedeemScriptType {
  PUBLIC_KEY_SCRIPT = 1,
  PUBLIC_KEY_HASH_SCRIPT,
  MULTI_SIG_SCRIPT,
  MULTI_SIG_HASH_SCRIPT,
}

export enum RedeemType {
  LOCK_TIME,
  SCRIPT,
}

export enum QueryKey {
  CREATE_SIGN_TRANSACTION = "CREATE_SIGN_TRANSACTION",
  CREATE_UNSIGNED_TRANSACTION = "CREATE_UNSIGNED_TRANSACTION",
  CREATE_OP_RETURN = "CREATE_OP_RETURN",
  GET_BTC_BALANCE_CX = "GET_BTC_BALANCE_CX",
  CREATE_SIGN_MESSAGE = "CREATE_SIGN_MESSAGE",
}

export enum AddressType {
  P2PKH,
  P2WPKH,
  P2TR,
  P2SH_P2WPKH,
  M44_P2WPKH,
  M44_P2TR,
}

export interface Network {
  chainId: number;
  label: string;
  name: string;
  rpc?: string;
}

export const BitcoinNetworks: Record<string, Network> = {
  mainnet: { chainId: 0, label: "LIVENET", name: "livenet" },
  testnet: { chainId: 1, label: "TESTNET", name: "testnet" },
};
export const CoreChainNetworks: Record<string, Network> = {
  mainnet: {
    chainId: 1116,
    label: "MAINNET",
    name: "mainnet",
  },
  testnet: {
    chainId: 1115,
    label: "TESTNET",
    name: "testnet",
  },
  devnet: {
    chainId: 1112,
    label: "DEVNET",
    name: "devnet",
  },
};
export const LOCKTIME_THRESHOLD = 0x1dcd6500; // 500000000

export type FeeSpeedType = "slow" | "avg" | "fast";

export const BitcoinNetworkMap: Record<number, string> = {
  1: "mainnet",
  2: "testnet",
};

export const CoreNetworkMap: Record<number, string> = {
  1: "mainnet",
  2: "devnet",
  3: "testnet",
};

export const FeeSpeedMap: Record<string, string> = {
  s: "slow",
  a: "avg",
  f: "fast",
};
