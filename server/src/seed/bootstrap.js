import slugify from 'slugify';
import { User, Template, Resume, Blog, Comment, Rating } from '../models/index.js';
import { env } from '../config/env.js';
import { getSettings } from '../services/settingsService.js';
import * as data from './data.js';
import { ratingStats } from '../utils/ratings.js';

const DEMO_PASSWORD = 'Demo@12345';

/** Ensures the admin account exists and seeds demo content on an empty database. */
export async function bootstrap({ force = false } = {}) {
  await getSettings(true); // creates the settings document
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.findOne({ $or: [{ email: env.admin.email }, { username: env.admin.username }] });
    if (admin) {
      admin.role = 'admin';
      await admin.save();
    } else {
      admin = await User.create({
        username: env.admin.username,
        name: 'Administrator',
        email: env.admin.email,
        password: env.admin.password,
        role: 'admin',
        emailVerified: true,
        headline: 'Platform Administrator',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        providers: { local: true },
      });
      console.log(`✓ Admin created → ${env.admin.email} / ${env.admin.password}  (change it after first login)`);
    }
  }

  if (!force && (!env.autoSeed || (await Template.estimatedDocumentCount()) > 0)) return;
  console.log('… Seeding demo content');

  /* templates */
  const tplDocs = {};
  for (const t of data.templates) {
    const slug = slugify(t.name, { lower: true, strict: true });
    tplDocs[slug] = await Template.findOneAndUpdate({ slug }, { ...t, slug }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  /* users */
  const users = { admin };
  for (const u of data.demoUsers) {
    let doc = await User.findOne({ username: u.username });
    if (!doc) doc = await User.create({ ...u, password: DEMO_PASSWORD, emailVerified: true, isDemo: true, providers: { local: true } });
    users[u.username] = doc;
  }

  /* sample resumes (public gallery) */
  for (const r of data.sampleResumes) {
    if (await Resume.exists({ isSample: true, title: r.title })) continue;
    await Resume.create({ user: admin._id, title: r.title, kind: r.kind, template: tplDocs[r.template]?._id, data: r.data, isSample: true, isPublic: true, views: Math.floor(Math.random() * 400) + 60 });
  }

  /* blogs */
  const now = Date.now();
  const all = [
    ...data.blogs.map((b, i) => ({ ...b, status: 'approved', publishedAt: new Date(now - (i + 1) * 2.3 * 864e5) })),
    ...data.pendingBlogs.map((b) => ({ ...b, status: 'pending' })),
  ];
  const created = [];
  for (const b of all) {
    const slug = slugify(b.title, { lower: true, strict: true }).slice(0, 80);
    if (await Blog.exists({ slug })) continue;
    const author = users[b.author] || admin;
    const pool = Object.values(users).map((u) => u._id);
    const likes = pool.filter(() => Math.random() > 0.35);
    const doc = await Blog.create({
      title: b.title,
      slug,
      content: b.content,
      excerpt: b.content.replace(/[#*_>`|\[\]()-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) + '…',
      coverImage: `https://picsum.photos/seed/${b.img}/1200/700`,
      category: b.category,
      tags: b.tags,
      youtubeUrl: b.youtubeUrl || '',
      author: author._id,
      status: b.status,
      featured: !!b.featured,
      publishedAt: b.publishedAt,
      readTime: Math.max(2, Math.round(b.content.split(/\s+/).length / 200)),
      views: b.status === 'approved' ? Math.floor(Math.random() * 1800) + 120 : 0,
      likes,
      dislikes: pool.filter((id) => !likes.includes(id) && Math.random() > 0.8),
    });
    created.push(doc);
  }

  /* comments & ratings on approved posts */
  const pool = Object.values(users);
  for (const blog of created.filter((b) => b.status === 'approved')) {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const u = pool[(i + blog.title.length) % pool.length];
      const c = await Comment.create({ blog: blog._id, user: u._id, content: data.comments[(i + blog.title.length) % data.comments.length], likes: pool.filter(() => Math.random() > 0.6).map((x) => x._id) });
      if (i === 0) await Comment.create({ blog: blog._id, user: pool[(i + 1) % pool.length]._id, parent: c._id, content: 'Agreed — this was really helpful.' });
    }
    const raters = pool.filter(() => Math.random() > 0.3);
    for (const u of raters) await Rating.create({ user: u._id, targetType: 'blog', target: blog._id, value: 3 + Math.floor(Math.random() * 3) }).catch(() => {});
    const st = await ratingStats({ targetType: 'blog', target: blog._id });
    blog.ratingAvg = st.avg;
    blog.ratingCount = st.count;
    blog.commentCount = await Comment.countDocuments({ blog: blog._id });
    await blog.save();
  }

  /* site reviews → landing page testimonials */
  for (const r of data.siteReviews) {
    const u = users[r.user];
    if (u && !(await Rating.exists({ user: u._id, targetType: 'site' }))) await Rating.create({ user: u._id, targetType: 'site', target: null, value: r.value, review: r.review });
  }

  console.log(`✓ Demo content ready (${data.templates.length} templates, ${data.sampleResumes.length} sample resumes, ${created.length} posts). Demo users password: ${DEMO_PASSWORD}`);
}
