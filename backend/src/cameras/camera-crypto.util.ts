import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const b64 = process.env.CAMERA_SECRET_KEY || '';
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) {
    // Fallback for dev only: derive a 32-byte key so the app doesn't crash
    // if a real key hasn't been configured yet.
    return crypto.createHash('sha256').update(b64 || 'dev-only-key').digest();
  }
  return key;
}

export function encryptSecret(plain?: string): string | undefined {
  if (!plain) return undefined;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSecret(payload?: string): string | undefined {
  if (!payload) return undefined;
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}
