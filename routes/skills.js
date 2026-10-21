import express from "express";
import { randomUUID } from "node:crypto";
import { challenges, evaluateChallenge } from "../data/challenges.js";
import { requireAuth, requireRole, users } from "./auth.js";
import { notify } from "../data/notifications.js";

const router = express.Router();

// Temporary server-side storage.
const attempts = new Map();
const credentials = new Map();

router.use(requireAuth);

function publicChallenge(challenge) {
  const {
    keywords,
    requiredMatches,
    checklist,
    modelAnswer,
    passMessage,
    ...visible
  } = challenge;

  return visible;
}

function studentCredentials(userId) {
  return [...credentials.values()].filter(
    (credential) => credential.userId === userId,
  );
}

// List challenges without exposing answers or scoring rules.
router.get("/challenges", (req, res) => {
  res.json({
    challenges: challenges.map(publicChallenge),
  });
});

// View one challenge.
router.get("/challenges/:id", (req, res) => {
  const challenge = challenges.find((item) => item.id === req.params.id);

  if (!challenge) {
    return res.status(404).json({ message: "Challenge not found." });
  }

  res.json({ challenge: publicChallenge(challenge) });
});

// Start an assessment owned by the logged-in student.
router.post("/challenges/:id/start", requireRole("student"), (req, res) => {
  const challenge = challenges.find((item) => item.id === req.params.id);

  if (!challenge) {
    return res.status(404).json({ message: "Challenge not found." });
  }

  const attempt = {
    id: randomUUID(),
    userId: req.user.id,
    challengeId: challenge.id,
    startedAt: new Date().toISOString(),
    submittedAt: null,
  };

  attempts.set(attempt.id, attempt);

  res.status(201).json({ attempt });
});

// Score an attempt. Never trust a score supplied by the browser.
router.post("/attempts/:id/submit", requireRole("student"), (req, res) => {
  const attempt = attempts.get(req.params.id);

  if (!attempt || attempt.userId !== req.user.id) {
    return res.status(404).json({ message: "Assessment attempt not found." });
  }

  if (attempt.submittedAt) {
    return res.status(409).json({
      message: "This attempt has already been submitted. Start a new attempt.",
    });
  }

  const answer = req.body?.answer;

  if (typeof answer !== "string" || !answer.trim() || answer.length > 10000) {
    return res.status(400).json({
      message: "Enter an answer between 1 and 10,000 characters.",
    });
  }

  const challenge = challenges.find((item) => item.id === attempt.challengeId);

  const result = evaluateChallenge(challenge, answer);

  attempt.answer = answer.trim();
  attempt.result = result;
  attempt.submittedAt = new Date().toISOString();
  notify(
    req.user.id,
    `${challenge.title}: ${result.score}% — ${
      result.pass ? "passed" : "keep practising"
    }.`,
  );

  let credential = null;

  if (result.pass) {
    // One credential per student per challenge.
    credential = studentCredentials(req.user.id).find(
      (item) => item.id === challenge.id,
    );

    if (!credential) {
      credential = {
        credentialId: `SS-${randomUUID()}`,
        id: challenge.id,
        userId: req.user.id,
        title: challenge.title,
        category: challenge.category,
        score: result.score,
        date: attempt.submittedAt,
        checklistResults: result.checklistResults,
        answer: attempt.answer,
        attemptId: attempt.id,
      };

      credentials.set(credential.credentialId, credential);
      notify(
        req.user.id,
        `New SkillStamp earned: ${challenge.title}. Credential: ${credential.credentialId}`,
      );
    }
  }

  res.json({
    result,
    credential,
    attemptId: attempt.id,
    modelAnswer: result.pass ? (challenge.modelAnswer ?? null) : null,
  });
});

// Portfolio data belongs to the logged-in student.
router.get("/portfolio", requireRole("student"), (req, res) => {
  const results = [...attempts.values()].filter(
    (attempt) => attempt.userId === req.user.id && attempt.submittedAt,
  );

  const stamps = studentCredentials(req.user.id);

  res.json({
    stamps,
    results,
    stats: {
      completedChallenges: new Set(
        results.map((attempt) => attempt.challengeId),
      ).size,
      stampsCollected: stamps.length,
      pointsEarned: stamps.length * 100,
    },
  });
});

// Employer verification exposes credential facts, not private answers.
router.get("/credentials/:id/verify", requireRole("employer"), (req, res) => {
  const credential = credentials.get(req.params.id);

  if (!credential) {
    return res.status(404).json({
      valid: false,
      message: "Credential not found in this demo session.",
    });
  }

  const owner = users.get(credential.userId);

  res.json({
    valid: true,
    credential: {
      credentialId: credential.credentialId,
      holderName: owner.name,
      title: credential.title,
      category: credential.category,
      score: credential.score,
      issuedAt: credential.date,
      issuer: "SkillStamp Hackathon Prototype",
      assessmentType: "Rule-based demo assessment",
    },
  });
});

export default router;
