import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Rating, Visit, ContactMessage, Subscriber } from '../models/index.js';
import { PUBLIC_USER_FIELDS } from '../models/User.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { imageUpload, documentUpload } from '../middleware/upload.js';
import { uploadImage, uploadFile } from '../services/uploadService.js';
import { getPublicSettings } from '../services/settingsService.js';
import { sendMail } from '../services/mailService.js';
import { getSettings } from '../services/settingsService.js';
import { ratingStats } from '../utils/ratings.js';

const r = Router();

/* ───────── Public runtime config (no secrets) ───────── */
r.get('/config/public', asyncHandler(async (_req, res) => {
  res.json(await getPublicSettings());
}));

/* ───────── Site rating & reviews ───────── */
export async function siteRatingSummary() {
  const [st, reviews] = await Promise.all([
    ratingStats({ targetType: 'site' }),
    Rating.find({ targetType: 'site', review: { $ne: '' }, value: { $gte: 4 } }).sort({ updatedAt: -1 }).limit(9).populate('user', PUBLIC_USER_FIELDS),
  ]);
  return { average: st.avg, count: st.count, distribution: st.distribution, reviews: reviews.filter((r) => r.user) };
}

r.get('/ratings/site', asyncHandler(async (req, res) => {
  const summary = await siteRatingSummary();
  const mine = req.user ? await Rating.findOne({ user: req.user._id, targetType: 'site' }) : null;
  res.json({ ...summary, mine: mine ? { value: mine.value, review: mine.review } : null });
}));

r.post('/ratings/site', requireAuth, asyncHandler(async (req, res) => {
  const value = Math.round(Number(req.body.value));
  if (!(value >= 1 && value <= 5)) throw new ApiError(400, 'Rating must be 1–5.');
  await Rating.findOneAndUpdate(
    { user: req.user._id, targetType: 'site', target: null },
    { value, review: String(req.body.review || '').slice(0, 500) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const summary = await siteRatingSummary();
  req.app.get('io')?.emit('site:rating', { average: summary.average, count: summary.count, distribution: summary.distribution });
  res.json({ ...summary, mine: { value, review: req.body.review || '' } });
}));

/* ───────── Uploads (imgbb for images, local disk for documents) ───────── */
r.post('/upload/image', requireAuth, imageUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image received.');
  res.status(201).json(await uploadImage(req.file));
}));

r.post('/upload/file', requireAuth, documentUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file received.');
  res.status(201).json(await uploadFile(req.file));
}));

/* ───────── Analytics ───────── */
const visitLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: false, legacyHeaders: false });
r.post('/analytics/visit', visitLimiter, asyncHandler(async (req, res) => {
  const path = String(req.body.path || '/').slice(0, 200);
  if (path.startsWith('/admin')) return res.json({ ok: true });
  await Visit.create({
    path,
    sessionId: req.sessionID,
    user: req.user?._id,
    ip: req.ip,
    userAgent: (req.get('user-agent') || '').slice(0, 300),
    referrer: String(req.body.referrer || '').slice(0, 300),
  });
  const total = await Visit.estimatedDocumentCount();
  res.json({ ok: true, total });
}));

/* ───────── Contact ───────── */
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10 });
r.post('/contact', contactLimiter, asyncHandler(async (req, res) => {
  const { name, email, subject, topic, preferredDate, message } = req.body;
  if (!name || !email || !message) throw new ApiError(400, 'Name, email and message are required.');
  const msg = await ContactMessage.create({ name, email, subject, topic, preferredDate: preferredDate || undefined, message, user: req.user?._id });
  const s = await getSettings();
  if (s.site.contactEmail) {
    sendMail({ to: s.site.contactEmail, subject: `[${s.site.name}] ${topic || 'Contact'}: ${subject || name}`, html: `<p><b>${name}</b> &lt;${email}&gt;</p><p>${String(message).replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>` }).catch(() => {});
  }
  req.app.get('io')?.to('admins').emit('admin:new-message', { name, subject: subject || topic });
  res.status(201).json({ ok: true, id: msg._id });
}));

/* ───────── Newsletter (also exposed via GraphQL) ───────── */
r.post('/newsletter', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new ApiError(400, 'Enter a valid email.');
  await Subscriber.updateOne({ email }, { email }, { upsert: true });
  res.json({ ok: true });
}));

export default r;
