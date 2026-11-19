import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hireloom',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
  encryptionKey: process.env.SETTINGS_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'dev-encryption-key',
  trustProxy: bool(process.env.TRUST_PROXY),
  autoSeed: bool(process.env.AUTO_SEED, true),
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@hireloom.dev',
    username: (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
  },
  rootDir: path.resolve(__dirname, '../..'),
};

/** Raw env values used as defaults beneath dashboard-managed settings. */
export const envDefaults = {
  ai: {
    // Google Gemini is the only AI provider. Without a key the app runs in offline demo mode.
    provider: 'gemini',
    geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
    geminiModel: (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim(),
  },
  imgbb: { apiKey: process.env.IMGBB_API_KEY || '' },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  },
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
  },
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    secure: bool(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.MAIL_FROM_NAME || 'HireLoom',
    fromEmail: process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || '',
  },
};
