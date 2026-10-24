import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9._]+$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    password: { type: String, select: false },
    avatar: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'banned'], default: 'active' },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    providers: {
      firebaseUid: { type: String, index: true, sparse: true },
      google: { type: Boolean, default: false },
      github: { type: String, index: true, sparse: true },
      phone: { type: Boolean, default: false },
      local: { type: Boolean, default: false },
    },
    headline: { type: String, default: '', maxlength: 120 },
    bio: { type: String, default: '', maxlength: 600 },
    website: { type: String, default: '' },
    location: {
      country: { type: String, default: '' },
      city: { type: String, default: '' },
    },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['', 'male', 'female', 'other'], default: '' },
    experienceLevel: { type: String, default: '' },
    skills: [{ type: String, trim: true }],
    socials: [
      {
        platform: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    ],
    lastLoginAt: Date,
    loginCount: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const o = this.toObject({ versionKey: false });
  delete o.password;
  return o;
};

export const PUBLIC_USER_FIELDS = 'username name avatar headline role';

export default mongoose.model('User', userSchema);
