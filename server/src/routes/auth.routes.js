import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { User, Otp } from '../models/index.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { randomCode, sha256 } from '../utils/crypto.js';
import { startSession } from '../middleware/auth.js';
import { sendOtpEmail, sendWelcomeEmail } from '../services/mailService.js';
import { getSettings } from '../services/settingsService.js';
import { env } from '../config/env.js';

const r = Router();

const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many codes requested. Try again in a few minutes.' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please wait and try again.' } });

const RESERVED = new Set(['admin', 'root', 'support', 'help', 'api', 'hireloom', 'system', 'moderator', 'null', 'undefined', 'about', 'login', 'register']);
const USERNAME_RE = /^(?!.*\.\.)(?!\.)(?!.*\.$)[a-z0-9._]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[1-9]\d{7,14}$/;
const normPhone = (p = '') => String(p).replace(/[\s()-]/g, '');

export function validateUsername(u) {
  if (!u) return 'Username is required.';
  if (u.length < 3 || u.length > 30) return 'Use 3–30 characters.';
  if (!USERNAME_RE.test(u)) return 'Only letters, numbers, periods and underscores. No leading/trailing or double periods.';
  if (RESERVED.has(u)) return 'That username is reserved.';
  return null;
}

async function suggestUsernames(base) {
  const clean = (base || 'user').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20) || 'user';
  const year = new Date().getFullYear();
  const candidates = [`${clean}${Math.floor(Math.random() * 90 + 10)}`, `${clean}.${year % 100}`, `${clean}_dev`, `the.${clean}`, `${clean}${Math.floor(Math.random() * 900 + 100)}`];
  const taken = await User.find({ username: { $in: candidates } }).distinct('username');
  return candidates.filter((c) => !taken.includes(c) && !validateUsername(c)).slice(0, 3);
}

export async function uniqueUsername(base) {
  let u = (base || 'user').toLowerCase().replace(/[^a-z0-9._]/g, '').replace(/^\.+|\.+$/g, '').slice(0, 24) || 'user';
  if (u.length < 3) u = `${u}user`;
  if (!(await User.exists({ username: u })) && !RESERVED.has(u)) return u;
  for (let i = 0; i < 20; i++) {
    const c = `${u}${crypto.randomInt(10, 9999)}`;
    if (!(await User.exists({ username: c }))) return c;
  }
  return `${u}${Date.now().toString(36)}`;
}

function sessionInfo(req) {
  return {
    id: req.sessionID ? `${req.sessionID.slice(0, 6)}…${req.sessionID.slice(-4)}` : null,
    loginMethod: req.session.loginMethod,
    loginAt: req.session.loginAt,
    expiresAt: req.session.cookie?.expires,
    ip: req.session.ip,
    userAgent: req.session.userAgent,
  };
}

/* ───────── Real-time availability checks ───────── */
r.get('/check-username', asyncHandler(async (req, res) => {
  const username = String(req.query.username || '').trim().toLowerCase();
  const reason = validateUsername(username);
  if (reason) return res.json({ available: false, reason, suggestions: [] });
  const exists = await User.exists({ username });
  res.json({ available: !exists, reason: exists ? 'That username is taken.' : null, suggestions: exists ? await suggestUsernames(username) : [] });
}));

r.get('/check-email', asyncHandler(async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.json({ available: false, reason: 'Enter a valid email address.' });
  const exists = await User.exists({ email });
  res.json({ available: !exists, reason: exists ? 'An account already uses this email.' : null });
}));

