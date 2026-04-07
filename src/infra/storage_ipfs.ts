import { PRIVATE_KEY, ENCRYPTION_SEED, HOUR_IN_SECONDS, PINATA_JWT, CONTENT_LENGTH_LIMIT, USER_UPLOAD_DAILY_LIMIT, DAY_IN_SECONDS } from "./constants.js";
import { Wallet } from "ethers";
import { encrypt, decrypt } from "./misc.js";
import { PinataIPFS } from "alith/data/storage";
import { getCache, setCache } from "./cache.js";
import { v4 as uuidv4 } from 'uuid';

const password = await new Wallet(PRIVATE_KEY).signMessage(ENCRYPTION_SEED);
const ipfs = new PinataIPFS();

export async function getStorage(key: string) {
    const url = await ipfs.getShareLink({ token: PINATA_JWT, id: key });
    const response = await fetch(url);
    const data = await response.text();
    return decrypt(data, password);
}

export async function setStorage(key: string, value: string) {
    const encryptedValue = encrypt(value, password);
    const fileMeta = await ipfs.upload({
        name: key,
        data: Buffer.from(encryptedValue),
        token: PINATA_JWT,
    });
    return await ipfs.getShareLink({ token: PINATA_JWT, id: fileMeta.id });
}

export async function deleteStorage(key: string) {
    throw new Error('IPFS deleteStorage is not implemented');
}

export async function uploadFile(user: string, data: string) {
    data = Buffer.from(data, 'base64').toString('utf-8');

    const contentLength = data.length;
    if (contentLength > CONTENT_LENGTH_LIMIT) {
        throw new Error('Content length limit exceeded');
    }

    // check user daily upload limit
    const dateString = new Date().toISOString().split('T')[0];
    const userKey = `user-upload-daily-usage:${user}/${dateString}`;
    const dailyUsage = parseInt(await getCache(userKey) || '0');

    if (dailyUsage + contentLength > USER_UPLOAD_DAILY_LIMIT) {
        throw new Error('Daily upload limit exceeded');
    }

    await setCache(userKey, (dailyUsage + contentLength).toString(), DAY_IN_SECONDS);

    const fileMeta = await ipfs.upload({
        name: `${user}/${uuidv4()}`,
        data: Buffer.from(data),
        token: PINATA_JWT,
    });

    return await ipfs.getShareLink({ token: PINATA_JWT, id: fileMeta.id });
}

export async function listFiles(prefix: string, after?: string) {
    throw new Error('IPFS listFiles is not implemented');
} 