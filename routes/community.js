import express from 'express';
import { randomUUID } from 'node:crypto';
import { opportunities } from '../data/opportunities.js';
import { requireRole } from './auth.js';
import { pairKey } from './skills.js';
import { fail, validId, profileFields } from '../lib/errors.js';
import { writeNotification } from '../data/notifications.js';

export function communityRoutes(db) {
  const router = express.Router();
  router.patch('/profile', async (req, res) => {
    const fields = profileFields(req.body);
    // Firebase Authentication owns the email. Profile fields cannot overwrite it.
    if (req.body.email && req.body.email.trim().toLowerCase() !== req.identity.email.toLowerCase()) throw fail(400, 'Your sign-in email cannot be changed from this profile form.');
    const updated = { ...fields, email: req.identity.email };
    await db.collection('users').doc(req.user.id).update(updated);
    res.json({ message: 'Profile saved.', user: { ...req.user, ...updated } });
  });
  router.get('/opportunities', (req, res) => res.json({ opportunities }));
  router.get('/applications', requireRole('student'), async (req, res) => {
    const snap = await db.collection('applications').where('userId', '==', req.user.id).get();
    res.json({ applications: snap.docs.map(d => d.data()).sort((a,b) => b.submittedAt.localeCompare(a.submittedAt)) });
  });
  router.post('/opportunities/:id/apply', requireRole('student'), async (req, res) => {
    const opportunity = opportunities.find(o => o.id === req.params.id);
    if (!opportunity) throw fail(404, 'Opportunity not found.');
    const ref = db.collection('applications').doc(pairKey(req.user.id, opportunity.id));
    const application = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) throw fail(409, 'You have already applied for this opportunity.');
      const record = { id: randomUUID(), userId: req.user.id, opportunityId: opportunity.id, title: opportunity.title, company: opportunity.company, status: 'Submitted', submittedAt: new Date().toISOString() };
      tx.create(ref, record);
      writeNotification(tx, db, req.user.id, `Application submitted for ${opportunity.title} at ${opportunity.company}.`);
      return record;
    });
    res.status(201).json({ message: 'Demo application submitted. No real employer was contacted.', application });
  });
  router.get('/notifications', async (req, res) => {
    const snap = await db.collection('notifications').where('userId', '==', req.user.id).get();
    res.json({ notifications: snap.docs.map(d => d.data()).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) });
  });
  router.patch('/notifications/:id/read', async (req, res) => {
    if (!validId(req.params.id)) throw fail(404, 'Notification not found.');
    const ref = db.collection('notifications').doc(req.params.id);
    const notification = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data().userId !== req.user.id) throw fail(404, 'Notification not found.');
      tx.update(ref, { read: true });
      return { ...snap.data(), read: true };
    });
    res.json({ notification });
  });
  return router;
}
