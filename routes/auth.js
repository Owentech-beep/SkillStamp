import express from 'express';
import { fail, profileFields } from '../lib/errors.js';

export function authMiddleware(firebaseAuth, db) {
  async function identify(req, res, next) {
    const match = /^Bearer ([^\s]+)$/.exec(req.get('authorization') || '');
    if (!match) throw fail(401, 'Please log in to continue.');
    try {
      req.identity = await firebaseAuth.verifyIdToken(match[1], true);
    } catch (error) {
      if (['auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token', 'auth/argument-error', 'auth/user-disabled', 'auth/user-not-found'].includes(error.code)) {
        throw fail(401, 'Your login has expired. Please log in again.');
      }
      console.error("Firebase token verification failed:", error.code);
      throw fail(503, 'Unable to verify your login. Please try again.');
    }
    if (!req.identity.email) throw fail(403, 'An email account is required.');
    next();
  }
  async function loadProfile(req, res, next) {
    const snap = await db.collection('users').doc(req.identity.uid).get();
    if (!snap.exists) throw fail(409, 'Complete your profile on the signup page.', 'PROFILE_REQUIRED');
    req.user = { ...snap.data(), id: req.identity.uid, email: req.identity.email };
    next();
  }
  return { identify, loadProfile };
}
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) throw fail(403, 'You do not have access to this feature.');
    next();
  };
}
export function authRoutes(db, firebaseAuth, identify, loadProfile) {
  const router = express.Router();
  router.post('/register', identify, async (req, res) => {
    const fields = profileFields(req.body);
    const role = req.body?.role ?? 'student';
    if (!['student', 'employer'].includes(role)) throw fail(400, 'Choose student or employer.');
    const types = ['Student', 'Job seeker', 'Career changer'];
    const type = role === 'employer' ? 'Employer' : types.includes(req.body.type) ? req.body.type : 'Student';
    const ref = db.collection('users').doc(req.identity.uid);
    const user = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      // Registration is retry-safe. An existing role can never be changed here.
      if (snap.exists) return { ...snap.data(), id: req.identity.uid, email: req.identity.email };
      const record = { ...fields, id: req.identity.uid, email: req.identity.email, role, type, createdAt: new Date().toISOString() };
      tx.create(ref, record);
      return record;
    });
    res.status(201).json({ user });
  });
  router.get('/me', identify, loadProfile, (req, res) => res.json({ user: req.user }));
  router.post('/logout', identify, async (req, res) => {
    // Revoke server access as well as signing out the browser. This affects all devices.
    await firebaseAuth.revokeRefreshTokens(req.identity.uid);
    res.json({ message: 'Logged out.' });
  });
  router.post('/login', (req, res) => res.status(410).json({ message: 'Use Firebase Authentication to sign in.' }));
  return router;
}
