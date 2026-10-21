import express from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const router = express.Router();

// Temporary storage: cleared when the server restarts.
export const users = new Map();

export function publicUser(user) {
  const { passwordHash, ...profile } = user;
  return profile;
}

export function requireAuth(req, res, next) {
  const user = users.get(req.session.userId);

  if (!user) {
    return res.status(401).json({
      message: "Please log in to continue.",
    });
  }

  req.user = user;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({
        message: "You do not have access to this feature.",
      });
    }

    next();
  };
}

function startSession(req, res, next, user, status = 200) {
  req.session.regenerate((err) => {
    if (err) return next(err);

    req.session.userId = user.id;

    req.session.save((err) => {
      if (err) return next(err);

      res.status(status).json({
        message: "Authentication successful.",
        user: publicUser(user),
      });
    });
  });
}

router.post("/register", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const password = body.password;
    const role = body.role ?? "student";

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        message: "Enter a name between 2 and 100 characters.",
      });
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Use at least 8 characters and at most 72 bytes for your password.",
      });
    }

    if (!["student", "employer"].includes(role)) {
      return res.status(400).json({
        message: "Choose student or employer.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Check after hashing so simultaneous registrations cannot duplicate emails.
    const exists = [...users.values()].some((user) => user.email === email);

    if (exists) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const allowedTypes = ["Student", "Job seeker", "Career changer"];
    const type =
      role === "employer"
        ? "Employer"
        : allowedTypes.includes(body.type)
          ? body.type
          : "Student";

    const user = {
      id: randomUUID(),
      name,
      email,
      passwordHash,
      role,
      type,
      location: "",
      skills: [],
      about: "",
      createdAt: new Date().toISOString(),
    };

    users.set(user.id, user);
    startSession(req, res, next, user, 201);
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (
      typeof body.password !== "string" ||
      Buffer.byteLength(body.password, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Enter a valid email and password.",
      });
    }

    const user = [...users.values()].find((user) => user.email === email);

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return res.status(401).json({
        message: "Incorrect email or password.",
      });
    }

    startSession(req, res, next, user);
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);

    res.clearCookie("skillstamp.sid", { path: "/" });
    res.json({ message: "Logged out successfully." });
  });
});

export default router;