/* ───────── OTP helpers ───────── */
async function issueOtp(channel, target) {
  await Otp.deleteMany({ channel, target });
  const code = randomCode(6);
  await Otp.create({ channel, target, codeHash: sha256(`${target}:${code}`), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  return code;
}

async function checkOtp(channel, target, code) {
  const otp = await Otp.findOne({ channel, target }).sort({ createdAt: -1 });
  if (!otp || otp.expiresAt < new Date()) throw new ApiError(400, 'Code expired. Request a new one.');
  if (otp.attempts >= 5) throw new ApiError(429, 'Too many wrong attempts. Request a new code.');
  if (otp.codeHash !== sha256(`${target}:${String(code).trim()}`)) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(400, `Incorrect code. ${5 - otp.attempts} attempt(s) left.`);
  }
  await Otp.deleteMany({ channel, target });
}

/* ───────── Email verification (Gmail-style) ───────── */
r.post('/email/send-otp', otpLimiter, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Enter a valid email address.');
  if (req.body.purpose !== 'update' && (await User.exists({ email }))) throw new ApiError(409, 'An account already uses this email.');
  const code = await issueOtp('email', email);
  const { delivered } = await sendOtpEmail(email, code);
  res.json({ sent: true, delivered, ...(delivered || env.isProd ? {} : { devCode: code }), message: delivered ? `Code sent to ${email}` : 'SMTP not configured — demo code shown on screen.' });
}));

r.post('/email/verify-otp', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  await checkOtp('email', email, req.body.code);
  req.session.verifiedEmail = email;
  if (req.user && req.body.purpose === 'update') {
    req.user.email = email;
    req.user.emailVerified = true;
    await req.user.save();
  }
  res.json({ verified: true, email });
}));

/* ───────── Phone verification ───────── */
r.post('/phone/send-otp', otpLimiter, asyncHandler(async (req, res) => {
  const phone = normPhone(req.body.phone);
  if (!PHONE_RE.test(phone)) throw new ApiError(400, 'Use international format, e.g. +8801XXXXXXXXX');
  if (req.body.purpose !== 'update' && (await User.exists({ phone }))) throw new ApiError(409, 'An account already uses this phone number.');
  const code = await issueOtp('phone', phone);
  console.log(`📱 [phone OTP — no SMS gateway, Firebase phone auth recommended] ${phone}: ${code}`);
  res.json({ sent: true, delivered: false, ...(env.isProd ? {} : { devCode: code }), message: 'Demo SMS mode — enable Firebase Phone Auth in the admin dashboard for real SMS.' });
}));

r.post('/phone/verify-otp', asyncHandler(async (req, res) => {
  const phone = normPhone(req.body.phone);
  await checkOtp('phone', phone, req.body.code);
  req.session.verifiedPhone = phone;
  if (req.user && req.body.purpose === 'update') {
    req.user.phone = phone;
    req.user.phoneVerified = true;
    await req.user.save();
  }
  res.json({ verified: true, phone });
}));

/** Verify a Firebase ID token with Google using only the web API key (no service account needed). */
export async function lookupFirebaseToken(idToken) {
  const { firebase } = await getSettings();
  if (!firebase.enabled || !firebase.apiKey) throw new ApiError(400, 'Firebase sign-in is not configured.');
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebase.apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.users?.[0]) throw new ApiError(401, json.error?.message ? `Firebase: ${json.error.message}` : 'Invalid Firebase token.');
  return json.users[0];
}

r.post('/phone/verify-firebase', asyncHandler(async (req, res) => {
  const fbUser = await lookupFirebaseToken(req.body.idToken);
  if (!fbUser.phoneNumber) throw new ApiError(400, 'Token has no verified phone number.');
  req.session.verifiedPhone = fbUser.phoneNumber;
  if (req.user && req.body.purpose === 'update') {
    req.user.phone = fbUser.phoneNumber;
    req.user.phoneVerified = true;
    await req.user.save();
  }
  res.json({ verified: true, phone: fbUser.phoneNumber });
}));

