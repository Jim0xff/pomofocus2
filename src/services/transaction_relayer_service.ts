import { BigNumberish, Contract, ethers, Wallet } from 'ethers';

import { AllowanceTransfer, PermitSingle, PERMIT2_ADDRESS, AllowanceProvider } from '@uniswap/permit2-sdk';
import { Web3Provider } from "@ethersproject/providers";
import { COING_GECKO_URL, CUREENCY_TOKEN_TO_ID_DECODE, RELAYER_MAP_DECODE, RPC_URL_MAP_DECODE, USD_TARGET_VALUE_DECODE, X402_SWAP_CONTRACT_ADDRESS, X402_SWAP_CONTRACT_ADDRESS_MAP_DECODE } from '../infra/constants.js';
import { UserInfo } from '../infra/auth.js';
import { getRepository } from '../infra/datasource.js';
import { delCache, getCache, setCache, tryLock, withLock } from '../infra/cache.js';
import { RemainToken } from '../models/remain_tokens.js';


// const provider = new ethers.JsonRpcProvider("https://metis-mainnet.public.blastapi.io");
const provider = new ethers.JsonRpcProvider("https://sepolia.metisdevops.link");
const signer = new Wallet('0xccc61019e6a49bcc428812c80c8ddebeebbe8530213d2ac4699909248cf32e92', provider);
// const chanId = 1088;
const chanId = 1088;
const xMetisAddress = "0x2Cb214B44D7391993d0ed7d7beFB63c220431D5b";
const providers = {};


const remainTokenRepository = getRepository(RemainToken);

export async function testSign(chainId: string) {
    //return await signPermit2Single(signer, "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000", "0x0b7f92047DbAC8D48DC9C5BFA488724eEa48d0e3", ethers.parseEther("0.1"),  chanId);
    return await eic3009Sign(signer, X402_SWAP_CONTRACT_ADDRESS_MAP_DECODE[chainId]);
}


export async function eic3009Sign(signer: ethers.Signer, swapContractAddress: string
) {
    const domain = {
        name: "xMetis",
        version: "1",
        chainId: 59902,
        verifyingContract: xMetisAddress,
    };

    const types = {
        TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
        ],
    };
    const userAddress = await signer.getAddress();

    const message = {
        from: userAddress,
        to: swapContractAddress,
        value: "109433960209424631",
        validAfter: 0,
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        nonce: ethers.hexlify(ethers.randomBytes(32)),
    };

    const signature = await signer.signTypedData(domain, types, message);
    const vrs = ethers.Signature.from(signature);

    return { signature, message, vrs };
}


export async function getRemainInfo(
    chainId: string,
    targetToken: string
) {
    return await remainTokenRepository.findOne({ where: { targetToken: targetToken, chainId: chainId } });
}


function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Operation timed out")), timeoutMs)
      )
    ]);
  }
  

  
