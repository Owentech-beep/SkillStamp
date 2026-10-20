// SkillStamp front-end prototype. Data is saved in this browser with localStorage.
// This is not Firebase authentication or a secure credential-verification system.

const STORAGE = {
  user: "skillstamp_user",
  stamps: "skillstamp_stamps", // base key; per-user suffix added at runtime
};

const challenges = [
  {
    id: "excel",
    title: "Excel Data Analysis",
    category: "Digital",
    level: "Beginner",
    duration: "30 min",
    symbol: "X",
    symbolClass: "excel",
    description:
      "Analyse a realistic weekly sales table and turn the numbers into a clear recommendation.",
    skillsDemonstrated: [
      "Data interpretation",
      "Basic calculations",
      "Business insight",
    ],
    learn: [
      "Read and interpret a small data table",
      "Calculate totals and averages accurately",
      "Identify the strongest day and a simple trend",
      "Write a practical recommendation for a shop owner",
    ],
    dataset: {
      headers: ["Day", "Sales (R)"],
      rows: [
        ["Monday", 450],
        ["Tuesday", 720],
        ["Wednesday", 310],
        ["Thursday", 900],
        ["Friday", 620],
        ["Saturday", 1150],
        ["Sunday", 480],
      ],
    },
    instructions: [
      "A spaza shop recorded these daily sales for one week (see table below).",
      "Calculate the total sales for the full week.",
      "Calculate the average daily sales (round to the nearest rand).",
      "Identify the day with the highest sales.",
      "Write 1–2 sentences recommending one practical action the owner could take based on the numbers.",
    ],
    placeholder:
      "Example format:\nTotal: Rxxxx\nAverage: Rxxx\nHighest day: Saturday (Rxxxx)\nRecommendation: ...",
    keywords: [
      "4630", "r4630", "r4 630", "661", "r661", "saturday", "1150", "r1150",
    ],
    requiredMatches: 3,
    checklist: [
      { id: "total", label: "Correct weekly total", test: (t) => /4630|4\s*630/.test(t) },
      { id: "average", label: "Reasonable average stated", test: (t) => /66[0-9]|average/.test(t) },
      { id: "highest", label: "Identified Saturday as highest", test: (t) => /saturday/.test(t) },
      { id: "insight", label: "Gave a practical recommendation", test: (t) => /recommend|suggest|should|could|stock|staff|promo|busy|weekend/.test(t) },
    ],
    modelAnswer:
      "Total: R4 630. Average: about R661 per day. Highest day: Saturday (R1 150). Recommendation: The owner should ensure enough stock and staff on Saturdays, and consider a mid-week promotion to lift the quieter Wednesday and Sunday sales.",
    passMessage:
      "You correctly worked with the weekly sales data and offered a practical recommendation. Your SkillStamp (with evidence) has been added to your portfolio.",
  },
  {
    id: "web",
    title: "Web Development Basics",
    category: "Digital",
    level: "Beginner",
    duration: "45 min",
    symbol: "</>",
    symbolClass: "code",
    description:
      "Demonstrate your understanding of the building blocks of a simple webpage.",
    learn: [
      "Explain the role of HTML",
      "Explain the role of CSS",
      "Explain the role of JavaScript",
    ],
    instructions: [
      "In your own words, explain what HTML is used for.",
      "Explain how CSS improves a webpage.",
      "Give one example of something JavaScript can make interactive.",
    ],
    placeholder: "Write your answer in three short points...",
    keywords: ["html", "css", "javascript"],
    requiredMatches: 3,
    passMessage:
      "Your answer mentions the three core web technologies and their roles. Your sample SkillStamp has been added to your portfolio.",
  },
  {
    id: "communication",
    title: "Professional Communication",
    category: "Communication",
    level: "Beginner",
    duration: "25 min",
    symbol: "✉",
    symbolClass: "communication",
    description:
      "Write a clear, professional follow-up email after applying for an internship.",
    skillsDemonstrated: [
      "Professional tone",
      "Clear purpose",
      "Polite call-to-action",
    ],
    learn: [
      "Use a professional greeting and closing",
      "State the purpose of the email clearly",
      "Ask a polite progress question",
      "Keep the message concise and respectful",
    ],
    scenario:
      "You applied for a Digital Marketing Internship at GreenLeaf Retail in Polokwane one week ago. You have not received a reply yet. Write a short follow-up email to the hiring manager (Ms Nkosi).",
    instructions: [
      "Address the email to Ms Nkosi.",
      "Mention the specific role and when you applied.",
      "Politely ask whether there is any update on the application.",
      "Offer to provide any further information if needed.",
      "Close professionally with your name.",
    ],
    placeholder:
      "Subject: Follow-up on Digital Marketing Internship application\n\nDear Ms Nkosi,\n\n...",
    keywords: [
      "dear", "ms nkosi", "internship", "digital marketing",
      "applied", "week", "update", "regards", "thank",
    ],
    requiredMatches: 4,
    checklist: [
      { id: "greeting", label: "Professional greeting (Dear Ms Nkosi)", test: (t) => /dear\s+(ms\s+)?nkosi/.test(t) },
      { id: "role", label: "Named the internship / role", test: (t) => /internship|digital marketing/.test(t) },
      { id: "timing", label: "Mentioned when you applied", test: (t) => /week|applied|ago|last/.test(t) },
      { id: "ask", label: "Polite request for an update", test: (t) => /update|status|progress|hear|any news/.test(t) },
      { id: "close", label: "Professional closing", test: (t) => /regards|sincerely|kind regards|thank you/.test(t) },
    ],
    modelAnswer:
      "Subject: Follow-up – Digital Marketing Internship application\n\nDear Ms Nkosi,\n\nI hope you are well. I applied for the Digital Marketing Internship at GreenLeaf Retail one week ago and wanted to politely follow up on the status of my application.\n\nI remain very interested in the opportunity and would be happy to provide any additional information if needed.\n\nThank you for your time. I look forward to hearing from you.\n\nKind regards,\n[Your Name]",
    passMessage:
      "Your email includes the key elements of a professional follow-up. Your SkillStamp (with evidence) has been added to your portfolio.",
  },
  {
    id: "problem",
    title: "Problem Solving",
    category: "Problem Solving",
    level: "Intermediate",
    duration: "35 min",
    symbol: "◎",
    symbolClass: "problem",
    description:
      "Break down a simple work problem and suggest a practical solution.",
    learn: [
      "Identify a problem",
      "Suggest a reasonable next step",
      "Explain your reasoning",
    ],
    instructions: [
      "A small team keeps missing deadlines because tasks are unclear.",
      "Describe one question you would ask to understand the problem.",
      "Suggest two practical actions the team could try.",
      "Explain how the team could check whether your solution worked.",
    ],
    placeholder: "Describe your approach and suggested solution...",
    keywords: ["task", "deadline", "plan", "check"],
    requiredMatches: 2,
    passMessage:
      "Your response outlines a practical approach. Your sample SkillStamp has been added to your portfolio.",
  },
];

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
      "A fictional entry-level learning opportunity focused on spreadsheets, reporting and interpreting information.",
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
      "A fictional training opportunity for someone interested in troubleshooting and helping computer users.",
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
      "A fictional junior opportunity for someone learning how to create and improve websites.",
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
      "A fictional internship involving email, records and everyday digital tasks.",
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
      "A fictional learning programme for people building foundational digital and workplace skills.",
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
      "A fictional entry-level role focused on helping customers and solving everyday problems.",
  },
];