/* ───────── Register / login / logout ───────── */
r.post('/register', asyncHandler(async (req, res) => {
  const s = await getSettings();
  if (!s.site.allowRegistration) throw new ApiError(403, 'Registration is currently closed.');
  const { name, password, dateOfBirth, gender } = req.body;
  const username = String(req.body.username || '').trim().toLowerCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = req.body.phone ? normPhone(req.body.phone) : '';

  if (!name?.trim()) throw new ApiError(400, 'Name is required.');
  const uErr = validateUsername(username);
  if (uErr) throw new ApiError(400, uErr);
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'A valid email is required.');
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) throw new ApiError(400, 'Password needs 8+ characters with an uppercase letter and a number.');
  if (s.features.requireEmailVerification && req.session.verifiedEmail !== email) throw new ApiError(400, 'Please verify your email first.');
  if (phone && req.session.verifiedPhone !== phone && s.features.requirePhoneVerification) throw new ApiError(400, 'Please verify your phone number first.');
  if (s.features.requirePhoneVerification && !phone) throw new ApiError(400, 'A verified phone number is required.');

  const user = await User.create({
    name: name.trim(),
    username,
    email,
    ...(phone ? { phone } : {}),
    password,
    dateOfBirth: dateOfBirth || undefined,
    gender: gender || '',
    emailVerified: req.session.verifiedEmail === email,
    phoneVerified: !!phone && req.session.verifiedPhone === phone,
    avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(username)}&backgroundColor=e0e7ff,ffd5c2,d1f4e0`,
    providers: { local: true },
    lastLoginAt: new Date(),
    loginCount: 1,
  });
  delete req.session.verifiedEmail;
  delete req.session.verifiedPhone;
  await startSession(req, user, 'password');
  sendWelcomeEmail(user).catch((e) => console.warn('Welcome email failed:', e.message));
  req.app.get('io')?.to('admins').emit('admin:new-user', { username: user.username, name: user.name });
  res.status(201).json({ user: user.toSafeJSON(), session: sessionInfo(req) });
}));

r.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const identifier = String(req.body.identifier || '').trim().toLowerCase();
  const { password } = req.body;
  if (!identifier || !password) throw new ApiError(400, 'Enter your username/email and password.');
  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }, { phone: normPhone(identifier) }] }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Incorrect credentials.');
  if (user.status !== 'active') throw new ApiError(403, 'This account has been suspended.');
  user.lastLoginAt = new Date();
  user.loginCount += 1;
  await user.save();
  await startSession(req, user, 'password');
  res.json({ user: user.toSafeJSON(), session: sessionInfo(req) });
}));

/** Google / Phone / (optional) GitHub via Firebase → server session. */
r.post('/firebase', asyncHandler(async (req, res) => {
  const fb = await lookupFirebaseToken(req.body.idToken);
  const providerIds = (fb.providerUserInfo || []).map((p) => p.providerId);
  const method = providerIds.includes('google.com') ? 'google' : providerIds.includes('github.com') ? 'github' : providerIds.includes('phone') ? 'phone' : 'firebase';
  const email = fb.email?.toLowerCase();
  const phone = fb.phoneNumber;

  let user = await User.findOne({ 'providers.firebaseUid': fb.localId });
  if (!user && email) user = await User.findOne({ email });
  if (!user && phone) user = await User.findOne({ phone });

  let created = false;
  if (!user) {
    const s = await getSettings();
    if (!s.site.allowRegistration) throw new ApiError(403, 'Registration is currently closed.');
    const base = email ? email.split('@')[0] : fb.displayName || `user${phone?.slice(-4) || ''}`;
    user = new User({
      name: fb.displayName || (email ? email.split('@')[0] : 'New member'),
      username: await uniqueUsername(base),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      emailVerified: !!fb.emailVerified,
      phoneVerified: !!phone,
      avatar: fb.photoUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${fb.localId}`,
    });
    created = true;
  }
  if (user.status !== 'active') throw new ApiError(403, 'This account has been suspended.');
  user.providers.firebaseUid = fb.localId;
  if (method === 'google') user.providers.google = true;
  if (method === 'phone') user.providers.phone = true;
  if (method === 'github') user.providers.github = user.providers.github || fb.localId;
  if (phone && !user.phone) user.phone = phone;
  user.lastLoginAt = new Date();
  user.loginCount += 1;
  await user.save();
  await startSession(req, user, method);
  if (created) {
    sendWelcomeEmail(user).catch((e) => console.warn('Welcome email failed:', e.message));
    req.app.get('io')?.to('admins').emit('admin:new-user', { username: user.username, name: user.name });
  }
  res.json({ user: user.toSafeJSON(), created, session: sessionInfo(req) });
}));

