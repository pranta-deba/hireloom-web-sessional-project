import { Router } from 'express';
import slugify from 'slugify';
import { Template, LAYOUTS } from '../models/index.js';
import { asyncHandler, ApiError, paginate, pageMeta, escapeRegex } from '../utils/http.js';
import { requireAdmin } from '../middleware/auth.js';

const r = Router();

r.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 12, maxLimit: 60 });
  const q = {};
  if (!(req.user?.role === 'admin' && req.query.all === '1')) q.isActive = true;
  if (['resume', 'cv'].includes(req.query.category)) q.category = req.query.category;
  if (req.query.layout && LAYOUTS.includes(req.query.layout)) q.layout = req.query.layout;
  if (req.query.search) q.name = { $regex: escapeRegex(req.query.search), $options: 'i' };
  const [items, total] = await Promise.all([Template.find(q).sort({ isFeatured: -1, order: 1, createdAt: -1 }).skip(skip).limit(limit), Template.countDocuments(q)]);
  res.json({ items, ...pageMeta(total, page, limit), layouts: LAYOUTS });
}));

r.get('/:slug', asyncHandler(async (req, res) => {
  const t = await Template.findOne({ slug: req.params.slug });
  if (!t) throw new ApiError(404, 'Template not found.');
  res.json({ template: t });
}));

const pickBody = (b) => ({
  name: b.name,
  category: b.category,
  layout: b.layout,
  description: b.description,
  thumbnail: b.thumbnail,
  theme: b.theme,
  tags: Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
  isActive: b.isActive,
  isFeatured: b.isFeatured,
  order: b.order,
});

r.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const data = pickBody(req.body);
  if (!data.name) throw new ApiError(400, 'Template name is required.');
  let slug = slugify(data.name, { lower: true, strict: true });
  if (await Template.exists({ slug })) slug = `${slug}-${Date.now().toString(36)}`;
  const t = await Template.create({ ...data, slug });
  res.status(201).json({ template: t });
}));

r.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const data = pickBody(req.body);
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
  const t = await Template.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!t) throw new ApiError(404, 'Template not found.');
  res.json({ template: t });
}));

r.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  await Template.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default r;
