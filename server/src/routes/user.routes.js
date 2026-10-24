import { Router } from 'express';
import { User, Resume, CoverLetter, AtsReport, Blog } from '../models/index.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

const EDITABLE = ['name', 'headline', 'bio', 'website', 'avatar', 'coverImage', 'location', 'dateOfBirth', 'gender', 'experienceLevel', 'skills', 'socials'];

r.put('/me', requireAuth, asyncHandler(async (req, res) => {
  EDITABLE.forEach((k) => {
    if (req.body[k] !== undefined) req.user[k] = req.body[k];
  });
  if (Array.isArray(req.body.skills)) req.user.skills = req.body.skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 40);
  if (Array.isArray(req.body.socials)) req.user.socials = req.body.socials.filter((s) => s?.url).slice(0, 10);
  await req.user.save();
  res.json({ user: req.user.toSafeJSON() });
}));

r.put('/me/password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (user.password && !(await user.comparePassword(currentPassword || ''))) throw new ApiError(400, 'Current password is incorrect.');
  if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) throw new ApiError(400, 'Password needs 8+ characters with an uppercase letter and a number.');
  user.password = newPassword;
  user.providers.local = true;
  await user.save();
  res.json({ ok: true });
}));

r.get('/me/stats', requireAuth, asyncHandler(async (req, res) => {
  const u = req.user._id;
  const [resumes, letters, reports, blogs, best] = await Promise.all([
    Resume.countDocuments({ user: u }),
    CoverLetter.countDocuments({ user: u }),
    AtsReport.countDocuments({ user: u }),
    Blog.aggregate([{ $match: { author: u } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    AtsReport.findOne({ user: u }).sort({ score: -1 }).select('score'),
  ]);
  const byStatus = Object.fromEntries(blogs.map((b) => [b._id, b.n]));
  res.json({ resumes, letters, reports, bestAtsScore: best?.score ?? null, blogs: { approved: byStatus.approved || 0, pending: byStatus.pending || 0, rejected: byStatus.rejected || 0 } });
}));

r.get('/:username', asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase(), status: 'active' }).select('username name avatar coverImage headline bio website location skills socials role createdAt');
  if (!user) throw new ApiError(404, 'User not found.');
  const posts = await Blog.find({ author: user._id, status: 'approved' }).sort({ publishedAt: -1 }).limit(6).select('title slug coverImage excerpt publishedAt category readTime');
  res.json({ user, posts });
}));

export default r;
