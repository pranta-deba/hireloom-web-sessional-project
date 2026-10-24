import { Router } from 'express';
import { User, Blog, Resume, CoverLetter, AtsReport, Template, Comment, Visit, ContactMessage, Subscriber, Rating } from '../models/index.js';
import { PUBLIC_USER_FIELDS } from '../models/User.js';
import { asyncHandler, ApiError, paginate, pageMeta, escapeRegex } from '../utils/http.js';
import { requireAdmin } from '../middleware/auth.js';
import { getAdminSettings, updateSettings, getSettings } from '../services/settingsService.js';
import { verifyTransport, sendMail, sendWelcomeEmail } from '../services/mailService.js';
import { render } from '../services/mailTemplates.js';
import { completeChat } from '../services/aiService.js';
import { serializeBlog } from './blog.routes.js';
import { env } from '../config/env.js';
import { ratingStats } from '../utils/ratings.js';

const r = Router();
r.use(requireAdmin);

function lastNDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/* ───────── Overview ───────── */
r.get('/stats', asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 13 * 864e5);
  since.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [users, admins, banned, blogs, pending, resumes, letters, ats, templates, comments, subscribers, messages, unread, totalVisits, todayVisits, uniqueSessions, visitsDaily, signupsDaily, topPages, recentUsers, siteRating] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ status: 'banned' }),
    Blog.countDocuments({ status: 'approved' }),
    Blog.countDocuments({ status: 'pending' }),
    Resume.countDocuments({ isSample: { $ne: true } }),
    CoverLetter.countDocuments(),
    AtsReport.countDocuments(),
    Template.countDocuments(),
    Comment.countDocuments(),
    Subscriber.countDocuments(),
    ContactMessage.countDocuments(),
    ContactMessage.countDocuments({ read: false }),
    Visit.countDocuments(),
    Visit.countDocuments({ createdAt: { $gte: today } }),
    Visit.distinct('sessionId').then((a) => a.length),
    Visit.find({ createdAt: { $gte: since } }).select('createdAt sessionId -_id').lean(),
    User.find({ createdAt: { $gte: since } }).select('createdAt -_id').lean(),
    Visit.aggregate([{ $group: { _id: '$path', views: { $sum: 1 } } }, { $sort: { views: -1 } }, { $limit: 8 }]),
    User.find().sort({ createdAt: -1 }).limit(6).select('username name avatar email createdAt role providers'),
    ratingStats({ targetType: 'site' }),
  ]);
  // bucket per UTC day in JS (portable across MongoDB-compatible engines)
  const vMap = {};
  visitsDaily.forEach((v) => {
    const d = new Date(v.createdAt).toISOString().slice(0, 10);
    vMap[d] ??= { views: 0, set: new Set() };
    vMap[d].views += 1;
    vMap[d].set.add(v.sessionId);
  });
  Object.values(vMap).forEach((v) => (v.visitors = v.set.size));
  const sMap = {};
  signupsDaily.forEach((u) => {
    const d = new Date(u.createdAt).toISOString().slice(0, 10);
    sMap[d] = (sMap[d] || 0) + 1;
  });
  const io = req.app.get('io');
  res.json({
    totals: { users, admins, banned, blogs, pending, resumes, letters, ats, templates, comments, subscribers, messages, unread, totalVisits, todayVisits, uniqueVisitors: uniqueSessions, online: io?.engine?.clientsCount || 0 },
    daily: lastNDays(14).map((d) => ({ date: d, views: vMap[d]?.views || 0, visitors: vMap[d]?.visitors || 0, signups: sMap[d] || 0 })),
    topPages: topPages.map((p) => ({ path: p._id, views: p.views })),
    recentUsers,
    siteRating: { average: siteRating.avg, count: siteRating.count },
  });
}));

/* ───────── Users ───────── */
r.get('/users', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const q = {};
  if (req.query.search) {
    const rx = { $regex: escapeRegex(req.query.search), $options: 'i' };
    q.$or = [{ username: rx }, { name: rx }, { email: rx }, { phone: rx }];
  }
  if (['user', 'admin'].includes(req.query.role)) q.role = req.query.role;
  if (['active', 'banned'].includes(req.query.status)) q.status = req.query.status;
  const [items, total] = await Promise.all([User.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(q)]);
  res.json({ items, ...pageMeta(total, page, limit) });
}));

r.patch('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (String(user._id) === String(req.user._id) && (req.body.role === 'user' || req.body.status === 'banned')) throw new ApiError(400, 'You cannot demote or ban yourself.');
  if (['user', 'admin'].includes(req.body.role)) user.role = req.body.role;
  if (['active', 'banned'].includes(req.body.status)) user.status = req.body.status;
  if (req.body.name) user.name = req.body.name;
  await user.save();
  res.json({ user });
}));

r.delete('/users/:id', asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete your own account here.');
  const id = req.params.id;
  await Promise.all([
    User.deleteOne({ _id: id }),
    Resume.deleteMany({ user: id }),
    CoverLetter.deleteMany({ user: id }),
    AtsReport.deleteMany({ user: id }),
    Blog.deleteMany({ author: id }),
    Comment.deleteMany({ user: id }),
    Rating.deleteMany({ user: id }),
  ]);
  res.json({ ok: true });
}));