/* ---------- Storage helpers ---------- */

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.user)) || null;
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem(STORAGE.user, JSON.stringify(user));
}

function stampsKey() {
  const u = getUser();
  const who = u && u.email ? u.email.toLowerCase() : "guest";
  return `${STORAGE.stamps}:${who}`;
}

function getStamps() {
  try {
    return JSON.parse(localStorage.getItem(stampsKey())) || [];
  } catch {
    return [];
  }
}

function saveStamps(stamps) {
  localStorage.setItem(stampsKey(), JSON.stringify(stamps));
}

/* ---------- General helpers ---------- */

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch])
  );
}

function safeInitial(name) {
  return (name || "T").trim().charAt(0).toUpperCase() || "T";
}

function toggleMenu() {
  document.getElementById("mainNav")?.classList.toggle("open");
}

function searchFromDashboard() {
  const q = document.getElementById("dashboardSearch")?.value.trim();
  if (q) sessionStorage.setItem("skillstamp_search", q);
  location.href = "challenges.html";
}

/* ---------- Recommendation engine ---------- */

// Given the user's stamps, find the opportunity they're closest to matching
// and recommend the specific challenge that would close the gap.
function computeRecommendation(stamps) {
  const doneIds = new Set(stamps.map((s) => s.id));

  const candidates = opportunities
    .map((o) => ({
      opportunity: o,
      missing: o.matchSkills.filter((ms) => !doneIds.has(ms)),
    }))
    .filter((c) => c.missing.length === 1) // one stamp away
    .sort((a, b) => a.missing.length - b.missing.length);

  if (candidates.length) {
    const best = candidates[0];
    const targetId = best.missing[0];
    const challenge = challenges.find((ch) => ch.id === targetId);
    if (challenge) {
      return {
        challenge,
        reason: `One SkillStamp away from "${best.opportunity.title}". Complete "${challenge.title}" to close the gap.`,
      };
    }
  }

  // Fallback: recommend the first uncompleted challenge.
  const nextUncompleted = challenges.find((ch) => !doneIds.has(ch.id));
  if (nextUncompleted) {
    return {
      challenge: nextUncompleted,
      reason: "Start with a practical challenge to build your first SkillStamp.",
    };
  }

  return {
    challenge: challenges[0],
    reason: "You've completed every challenge — well done. Review any of them to keep your skills sharp.",
  };
}

