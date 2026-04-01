import { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME, PINATA_JWT } from "./constants.js";

// Import storage implementations
import * as s3Storage from "./storage_s3.js";
import * as ipfsStorage from "./storage_ipfs.js";

// Determine which storage to use based on configuration
function getStorageType() {
    // Check if S3 is configured
    if (S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && S3_BUCKET_NAME) {
        console.log('Storage: Using S3 storage (configured with S3 credentials)');
        return 's3';
    }

    // Check if IPFS is configured
    if (PINATA_JWT) {
        console.log('Storage: Using IPFS storage (configured with PINATA_JWT)');
        return 'ipfs';
    }

    // If no storage is configured, throw an error
    throw new Error('No storage configured');
}

const storageType = getStorageType();

// Export the appropriate storage functions
export async function getStorage(key: string) {
    if (storageType === 's3') {
        return s3Storage.getStorage(key);
    } else {
        return ipfsStorage.getStorage(key);
    }
}

export async function setStorage(key: string, value: string) {
    if (storageType === 's3') {
        return s3Storage.setStorage(key, value);
    } else {
        return ipfsStorage.setStorage(key, value);
    }
}

export async function uploadFile(user: string, data: string) {
    if (storageType === 's3') {
        return s3Storage.uploadFile(user, data);
    } else {
        return ipfsStorage.uploadFile(user, data);
    }
}

export async function listFiles(prefix: string, after?: string) {

    if (storageType === 's3') {
        return s3Storage.listFiles(prefix, after);
    } else {
        return ipfsStorage.listFiles(prefix, after);
    }
}

export async function deleteStorage(key: string) {
    if (storageType === 's3') {
        return s3Storage.deleteStorage(key);
    } else {
        return ipfsStorage.deleteStorage(key);
    }
}

// Export storage type for debugging/logging purposes
export const STORAGE_TYPE = storageType;
