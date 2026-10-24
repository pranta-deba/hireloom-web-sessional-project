import { Router } from 'express';
import { Blog, Comment } from '../models/index.js';
import { PUBLIC_USER_FIELDS } from '../models/User.js';
import { asyncHandler, ApiError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeBlog as serialize } from './blog.routes.js';

const r = Router();
r.use(requireAuth);

const emit = (req, blogId, event, payload) => req.app.get('io')?.to(`blog:${blogId}`).emit(event, payload);

r.post('/', asyncHandler(async (req, res) => {
  const { blogId, content, parentId } = req.body;
  const text = String(content || '').trim();
  if (!text) throw new ApiError(400, 'Comment cannot be empty.');
  const blog = await Blog.findOne({ _id: blogId, status: 'approved' });
  if (!blog) throw new ApiError(404, 'Post not found.');
  let parent = null;
  if (parentId) {
    parent = await Comment.findOne({ _id: parentId, blog: blog._id });
    if (!parent) throw new ApiError(404, 'Parent comment not found.');
    if (parent.parent) parent = await Comment.findById(parent.parent); // keep threads one level deep
  }
  const comment = await Comment.create({ blog: blog._id, user: req.user._id, content: text.slice(0, 2000), parent: parent?._id || null });
  await Blog.updateOne({ _id: blog._id }, { $inc: { commentCount: 1 } });
  await comment.populate('user', PUBLIC_USER_FIELDS);
  const data = { ...serialize(comment), replies: [] };
  emit(req, blog._id, 'comment:new', { blogId: String(blog._id), comment: data, socketId: req.get('x-socket-id') || null });
  res.status(201).json({ comment: data });
}));

r.put('/:id', asyncHandler(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c) throw new ApiError(404, 'Comment not found.');
  if (String(c.user) !== String(req.user._id)) throw new ApiError(403, 'You can only edit your own comments.');
  c.content = String(req.body.content || '').trim().slice(0, 2000);
  if (!c.content) throw new ApiError(400, 'Comment cannot be empty.');
  c.edited = true;
  await c.save();
  await c.populate('user', PUBLIC_USER_FIELDS);
  const data = serialize(c, req.user._id);
  emit(req, c.blog, 'comment:updated', { comment: data });
  res.json({ comment: data });
}));

r.delete('/:id', asyncHandler(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c) throw new ApiError(404, 'Comment not found.');
  if (String(c.user) !== String(req.user._id) && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed.');
  const removed = 1 + (await Comment.countDocuments({ parent: c._id }));
  await Comment.deleteMany({ $or: [{ _id: c._id }, { parent: c._id }] });
  await Blog.updateOne({ _id: c.blog }, { $inc: { commentCount: -removed } });
  emit(req, c.blog, 'comment:deleted', { commentId: String(c._id), parentId: c.parent ? String(c.parent) : null, removed, socketId: req.get('x-socket-id') || null });
  res.json({ ok: true });
}));

r.post('/:id/react', asyncHandler(async (req, res) => {
  const type = req.body.type;
  if (!['like', 'dislike'].includes(type)) throw new ApiError(400, 'Invalid reaction.');
  const c = await Comment.findById(req.params.id);
  if (!c) throw new ApiError(404, 'Comment not found.');
  const uid = req.user._id;
  const inL = c.likes.some((x) => x.equals(uid));
  const inD = c.dislikes.some((x) => x.equals(uid));
  const update = type === 'like'
    ? inL ? { $pull: { likes: uid } } : { $addToSet: { likes: uid }, $pull: { dislikes: uid } }
    : inD ? { $pull: { dislikes: uid } } : { $addToSet: { dislikes: uid }, $pull: { likes: uid } };
  const u = await Comment.findByIdAndUpdate(c._id, update, { new: true });
  const payload = { commentId: String(c._id), likesCount: u.likes.length, dislikesCount: u.dislikes.length };
  emit(req, c.blog, 'comment:reactions', payload);
  res.json({ ...payload, myReaction: (type === 'like' && !inL) || (type === 'dislike' && !inD) ? type : null });
}));

export default r;
