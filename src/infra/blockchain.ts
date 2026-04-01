import { Contract, Interface, JsonRpcProvider, Wallet } from "ethers";
import { logger } from "./logger.js";
import axios from "axios";
import { AIRDROP_CONTRACT_ADDRESS, DATA_ANCHOR_TOKEN_ADDRESS, DATA_REGISTRY_ADDRESS, METIS_PRIVATE_KEY, METIS_RPC_URL, RPC_URL, SUBGRAPH_URL } from "./constants.js";
import { randomBytes } from "crypto";


import { DATA_REGISTRY_CONTRACT_ABI } from "alith/lazai";
import { PRIVATE_KEY } from "./constants.js";

export const provider = new JsonRpcProvider(RPC_URL);
export const wallet = new Wallet(PRIVATE_KEY, provider);
export const metisProvider = new JsonRpcProvider(METIS_RPC_URL);
export const metisWallet = new Wallet(METIS_PRIVATE_KEY, metisProvider);

export async function querySubgraph(query: string, variables: any = {}) {
    const res = await axios({
        url: SUBGRAPH_URL,
        data: { query, variables },
        method: 'POST',
    });

    if (res.data.errors) {
        logger.error('querySubgraph query=%s (variables=%s) error=%s', query, JSON.stringify(variables), JSON.stringify(res.data));
    }

    return res.data.data;
}

export function parseError(e: any) {
    const iface = new Interface(['error Error(string)']);
    let msg = e.message;
    try {
        const err = iface.parseError(e?.data);
        msg = err?.args?.[0];
    } catch {
    }
    return msg || JSON.stringify(e);
}

export function addressModWithRandom(
    address: string,
    mod: number | bigint
  ): {
    result: bigint;
    salt: string;
  } {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error("Invalid EVM address");
    }
  
    const bigMod = BigInt(mod);
    if (bigMod <= 0n) {
      throw new Error("mod must be > 0");
    }
  
    // 1️⃣ 生成随机 salt（8 bytes）
    const salt = "0x" + randomBytes(8).toString("hex");
  
    // 2️⃣ 拼接 address + salt
    const combinedHex = address + salt.slice(2);
  
    // 3️⃣ BigInt 取模
    const value = BigInt(combinedHex);
    const result = value % bigMod;
  
    return { result, salt };
  }
