import crypto from "crypto";


export function encrypt(value: string, password: string) {
    // Simple AES encryption using Web Crypto API (Node.js >= v15)
    // Returns base64 encoded ciphertext with IV prepended (iv:ciphertext)
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(password).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    // Prepend IV (base64) to ciphertext, separated by ':'
    return iv.toString('base64') + ':' + encrypted;
}

export function decrypt(value: string, password: string) {
    const [ivBase64, encrypted] = value.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const key = crypto.createHash('sha256').update(password).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export function timeAgo(date: Date) {
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 1) {
        return `${days} days ago`;
    } else if (hours > 1) {
        return `${hours} hours ago`;
    } else if (minutes > 1) {
        return `${minutes} minutes ago`;
    } else if (seconds > 1) {
        return `${seconds} seconds ago`;
    } else {
        return 'just now';
    }
}