import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { bootstrap } from './bootstrap.js';
import { Template, Resume, Blog, Comment, Rating, User } from '../models/index.js';

/**
 *  npm run seed         → add any missing demo content
 *  npm run seed:fresh   → wipe demo content (templates, blogs, resumes, comments, ratings, demo users) and reseed
 *  Settings and real user accounts are never touched.
 */
const fresh = process.argv.includes('--fresh');

await connectDB();
if (fresh) {
  await Promise.all([Template.deleteMany({}), Blog.deleteMany({}), Comment.deleteMany({}), Rating.deleteMany({}), Resume.deleteMany({ isSample: true }), User.deleteMany({ isDemo: true })]);
  console.log('✓ Demo content cleared');
}
await bootstrap({ force: true });
await mongoose.disconnect();
process.exit(0);
