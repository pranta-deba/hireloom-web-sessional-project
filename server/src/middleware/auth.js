import { User } from '../models/index.js';
import { ApiError } from '../utils/http.js';

/** Attaches req.user if the session holds a valid, active user. */
export async function attachUser(req, _res, next) {
  try {
    const id = req.session?.userId;
    if (id) {
      const user = await User.findById(id);
      if (user && user.status === 'active') req.user = user;
      else if (req.session) {
        delete req.session.userId;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new ApiError(401, 'Please sign in to continue.'));
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(new ApiError(401, 'Please sign in to continue.'));
  if (req.user.role !== 'admin') return next(new ApiError(403, 'Administrator access required.'));
  next();
}

/** Persist a login in the session — the single place where sessions are created. */
export function startSession(req, user, method) {
  return new Promise((resolve, reject) => {
    const keep = { verifiedEmail: req.session.verifiedEmail, verifiedPhone: req.session.verifiedPhone };
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = String(user._id);
      req.session.role = user.role;
      req.session.loginMethod = method;
      req.session.loginAt = new Date().toISOString();
      req.session.ip = req.ip;
      req.session.userAgent = req.get('user-agent') || '';
      Object.assign(req.session, keep);
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}
