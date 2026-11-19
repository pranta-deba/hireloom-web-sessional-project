import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { createHandler } from 'graphql-http/lib/use/express';

import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { attachUser } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/error.js';
import { UPLOAD_DIR } from './services/uploadService.js';
import { initSocket } from './socket/index.js';
import { schema, rootValue } from './graphql/schema.js';
import { mountSoap } from './soap/service.js';
import { bootstrap } from './seed/bootstrap.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import templateRoutes from './routes/template.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import coverLetterRoutes from './routes/coverLetter.routes.js';
import atsRoutes from './routes/ats.routes.js';
import blogRoutes from './routes/blog.routes.js';
import commentRoutes from './routes/comment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import miscRoutes from './routes/misc.routes.js';

/** Allowed browser origins: CLIENT_URL, plus localhost / LAN dev servers outside production. */
export function corsOrigin(origin, cb) {
  if (!origin || origin === env.clientUrl) return cb(null, true);
  if (!env.isProd) {
    try {
      const { hostname } = new URL(origin);
      if (/^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(hostname)) return cb(null, true);
    } catch {
      /* fall through */
    }
  }
  return cb(null, false);
}

async function start() {
  await connectDB();
  await bootstrap();

  const app = express();
  if (env.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // YouTube, Google Maps, Firebase & TFLite CDNs are embedded by design
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Firebase Google popup
    })
  );
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(compression());
  app.use(morgan(env.isProd ? 'combined' : 'dev', { skip: (req) => req.url.startsWith('/socket.io') }));

  const sessionMiddleware = session({
    name: 'hl.sid',
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: true, // anonymous sessions power unique-visitor analytics
    rolling: true,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      collectionName: 'sessions',
      ttl: 7 * 24 * 60 * 60,
      touchAfter: 60,
      // MongoDB uses a native TTL index; MONGO_COMPAT=true switches to interval clean-up for engines without TTL support
      autoRemove: process.env.MONGO_COMPAT === 'true' ? 'interval' : 'native',
    }),
    cookie: { httpOnly: true, sameSite: 'lax', secure: env.isProd && env.trustProxy, maxAge: 7 * 24 * 60 * 60 * 1000 },
  });
  app.use(sessionMiddleware);
  app.use(attachUser);

  // SOAP must read the raw XML body, so it is mounted before the JSON parser
  mountSoap(app);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime(), db: mongoose.connection.readyState === 1 }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/cover-letters', coverLetterRoutes);
  app.use('/api/ats', atsRoutes);
  app.use('/api/blogs', blogRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', miscRoutes);

  app.all('/graphql', createHandler({ schema, rootValue, context: (req) => ({ user: req.raw.user }) }));

  // Production: serve the built React app from ../client/dist
  const clientDist = path.resolve(env.rootDir, '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api|graphql|soap|socket\.io|uploads).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use('/api', notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  const io = initSocket(server, sessionMiddleware, corsOrigin);
  app.set('io', io);

  server.listen(env.port, () => {
    console.log(`✓ HireLoom API   → http://localhost:${env.port}/api/health`);
    console.log(`✓ GraphQL        → http://localhost:${env.port}/graphql`);
    console.log(`✓ SOAP (WSDL)    → http://localhost:${env.port}/soap/hireloom?wsdl`);
    console.log(`✓ Client origin  → ${env.clientUrl}`);
  });

  const shutdown = async () => {
    console.log('\nShutting down…');
    io.close();
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('✗ Failed to start server:', err.message);
  if (/ECONNREFUSED|ServerSelection/i.test(err.message)) console.error('  → Is MongoDB running? Check MONGO_URI in server/.env');
  process.exit(1);
});
