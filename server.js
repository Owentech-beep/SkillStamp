import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import session from "express-session";
import { randomBytes } from "node:crypto";
import authRoutes from "./routes/auth.js";
import skillsRoutes from "./routes/skills.js";
import communityRoutes from "./routes/community.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
// Local hackathon prototype: sessions are stored in server memory.
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required in production.");
}

app.use(
  session({
    name: "skillstamp.sid",
    secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction, // Local HTTP development.
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

//Routes
app.use("/api/auth", authRoutes);
app.use("/api", skillsRoutes);
app.use("/api", communityRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "SkillStamp backend is running",
  });
});

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.status(404).send("Page not found");
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request",
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large",
    });
  }

  console.error(err);

  res.status(500).json({
    success: false,
    message: "Something went wrong on the server",
  });
});

app.listen(PORT, () => {
  console.log(`SkillStamp running at http://localhost:${PORT}`);
});