/* ---------- Auth pages ---------- */

function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const old = getUser();
    const user =
      old && old.email.toLowerCase() === email.toLowerCase()
        ? old
        : {
            name: email.split("@")[0].replace(/[._-]/g, " "),
            email,
            type: "Job seeker",
            location: "",
            skills: [],
            about: "",
          };
    saveUser(user);
    location.href = "dashboard.html";
  });
}

function initSignup() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = {
      name: document.getElementById("fullName").value.trim(),
      email: document.getElementById("signupEmail").value.trim(),
      type: document.getElementById("userType").value,
      location: "",
      skills: [],
      about: "",
    };
    saveUser(user);
    location.href = "dashboard.html";
  });
}

/* ---------- Shared avatar filler ---------- */

function initAvatar() {
  const user = getUser();
  document.querySelectorAll("[data-avatar]").forEach((el) => {
    el.textContent = safeInitial(user ? user.name : "");
  });
}

/* ---------- Dashboard ---------- */

function initDashboard() {
  const user = getUser();
  const welcome = document.getElementById("welcomeName");
  if (welcome) welcome.textContent = user ? user.name.split(" ")[0] : "there";

  const stamps = getStamps();
  const completed = document.getElementById("completedCount");
  const stampCount = document.getElementById("stampCount");
  if (completed) completed.textContent = stamps.length;
  if (stampCount) stampCount.textContent = stamps.length;

  const oppCount = document.getElementById("opportunityCount");
  if (oppCount) oppCount.textContent = opportunities.length;

  const search = document.getElementById("dashboardSearch");
  if (search) search.value = sessionStorage.getItem("skillstamp_search") || "";

  // Render the computed recommendation.
  const recGrid = document.getElementById("recommendationGrid");
  if (recGrid) {
    const rec = computeRecommendation(stamps);
    const c = rec.challenge;
    recGrid.innerHTML = `<article class="card recommendation">
      <div class="challenge-symbol ${escapeHTML(c.symbolClass)}" aria-hidden="true">${escapeHTML(c.symbol)}</div>
      <div class="recommendation-body">
        <span class="pill">RECOMMENDED NEXT</span>
        <h3>${escapeHTML(c.title)}</h3>
        <p>${escapeHTML(rec.reason)}</p>
        <a class="text-link" href="challenge.html?id=${encodeURIComponent(c.id)}">Start challenge →</a>
      </div>
    </article>`;
  }
}

/* ---------- Challenges list ---------- */

function challengeCard(c) {
  const done = getStamps().some((s) => s.id === c.id);
  return `<article class="card challenge-card">
    <div class="challenge-symbol ${escapeHTML(c.symbolClass)}" aria-hidden="true">${escapeHTML(c.symbol)}</div>
    <div>
      <span class="category-label">${escapeHTML(c.category)}</span>
      <h3>${escapeHTML(c.title)}</h3>
      <p>${escapeHTML(c.description)}</p>
      <div class="card-meta">
        <span class="pill">${escapeHTML(c.level)}</span>
        <span class="pill">${escapeHTML(c.duration)}</span>
        ${done ? '<span class="pill pill-green">Completed <span aria-hidden="true">✓</span></span>' : ""}
      </div>
      <div class="card-actions">
        <a class="btn" href="challenge.html?id=${encodeURIComponent(c.id)}">${done ? "Review challenge" : "Start challenge"}</a>
      </div>
    </div>
  </article>`;
}

