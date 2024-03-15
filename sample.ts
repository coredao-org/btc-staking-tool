import * as bitcoin from "bitcoinjs-lib";
import Bignumber from "bignumber.js";
import coinSelect from "coinselect-segwit";
import split from "coinselect-segwit/split";
import * as ecc from "tiny-secp256k1";
import ECPairFactory from "ecpair";
import { PsbtInput } from "bip174/src/lib/interfaces";
import { witnessStackToScriptWitness } from "bitcoinjs-lib/src/psbt/psbtutils";
import { RegtestUtils } from "regtest-client";

// BTC RPC client
const APIPASS = "satoshi";
const APIURL = "https://regtest.bitbank.cc/1";
const regtestUtils = new RegtestUtils({ APIPASS, APIURL });

//private key of the signing address
const privkey: string = process.env.PRIVATE_KEY ?? "";
const ECPair = ECPairFactory(ecc);
const keyPair = ECPair.fromPrivateKey(Buffer.from(privkey, "hex"));
const pubkey: Buffer = keyPair.publicKey;
//set network to testnet
const network = bitcoin.networks.regtest;
//set fee rate to 1
const feeRate = 1;

const OPS = bitcoin.script.OPS;

const lockTime = 1710857172; // CLTV timelock

//Stake BTC
async function StakeBTC() {
  const amount = 3000000; // In SAT
  const account = "2MzCBZ1eZLzeJib6ZJ9A5ZUSDTxg655YwBC"; //The address to send BTC
  const p2wpkhPayment = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network,
  });
  const p2shPayment = bitcoin.payments.p2sh({
    redeem: p2wpkhPayment,
    network,
  });

  const utxos = (await regtestUtils.unspents(account)).map((utxo) => ({
    ...utxo,
    txid: utxo.txId,
    witnessUtxo: {
      script: p2wpkhPayment.output!,
      value: utxo.value,
    },
    redeemScript: p2shPayment.redeem?.output,
  }));

  //This is the P2PKH redeem script of the CLTV timelocked UTXO, which will be used when unlock the BTC assets
  const redeemScript = bitcoin.script.compile([
    bitcoin.script.number.encode(lockTime),
    OPS.OP_CHECKLOCKTIMEVERIFY,
    OPS.OP_DROP,
    OPS.OP_DUP,
    OPS.OP_HASH160,
    bitcoin.crypto.hash160(pubkey),
    OPS.OP_EQUALVERIFY,
    OPS.OP_CHECKSIG,
  ]);

  //P2WSH script
  const lockScript = bitcoin.payments.p2wsh({
    redeem: {
      output: redeemScript,
    },
    network,
  }).output;

  const scriptAddress: string = bitcoin.address.fromOutputScript(
    lockScript!,
    network
  );

  //OP_RETURN script
  //P2PKH:{flag}{version}{chainId}{rewardAddress}{validator}{coreFee}{redeemScript}
  const flag = "SAT+"; // Core/SAT+ identifier
  const validatorAddress = "0x0A53B7e0Ffd97357e444B85f4D683c1d8e22879A"; //Validator address to delegate to.
  const rewardAddress = "0xE9B809ea7464c103862F31F234018e5F87BB3D1e"; //Core address to claim CORE rewards.
  const chainId = "1112"; //Chain ID, Devnet 1112, Mainnet 1115
  const version = 1; //Version 1.
  const coreFee = 0; //Fee paid to porters of CORE, who transmit the BTC staking transaction to Core blockchain.
  const flagHex = Buffer.from(flag, "utf-8").toString("hex").padStart(8, "0");
  const versionHex = Number(version).toString(16).padStart(2, "0");
  const chainIdHex = Number(chainId).toString(16).padStart(4, "0");
  const rewardAddressHex = rewardAddress
    .replace("0x", "")
    .toLowerCase()
    .padStart(40, "0");
  const validatorAddressHex = validatorAddress
    .replace("0x", "")
    .toLowerCase()
    .padStart(40, "0");
  const coreFeeHex = Number(coreFee).toString(16).padStart(2, "0");

  const hex = `${flagHex}${versionHex}${chainIdHex}${rewardAddressHex}${validatorAddressHex}${coreFeeHex}${redeemScript.toString(
    "hex"
  )}`;

  const targets = [
    //CLTV script output
    {
      value: new Bignumber(amount).toNumber(),
      script: lockScript,
    },
    //OP_RETURN
    {
      script: bitcoin.payments.embed({
        data: [Buffer.from(hex, "hex")],
        network: network,
      }).output,
      value: 0,
    },
  ];

  let { inputs, outputs } = coinSelect(utxos, targets, feeRate);

  if (!inputs) {
    throw new Error("insufficient balance");
  }
  const psbt = new bitcoin.Psbt({
    network,
  });
  inputs?.forEach((input) =>
    psbt.addInput({
      hash:
        typeof input.txid === "string" ? input.txid : Buffer.from(input.txid),
      index: input.vout,
      ...(input.witnessUtxo
        ? {
            witnessUtxo: {
              script: Buffer.from(input.witnessUtxo.script),
              value: input.witnessUtxo.value,
            },
          }
        : {}),
      ...(input.redeemScript
        ? { redeemScript: Buffer.from(input.redeemScript) }
        : {}),
      sequence: 0xffffffff - 1,
    })
  );
  outputs?.forEach((output) => {
    if (!output.address && !output.script) {
      output.address = account;
    }
    psbt.addOutput({
      ...(output.script
        ? { script: Buffer.from(output.script) }
        : { address: output.address! }),
      value: output.value ?? 0,
    });
  });
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  const txId = await regtestUtils.broadcast(psbt.extractTransaction().toHex());
  console.log(`txId:${txId}`);
  console.log(`CLTV script address: ${scriptAddress}`);
  console.log(`redeem script: ${redeemScript.toString("hex")}`);
}

