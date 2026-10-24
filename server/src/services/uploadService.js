import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getSettings } from './settingsService.js';
import { env } from '../config/env.js';

export const UPLOAD_DIR = path.join(env.rootDir, 'uploads');

async function saveLocal(buffer, originalName) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(originalName || '').toLowerCase().slice(0, 8) || '.bin';
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

/** Upload an image to imgbb; falls back to local disk when no key is configured. */
export async function uploadImage(file) {
  const { imgbb } = await getSettings();
  if (!imgbb.apiKey) {
    const url = await saveLocal(file.buffer, file.originalname);
    return { url, thumb: url, provider: 'local' };
  }
  const body = new URLSearchParams();
  body.set('image', file.buffer.toString('base64'));
  body.set('name', path.parse(file.originalname || 'image').name.slice(0, 60));
  const qs = new URLSearchParams({ key: imgbb.apiKey });
  if (Number(imgbb.expiration) > 0) qs.set('expiration', String(imgbb.expiration));
  const res = await fetch(`https://api.imgbb.com/1/upload?${qs}`, { method: 'POST', body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.data?.url) {
    const msg = json?.error?.message || `imgbb upload failed (${res.status})`;
    throw Object.assign(new Error(msg), { status: 502 });
  }
  return { url: json.data.display_url || json.data.url, thumb: json.data.thumb?.url || json.data.url, provider: 'imgbb', deleteUrl: json.data.delete_url };
}

export async function uploadFile(file) {
  const url = await saveLocal(file.buffer, file.originalname);
  return { url, name: file.originalname, size: file.size, mime: file.mimetype };
}
