import { PRIVATE_KEY, ENCRYPTION_SEED, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET_NAME, S3_ENDPOINT, CONTENT_LENGTH_LIMIT, USER_UPLOAD_DAILY_LIMIT, DAY_IN_SECONDS, USER_UPLOAD_IMAGE_DAILY_LIMIT } from "./constants.js";
import { Wallet } from "ethers";
import { encrypt, decrypt } from "./misc.js";
import { S3Client, GetObjectCommand, PutObjectCommand, PutObjectAclCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getCache, setCache } from "./cache.js";
import { v4 as uuidv4 } from 'uuid';
import { logger } from "./logger.js";

const password = await new Wallet(PRIVATE_KEY).signMessage(ENCRYPTION_SEED);

// Initialize S3 client for S3-compatible services
const s3Client = new S3Client({
    region: S3_REGION,
    credentials: {
        accessKeyId: S3_ACCESS_KEY_ID!,
        secretAccessKey: S3_SECRET_ACCESS_KEY!,
    },
    ...(S3_ENDPOINT && {
        endpoint: 'https://' + S3_ENDPOINT,
        forcePathStyle: true, // Required for S3-compatible services like MinIO
    }),
});

export async function getStorage(key: string) {
    logger.info(`getStorage: ${key}`);
    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);
        const data = await response.Body?.transformToString();

        if (!data) {
            throw new Error('No data found');
        }

        return decrypt(data, password);
    } catch (error) {
        console.error('Error getting storage from S3:', error);
        throw new Error('Failed to retrieve data from S3');
    }
}

export async function setStorage(key: string, value: string) {
    logger.info(`setStorage: ${key}`);
    try {
        const encryptedValue = encrypt(value, password);

        const command = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: key,
            Body: encryptedValue,
            ContentType: 'text/plain',
        });

        await s3Client.send(command);

        // Return permanent public URL for public bucket
        return S3_ENDPOINT
            ? `${S3_ENDPOINT}/${S3_BUCKET_NAME}/${key}`
            : `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${key}`;
    } catch (error) {
        console.error('Error setting storage to S3:', error);
        throw new Error('Failed to store data to S3');
    }
}

export async function listFiles(prefix: string, after?: string) {
    const command = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: prefix,
        StartAfter: after,
    });

    const response = await s3Client.send(command);
    return response.Contents?.map(({ Key, LastModified }) => ({ Key, LastModified }));
}

export async function deleteStorage(key: string) {
    logger.info(`deleteStorage: ${key}`);
    const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);
}

export async function uploadFile(user: string, data: string) {
    logger.info(`uploadFile: ${user} ${data.slice(0, 10)}...`);
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

    try {
        const fileKey = `users/${user}/${uuidv4()}`;

        const command = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: fileKey,
            Body: data,
            ContentType: 'application/octet-stream',
        });

        await s3Client.send(command);
        // set file as public
        await s3Client.send(new PutObjectAclCommand({
            Bucket: S3_BUCKET_NAME,
            Key: fileKey,
            ACL: 'public-read',
        }));

        // Return permanent public URL for public bucket
        return S3_ENDPOINT
            ? `https://${S3_ENDPOINT}/${S3_BUCKET_NAME}/${fileKey}`
            : `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        throw new Error('Failed to upload file to S3');
    }
}

export async function uploadImage(user: string, data: any) {
    const contentLength = data.length;
    if (contentLength > CONTENT_LENGTH_LIMIT) {
        throw new Error('Content length limit exceeded');
    }
    // check user daily upload limit
    const dateString = new Date().toISOString().split('T')[0];
    const userKey = `user-image-upload-daily-usage:${user}/${dateString}`;
    const dailyUsage = parseInt(await getCache(userKey) || '0');

    if (dailyUsage + contentLength > USER_UPLOAD_IMAGE_DAILY_LIMIT) {
        throw new Error('Daily upload limit exceeded');
    }

    await setCache(userKey, (dailyUsage + contentLength).toString(), DAY_IN_SECONDS);

    try {
        const fileKey = `users/chatImage/${user}/${uuidv4()}.png`;

        const command = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: fileKey,
            Body: data,
            ContentType: 'image/png',
        });

        await s3Client.send(command);
        // set file as public
        await s3Client.send(new PutObjectAclCommand({
            Bucket: S3_BUCKET_NAME,
            Key: fileKey,
            ACL: 'public-read',
        }));

        // Return permanent public URL for public bucket
        return S3_ENDPOINT
            ? `https://${S3_ENDPOINT}/${S3_BUCKET_NAME}/${fileKey}`
            : `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        throw new Error('Failed to upload file to S3');
    }
}