//Redeem BTC
async function RedeemBTC() {
  //Address derived from the redeemScript.
  const cltvAddress =
    "bcrt1qyflaa4xrcgadwtp4ma4nlv0mwzmt5evu3aa4a4ewn8ne0weqku6q64wlsv";
  //Redeem script generated during the staking process.
  const redeemScript =
    "04d49bf965b17576a914a808bc3c1ba547b0ba2df4abf1396f35c4d23b4f88ac";
  const redeemScriptBuf = Buffer.from(redeemScript, "hex");
  //Address for receiving the unlocked BTC
  const destAddress = "2MzCBZ1eZLzeJib6ZJ9A5ZUSDTxg655YwBC";

  //Payment script of P2SH-P2WSH address
  const script = bitcoin.payments.p2wsh({
    redeem: {
      output: redeemScriptBuf,
      network,
    },
    network,
  }).output;

  //P2WSH
  const utxos = (await regtestUtils.unspents(cltvAddress)).map((utxo) => ({
    ...utxo,
    txid: utxo.txId,
    witnessUtxo: {
      script: script!,
      value: utxo.value,
    },
    witnessScript: redeemScriptBuf,
  }));

  let { inputs, outputs } = split(
    utxos,
    [
      {
        address: destAddress,
      },
    ],
    feeRate
  );

  //Update transaction fee by re-caculating signatures
  let signatureSize = 0;
  inputs!.forEach(() => {
    signatureSize += (72 + 66) / 4;
  });

  const signatureSizeFee = new Bignumber(signatureSize)
    .multipliedBy(new Bignumber(feeRate))
    .toNumber();

  const newOutValue = outputs![0].value! - signatureSizeFee;

  //locked btc can not cover the transaction fee
  if (newOutValue <= 0) {
    return;
  }

  outputs![0].value = Math.floor(outputs![0].value! - signatureSizeFee);

  const psbt = new bitcoin.Psbt({
    network,
  });

  //Must set lock time when unlocking
  psbt.setLocktime(lockTime);

  inputs?.forEach((input) =>
    psbt.addInput({
      hash:
        typeof input.txid === "string" ? input.txid : Buffer.from(input.txid),
      index: input.vout,
      ...(input.witnessUtxo
        ? {
            witnessUtxo: {
              script: Buffer.from(input.witnessUtxo.script),
              value: input.witnessUtxo.value,
            },
          }
        : {}),
      ...(input.witnessScript
        ? { witnessScript: Buffer.from(input.witnessScript) }
        : {}),
      //It's crucial to set the sequence less than 0xffffffff, or else the locktime will be disregarded.
      sequence: 0xffffffff - 1,
    })
  );

  outputs?.forEach((output) => {
    psbt.addOutput({
      ...(output.script
        ? { script: Buffer.from(output.script) }
        : { address: output.address! }),
      value: output.value ?? 0,
    });
  });

  inputs!.forEach((input, idx) => {
    psbt.signInput(idx, keyPair);
  });

  psbt.txInputs.forEach((input, idx) => {
    psbt.finalizeInput(
      idx,
      (inputIndex: number, input: PsbtInput, script: Buffer) => {
        if (!input.partialSig || !input.partialSig.length) {
          throw new Error(`tx was not fully signed`);
        }
        //P2PKH type redeemScript
        const paymentParams = {
          redeem: {
            input: bitcoin.script.compile([
              input.partialSig[0].signature,
              input.partialSig[0].pubkey,
            ]),
            output: script,
            network,
          },
          network,
        };
        //P2WSH
        const payment = bitcoin.payments.p2wsh(paymentParams);

        return {
          finalScriptSig: payment.input,
          finalScriptWitness: witnessStackToScriptWitness(payment.witness!),
        };
      }
    );
  });

  const txId = await regtestUtils.broadcast(psbt.extractTransaction().toHex());
  console.log(`txId: ${txId}`);
}
