import { Setting } from '../models/index.js';
import { env, envDefaults } from '../config/env.js';
import { encrypt, decrypt, mask, isMasked } from '../utils/crypto.js';
import { DEFAULT_WELCOME_HTML } from './mailTemplates.js';

/** Fields stored encrypted at rest and masked in the admin UI. */
export const SECRET_PATHS = [
  'ai.openaiApiKey',
  'ai.geminiApiKey',
  'ai.compatibleApiKey',
  'imgbb.apiKey',
  'github.clientSecret',
  'mail.pass',
];

const DEFAULTS = () => ({
  site: {
    name: 'HireLoom',
    tagline: 'Weave a career story recruiters can’t ignore.',
    description:
      'AI-assisted resume & CV builder, ATS checker, cover-letter studio and a community tech journal — all in one workspace.',
    heroTitle: 'Craft the résumé that gets the call.',
    heroSubtitle:
      'Professional templates, an honest ATS score, AI cover letters and a community of builders — designed for people who take their careers seriously.',
    contactEmail: 'hello@hireloom.dev',
    phone: '+880 1700-000000',
    address: 'Gulshan Avenue, Dhaka 1212, Bangladesh',
    mapQuery: 'Gulshan Avenue, Dhaka',
    mapLat: 23.7925,
    mapLng: 90.4078,
    social: { facebook: 'https://facebook.com', linkedin: 'https://linkedin.com', github: 'https://github.com', x: 'https://x.com', youtube: 'https://youtube.com' },
    allowRegistration: true,
    maintenanceMode: false,
    announcement: '',
  },
  features: {
    requireEmailVerification: true,
    requirePhoneVerification: false,
    autoApproveAdminPosts: true,
    blogPostsPerPage: 9,
  },
  firebase: {
    enabled: false,
    googleEnabled: true,
    phoneEnabled: true,
    githubViaFirebase: false,
    ...envDefaults.firebase,
    measurementId: '',
  },
  github: {
    enabled: false,
    ...envDefaults.github,
    callbackUrl: '',
    scope: 'read:user user:email',
  },
  imgbb: { ...envDefaults.imgbb, expiration: 0 },
  ai: {
    ...envDefaults.ai,
    temperature: 0.7,
    maxTokens: 1400,
    resumeSystemPrompt:
      'You are an expert career writer and certified professional resume writer. Produce concise, quantified, ATS-friendly content. Never invent employers or degrees the user did not provide.',
    coverLetterSystemPrompt:
      'You are a senior recruiter who writes persuasive, specific cover letters. Keep them truthful, warm and professional, 250–380 words, no clichés, no placeholders like [Company].',
    atsSystemPrompt:
      'You are an ATS (Applicant Tracking System) optimisation specialist. Give precise, actionable feedback in Markdown with short headings and bullet points.',
  },
  chatbot: {
    enabled: true,
    name: 'Loom',
    greeting: 'Hi! I’m Loom, your career co-pilot. Ask me about resumes, interviews, salaries or tech careers.',
    systemPrompt:
      'You are Loom, the friendly career assistant of HireLoom. Help with resumes, CVs, cover letters, interviews, job search and technology careers. Be concise, practical and encouraging. Use Markdown.',
    suggestions: ['How do I beat ATS filters?', 'Rewrite my summary for a backend role', 'Top interview questions for React developers', 'How to negotiate my first salary?'],
    historyLimit: 12,
  },
  mail: {
    enabled: false,
    ...envDefaults.mail,
    sendWelcome: true,
    welcomeSubject: 'Welcome to {{siteName}}, {{name}} ✨',
    welcomeHtml: DEFAULT_WELCOME_HTML,
  },
  media: {
    videos: [
      { title: 'But what is a neural network?', youtubeId: 'aircAruvnKk', channel: '3Blue1Brown' },
      { title: 'React in 100 Seconds', youtubeId: 'Tn6-PIqc4UM', channel: 'Fireship' },
      { title: 'Introduction to Programming & CS', youtubeId: 'zOjov-2OZ0E', channel: 'freeCodeCamp' },
      { title: 'Python for Beginners', youtubeId: 'kqtD5dpn9C8', channel: 'Programming with Mosh' },
    ],
    audios: [
      { title: 'Deep Focus — Coding Session', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { title: 'Interview Day Calm', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
      { title: 'Late Night Deploy', artist: 'SoundHelix', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    ],
  },
  ml: {
    tfliteModelUrl: 'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite',
    labelsUrl: 'https://storage.googleapis.com/download.tensorflow.org/data/ImageNetLabels.txt',
    wasmPath: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/wasm/',
  },
});

/* ── tiny object helpers ── */
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
function deepMerge(base, over) {
  if (!isObj(over)) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (isObj(v) && isObj(base?.[k])) out[k] = deepMerge(base[k], v);
    else if (v !== undefined && v !== null && !(v === '' && typeof base?.[k] === 'string' && base[k] !== '' && SECRET_OR_ENV(k))) out[k] = v;
  }
  return out;
}
// empty DB strings must not wipe a non-empty env default for credential-like keys
const SECRET_OR_ENV = (k) => /key|secret|pass|clientId|host|user|apiKey|projectId|authDomain|appId|fromEmail/i.test(k);

const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => {
  const keys = p.split('.');
  let cur = o;
  keys.slice(0, -1).forEach((k) => {
    if (!isObj(cur[k])) cur[k] = {};
    cur = cur[k];
  });
  cur[keys.at(-1)] = v;
};

let cache = null;
let cacheAt = 0;
const TTL = 30_000;

async function loadDoc() {
  let doc = await Setting.findOne({ key: 'global' });
  if (!doc) doc = await Setting.create({ key: 'global', data: {} });
  return doc;
}

/** Full, decrypted, merged settings (server-side only). */
export async function getSettings(force = false) {
  if (!force && cache && Date.now() - cacheAt < TTL) return cache;
  const doc = await loadDoc();
  const stored = structuredClone(doc.data || {});
  SECRET_PATHS.forEach((p) => {
    const v = getPath(stored, p);
    if (v) setPath(stored, p, decrypt(v));
  });
  const merged = deepMerge(DEFAULTS(), stored);
  if (!merged.github.callbackUrl) merged.github.callbackUrl = `${env.clientUrl}/api/auth/github/callback`;
  cache = merged;
  cacheAt = Date.now();
  return merged;
}

export function invalidateSettings() {
  cache = null;
}

export function aiReady(s) {
  const a = s.ai;
  if (a.provider === 'openai') return !!a.openaiApiKey;
  if (a.provider === 'gemini') return !!a.geminiApiKey;
  if (a.provider === 'openai-compatible') return !!(a.compatibleBaseUrl && a.compatibleModel);
  return false;
}

/** Safe subset for the browser — no secrets ever leave the server here. */
export async function getPublicSettings() {
  const s = await getSettings();
  const fb = s.firebase;
  const firebaseReady = fb.enabled && fb.apiKey && fb.authDomain && fb.projectId && fb.appId;
  return {
    site: s.site,
    features: s.features,
    auth: {
      google: !!(firebaseReady && fb.googleEnabled),
      phone: !!(firebaseReady && fb.phoneEnabled),
      github: !!(s.github.enabled && s.github.clientId && s.github.clientSecret) || !!(firebaseReady && fb.githubViaFirebase),
      githubMode: firebaseReady && fb.githubViaFirebase ? 'firebase' : 'oauth',
      emailOtp: true,
    },
    firebase: firebaseReady
      ? {
          apiKey: fb.apiKey,
          authDomain: fb.authDomain,
          projectId: fb.projectId,
          storageBucket: fb.storageBucket,
          messagingSenderId: fb.messagingSenderId,
          appId: fb.appId,
          measurementId: fb.measurementId,
        }
      : null,
    chatbot: { enabled: s.chatbot.enabled, name: s.chatbot.name, greeting: s.chatbot.greeting, suggestions: s.chatbot.suggestions },
    ai: { provider: s.ai.provider, ready: aiReady(s) },
    media: s.media,
    ml: s.ml,
    mailReady: !!(s.mail.enabled && s.mail.host && s.mail.user && s.mail.pass),
  };
}

/** Admin view — secrets masked. */
export async function getAdminSettings() {
  const s = structuredClone(await getSettings(true));
  SECRET_PATHS.forEach((p) => setPath(s, p, mask(getPath(s, p))));
  return s;
}

/** Partial update from the admin dashboard. Masked secrets are ignored, new secrets encrypted. */
export async function updateSettings(partial) {
  const doc = await loadDoc();
  const data = structuredClone(doc.data || {});
  const defaults = DEFAULTS();

  const walk = (obj, prefix = '') => {
    for (const [k, v] of Object.entries(obj || {})) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (getPath(defaults, p) === undefined && !prefix) continue; // unknown top-level section
      if (isObj(v)) walk(v, p);
      else if (SECRET_PATHS.includes(p)) {
        if (isMasked(v)) continue; // untouched
        setPath(data, p, v ? encrypt(v) : '');
      } else setPath(data, p, v);
    }
  };
  walk(partial);
  doc.data = data;
  doc.markModified('data');
  await doc.save();
  invalidateSettings();
  return getAdminSettings();
}