/* ───────── GitHub OAuth (keys managed in the admin dashboard) ───────── */
r.get('/github', asyncHandler(async (req, res) => {
  const { github } = await getSettings();
  if (!github.enabled || !github.clientId || !github.clientSecret) return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent('GitHub sign-in is not configured yet.')}`);
  const state = crypto.randomBytes(16).toString('hex');
  req.session.githubState = state;
  req.session.returnTo = typeof req.query.returnTo === 'string' && req.query.returnTo.startsWith('/') && !req.query.returnTo.startsWith('//') ? req.query.returnTo : '/dashboard';
  // By default redirect_uri is NOT sent: GitHub then uses the "Authorization callback URL" registered on the
  // OAuth app, which avoids the "redirect_uri is not associated with this application" error caused by
  // localhost vs 127.0.0.1, port 5000 vs 5173, http vs https or a trailing-slash mismatch.
  const params = new URLSearchParams({ client_id: github.clientId.trim(), scope: github.scope || 'read:user user:email', state, allow_signup: 'true' });
  if (github.sendRedirectUri) params.set('redirect_uri', github.callbackUrl.trim());
  req.session.save(() => res.redirect(`https://github.com/login/oauth/authorize?${params}`));
}));

r.get('/github/callback', asyncHandler(async (req, res) => {
  try {
    await githubCallback(req, res);
  } catch (e) {
    console.error('GitHub callback failed:', e.message);
    if (!res.headersSent) res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent('GitHub sign-in failed — please try again.')}`);
  }
}));

async function githubCallback(req, res) {
  const fail = (m) => res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent(m)}`);
  const { code, state } = req.query;
  if (req.query.error) {
    if (req.query.error === 'access_denied') return fail('GitHub sign-in was cancelled.');
    if (req.query.error === 'redirect_uri_mismatch') return fail('GitHub callback URL mismatch — copy the callback URL from Admin → Settings → GitHub into your GitHub OAuth app.');
    return fail(String(req.query.error_description || req.query.error));
  }
  if (!code || !state || state !== req.session.githubState) return fail('GitHub sign-in expired. Please try again.');
  delete req.session.githubState;
  const { github } = await getSettings();

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: github.clientId.trim(), client_secret: github.clientSecret.trim(), code, ...(github.sendRedirectUri ? { redirect_uri: github.callbackUrl.trim() } : {}) }),
  });
  const token = await tokenRes.json().catch(() => ({}));
  if (!token.access_token) return fail(token.error_description || 'GitHub token exchange failed.');
  const gh = { Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'HireLoom', Accept: 'application/vnd.github+json' };
  const profileRes = await fetch('https://api.github.com/user', { headers: gh });
  const profile = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok || !profile.id) return fail('Could not read your GitHub profile. Please try again.');
  let email = profile.email;
  if (!email) {
    const emails = await (await fetch('https://api.github.com/user/emails', { headers: gh })).json().catch(() => []);
    email = Array.isArray(emails) ? (emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified))?.email : null;
  }
  email = email?.toLowerCase();

  let user = await User.findOne({ 'providers.github': String(profile.id) });
  if (!user && email) user = await User.findOne({ email });
  let created = false;
  if (!user) {
    const s = await getSettings();
    if (!s.site.allowRegistration) return fail('Registration is currently closed.');
    user = new User({
      name: profile.name || profile.login,
      username: await uniqueUsername(profile.login),
      ...(email ? { email, emailVerified: true } : {}),
      avatar: profile.avatar_url,
      bio: profile.bio || '',
      website: profile.blog || '',
      socials: [{ platform: 'GitHub', url: profile.html_url }],
    });
    created = true;
  }
  if (user.status !== 'active') return fail('This account has been suspended.');
  user.providers.github = String(profile.id);
  user.lastLoginAt = new Date();
  user.loginCount += 1;
  await user.save();
  const returnTo = req.session.returnTo || '/dashboard';
  await startSession(req, user, 'github');
  if (created) sendWelcomeEmail(user).catch(() => {});
  res.redirect(`${env.clientUrl}${returnTo}${returnTo.includes('?') ? '&' : '?'}welcome=github`);
}

r.post('/logout', (req, res, next) => {
  const name = req.session?.cookie ? 'hl.sid' : null;
  req.session.destroy((err) => {
    if (err) return next(err);
    if (name) res.clearCookie(name);
    res.json({ ok: true });
  });
});

r.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user.toSafeJSON(), session: sessionInfo(req) });
});

export default r;
