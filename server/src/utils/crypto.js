import crypto from 'node:crypto';
import { env } from '../config/env.js';

const KEY = crypto.createHash('sha256').update(String(env.encryptionKey)).digest();
const PREFIX = 'enc:v1:';

/** AES-256-GCM — secrets stored in MongoDB are never kept in plain text. */
export function encrypt(plain) {
  if (plain === undefined || plain === null || plain === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(value) {
  if (!value || typeof value !== 'string' || !value.startsWith(PREFIX)) return value || '';
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    console.warn('⚠  Could not decrypt a stored secret — was SETTINGS_ENCRYPTION_KEY changed?');
    return '';
  }
}

export const MASK = '••••••••';
export function mask(value) {
  if (!value) return '';
  const s = String(value);
  return MASK + s.slice(-4);
}
export const isMasked = (v) => typeof v === 'string' && v.startsWith(MASK);

export const randomCode = (len = 6) =>
  Array.from({ length: len }, () => crypto.randomInt(0, 10)).join('');

export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
