import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('disconnected', () => console.warn('⚠  MongoDB disconnected'));
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`✓ MongoDB connected → ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}
