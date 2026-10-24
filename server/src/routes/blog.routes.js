import { Router } from 'express';
import slugify from 'slugify';
import { Blog, Comment, Rating } from '../models/index.js';
import { PUBLIC_USER_FIELDS } from '../models/User.js';
import { asyncHandler, ApiError, paginate, pageMeta, escapeRegex } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { getSettings } from '../services/settingsService.js';
import { ratingStats } from '../utils/ratings.js';

const r = Router();

export const BLOG_CATEGORIES = ['Technology', 'Web Development', 'AI & ML', 'Career', 'Cloud & DevOps', 'Cybersecurity', 'Data Science', 'Mobile', 'Productivity'];

export function serializeBlog(b, userId) {
  const o = b.toObject ? b.toObject() : { ...b };
  const uid = userId ? String(userId) : null;
  const likes = (o.likes || []).map(String);
  const dislikes = (o.dislikes || []).map(String);
  o.likesCount = likes.length;
  o.dislikesCount = dislikes.length;
  o.myReaction = uid ? (likes.includes(uid) ? 'like' : dislikes.includes(uid) ? 'dislike' : null) : null;
  delete o.likes;
  delete o.dislikes;
  return o;
}

const readTime = (md = '') => Math.max(1, Math.round(md.split(/\s+/).length / 220));

async function uniqueSlug(title, excludeId) {
  const base = slugify(title, { lower: true, strict: true }).slice(0, 80) || 'post';
  let slug = base;
  let i = 1;
  while (await Blog.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${base}-${++i}`;
  return slug;
}

/* ───────── Public reads ───────── */
r.get('/categories', asyncHandler(async (_req, res) => {
  const counts = await Blog.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
  const map = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  res.json({ categories: BLOG_CATEGORIES.map((name) => ({ name, count: map[name] || 0 })) });
}));

r.get('/', asyncHandler(async (req, res) => {
  const s = await getSettings();
  const { page, limit, skip } = paginate(req.query, { defaultLimit: s.features.blogPostsPerPage || 9, maxLimit: 30 });
  const q = { status: 'approved' };
  if (req.query.category && req.query.category !== 'All') q.category = req.query.category;
  if (req.query.tag) q.tags = req.query.tag;
  if (req.query.search) {
    const rx = { $regex: escapeRegex(req.query.search), $options: 'i' };
    q.$or = [{ title: rx }, { excerpt: rx }, { tags: rx }];
  }
  const sort = { popular: { views: -1 }, rated: { ratingAvg: -1, ratingCount: -1 }, oldest: { publishedAt: 1 } }[req.query.sort] || { featured: -1, publishedAt: -1 };
  const [items, total] = await Promise.all([
    Blog.find(q).sort(sort).skip(skip).limit(limit).select('-content').populate('author', PUBLIC_USER_FIELDS),
    Blog.countDocuments(q),
  ]);
  res.json({ items: items.map((b) => serializeBlog(b, req.user?._id)), ...pageMeta(total, page, limit) });
}));

r.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });
  const q = { author: req.user._id };
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) q.status = req.query.status;
  const [items, total] = await Promise.all([Blog.find(q).sort({ updatedAt: -1 }).skip(skip).limit(limit).select('-content'), Blog.countDocuments(q)]);
  res.json({ items: items.map((b) => serializeBlog(b, req.user._id)), ...pageMeta(total, page, limit) });
}));

r.get('/:slug', asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug }).populate('author', `${PUBLIC_USER_FIELDS} bio`);
  if (!blog) throw new ApiError(404, 'Post not found.');
  const isOwner = req.user && String(blog.author._id) === String(req.user._id);
  if (blog.status !== 'approved' && !isOwner && req.user?.role !== 'admin') throw new ApiError(404, 'Post not found.');
  if (blog.status === 'approved') await Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } });
  const [related, myRating] = await Promise.all([
    Blog.find({ status: 'approved', category: blog.category, _id: { $ne: blog._id } }).sort({ publishedAt: -1 }).limit(3).select('title slug coverImage readTime publishedAt category'),
    req.user ? Rating.findOne({ user: req.user._id, targetType: 'blog', target: blog._id }) : null,
  ]);
  res.json({ blog: { ...serializeBlog(blog, req.user?._id), myRating: myRating?.value || 0 }, related, isOwner });
}));

/* ───────── Authoring (pending until an admin approves) ───────── */
const pick = (b) => ({
  title: b.title?.trim(),
  excerpt: b.excerpt?.trim(),
  content: b.content,
  coverImage: b.coverImage,
  category: BLOG_CATEGORIES.includes(b.category) ? b.category : 'Technology',
  tags: (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',')).map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 8),
  youtubeUrl: b.youtubeUrl || '',
  audioUrl: b.audioUrl || '',
  eventDate: b.eventDate || undefined,
});

r.post('/', requireAuth, asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (!data.title || !data.content || data.content.length < 80) throw new ApiError(400, 'Title and at least 80 characters of content are required.');
  const s = await getSettings();
  const autoApprove = req.user.role === 'admin' && s.features.autoApproveAdminPosts;
  const blog = await Blog.create({
    ...data,
    excerpt: data.excerpt || data.content.replace(/[#*_>`\[\]()!-]/g, '').slice(0, 220).trim(),
    coverImage: data.coverImage || `https://picsum.photos/seed/${Date.now()}/1200/700`,
    slug: await uniqueSlug(data.title),
    author: req.user._id,
    status: autoApprove ? 'approved' : 'pending',
    publishedAt: autoApprove ? new Date() : undefined,
    readTime: readTime(data.content),
  });
  if (!autoApprove) req.app.get('io')?.to('admins').emit('admin:pending-blog', { id: blog._id, title: blog.title, author: req.user.username });
  res.status(201).json({ blog: serializeBlog(blog, req.user._id) });
}));

