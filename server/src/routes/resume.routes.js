import { Router } from 'express';
import { Resume, Template } from '../models/index.js';
import { asyncHandler, ApiError, paginate, pageMeta } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { completeChat, parseJsonLoose } from '../services/aiService.js';
import { getSettings } from '../services/settingsService.js';

const r = Router();

/** Public gallery of sample resumes (shown to everyone). */
r.get('/samples', asyncHandler(async (req, res) => {
  const items = await Resume.find({ isSample: true, isPublic: true }).populate('template').sort({ createdAt: 1 }).limit(12);
  res.json({ items });
}));

r.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 12 });
  const q = { user: req.user._id };
  if (['resume', 'cv'].includes(req.query.kind)) q.kind = req.query.kind;
  const [items, total] = await Promise.all([Resume.find(q).populate('template').sort({ updatedAt: -1 }).skip(skip).limit(limit), Resume.countDocuments(q)]);
  res.json({ items, ...pageMeta(total, page, limit) });
}));

r.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { title, kind, templateId, templateSlug, data, accentColor, fromSampleId } = req.body;
  let template = templateId ? await Template.findById(templateId) : templateSlug ? await Template.findOne({ slug: templateSlug }) : null;
  if (!template) template = await Template.findOne({ isActive: true }).sort({ isFeatured: -1, order: 1 });
  let seedData = data;
  if (fromSampleId) {
    const sample = await Resume.findOne({ _id: fromSampleId, isSample: true });
    if (sample) seedData = sample.data.toObject();
  }
  if (!seedData) {
    seedData = {
      personal: { fullName: req.user.name, headline: req.user.headline, email: req.user.email || '', phone: req.user.phone || '', location: [req.user.location?.city, req.user.location?.country].filter(Boolean).join(', '), photo: req.user.avatar?.includes('dicebear') ? '' : req.user.avatar },
      skills: (req.user.skills || []).map((name) => ({ name, level: 'Advanced' })),
    };
  }
  const resume = await Resume.create({ user: req.user._id, title: title || `${template?.name || 'My'} ${kind === 'cv' ? 'CV' : 'Résumé'}`, kind: kind || template?.category || 'resume', template: template?._id, accentColor: accentColor || '', data: seedData });
  if (template) await Template.updateOne({ _id: template._id }, { $inc: { usageCount: 1 } });
  res.status(201).json({ resume: await resume.populate('template') });
}));

/** AI "generate a brand-new CV/résumé" from a short brief. */
r.post('/generate', requireAuth, asyncHandler(async (req, res) => {
  const s = await getSettings();
  const brief = req.body || {};
  const prompt = `Create a complete ${brief.kind === 'cv' ? 'academic/professional CV' : 'one-to-two page résumé'} as STRICT JSON (no markdown) with this exact shape:
{"title":string,"personal":{"fullName","headline","email","phone","location","summary"},"experience":[{"company","role","location","startDate":"YYYY-MM","endDate":"YYYY-MM or empty","current":boolean,"description":"3-4 bullet lines starting with • and containing metrics"}],"education":[{"school","degree","field","startDate","endDate","grade"}],"skills":[{"name","level":"Beginner|Intermediate|Advanced|Expert"}],"languages":[{"name","proficiency":"Native|Fluent|Professional|Conversational|Basic"}],"projects":[{"name","link","description"}],"certifications":[{"name","issuer","date"}],"interests":[string]}
Candidate brief:
- Name: ${brief.fullName || 'not given'}
- Target role: ${brief.targetRole || 'not given'}
- Years of experience: ${brief.years || 'not given'}
- Key skills: ${brief.skills || 'not given'}
- Most recent company: ${brief.lastCompany || 'not given'}
- Education: ${[brief.degree, brief.field, brief.school].filter(Boolean).join(', ') || 'not given'}
- Location: ${brief.location || 'not given'}
- Email / phone: ${brief.email || ''} ${brief.phone || ''}
- Extra notes: ${brief.notes || 'none'}
Use the facts given; where something is unknown, use a sensible generic placeholder (e.g. "Previous Company").`;
  const text = await completeChat({
    task: 'resume',
    context: brief,
    json: true,
    messages: [
      { role: 'system', content: s.ai.resumeSystemPrompt },
      { role: 'user', content: prompt },
    ],
  });
  const data = parseJsonLoose(text);
  if (!data?.personal) throw new ApiError(502, 'The AI returned an unexpected format. Please try again.');
  let template = brief.templateSlug ? await Template.findOne({ slug: brief.templateSlug }) : null;
  if (!template) template = await Template.findOne({ isActive: true, category: brief.kind === 'cv' ? 'cv' : 'resume' }).sort({ isFeatured: -1, order: 1 });
  const { title, ...rest } = data;
  const resume = await Resume.create({ user: req.user._id, title: title || `${brief.targetRole || 'AI'} ${brief.kind === 'cv' ? 'CV' : 'Résumé'}`, kind: brief.kind === 'cv' ? 'cv' : 'resume', template: template?._id, data: rest });
  res.status(201).json({ resume: await resume.populate('template') });
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const resume = await Resume.findById(req.params.id).populate('template').populate('user', 'username name avatar');
  if (!resume) throw new ApiError(404, 'Resume not found.');
  const isOwner = req.user && String(resume.user._id) === String(req.user._id);
  if (!isOwner && !resume.isPublic && req.user?.role !== 'admin') throw new ApiError(403, 'This resume is private.');
  if (!isOwner) await Resume.updateOne({ _id: resume._id }, { $inc: { views: 1 } });
  res.json({ resume, isOwner });
}));

r.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
  if (!resume) throw new ApiError(404, 'Resume not found.');
  ['title', 'kind', 'accentColor', 'isPublic'].forEach((k) => req.body[k] !== undefined && (resume[k] = req.body[k]));
  if (req.body.templateId) resume.template = req.body.templateId;
  if (req.body.data) resume.data = req.body.data;
  await resume.save();
  res.json({ resume: await resume.populate('template') });
}));

r.post('/:id/duplicate', requireAuth, asyncHandler(async (req, res) => {
  const src = await Resume.findOne({ _id: req.params.id, user: req.user._id });
  if (!src) throw new ApiError(404, 'Resume not found.');
  const copy = await Resume.create({ user: req.user._id, title: `${src.title} (copy)`, kind: src.kind, template: src.template, accentColor: src.accentColor, data: src.data.toObject() });
  res.status(201).json({ resume: await copy.populate('template') });
}));

r.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const q = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id };
  const out = await Resume.deleteOne(q);
  if (!out.deletedCount) throw new ApiError(404, 'Resume not found.');
  res.json({ ok: true });
}));

export default r;
