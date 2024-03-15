"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeSpeedMap = exports.CoreNetworkMap = exports.BitcoinNetworkMap = exports.LOCKTIME_THRESHOLD = exports.CoreChainNetworks = exports.BitcoinNetworks = exports.AddressType = exports.QueryKey = exports.RedeemType = exports.RedeemScriptType = exports.CreateTxnType = void 0;
var CreateTxnType;
(function (CreateTxnType) {
    CreateTxnType[CreateTxnType["CREATE_UNSIGNED_TRANSACTION_BY_WALLET"] = 0] = "CREATE_UNSIGNED_TRANSACTION_BY_WALLET";
    CreateTxnType[CreateTxnType["CREATE_UNSIGNED_TRANSACTION_BY_ADDRESS"] = 1] = "CREATE_UNSIGNED_TRANSACTION_BY_ADDRESS";
    CreateTxnType[CreateTxnType["CREATE_UNSIGNED_REDEEM_TRANSACTION_BY_SCRIPT"] = 2] = "CREATE_UNSIGNED_REDEEM_TRANSACTION_BY_SCRIPT";
})(CreateTxnType || (exports.CreateTxnType = CreateTxnType = {}));
var RedeemScriptType;
(function (RedeemScriptType) {
    RedeemScriptType[RedeemScriptType["PUBLIC_KEY_SCRIPT"] = 1] = "PUBLIC_KEY_SCRIPT";
    RedeemScriptType[RedeemScriptType["PUBLIC_KEY_HASH_SCRIPT"] = 2] = "PUBLIC_KEY_HASH_SCRIPT";
    RedeemScriptType[RedeemScriptType["MULTI_SIG_SCRIPT"] = 3] = "MULTI_SIG_SCRIPT";
    RedeemScriptType[RedeemScriptType["MULTI_SIG_HASH_SCRIPT"] = 4] = "MULTI_SIG_HASH_SCRIPT";
})(RedeemScriptType || (exports.RedeemScriptType = RedeemScriptType = {}));
var RedeemType;
(function (RedeemType) {
    RedeemType[RedeemType["LOCK_TIME"] = 0] = "LOCK_TIME";
    RedeemType[RedeemType["SCRIPT"] = 1] = "SCRIPT";
})(RedeemType || (exports.RedeemType = RedeemType = {}));
var QueryKey;
(function (QueryKey) {
    QueryKey["CREATE_SIGN_TRANSACTION"] = "CREATE_SIGN_TRANSACTION";
    QueryKey["CREATE_UNSIGNED_TRANSACTION"] = "CREATE_UNSIGNED_TRANSACTION";
    QueryKey["CREATE_OP_RETURN"] = "CREATE_OP_RETURN";
    QueryKey["GET_BTC_BALANCE_CX"] = "GET_BTC_BALANCE_CX";
    QueryKey["CREATE_SIGN_MESSAGE"] = "CREATE_SIGN_MESSAGE";
})(QueryKey || (exports.QueryKey = QueryKey = {}));
var AddressType;
(function (AddressType) {
    AddressType[AddressType["P2PKH"] = 0] = "P2PKH";
    AddressType[AddressType["P2WPKH"] = 1] = "P2WPKH";
    AddressType[AddressType["P2TR"] = 2] = "P2TR";
    AddressType[AddressType["P2SH_P2WPKH"] = 3] = "P2SH_P2WPKH";
    AddressType[AddressType["M44_P2WPKH"] = 4] = "M44_P2WPKH";
    AddressType[AddressType["M44_P2TR"] = 5] = "M44_P2TR";
})(AddressType || (exports.AddressType = AddressType = {}));
exports.BitcoinNetworks = {
    mainnet: { chainId: 0, label: "LIVENET", name: "livenet" },
    testnet: { chainId: 1, label: "TESTNET", name: "testnet" },
};
exports.CoreChainNetworks = {
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
exports.LOCKTIME_THRESHOLD = 0x1dcd6500; // 500000000
exports.BitcoinNetworkMap = {
    1: "mainnet",
    2: "testnet",
};
exports.CoreNetworkMap = {
    1: "mainnet",
    2: "devnet",
    3: "testnet",
};
exports.FeeSpeedMap = {
    s: "slow",
    a: "avg",
    f: "fast",
};