r.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) throw new ApiError(404, 'Post not found.');
  const isAdmin = req.user.role === 'admin';
  if (String(blog.author) !== String(req.user._id) && !isAdmin) throw new ApiError(403, 'You can only edit your own posts.');
  const data = pick(req.body);
  Object.entries(data).forEach(([k, v]) => v !== undefined && (blog[k] = v));
  if (data.title) blog.slug = await uniqueSlug(data.title, blog._id);
  blog.readTime = readTime(blog.content);
  if (!isAdmin) {
    blog.status = 'pending'; // edits by authors are re-reviewed
    blog.rejectionReason = '';
    req.app.get('io')?.to('admins').emit('admin:pending-blog', { id: blog._id, title: blog.title, author: req.user.username });
  }
  await blog.save();
  res.json({ blog: serializeBlog(blog, req.user._id) });
}));

r.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) throw new ApiError(404, 'Post not found.');
  if (String(blog.author) !== String(req.user._id) && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed.');
  await Promise.all([blog.deleteOne(), Comment.deleteMany({ blog: blog._id }), Rating.deleteMany({ targetType: 'blog', target: blog._id })]);
  res.json({ ok: true });
}));

/* ───────── Like / dislike (Facebook-style toggle) ───────── */
r.post('/:id/react', requireAuth, asyncHandler(async (req, res) => {
  const type = req.body.type;
  if (!['like', 'dislike'].includes(type)) throw new ApiError(400, 'Invalid reaction.');
  const blog = await Blog.findOne({ _id: req.params.id, status: 'approved' });
  if (!blog) throw new ApiError(404, 'Post not found.');
  const uid = req.user._id;
  const inLikes = blog.likes.some((x) => x.equals(uid));
  const inDislikes = blog.dislikes.some((x) => x.equals(uid));
  const update =
    type === 'like'
      ? inLikes ? { $pull: { likes: uid } } : { $addToSet: { likes: uid }, $pull: { dislikes: uid } }
      : inDislikes ? { $pull: { dislikes: uid } } : { $addToSet: { dislikes: uid }, $pull: { likes: uid } };
  await Blog.updateOne({ _id: blog._id }, update);
  const updated = await Blog.findById(blog._id).select('likes dislikes');
  const payload = { blogId: String(blog._id), likesCount: updated.likes.length, dislikesCount: updated.dislikes.length };
  req.app.get('io')?.to(`blog:${blog._id}`).emit('blog:reactions', payload);
  res.json({ ...payload, myReaction: (type === 'like' && !inLikes) || (type === 'dislike' && !inDislikes) ? type : null });
}));

/* ───────── Star rating ───────── */
r.post('/:id/rate', requireAuth, asyncHandler(async (req, res) => {
  const value = Number(req.body.value);
  if (!(value >= 1 && value <= 5)) throw new ApiError(400, 'Rating must be between 1 and 5.');
  const blog = await Blog.findOne({ _id: req.params.id, status: 'approved' });
  if (!blog) throw new ApiError(404, 'Post not found.');
  await Rating.findOneAndUpdate({ user: req.user._id, targetType: 'blog', target: blog._id }, { value: Math.round(value) }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const st = await ratingStats({ targetType: 'blog', target: blog._id });
  blog.ratingAvg = st.avg;
  blog.ratingCount = st.count;
  await blog.save();
  const payload = { blogId: String(blog._id), ratingAvg: blog.ratingAvg, ratingCount: blog.ratingCount };
  req.app.get('io')?.to(`blog:${blog._id}`).emit('blog:rating', payload);
  res.json({ ...payload, myRating: Math.round(value) });
}));

/* ───────── Comments ───────── */
r.get('/:id/comments', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10, maxLimit: 50 });
  const q = { blog: req.params.id, parent: null };
  const [roots, total] = await Promise.all([
    Comment.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', PUBLIC_USER_FIELDS),
    Comment.countDocuments(q),
  ]);
  const replies = await Comment.find({ parent: { $in: roots.map((c) => c._id) } }).sort({ createdAt: 1 }).populate('user', PUBLIC_USER_FIELDS);
  const ser = (c) => serializeBlog(c, req.user?._id);
  res.json({
    items: roots.map((c) => ({ ...ser(c), replies: replies.filter((rp) => String(rp.parent) === String(c._id)).map(ser) })),
    ...pageMeta(total, page, limit),
  });
}));

export default r;