function initChallenges() {
  const list = document.getElementById("challengeList");
  if (!list) return;

  const search = document.getElementById("challengeSearch");
  const level = document.getElementById("levelFilter");
  const category = document.getElementById("categoryFilter");
  if (!search || !level || !category) return;

  const savedSearch = sessionStorage.getItem("skillstamp_search");
  if (savedSearch) search.value = savedSearch;
  sessionStorage.removeItem("skillstamp_search");

  function render() {
    const q = search.value.toLowerCase();
    const filtered = challenges.filter(
      (c) =>
        (c.title + " " + c.description + " " + c.category)
          .toLowerCase()
          .includes(q) &&
        (level.value === "all" || c.level === level.value) &&
        (category.value === "all" || c.category === category.value)
    );

    list.innerHTML = filtered.length
      ? filtered.map(challengeCard).join("")
      : '<div class="empty-state"><h2>No matching challenges</h2><p>Try another search or filter.</p></div>';
  }

  search.addEventListener("input", render);
  level.addEventListener("change", render);
  category.addEventListener("change", render);
  render();
}

/* ---------- Challenge detail + evaluation ---------- */

function evaluateChallenge(c, answer) {
  const text = answer.toLowerCase().replace(/\s+/g, " ").trim();

  if (!text) {
    return {
      pass: false,
      score: 0,
      matched: 0,
      total: (c.checklist || c.keywords || []).length,
      checklistResults: [],
      feedback: "Please enter an answer before submitting.",
    };
  }

  if (c.checklist && c.checklist.length) {
    const checklistResults = c.checklist.map((item) => ({
      id: item.id,
      label: item.label,
      passed: item.test(text),
    }));
    const matched = checklistResults.filter((r) => r.passed).length;
    const total = checklistResults.length;
    const threshold = c.requiredMatches
      ? Math.min(c.requiredMatches, total)
      : Math.ceil(total * 0.7);
    const pass = matched >= threshold;

    return {
      pass,
      matched,
      total,
      score: Math.round((matched / total) * 100),
      checklistResults,
      feedback: pass
        ? c.passMessage
        : "Not quite yet. Review the checklist below, strengthen the missing parts, and try again. This is a simple demo evaluation — not a professional certification.",
    };
  }

  // fallback keyword matching...
  const matchedKeywords = c.keywords.filter((k) => text.includes(k));
  const required = c.requiredMatches ?? 2;
  const pass = matchedKeywords.length >= required;

  return {
    pass,
    matched: matchedKeywords.length,
    total: c.keywords.length,
    score: pass ? 100 : Math.round((matchedKeywords.length / required) * 100),
    checklistResults: [],
    feedback: pass
      ? c.passMessage
      : "Not quite yet. Review the instructions, add more detail and try again. This demo checks for selected keywords, so it is only a simple illustration—not a reliable assessment of skill.",
  };
}

// Renders the dataset table (if present) as an HTML table.
function renderDataset(dataset) {
  if (!dataset || !dataset.headers || !dataset.rows) return "";
  return `<div class="dataset-block">
    <h3>Dataset</h3>
    <table class="dataset-table">
      <thead><tr>${dataset.headers.map((h) => `<th>${escapeHTML(h)}</th>`).join("")}</tr></thead>
      <tbody>${dataset.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHTML(cell)}</td>`).join("")}</tr>`
        )
        .join("")}</tbody>
    </table>
  </div>`;
}

