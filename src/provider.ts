import axios, { AxiosResponse } from "axios";
import * as bitcoin from "bitcoinjs-lib";
import { FeeSpeedType } from "./constant";

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
  };
}

export interface Transaction {
  txid: string;
  confirmations: number;
  value: number;
  fee: number;
}

export const MempoolRpcUrl = {
  testnet: "https://mempool.space/testnet/api",
  mainnet: "https://mempool.space/api",
};

export class Provider {
  private apiUrl: string;
  private feeApiUrl: string;
  constructor({
    network,
    bitcoinRpc,
  }: {
    network: bitcoin.Network;
    bitcoinRpc: string;
  }) {
    if (bitcoinRpc === "mempool") {
      this.apiUrl =
        network === bitcoin.networks.testnet
          ? MempoolRpcUrl["testnet"]
          : MempoolRpcUrl["mainnet"];
    } else {
      this.apiUrl = bitcoinRpc;
    }

    this.feeApiUrl =
      network === bitcoin.networks.testnet
        ? MempoolRpcUrl["testnet"]
        : MempoolRpcUrl["mainnet"];
  }

  async getFeeRate(feeRate?: FeeSpeedType | string): Promise<number> {
    try {
      if (!isNaN(Number(feeRate))) {
        return Number(feeRate);
      }
      const response: AxiosResponse<any> = await axios.get(
        `${this.feeApiUrl}/v1/fees/recommended`
      );
      const data: {
        fastestFee: number;
        halfHourFee: number;
        hourFee: number;
        economyFee: number;
        minimumFee: number;
      } = response.data;
      if (feeRate === "slow") {
        return data.hourFee;
      } else if (feeRate === "fast") {
        return data.fastestFee;
      } else {
        return data.halfHourFee;
      }
    } catch (error) {
      throw new Error(`Failed to get fee rate: ${error}`);
    }
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      const response: AxiosResponse<UTXO[]> = await axios.get(
        `${this.apiUrl}/address/${address}/utxo`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get UTXOs for address ${address}: ${error}`);
    }
  }

  async getRawTransaction(txid: string): Promise<string> {
    try {
      const response: AxiosResponse<string> = await axios.get(
        `${this.apiUrl}/tx/${txid}/hex`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get transaction ${txid}: ${error}`);
    }
  }
  async broadcast(hex: string): Promise<string> {
    try {
      const response: AxiosResponse<string> = await axios.post(
        `${this.apiUrl}/tx`,
        hex,
        {
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to broadcast transaction: ${error.response.data ?? error}`
      );
    }
  }
}
