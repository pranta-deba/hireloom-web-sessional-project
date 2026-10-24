import { buildSchema } from 'graphql';
import { Blog, Template, User, Resume, Subscriber } from '../models/index.js';
import { escapeRegex } from '../utils/http.js';

export const schema = buildSchema(`
  type Author { username: String!, name: String!, avatar: String, headline: String }
  type Blog {
    id: ID!, title: String!, slug: String!, excerpt: String, coverImage: String, category: String,
    tags: [String!]!, readTime: Int, views: Int, likes: Int, ratingAvg: Float, commentCount: Int,
    publishedAt: String, author: Author
  }
  type BlogPage { items: [Blog!]!, total: Int!, page: Int!, pages: Int! }
  type Theme { primary: String, accent: String, font: String }
  type Template { id: ID!, name: String!, slug: String!, category: String!, layout: String!, description: String, usageCount: Int, theme: Theme }
  type SiteStats { users: Int!, blogs: Int!, resumes: Int!, templates: Int! }
  type Viewer { username: String!, name: String!, role: String! }
  type SubscribeResult { ok: Boolean!, message: String! }

  type Query {
    blogs(page: Int = 1, limit: Int = 6, category: String, search: String): BlogPage!
    blog(slug: String!): Blog
    trending(limit: Int = 4): [Blog!]!
    templates(category: String): [Template!]!
    siteStats: SiteStats!
    viewer: Viewer
  }

  type Mutation {
    subscribe(email: String!): SubscribeResult!
  }
`);

const mapBlog = (b) => ({
  id: String(b._id),
  title: b.title,
  slug: b.slug,
  excerpt: b.excerpt,
  coverImage: b.coverImage,
  category: b.category,
  tags: b.tags || [],
  readTime: b.readTime,
  views: b.views,
  likes: (b.likes || []).length,
  ratingAvg: b.ratingAvg,
  commentCount: b.commentCount,
  publishedAt: b.publishedAt ? new Date(b.publishedAt).toISOString() : null,
  author: b.author && b.author.username ? b.author : null,
});

export const rootValue = {
  async blogs({ page, limit, category, search }) {
    const l = Math.min(30, Math.max(1, limit));
    const q = { status: 'approved' };
    if (category) q.category = category;
    if (search) q.title = { $regex: escapeRegex(search), $options: 'i' };
    const [items, total] = await Promise.all([
      Blog.find(q).sort({ publishedAt: -1 }).skip((page - 1) * l).limit(l).populate('author', 'username name avatar headline'),
      Blog.countDocuments(q),
    ]);
    return { items: items.map(mapBlog), total, page, pages: Math.max(1, Math.ceil(total / l)) };
  },
  async blog({ slug }) {
    const b = await Blog.findOne({ slug, status: 'approved' }).populate('author', 'username name avatar headline');
    return b ? mapBlog(b) : null;
  },
  async trending({ limit }) {
    const items = await Blog.find({ status: 'approved' }).sort({ views: -1, ratingAvg: -1 }).limit(Math.min(12, limit)).populate('author', 'username name avatar headline');
    return items.map(mapBlog);
  },
  async templates({ category }) {
    const items = await Template.find({ isActive: true, ...(category ? { category } : {}) }).sort({ order: 1 });
    return items.map((t) => ({ id: String(t._id), name: t.name, slug: t.slug, category: t.category, layout: t.layout, description: t.description, usageCount: t.usageCount, theme: t.theme }));
  },
  async siteStats() {
    const [users, blogs, resumes, templates] = await Promise.all([User.countDocuments(), Blog.countDocuments({ status: 'approved' }), Resume.countDocuments(), Template.countDocuments({ isActive: true })]);
    return { users, blogs, resumes, templates };
  },
  viewer(_args, ctx) {
    return ctx.user ? { username: ctx.user.username, name: ctx.user.name, role: ctx.user.role } : null;
  },
  async subscribe({ email }) {
    const e = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return { ok: false, message: 'Please enter a valid email address.' };
    const existed = await Subscriber.exists({ email: e });
    if (!existed) await Subscriber.create({ email: e });
    return { ok: true, message: existed ? 'You are already subscribed — thank you!' : 'Subscribed! Watch your inbox for the next issue.' };
  },
};