function initChallenge() {
  const holder = document.getElementById("challengeDetail");
  if (!holder) return;

  const id = new URLSearchParams(location.search).get("id") || "excel";
  const c = challenges.find((x) => x.id === id) || challenges[0];
  const already = getStamps().some((s) => s.id === c.id);

  const skillsHTML = c.skillsDemonstrated
    ? `<h3>Skills demonstrated</h3><div class="card-meta">${c.skillsDemonstrated
        .map((s) => `<span class="pill">${escapeHTML(s)}</span>`)
        .join("")}</div>`
    : "";

  const scenarioHTML = c.scenario
    ? `<div class="scenario"><h3>Scenario</h3><p>${escapeHTML(c.scenario)}</p></div>`
    : "";

  holder.innerHTML = `<article class="card challenge-detail-card">
    <span class="category-label">${escapeHTML(c.category)} · ${escapeHTML(c.level)}</span>
    <h1>${escapeHTML(c.title)}</h1>
    <p class="muted">${escapeHTML(c.description)}</p>
    <div class="card-meta">
      <span class="pill">${escapeHTML(c.duration)}</span>
      <span class="pill">Sample assessment</span>
    </div>
    ${skillsHTML}
    ${scenarioHTML}
    ${renderDataset(c.dataset)}
    <div class="instructions">
      <h3>Your task</h3>
      <ol>${c.instructions.map((i) => `<li>${escapeHTML(i)}</li>`).join("")}</ol>
    </div>
    <h3>What you'll practise</h3>
    <ul>${c.learn.map((i) => `<li>${escapeHTML(i)}</li>`).join("")}</ul>
    <form id="answerForm">
      <label for="challengeAnswer">Your submission</label>
      <textarea id="challengeAnswer" required placeholder="${escapeHTML(c.placeholder)}"></textarea>
      <button class="btn" type="submit">Submit for sample evaluation</button>
    </form>
    ${already ? '<p class="form-note">You have already earned a demo SkillStamp for this challenge. A new pass will not create a duplicate.</p>' : ""}
  </article>`;

  const form = document.getElementById("answerForm");
  const panel = document.getElementById("resultPanel");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const answer = document.getElementById("challengeAnswer").value;
    const result = evaluateChallenge(c, answer);

    panel.classList.remove("hidden");
    panel.setAttribute("tabindex", "-1");

    // Build checklist feedback HTML if available
    let checklistHTML = "";
    if (result.checklistResults && result.checklistResults.length) {
      const items = result.checklistResults
        .map(
          (r) =>
            `<li class="checklist-item ${r.passed ? "passed" : "failed"}">
              <span class="checklist-icon" aria-hidden="true">${r.passed ? "✓" : "✗"}</span>
              ${escapeHTML(r.label)}
            </li>`
        )
        .join("");
      checklistHTML = `<ul class="result-checklist">${items}</ul>`;
    }

    const modelAnswerHTML = result.pass && c.modelAnswer
      ? `<details class="model-answer"><summary>See a model answer</summary><pre>${escapeHTML(c.modelAnswer)}</pre></details>`
      : "";

    panel.innerHTML = `
      <h2>${result.pass ? "★ Challenge passed!" : "Keep practising"}</h2>
      <div class="result-score">${result.matched} of ${result.total} key ideas matched</div>
      ${checklistHTML}
      <p>${escapeHTML(result.feedback)}</p>
      ${modelAnswerHTML}
      <p class="form-note">This score is generated by simple demo logic and does not certify real-world competence.</p>
      ${
        result.pass
          ? '<a class="btn" href="portfolio.html">View my SkillStamps</a>'
          : '<button class="btn" type="button" id="tryAgainBtn">Try again</button>'
      }
    `;

    if (result.pass) {
      const stamps = getStamps();
      const existing = stamps.find((s) => s.id === c.id);

      if (existing) {
        if (result.score > existing.score) existing.score = result.score;
        existing.checklistResults = result.checklistResults;
        existing.answer = answer;
      } else {
        stamps.push({
          id: c.id,
          title: c.title,
          category: c.category,
          score: result.score,
          date: new Date().toISOString(),
          checklistResults: result.checklistResults,
          answer,
        });
      }

      saveStamps(stamps);
    }

    const tryAgain = document.getElementById("tryAgainBtn");
    if (tryAgain) {
      tryAgain.addEventListener("click", () => {
        const textarea = document.getElementById("challengeAnswer");
        textarea.focus();
        textarea.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    panel.focus({ preventScroll: false });
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/* ---------- Portfolio ---------- */

// Demo stamps shown when portfolio.html?demo=1 is visited (for landing-page preview).
const DEMO_STAMPS = [
  {
    id: "excel",
    title: "Excel Data Analysis",
    category: "Digital",
    score: 100,
    date: new Date().toISOString(),
    checklistResults: [
      { id: "total", label: "Correct weekly total", passed: true },
      { id: "average", label: "Reasonable average stated", passed: true },
      { id: "highest", label: "Identified Saturday as highest", passed: true },
      { id: "insight", label: "Gave a practical recommendation", passed: true },
    ],
    answer:
      "Total: R4 630. Average: about R661 per day. Highest day: Saturday (R1 150). Recommendation: The owner should ensure enough stock and staff on Saturdays.",
  },
  {
    id: "communication",
    title: "Professional Communication",
    category: "Communication",
    score: 100,
    date: new Date().toISOString(),
    checklistResults: [
      { id: "greeting", label: "Professional greeting (Dear Ms Nkosi)", passed: true },
      { id: "role", label: "Named the internship / role", passed: true },
      { id: "timing", label: "Mentioned when you applied", passed: true },
      { id: "ask", label: "Polite request for an update", passed: true },
      { id: "close", label: "Professional closing", passed: true },
    ],
    answer:
      "Dear Ms Nkosi, I applied for the Digital Marketing Internship one week ago and wanted to follow up on the status of my application. Thank you. Kind regards, [Your Name].",
  },
  {
    id: "web",
    title: "Web Development Basics",
    category: "Digital",
    score: 100,
    date: new Date().toISOString(),
    checklistResults: [],
    answer: "HTML structures content. CSS styles it. JavaScript adds interactivity.",
  },
];

function initPortfolio() {
  const list = document.getElementById("portfolioList");
  const empty = document.getElementById("emptyPortfolio");
  if (!list) return;

  const isDemo = new URLSearchParams(location.search).get("demo") === "1";
  const user = getUser();
  const stamps = isDemo ? DEMO_STAMPS : getStamps();

  const nameEl = document.getElementById("portfolioName");
  const totalEl = document.getElementById("portfolioTotal");
  if (nameEl) {
    nameEl.textContent = isDemo
      ? "Sample portfolio"
      : user
        ? `${user.name}'s SkillStamps`
        : "Your SkillStamps";
  }
  if (totalEl) {
    totalEl.textContent = `${stamps.length} stamp${stamps.length === 1 ? "" : "s"}`;
  }

  // Toggle the empty-state and, if demo mode, hide the "sign up" CTA.
  if (empty) empty.classList.toggle("hidden", stamps.length > 0);

  if (isDemo) {
    const demoBadge = document.getElementById("demoPreviewBadge");
    if (demoBadge) demoBadge.classList.remove("hidden");
  }

  // Extra summary line: how many challenges earned "with evidence".
  const extra = document.getElementById("portfolioSummaryExtra");
  if (extra) {
    const withEvidence = stamps.filter(
      (s) => Array.isArray(s.checklistResults) && s.checklistResults.length
    ).length;
    extra.innerHTML = withEvidence
      ? `<p class="muted">${withEvidence} stamp${withEvidence === 1 ? "" : "s"} include checklist evidence.</p>`
      : "";
  }

  list.innerHTML = stamps
    .map((s) => {
      const evidenceHTML =
        Array.isArray(s.checklistResults) && s.checklistResults.length
          ? `<ul class="stamp-evidence">${s.checklistResults
              .map(
                (r) =>
                  `<li class="${r.passed ? "passed" : "failed"}"><span aria-hidden="true">${r.passed ? "✓" : "✗"}</span> ${escapeHTML(r.label)}</li>`
              )
              .join("")}</ul>`
          : "";

      const answerHTML = s.answer
        ? `<details class="stamp-answer"><summary>View submitted answer</summary><pre>${escapeHTML(s.answer)}</pre></details>`
        : "";

      return `<article class="card stamp-card-small">
        <div class="stamp-badge" aria-hidden="true">★</div>
        <div>
          <span class="category-label">${escapeHTML(s.category)}</span>
          <h3>${escapeHTML(s.title)}</h3>
          <p>Demo score: ${Number(s.score) || 0}% · Earned ${new Date(s.date).toLocaleDateString()}</p>
          ${evidenceHTML}
          ${answerHTML}
        </div>
      </article>`;
    })
    .join("");
}

/* ---------- Opportunities ---------- */

function initOpportunities() {
  const list = document.getElementById("opportunityList");
  if (!list) return;

  const search = document.getElementById("opportunitySearch");
  const type = document.getElementById("opportunityType");
  if (!search || !type) return;

  function render() {
    const q = search.value.toLowerCase();
    const stamps = getStamps();

    const data = opportunities.filter(
      (o) =>
        (o.title + " " + o.company + " " + o.location + " " + o.skills.join(" "))
          .toLowerCase()
          .includes(q) &&
        (type.value === "all" || o.type === type.value)
    );

    list.innerHTML = data.length
      ? data
          .map((o) => {
            const matchedStamps = stamps.filter((s) =>
              o.matchSkills.includes(s.id)
            );
            const missingSkills = o.matchSkills.filter(
              (ms) => !stamps.some((s) => s.id === ms)
            );
            const hits = matchedStamps.length;
            const match = Math.min(
              98,
              Math.round(
                25 + (hits / Math.max(o.matchSkills.length, 1)) * 73
              )
            );

            const reason = matchedStamps.length
              ? `Matched because you earned: <strong>${matchedStamps
                  .map((s) => escapeHTML(s.title))
                  .join(", ")}</strong>`
              : "Complete a related challenge to improve this match.";

            const missing = missingSkills.length
              ? `<p class="match-reason"><small>Missing: ${missingSkills
                  .map(escapeHTML)
                  .join(", ")}</small></p>`
              : "";

            return `<article class="card opportunity-card">
              <span class="match-pill">${match}% demo match</span>
              <span class="category-label">${escapeHTML(o.type)}</span>
              <h3>${escapeHTML(o.title)}</h3>
              <p><strong>${escapeHTML(o.company)}</strong> · ${escapeHTML(o.location)}</p>
              <p>${escapeHTML(o.description)}</p>
              <div class="card-meta">
                ${o.skills.map((s) => `<span class="pill">${escapeHTML(s)}</span>`).join("")}
              </div>
              <p class="match-reason">${reason}</p>
              ${missing}
              <button class="btn" type="button" data-opportunity-id="${escapeHTML(o.id)}">View details</button>
            </article>`;
          })
          .join("")
      : '<div class="empty-state"><h2>No matching opportunities</h2><p>Try a different keyword or type.</p></div>';

    list.querySelectorAll("[data-opportunity-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        showOpportunityInfo(btn.dataset.opportunityId);
      });
    });
  }

  search.addEventListener("input", render);
  type.addEventListener("change", render);
  render();
}

function showOpportunityInfo(id) {
  const o = opportunities.find((x) => x.id === id);
  if (o) {
    alert(
      `${o.title}\n${o.company}\n${o.location}\n\n${o.description}\n\nThis is a fictional hackathon demo listing, not a live vacancy.`
    );
  }
}

/* ---------- Profile ---------- */

function initProfile() {
  const form = document.getElementById("profileForm");
  if (!form) return;

  const user = getUser() || {
    name: "",
    email: "",
    location: "",
    skills: [],
    about: "",
  };

  document.getElementById("profileName").value = user.name || "";
  document.getElementById("profileEmail").value = user.email || "";
  document.getElementById("profileLocation").value = user.location || "";
  document.getElementById("profileSkills").value = (user.skills || []).join(
    ", "
  );
  document.getElementById("profileAbout").value = user.about || "";

  const heading = document.getElementById("profileHeading");
  const avatar = document.getElementById("profileAvatar");
  if (heading) heading.textContent = user.name || "Your profile";
  if (avatar) avatar.textContent = safeInitial(user.name);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const updated = {
      ...user,
      name: document.getElementById("profileName").value.trim(),
      email: document.getElementById("profileEmail").value.trim(),
      location: document.getElementById("profileLocation").value.trim(),
      skills: document        .getElementById("profileSkills")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      about: document.getElementById("profileAbout").value.trim(),
    };

    saveUser(updated);

    if (heading) heading.textContent = updated.name;
    if (avatar) avatar.textContent = safeInitial(updated.name);

    alert("Profile saved in this browser demo.");
  });
}

function logoutDemo() {
  if (
    confirm(
      "Clear the demo profile for this browser and return to the public page?"
    )
  ) {
    localStorage.removeItem(stampsKey());
    localStorage.removeItem(STORAGE.user);
    location.href = "index.html";
  }
}

function resetDemo() {
  if (
    confirm(
      "This will clear your demo profile and all SkillStamps. Continue?"
    )
  ) {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE.user) || k.startsWith(STORAGE.stamps))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
    location.href = "index.html";
  }
}

/* ---------- PWA service worker ---------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

/* ---------- Router ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initAvatar();

  const page = document.body.dataset.page;
  const init = {
    login: initLogin,
    signup: initSignup,
    dashboard: initDashboard,
    challenges: initChallenges,
    challenge: initChallenge,
    portfolio: initPortfolio,
    opportunities: initOpportunities,
    profile: initProfile,
  }[page];

  if (init) init();
});