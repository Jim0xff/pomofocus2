import { BigNumberish, BytesLike, getBytes, solidityPackedKeccak256, Wallet } from "ethers";
import { PERMIT_EXPIRE_TIME, PRIVATE_KEY } from "./constants.js";

const signer = new Wallet(PRIVATE_KEY);

export async function signPermit(nonce: number, permitType: number, dataHash: string, expire: number): Promise<PermitStruct> {
    const hash = solidityPackedKeccak256(["uint8", "uint128", "uint256", "uint"], [permitType, nonce, dataHash, expire]);
    const sig = await signer.signMessage(getBytes(hash));
    return { permitType, nonce, dataHash, expire, sig };
}

export type PermitStruct = {
    permitType: number;
    nonce: number;
    dataHash: string;
    expire: number;
    sig: string;
};

