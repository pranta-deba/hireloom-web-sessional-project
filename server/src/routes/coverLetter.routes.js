import { Router } from 'express';
import { CoverLetter } from '../models/index.js';
import { asyncHandler, ApiError, paginate, pageMeta } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

r.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const q = { user: req.user._id };
  const [items, total] = await Promise.all([CoverLetter.find(q).sort({ updatedAt: -1 }).skip(skip).limit(limit), CoverLetter.countDocuments(q)]);
  res.json({ items, ...pageMeta(total, page, limit) });
}));

r.post('/', asyncHandler(async (req, res) => {
  const { title, company, role, tone, jobDescription, content } = req.body;
  if (!content?.trim()) throw new ApiError(400, 'Cover letter content is empty.');
  const letter = await CoverLetter.create({ user: req.user._id, title: title || `${role || 'Cover letter'} — ${company || 'Company'}`, company, role, tone, jobDescription, content });
  res.status(201).json({ letter });
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const letter = await CoverLetter.findOne({ _id: req.params.id, user: req.user._id });
  if (!letter) throw new ApiError(404, 'Cover letter not found.');
  res.json({ letter });
}));

r.put('/:id', asyncHandler(async (req, res) => {
  const letter = await CoverLetter.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: Object.fromEntries(['title', 'company', 'role', 'tone', 'jobDescription', 'content'].filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]])) },
    { new: true }
  );
  if (!letter) throw new ApiError(404, 'Cover letter not found.');
  res.json({ letter });
}));

r.delete('/:id', asyncHandler(async (req, res) => {
  await CoverLetter.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
}));

export default r;
