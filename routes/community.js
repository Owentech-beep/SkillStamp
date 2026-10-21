import express from "express";
import { randomUUID } from "node:crypto";
import {
  requireAuth,
  requireRole,
  publicUser,
  users,
} from "./auth.js";
import {
  notify,
  getNotifications,
  markNotificationRead,
} from "../data/notifications.js";

const router = express.Router();
const applications = new Map();

const opportunities = [
  {
    id: "o1",
    title: "Junior Data Analyst (Demo)",
    type: "Internship",
    company: "Example Analytics Co.",
    location: "Polokwane, Limpopo",
    skills: ["Excel", "Data analysis", "Communication"],
    matchSkills: ["excel", "data"],
    description:
      "A fictional learning opportunity involving spreadsheets and reporting.",
  },
  {
    id: "o2",
    title: "IT Support Trainee (Demo)",
    type: "Learnership",
    company: "Example Digital Services",
    location: "Pretoria, Gauteng",
    skills: ["Computer basics", "Problem solving", "Communication"],
    matchSkills: ["problem", "communication"],
    description:
      "A fictional training opportunity in troubleshooting and user support.",
  },
  {
    id: "o3",
    title: "Junior Web Developer (Demo)",
    type: "Entry-level job",
    company: "Example Web Studio",
    location: "Remote / South Africa",
    skills: ["HTML", "CSS", "JavaScript"],
    matchSkills: ["web"],
    description:
      "A fictional junior opportunity building and improving websites.",
  },
  {
    id: "o4",
    title: "Office Administration Intern (Demo)",
    type: "Internship",
    company: "Example Community Office",
    location: "Limpopo",
    skills: ["Communication", "Organisation", "Digital literacy"],
    matchSkills: ["communication", "excel"],
    description:
      "A fictional internship involving email, records and digital tasks.",
  },
  {
    id: "o5",
    title: "Digital Skills Learnership (Demo)",
    type: "Learnership",
    company: "Example Skills Hub",
    location: "South Africa",
    skills: ["Digital literacy", "Problem solving"],
    matchSkills: ["web", "problem"],
    description:
      "A fictional programme building digital and workplace skills.",
  },
  {
    id: "o6",
    title: "Customer Service Assistant (Demo)",
    type: "Entry-level job",
    company: "Example Retail Group",
    location: "Polokwane, Limpopo",
    skills: ["Communication", "Teamwork", "Problem solving"],
    matchSkills: ["communication", "problem"],
    description:
      "A fictional entry-level role helping customers solve everyday problems.",
  },
];

router.use(requireAuth);

router.patch("/profile", (req, res) => {
  const body = req.body ?? {};
  const { name, email, location, skills, about } = body;

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 100
  ) {
    return res.status(400).json({
      message: "Enter a name between 2 and 100 characters.",
    });
  }

  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return res.status(400).json({
      message: "Enter a valid email address.",
    });
  }

  const normalisedEmail = email.trim().toLowerCase();

  const duplicate = [...users.values()].some(
    (user) =>
      user.id !== req.user.id && user.email === normalisedEmail
  );

  if (duplicate) {
    return res.status(409).json({
      message: "Another account already uses that email.",
    });
  }

  if (
    typeof location !== "string" ||
    location.length > 150 ||
    typeof about !== "string" ||
    about.length > 2000 ||
    !Array.isArray(skills) ||
    skills.length > 20 ||
    skills.some(
      (skill) => typeof skill !== "string" || skill.length > 60
    )
  ) {
    return res.status(400).json({
      message:
        "Use a location under 150 characters, a bio under 2,000 characters and up to 20 skills of 60 characters each.",
    });
  }

  // Only update these profile fields. Role and password cannot be changed here.
  Object.assign(req.user, {
    name: name.trim(),
    email: normalisedEmail,
    location: location.trim(),
    about: about.trim(),
    skills: [...new Set(skills.map((skill) => skill.trim()).filter(Boolean))],
  });

  res.json({
    message: "Profile saved.",
    user: publicUser(req.user),
  });
});

router.get("/opportunities", (req, res) => {
  res.json({ opportunities });
});

router.get("/applications", requireRole("student"), (req, res) => {
  res.json({
    applications: [...applications.values()].filter(
      (application) => application.userId === req.user.id
    ),
  });
});

router.post(
  "/opportunities/:id/apply",
  requireRole("student"),
  (req, res) => {
    const opportunity = opportunities.find(
      (item) => item.id === req.params.id
    );

    if (!opportunity) {
      return res.status(404).json({
        message: "Opportunity not found.",
      });
    }

    const key = `${req.user.id}:${opportunity.id}`;

    if (applications.has(key)) {
      return res.status(409).json({
        message: "You have already applied for this opportunity.",
      });
    }

    const application = {
      id: randomUUID(),
      userId: req.user.id,
      opportunityId: opportunity.id,
      title: opportunity.title,
      company: opportunity.company,
      status: "Submitted",
      submittedAt: new Date().toISOString(),
    };

    applications.set(key, application);

    notify(
      req.user.id,
      `Application submitted for ${opportunity.title} at ${opportunity.company}.`
    );

    res.status(201).json({
      message: "Demo application submitted. No real employer was contacted.",
      application,
    });
  }
);

router.get("/notifications", (req, res) => {
  res.json({
    notifications: getNotifications(req.user.id),
  });
});

router.patch("/notifications/:id/read", (req, res) => {
  const notification = markNotificationRead(req.user.id, req.params.id);

  if (!notification) {
    return res.status(404).json({
      message: "Notification not found.",
    });
  }

  res.json({ notification });
});

export default router;