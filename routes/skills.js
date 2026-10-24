import express from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { challenges, evaluateChallenge } from '../data/challenges.js';
import { requireRole } from './auth.js';
import { fail, validId } from '../lib/errors.js';
import { writeNotification } from '../data/notifications.js';

export function pairKey(a, b) { return createHash('sha256').update(JSON.stringify([a, b])).digest('hex'); }
function publicChallenge({ keywords, requiredMatches, checklist, modelAnswer, passMessage, ...visible }) { return visible; }
export function skillsRoutes(db) {
  const router = express.Router();
  router.get('/challenges', (req, res) => res.json({ challenges: challenges.map(publicChallenge) }));
  router.get('/challenges/:id', (req, res) => {
    const challenge = challenges.find(c => c.id === req.params.id);
    if (!challenge) throw fail(404, 'Challenge not found.');
    res.json({ challenge: publicChallenge(challenge) });
  });
  router.post('/challenges/:id/start', requireRole('student'), async (req, res) => {
    const challenge = challenges.find(c => c.id === req.params.id);
    if (!challenge) throw fail(404, 'Challenge not found.');
    const attempt = { id: randomUUID(), userId: req.user.id, challengeId: challenge.id, startedAt: new Date().toISOString(), submittedAt: null };
    await db.collection('attempts').doc(attempt.id).create(attempt);
    res.status(201).json({ attempt });
  });
  router.post('/attempts/:id/submit', requireRole('student'), async (req, res) => {
    if (!validId(req.params.id)) throw fail(404, 'Assessment attempt not found.');
    const answer = req.body?.answer;
    if (typeof answer !== 'string' || !answer.trim() || answer.length > 10000) throw fail(400, 'Enter an answer between 1 and 10,000 characters.');
    const attemptRef = db.collection('attempts').doc(req.params.id);
    const output = await db.runTransaction(async tx => {
      const snap = await tx.get(attemptRef);
      if (!snap.exists || snap.data().userId !== req.user.id) throw fail(404, 'Assessment attempt not found.');
      const attempt = snap.data();
      const challenge = challenges.find(c => c.id === attempt.challengeId);
      if (!challenge) throw fail(404, 'Challenge not found.');
      const stampRef = db.collection('credentials').doc(pairKey(req.user.id, challenge.id));
      const stampSnap = await tx.get(stampRef);
      // Same attempt and same answer is a safe retry, with no repeated side effects.
      if (attempt.submittedAt) {
        if (attempt.answer !== answer.trim()) throw fail(409, 'This attempt has already been submitted. Start a new attempt.');
        return { result: attempt.result, credential: attempt.result.pass && stampSnap.exists ? stampSnap.data() : null, attemptId: attempt.id, modelAnswer: attempt.result.pass ? challenge.modelAnswer ?? null : null };
      }
      const result = evaluateChallenge(challenge, answer);
      const date = new Date().toISOString();
      let credential = result.pass && stampSnap.exists ? stampSnap.data() : null;
      tx.update(attemptRef, { answer: answer.trim(), result, submittedAt: date });
      writeNotification(tx, db, req.user.id, `${challenge.title}: ${result.score}% — ${result.pass ? 'passed' : 'keep practising'}.`);
      if (result.pass && !credential) {
        credential = { credentialId: `SS-${randomUUID()}`, id: challenge.id, userId: req.user.id, title: challenge.title, category: challenge.category, score: result.score, date, checklistResults: result.checklistResults, answer: answer.trim(), attemptId: attempt.id };
        tx.create(stampRef, credential);
        writeNotification(tx, db, req.user.id, `New SkillStamp earned: ${challenge.title}. Credential: ${credential.credentialId}`);
      }
      return { result, credential, attemptId: attempt.id, modelAnswer: result.pass ? challenge.modelAnswer ?? null : null };
    });
    res.json(output);
  });
  router.get('/portfolio', requireRole('student'), async (req, res) => {
    const [attempts, credentials] = await Promise.all([
      db.collection('attempts').where('userId', '==', req.user.id).get(),
      db.collection('credentials').where('userId', '==', req.user.id).get(),
    ]);
    const results = attempts.docs.map(d => d.data()).filter(a => a.submittedAt).sort((a,b) => b.submittedAt.localeCompare(a.submittedAt));
    const stamps = credentials.docs.map(d => d.data()).sort((a,b) => b.date.localeCompare(a.date));
    res.json({ stamps, results, stats: { completedChallenges: new Set(results.map(a => a.challengeId)).size, stampsCollected: stamps.length, pointsEarned: stamps.length * 100 } });
  });
  router.get('/credentials/:id/verify', requireRole('employer'), async (req, res) => {
    if (!validId(req.params.id)) throw fail(404, 'Credential not found.');
    const matches = await db.collection('credentials').where('credentialId', '==', req.params.id).limit(1).get();
    if (matches.empty) return res.status(404).json({ valid: false, message: 'Credential not found.' });
    const c = matches.docs[0].data();
    const owner = await db.collection('users').doc(c.userId).get();
    if (!owner.exists) return res.status(404).json({ valid: false, message: 'Credential holder is unavailable.' });
    res.json({ valid: true, credential: { credentialId: c.credentialId, holderName: owner.data().name, title: c.title, category: c.category, score: c.score, issuedAt: c.date, issuer: 'SkillStamp Hackathon Prototype', assessmentType: 'Rule-based demo assessment' } });
  });
  return router;
}
