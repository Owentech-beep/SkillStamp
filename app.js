import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { authMiddleware, authRoutes } from './routes/auth.js';
import { skillsRoutes } from './routes/skills.js';
import { communityRoutes } from './routes/community.js';
const root = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ db, firebaseAuth, webConfig, production = false }) {
  const app = express();
  app.disable('x-powered-by');
  if (production) app.set('trust proxy', 1); // Render has one trusted reverse proxy.
  app.use(helmet({
    strictTransportSecurity: production ? undefined : false,
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com'],
      frameSrc: ["'self'", `https://${webConfig.authDomain}`],
      objectSrc: ["'none'"], upgradeInsecureRequests: production ? [] : null,
    } },
  }));
  app.get('/api/health', (req, res) => res.json({ success: true, message: 'SkillStamp backend is running' }));
  app.get('/api/firebase-config', (req, res) => res.json(webConfig));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests. Please wait a minute.' } }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.headers['content-length'] !== '0' && req.headers['content-length'] && !req.is('application/json')) return res.status(415).json({ message: 'Send JSON requests.' });
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  const { identify, loadProfile } = authMiddleware(firebaseAuth, db);
  app.use('/api/auth', authRoutes(db, firebaseAuth, identify, loadProfile));
  app.use('/api', identify, loadProfile, skillsRoutes(db), communityRoutes(db));
  app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));
  app.use(express.static(path.join(root, 'public'), { maxAge: 0 }));
  app.use((req, res) => res.status(404).send('Page not found.'));
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON request.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error('Request failed:', err.code || err.name); // Never log tokens, passwords or request bodies.
    res.status(status).json({ message: status === 500 ? 'Unable to complete the request. Please try again.' : err.message, ...(err.code && status < 500 ? { code: err.code } : {}) });
  });
  return app;
}
