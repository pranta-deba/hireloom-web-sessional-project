import mongoose from 'mongoose';
export { default as User } from './User.js';

const { Schema, model } = mongoose;
const ObjectId = Schema.Types.ObjectId;

/* ───────── Settings (single document, secrets encrypted) ───────── */
export const Setting = model(
  'Setting',
  new Schema({ key: { type: String, unique: true, default: 'global' }, data: { type: Schema.Types.Mixed, default: {} } }, { timestamps: true, minimize: false })
);

/* ───────── One-time passcodes (email / phone) ───────── */
const otpSchema = new Schema(
  {
    channel: { type: String, enum: ['email', 'phone'], required: true },
    target: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Otp = model('Otp', otpSchema);

/* ───────── Resume / CV templates ───────── */
export const LAYOUTS = ['classic', 'sidebar', 'minimal', 'executive', 'creative', 'timeline'];
export const Template = model(
  'Template',
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      slug: { type: String, required: true, unique: true },
      category: { type: String, enum: ['resume', 'cv'], default: 'resume' },
      layout: { type: String, enum: LAYOUTS, default: 'classic' },
      description: { type: String, default: '' },
      thumbnail: { type: String, default: '' },
      theme: {
        primary: { type: String, default: '#2F4BFF' },
        accent: { type: String, default: '#FF6A3D' },
        font: { type: String, default: 'Manrope' },
        headingFont: { type: String, default: 'Instrument Serif' },
      },
      tags: [String],
      isActive: { type: Boolean, default: true },
      isFeatured: { type: Boolean, default: false },
      usageCount: { type: Number, default: 0 },
      order: { type: Number, default: 0 },
    },
    { timestamps: true }
  )
);

/* ───────── Resumes & CVs ───────── */
const dateish = { type: String, default: '' }; // ISO yyyy-mm stored as string for easy round-trip
const resumeData = new Schema(
  {
    personal: {
      fullName: { type: String, default: '' },
      headline: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      website: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      photo: { type: String, default: '' },
      summary: { type: String, default: '' },
    },
    experience: [{ company: String, role: String, location: String, startDate: dateish, endDate: dateish, current: Boolean, description: String }],
    education: [{ school: String, degree: String, field: String, startDate: dateish, endDate: dateish, grade: String }],
    skills: [{ name: String, level: { type: String, default: 'Intermediate' } }],
    languages: [{ name: String, proficiency: { type: String, default: 'Professional' } }],
    projects: [{ name: String, link: String, description: String }],
    certifications: [{ name: String, issuer: String, date: dateish }],
    publications: [{ title: String, venue: String, year: String }],
    interests: [String],
  },
  { _id: false }
);

export const Resume = model(
  'Resume',
  new Schema(
    {
      user: { type: ObjectId, ref: 'User', required: true, index: true },
      title: { type: String, default: 'Untitled resume' },
      kind: { type: String, enum: ['resume', 'cv'], default: 'resume' },
      template: { type: ObjectId, ref: 'Template' },
      accentColor: { type: String, default: '' },
      data: { type: resumeData, default: () => ({}) },
      isPublic: { type: Boolean, default: false },
      isSample: { type: Boolean, default: false },
      views: { type: Number, default: 0 },
    },
    { timestamps: true }
  )
);

/* ───────── Cover letters ───────── */
export const CoverLetter = model(
  'CoverLetter',
  new Schema(
    {
      user: { type: ObjectId, ref: 'User', required: true, index: true },
      title: { type: String, default: 'Cover letter' },
      company: String,
      role: String,
      tone: String,
      jobDescription: String,
      content: { type: String, default: '' },
    },
    { timestamps: true }
  )
);

/* ───────── ATS reports ───────── */
export const AtsReport = model(
  'AtsReport',
  new Schema(
    {
      user: { type: ObjectId, ref: 'User', required: true, index: true },
      fileName: String,
      jobTitle: String,
      score: Number,
      breakdown: Schema.Types.Mixed,
      matchedKeywords: [String],
      missingKeywords: [String],
      stats: Schema.Types.Mixed,
      aiFeedback: { type: String, default: '' },
    },
    { timestamps: true }
  )
);

/* ───────── Blog posts ───────── */
const blogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, default: '', maxlength: 300 },
    content: { type: String, required: true },
    coverImage: { type: String, default: '' },
    category: { type: String, default: 'Technology' },
    tags: [String],
    youtubeUrl: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    eventDate: { type: Date },
    author: { type: ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    rejectionReason: { type: String, default: '' },
    likes: [{ type: ObjectId, ref: 'User' }],
    dislikes: [{ type: ObjectId, ref: 'User' }],
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    readTime: { type: Number, default: 1 },
    featured: { type: Boolean, default: false },
    publishedAt: Date,
  },
  { timestamps: true }
);
blogSchema.index({ title: 'text', excerpt: 'text', tags: 'text' });
export const Blog = model('Blog', blogSchema);

/* ───────── Comments ───────── */
export const Comment = model(
  'Comment',
  new Schema(
    {
      blog: { type: ObjectId, ref: 'Blog', required: true, index: true },
      user: { type: ObjectId, ref: 'User', required: true },
      parent: { type: ObjectId, ref: 'Comment', default: null },
      content: { type: String, required: true, maxlength: 2000 },
      likes: [{ type: ObjectId, ref: 'User' }],
      dislikes: [{ type: ObjectId, ref: 'User' }],
      edited: { type: Boolean, default: false },
    },
    { timestamps: true }
  )
);

/* ───────── Ratings (per post or for the site) ───────── */
const ratingSchema = new Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['blog', 'site'], required: true },
    target: { type: ObjectId, default: null },
    value: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);
ratingSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
export const Rating = model('Rating', ratingSchema);

/* ───────── Analytics ───────── */
const visitSchema = new Schema(
  {
    path: String,
    sessionId: { type: String, index: true },
    user: { type: ObjectId, ref: 'User' },
    ip: String,
    userAgent: String,
    referrer: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
visitSchema.index({ createdAt: -1 });
export const Visit = model('Visit', visitSchema);

/* ───────── AI chat history ───────── */
export const ChatThread = model(
  'ChatThread',
  new Schema(
    {
      user: { type: ObjectId, ref: 'User', required: true, unique: true },
      messages: [{ role: { type: String, enum: ['user', 'assistant'] }, content: String, at: { type: Date, default: Date.now } }],
    },
    { timestamps: true }
  )
);

/* ───────── Contact messages & newsletter ───────── */
export const ContactMessage = model(
  'ContactMessage',
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
      subject: { type: String, default: '' },
      topic: { type: String, default: 'General' },
      preferredDate: Date,
      message: { type: String, required: true, maxlength: 4000 },
      read: { type: Boolean, default: false },
      user: { type: ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
);

export const Subscriber = model(
  'Subscriber',
  new Schema({ email: { type: String, unique: true, lowercase: true, trim: true } }, { timestamps: true })
);