/* ───────── Blog moderation ───────── */
r.get('/blogs', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const q = {};
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) q.status = req.query.status;
  if (req.query.search) q.title = { $regex: escapeRegex(req.query.search), $options: 'i' };
  const [items, total] = await Promise.all([Blog.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', `${PUBLIC_USER_FIELDS} email`), Blog.countDocuments(q)]);
  res.json({ items: items.map((b) => serializeBlog(b)), ...pageMeta(total, page, limit) });
}));

r.get('/blogs/:id', asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate('author', PUBLIC_USER_FIELDS);
  if (!blog) throw new ApiError(404, 'Post not found.');
  res.json({ blog: serializeBlog(blog) });
}));

r.patch('/blogs/:id/status', asyncHandler(async (req, res) => {
  const { status, reason, featured } = req.body;
  const blog = await Blog.findById(req.params.id).populate('author', 'username email name');
  if (!blog) throw new ApiError(404, 'Post not found.');
  if (status) {
    if (!['pending', 'approved', 'rejected'].includes(status)) throw new ApiError(400, 'Invalid status.');
    blog.status = status;
    blog.rejectionReason = status === 'rejected' ? reason || 'Does not meet community guidelines.' : '';
    if (status === 'approved' && !blog.publishedAt) blog.publishedAt = new Date();
  }
  if (typeof featured === 'boolean') blog.featured = featured;
  await blog.save();
  const io = req.app.get('io');
  if (status) io?.to(`user:${blog.author._id}`).emit('notify', { type: status === 'approved' ? 'success' : 'warning', message: status === 'approved' ? `Your post "${blog.title}" is now live!` : `Your post "${blog.title}" was ${status}.` });
  if (status === 'approved') io?.emit('blog:published', { slug: blog.slug, title: blog.title });
  res.json({ blog: serializeBlog(blog) });
}));

/* ───────── Content oversight ───────── */
r.get('/resumes', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const q = req.query.samples === '1' ? { isSample: true } : {};
  const [items, total] = await Promise.all([Resume.find(q).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('user', 'username name avatar').populate('template', 'name layout'), Resume.countDocuments(q)]);
  res.json({ items, ...pageMeta(total, page, limit) });
}));

r.patch('/resumes/:id', asyncHandler(async (req, res) => {
  const update = {};
  if (typeof req.body.isSample === 'boolean') update.isSample = req.body.isSample;
  if (typeof req.body.isPublic === 'boolean') update.isPublic = req.body.isPublic;
  const resume = await Resume.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json({ resume });
}));

r.get('/comments', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 15 });
  const [items, total] = await Promise.all([Comment.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', PUBLIC_USER_FIELDS).populate('blog', 'title slug'), Comment.countDocuments()]);
  res.json({ items, ...pageMeta(total, page, limit) });
}));

r.get('/messages', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const [items, total] = await Promise.all([ContactMessage.find().sort({ createdAt: -1 }).skip(skip).limit(limit), ContactMessage.countDocuments()]);
  res.json({ items, ...pageMeta(total, page, limit) });
}));
r.patch('/messages/:id', asyncHandler(async (req, res) => {
  res.json({ message: await ContactMessage.findByIdAndUpdate(req.params.id, { read: !!req.body.read }, { new: true }) });
}));
r.delete('/messages/:id', asyncHandler(async (req, res) => {
  await ContactMessage.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
}));

r.get('/subscribers', asyncHandler(async (_req, res) => {
  res.json({ items: await Subscriber.find().sort({ createdAt: -1 }).limit(500) });
}));

/* ───────── Settings & integrations ───────── */
r.get('/settings', asyncHandler(async (_req, res) => {
  res.json({ settings: await getAdminSettings(), env: { clientUrl: env.clientUrl, nodeEnv: env.nodeEnv, githubCallbackDefault: `${env.clientUrl}/api/auth/github/callback` } });
}));

r.put('/settings', asyncHandler(async (req, res) => {
  const settings = await updateSettings(req.body || {});
  req.app.get('io')?.emit('config:updated');
  res.json({ settings });
}));

r.post('/settings/test-mail', asyncHandler(async (req, res) => {
  try {
    await verifyTransport();
  } catch (e) {
    throw new ApiError(400, `SMTP connection failed: ${e.message}`);
  }
  const to = req.body.to || req.user.email;
  if (req.body.template === 'welcome') {
    const out = await sendWelcomeEmail({ ...req.user.toObject(), email: to });
    return res.json({ ok: true, delivered: out.delivered, to });
  }
  const s = await getSettings();
  const out = await sendMail({ to, subject: `${s.site.name} — SMTP test ✔`, html: `<p>SMTP is configured correctly. Sent at ${new Date().toISOString()}.</p>` });
  res.json({ ok: true, delivered: out.delivered, to });
}));

r.post('/settings/preview-welcome', asyncHandler(async (req, res) => {
  const s = await getSettings();
  const vars = { name: req.user.name.split(' ')[0], username: req.user.username, siteName: s.site.name, loginUrl: `${env.clientUrl}/dashboard`, year: new Date().getFullYear() };
  res.json({ subject: render(req.body.subject ?? s.mail.welcomeSubject, vars), html: render(req.body.html ?? s.mail.welcomeHtml, vars) });
}));

r.post('/settings/test-ai', asyncHandler(async (_req, res) => {
  const started = Date.now();
  const text = await completeChat({ messages: [{ role: 'user', content: 'Reply with exactly: "HireLoom AI is connected." then one short career tip.' }] });
  const s = await getSettings();
  res.json({ ok: true, provider: s.ai.provider, ms: Date.now() - started, sample: text.slice(0, 400) });
}));

export default r;
