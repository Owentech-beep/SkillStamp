async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function showFormMessage(form, message) {
  let notice = form.querySelector("[data-form-message]");

  if (!notice) {
    notice = document.createElement("p");
    notice.dataset.formMessage = "";
    notice.className = "form-note";
    notice.setAttribute("role", "alert");
    form.appendChild(notice);
  }

  notice.textContent = message;
}
// SkillStamp front-end prototype. Data is saved in this browser with localStorage.
// This is not Firebase authentication or a secure credential-verification system.

const STORAGE = {
  user: "skillstamp_user",
  stamps: "skillstamp_stamps", // base key; per-user suffix added at runtime
  documents: "skillstamp_documents", // base key; per-user suffix added at runtime
};

const DOC_MAX_BYTES = 1.5 * 1024 * 1024; // ~1.5 MB per file (localStorage limit)
const DOC_ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const DOC_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp";

let challenges = [];
let serverPortfolio = {
  stamps: [],
  results: [],
  stats: {
    completedChallenges: 0,
    stampsCollected: 0,
    pointsEarned: 0,
  },
};

let opportunities = [];
let myApplications = [];

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
  return serverPortfolio.stamps;
}

function saveStamps(stamps) {
  localStorage.setItem(stampsKey(), JSON.stringify(stamps));
}

function documentsKey() {
  const u = getUser();
  const who = u && u.email ? u.email.toLowerCase() : "guest";
  return `${STORAGE.documents}:${who}`;
}

function getDocuments() {
  try {
    return JSON.parse(localStorage.getItem(documentsKey())) || [];
  } catch {
    return [];
  }
}

function saveDocuments(docs) {
  localStorage.setItem(documentsKey(), JSON.stringify(docs));
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function isAllowedDocument(file) {
  if (DOC_ALLOWED.includes(file.type)) return true;
  const name = (file.name || "").toLowerCase();
  return /\.(pdf|jpe?g|png|webp|docx?)$/.test(name);
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Minimal ZIP builder (store only, no compression) — no external library needed. */
function buildZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  function crc32(buf) {
    let c = 0xffffffff;
    const table =
      buildZip._crcTable ||
      (buildZip._crcTable = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
          let x = n;
          for (let k = 0; k < 8; k++)
            x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1;
          t[n] = x;
        }
        return t;
      })());
    for (let i = 0; i < buf.length; i++)
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function u16(n) {
    return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
  }
  function u32(n) {
    return new Uint8Array([
      n & 0xff,
      (n >> 8) & 0xff,
      (n >> 16) & 0xff,
      (n >> 24) & 0xff,
    ]);
  }

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const size = data.length;

    // Local file header
    const local = [
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    ];
    const localLen = 30 + nameBytes.length + size;
    localParts.push(...local);

    // Central directory header
    const central = [
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ];
    centralParts.push(...central);
    offset += localLen;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const end = [
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralSize),
    u32(offset),
    u16(0),
  ];

  const all = [...localParts, ...centralParts, ...end];
  let total = 0;
  for (const p of all) total += p.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of all) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
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
      })[ch],
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

function computeRecommendation(stamps) {
  const doneIds = new Set(stamps.map((s) => s.id));

  const candidates = opportunities
    .map((o) => ({
      opportunity: o,
      missing: o.matchSkills.filter((ms) => !doneIds.has(ms)),
    }))
    .filter((c) => c.missing.length === 1)
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

  const nextUncompleted = challenges.find((ch) => !doneIds.has(ch.id));
  if (nextUncompleted) {
    return {
      challenge: nextUncompleted,
      reason:
        "Start with a practical challenge to build your first SkillStamp.",
    };
  }

  return {
    challenge: challenges[0],
    reason:
      "You've completed every challenge — well done. Review any of them to keep your skills sharp.",
  };
}

/* ---------- Auth pages ---------- */

function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    showFormMessage(form, "Logging in...");

    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("loginEmail").value.trim(),
          password: document.getElementById("loginPassword").value,
        }),
      });

      // Display cache only. The server session controls API access.
      saveUser(data.user);
      location.href = "dashboard.html";
    } catch (err) {
      showFormMessage(form, err.message);
    } finally {
      button.disabled = false;
    }
  });
}

function initSignup() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    showFormMessage(form, "Creating your account...");

    const type = document.getElementById("userType").value;

    try {
      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("fullName").value.trim(),
          email: document.getElementById("signupEmail").value.trim(),
          password: document.getElementById("signupPassword").value,
          type,
          role: type === "Employer" ? "employer" : "student",
        }),
      });

      saveUser(data.user);
      location.href = "dashboard.html";
    } catch (err) {
      showFormMessage(form, err.message);
    } finally {
      button.disabled = false;
    }
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
  if (user?.role === "employer") {
    const main = document.querySelector("main");

    if (main && !document.getElementById("employerVerifyLink")) {
      const link = document.createElement("a");
      link.id = "employerVerifyLink";
      link.className = "btn";
      link.href = "verify.html";
      link.textContent = "Verify a SkillStamp";
      main.prepend(link);
    }
  }
  const welcome = document.getElementById("welcomeName");
  if (welcome) welcome.textContent = user ? user.name.split(" ")[0] : "there";

  const stamps = getStamps();
  const completed = document.getElementById("completedCount");
  const stampCount = document.getElementById("stampCount");
  if (completed) {
    completed.textContent = serverPortfolio.stats.completedChallenges;
  }

  if (stampCount) {
    stampCount.textContent = serverPortfolio.stats.stampsCollected;
  }

  const oppCount = document.getElementById("opportunityCount");
  if (oppCount) oppCount.textContent = opportunities.length;

  const search = document.getElementById("dashboardSearch");
  if (search) search.value = sessionStorage.getItem("skillstamp_search") || "";

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
  const search = document.getElementById("challengeSearch");
  const level = document.getElementById("levelFilter");
  const category = document.getElementById("categoryFilter");

  if (!list || !search || !level || !category) return;

  const savedSearch = sessionStorage.getItem("skillstamp_search");

  if (savedSearch) {
    search.value = savedSearch;
    sessionStorage.removeItem("skillstamp_search");
  }

  function render() {
    const query = search.value.trim().toLowerCase();

    const filtered = challenges.filter((challenge) => {
      const matchesSearch = [
        challenge.title,
        challenge.description,
        challenge.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesLevel =
        level.value === "all" || challenge.level === level.value;

      const matchesCategory =
        category.value === "all" || challenge.category === category.value;

      return matchesSearch && matchesLevel && matchesCategory;
    });

    list.innerHTML = filtered.length
      ? filtered.map(challengeCard).join("")
      : `<div class="empty-state">
           <h2>No matching challenges</h2>
           <p>Try a different search or filter.</p>
         </div>`;
  }

  search.addEventListener("input", render);
  level.addEventListener("change", render);
  category.addEventListener("change", render);

  render();
}

function initChallenge() {
  const holder = document.getElementById("challengeDetail");
  const panel = document.getElementById("resultPanel");
  if (!holder || !panel) return;

  const id = new URLSearchParams(location.search).get("id") || "excel";
  const challenge = challenges.find((item) => item.id === id);

  if (!challenge) {
    holder.textContent = "Challenge not found.";
    return;
  }

  if (getUser()?.role !== "student") {
    holder.textContent = "Assessments are available to student accounts.";
    return;
  }

  const alreadyEarned = getStamps().some((stamp) => stamp.id === challenge.id);

  holder.innerHTML = `
    <article class="card challenge-detail-card">
      <span class="category-label">
        ${escapeHTML(challenge.category)} · ${escapeHTML(challenge.level)}
      </span>

      <h1>${escapeHTML(challenge.title)}</h1>
      <p class="muted">${escapeHTML(challenge.description)}</p>

      <div class="card-meta">
        <span class="pill">${escapeHTML(challenge.duration)}</span>
        <span class="pill">Demo assessment</span>
      </div>

      ${
        challenge.scenario
          ? `<div class="scenario">
               <h3>Scenario</h3>
               <p>${escapeHTML(challenge.scenario)}</p>
             </div>`
          : ""
      }

      ${renderDataset(challenge.dataset)}

      <div class="instructions">
        <h3>Your task</h3>
        <ol>
          ${challenge.instructions
            .map((item) => `<li>${escapeHTML(item)}</li>`)
            .join("")}
        </ol>
      </div>

      <h3>What you'll practise</h3>
      <ul>
        ${challenge.learn
          .map((item) => `<li>${escapeHTML(item)}</li>`)
          .join("")}
      </ul>

      <form id="answerForm">
        <label for="challengeAnswer">Your submission</label>
        <textarea
          id="challengeAnswer"
          required
          maxlength="10000"
          placeholder="${escapeHTML(challenge.placeholder)}"
        ></textarea>

        <button class="btn" type="submit">Submit assessment</button>
      </form>

      ${
        alreadyEarned
          ? '<p class="form-note">You already earned this SkillStamp. Another pass will not create a duplicate or change its original score.</p>'
          : ""
      }
    </article>
  `;

  const form = document.getElementById("answerForm");
  const button = form.querySelector('button[type="submit"]');

  let attemptId = null;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const answer = document.getElementById("challengeAnswer").value.trim();

    if (!answer) {
      showFormMessage(form, "Enter your answer first.");
      return;
    }

    button.disabled = true;
    showFormMessage(form, "Submitting your assessment...");

    try {
      if (!attemptId) {
        const started = await apiRequest(
          `/api/challenges/${encodeURIComponent(challenge.id)}/start`,
          { method: "POST" },
        );

        attemptId = started.attempt.id;
      }

      const data = await apiRequest(
        `/api/attempts/${encodeURIComponent(attemptId)}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answer }),
        },
      );

      // A later submission must use a new attempt.
      attemptId = null;

      const { result, credential, modelAnswer } = data;

      // Update the current page's display cache with the server-issued stamp.
      if (
        credential &&
        !serverPortfolio.stamps.some(
          (stamp) => stamp.credentialId === credential.credentialId,
        )
      ) {
        serverPortfolio.stamps.push(credential);
      }

      panel.classList.remove("hidden");
      panel.setAttribute("tabindex", "-1");

      panel.innerHTML = `
        <h2>${result.pass ? "★ Challenge passed!" : "Keep practising"}</h2>
        <p class="result-score">Score: ${Number(result.score)}%</p>

        <ul class="result-checklist">
          ${(result.checklistResults || [])
            .map(
              (item) => `
                <li class="checklist-item ${item.passed ? "passed" : "failed"}">
                  ${item.passed ? "✓" : "✗"} ${escapeHTML(item.label)}
                </li>
              `,
            )
            .join("")}
        </ul>

        <p>${escapeHTML(result.feedback)}</p>

        ${
          credential
            ? `<p><strong>Credential ID:</strong>
                 <span style="overflow-wrap:anywhere">
                   ${escapeHTML(credential.credentialId)}
                 </span>
               </p>`
            : ""
        }

        ${
          modelAnswer
            ? `<details class="model-answer">
                 <summary>See a model answer</summary>
                 <pre>${escapeHTML(modelAnswer)}</pre>
               </details>`
            : ""
        }

        <p class="form-note">
          Rule-based hackathon assessment, not professional certification.
        </p>

        <a class="btn" href="portfolio.html">View my portfolio</a>
      `;

      showFormMessage(form, "Assessment saved.");
      panel.focus();
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      if (err.status === 401) {
        location.replace("login.html");
        return;
      }

      if (err.status === 409) {
        attemptId = null;
        showFormMessage(
          form,
          "This attempt was already saved. Check your portfolio, or submit again to start a new attempt.",
        );
      } else {
        showFormMessage(form, err.message);
      }
    } finally {
      button.disabled = false;
    }
  });
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

function renderDataset(dataset) {
  if (!dataset || !dataset.headers || !dataset.rows) return "";
  return `<div class="dataset-block">
    <h3>Dataset</h3>
    <table class="dataset-table">
      <thead><tr>${dataset.headers.map((h) => `<th>${escapeHTML(h)}</th>`).join("")}</tr></thead>
      <tbody>${dataset.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHTML(cell)}</td>`).join("")}</tr>`,
        )
        .join("")}</tbody>
    </table>
  </div>`;
}

/* ---------- Portfolio ---------- */

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
      {
        id: "greeting",
        label: "Professional greeting (Dear Ms Nkosi)",
        passed: true,
      },
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
    answer:
      "HTML structures content. CSS styles it. JavaScript adds interactivity.",
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

  if (empty) empty.classList.toggle("hidden", stamps.length > 0);

  if (isDemo) {
    const demoBadge = document.getElementById("demoPreviewBadge");
    if (demoBadge) demoBadge.classList.remove("hidden");
  }

  const extra = document.getElementById("portfolioSummaryExtra");
  if (extra) {
    const withEvidence = stamps.filter(
      (s) => Array.isArray(s.checklistResults) && s.checklistResults.length,
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
                  `<li class="${r.passed ? "passed" : "failed"}"><span aria-hidden="true">${r.passed ? "✓" : "✗"}</span> ${escapeHTML(r.label)}</li>`,
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
          ${
            s.credentialId
              ? `<p style="overflow-wrap:anywhere">
         <strong>Credential ID:</strong>
         ${escapeHTML(s.credentialId)}
       </p>`
              : ""
          }
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
  const search = document.getElementById("opportunitySearch");
  const type = document.getElementById("opportunityType");

  if (!list || !search || !type) return;

  function render() {
    const query = search.value.trim().toLowerCase();
    const isStudent = getUser()?.role === "student";

    const filtered = opportunities.filter((opportunity) => {
      const text = [
        opportunity.title,
        opportunity.company,
        opportunity.location,
        ...opportunity.skills,
      ]
        .join(" ")
        .toLowerCase();

      return (
        text.includes(query) &&
        (type.value === "all" || opportunity.type === type.value)
      );
    });

    list.innerHTML = filtered.length
      ? filtered
          .map((opportunity) => {
            const application = myApplications.find(
              (item) => item.opportunityId === opportunity.id,
            );

            const matched = getStamps().filter((stamp) =>
              opportunity.matchSkills.includes(stamp.id),
            );

            return `
            <article class="card opportunity-card">
              <span class="category-label">
                ${escapeHTML(opportunity.type)}
              </span>
              <h3>${escapeHTML(opportunity.title)}</h3>
              <p>
                <strong>${escapeHTML(opportunity.company)}</strong>
                · ${escapeHTML(opportunity.location)}
              </p>
              <p>${escapeHTML(opportunity.description)}</p>

              <div class="card-meta">
                ${opportunity.skills
                  .map(
                    (skill) => `<span class="pill">${escapeHTML(skill)}</span>`,
                  )
                  .join("")}
              </div>

              <p class="match-reason">
                ${
                  matched.length
                    ? `Related SkillStamps: ${matched
                        .map((stamp) => escapeHTML(stamp.title))
                        .join(", ")}`
                    : "Complete a related challenge to strengthen your portfolio."
                }
              </p>

              ${
                isStudent
                  ? `<button
                       class="btn"
                       type="button"
                       data-apply="${escapeHTML(opportunity.id)}"
                       ${application ? "disabled" : ""}
                     >
                       ${application ? "Application submitted ✓" : "Apply"}
                     </button>`
                  : '<p class="form-note">Applications are available to student accounts.</p>'
              }

              <p data-application-message role="status" class="form-note">
                ${
                  application
                    ? `Submitted ${escapeHTML(
                        new Date(application.submittedAt).toLocaleString(),
                      )}`
                    : "Demo listing. Applications are recorded locally on the server."
                }
              </p>
            </article>
          `;
          })
          .join("")
      : '<p class="empty-state">No matching opportunities.</p>';

    list.querySelectorAll("[data-apply]").forEach((button) => {
      button.addEventListener("click", async () => {
        const message = button
          .closest("article")
          .querySelector("[data-application-message]");

        button.disabled = true;
        message.textContent = "Submitting application...";

        try {
          const data = await apiRequest(
            `/api/opportunities/${encodeURIComponent(button.dataset.apply)}/apply`,
            { method: "POST" },
          );

          myApplications.push(data.application);
          button.textContent = "Application submitted ✓";
          message.textContent = data.message;
        } catch (err) {
          message.textContent = err.message;

          if (err.status === 409) {
            button.textContent = "Already applied";
          } else {
            button.disabled = false;
          }
        }
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
      `${o.title}\n${o.company}\n${o.location}\n\n${o.description}\n\nThis is a fictional hackathon demo listing, not a live vacancy.`,
    );
  }
}

/* ---------- Profile ---------- */

function renderDocumentList() {
  const list = document.getElementById("documentList");
  const empty = document.getElementById("documentEmpty");
  const zipBtn = document.getElementById("downloadAllZip");
  if (!list) return;

  const docs = getDocuments().sort(
    (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt),
  );

  if (empty) empty.classList.toggle("hidden", docs.length > 0);
  if (zipBtn) zipBtn.classList.toggle("hidden", docs.length === 0);

  list.innerHTML = docs
    .map((doc) => {
      const icon =
        doc.category === "cv"
          ? "📄"
          : doc.type && doc.type.startsWith("image/")
            ? "🖼"
            : "📜";
      const catLabel = doc.category === "cv" ? "CV / Résumé" : "Certificate";
      return `<article class="document-item" data-doc-id="${escapeHTML(doc.id)}">
        <div class="document-icon" aria-hidden="true">${icon}</div>
        <div class="document-meta">
          <strong class="document-name">${escapeHTML(doc.name)}</strong>
          <span class="document-details">${escapeHTML(catLabel)} · ${formatFileSize(doc.size)} · ${new Date(doc.uploadedAt).toLocaleDateString()}</span>
        </div>
        <div class="document-actions">
          <button type="button" class="btn btn-ghost btn-small" data-view-doc="${escapeHTML(doc.id)}">View</button>
          <button type="button" class="btn btn-danger btn-small" data-delete-doc="${escapeHTML(doc.id)}" aria-label="Delete ${escapeHTML(doc.name)}">Delete</button>
        </div>
      </article>`;
    })
    .join("");

  list.querySelectorAll("[data-view-doc]").forEach((btn) => {
    btn.addEventListener("click", () => viewDocument(btn.dataset.viewDoc));
  });
  list.querySelectorAll("[data-delete-doc]").forEach((btn) => {
    btn.addEventListener("click", () => deleteDocument(btn.dataset.deleteDoc));
  });
}

function viewDocument(id) {
  const doc = getDocuments().find((d) => d.id === id);
  if (!doc || !doc.dataUrl) {
    alert("Document not found.");
    return;
  }
  const win = window.open();
  if (win) {
    if (doc.type && doc.type.startsWith("image/")) {
      win.document.write(
        `<title>${escapeHTML(doc.name)}</title><img src="${doc.dataUrl}" style="max-width:100%;height:auto;display:block;margin:20px auto;" alt="${escapeHTML(doc.name)}" />`,
      );
    } else {
      win.location.href = doc.dataUrl;
    }
  } else {
    const a = document.createElement("a");
    a.href = doc.dataUrl;
    a.download = doc.name;
    a.target = "_blank";
    a.click();
  }
}

function deleteDocument(id) {
  if (!confirm("Remove this document from your demo profile?")) return;
  const docs = getDocuments().filter((d) => d.id !== id);
  saveDocuments(docs);
  renderDocumentList();
}

async function handleDocumentUpload(file, category) {
  const status = document.getElementById("documentUploadStatus");
  const setStatus = (msg, isError) => {
    if (!status) return;
    status.textContent = msg;
    status.classList.toggle("error", !!isError);
    status.classList.remove("hidden");
  };

  if (!file) return;

  if (!isAllowedDocument(file)) {
    setStatus(
      "Please upload a PDF, Word document, or image (JPG/PNG/WebP).",
      true,
    );
    return;
  }

  if (file.size > DOC_MAX_BYTES) {
    setStatus(
      `File is too large (${formatFileSize(file.size)}). Demo limit is about ${formatFileSize(DOC_MAX_BYTES)} per file.`,
      true,
    );
    return;
  }

  setStatus("Uploading…");

  try {
    const dataUrl = await fileToDataUrl(file);
    const docs = getDocuments();
    const entry = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      category: category === "cv" ? "cv" : "certificate",
      uploadedAt: new Date().toISOString(),
      dataUrl,
    };
    docs.push(entry);
    saveDocuments(docs);
    renderDocumentList();
    setStatus(`Saved “${file.name}” to your demo profile.`);
    const input =
      category === "cv"
        ? document.getElementById("cvUpload")
        : document.getElementById("certUpload");
    if (input) input.value = "";
  } catch (err) {
    setStatus("Could not save the file. Try a smaller PDF or image.", true);
  }
}

function downloadAllAsZip() {
  const docs = getDocuments();
  const status = document.getElementById("documentUploadStatus");
  if (!docs.length) {
    if (status) {
      status.textContent = "No documents to download.";
      status.classList.add("error");
      status.classList.remove("hidden");
    }
    return;
  }

  if (status) {
    status.textContent = "Building ZIP…";
    status.classList.remove("error");
    status.classList.remove("hidden");
  }

  try {
    const usedNames = new Set();
    const files = docs.map((doc) => {
      let name = doc.name || "document";
      // Avoid duplicate names inside the ZIP
      if (usedNames.has(name)) {
        const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
        const base = name.includes(".")
          ? name.slice(0, name.lastIndexOf("."))
          : name;
        let n = 2;
        while (usedNames.has(`${base} (${n})${ext}`)) n++;
        name = `${base} (${n})${ext}`;
      }
      usedNames.add(name);
      // Prefix folder by category for clarity
      const folder = doc.category === "cv" ? "CV" : "Certificates";
      return {
        name: `${folder}/${name}`,
        data: dataUrlToUint8Array(doc.dataUrl),
      };
    });

    const zipBytes = buildZip(files);
    const blob = new Blob([zipBytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const user = getUser();
    const who =
      user && user.name ? user.name.replace(/\s+/g, "_") : "SkillStamp";
    a.href = url;
    a.download = `${who}_documents.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (status) {
      status.textContent = `Downloaded ${docs.length} file${docs.length === 1 ? "" : "s"} as ZIP.`;
      status.classList.remove("error");
    }
  } catch (err) {
    if (status) {
      status.textContent =
        "Could not create the ZIP. Try fewer or smaller files.";
      status.classList.add("error");
    }
  }
}

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
    ", ",
  );
  document.getElementById("profileAbout").value = user.about || "";

  const heading = document.getElementById("profileHeading");
  const avatar = document.getElementById("profileAvatar");
  if (heading) heading.textContent = user.name || "Your profile";
  if (avatar) avatar.textContent = safeInitial(user.name);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    showFormMessage(form, "Saving profile...");

    try {
      const data = await apiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: document.getElementById("profileName").value.trim(),
          email: document.getElementById("profileEmail").value.trim(),
          location: document.getElementById("profileLocation").value.trim(),
          skills: document
            .getElementById("profileSkills")
            .value.split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
          about: document.getElementById("profileAbout").value.trim(),
        }),
      });

      saveUser(data.user);

      if (heading) heading.textContent = data.user.name;
      if (avatar) avatar.textContent = safeInitial(data.user.name);

      initAvatar();
      showFormMessage(form, "Profile saved on the server.");
    } catch (err) {
      showFormMessage(form, err.message);
    } finally {
      if (button) button.disabled = false;
    }
  });

  // Document uploads
  const cvInput = document.getElementById("cvUpload");
  const certInput = document.getElementById("certUpload");
  if (cvInput) {
    cvInput.setAttribute("accept", DOC_ACCEPT);
    cvInput.addEventListener("change", () => {
      const file = cvInput.files && cvInput.files[0];
      if (file) handleDocumentUpload(file, "cv");
    });
  }
  if (certInput) {
    certInput.setAttribute("accept", DOC_ACCEPT);
    certInput.addEventListener("change", () => {
      const file = certInput.files && certInput.files[0];
      if (file) handleDocumentUpload(file, "certificate");
    });
  }

  const zipBtn = document.getElementById("downloadAllZip");
  if (zipBtn) {
    zipBtn.addEventListener("click", downloadAllAsZip);
  }

  renderDocumentList();
}

async function logoutDemo() {
  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
    });

    localStorage.removeItem(STORAGE.user);
    location.href = "login.html";
  } catch (err) {
    alert(`Could not log out: ${err.message}`);
  }
}

function resetDemo() {
  if (
    confirm(
      "This will clear your demo profile, SkillStamps and uploaded documents. Continue?",
    )
  ) {
    Object.keys(localStorage)
      .filter(
        (k) =>
          k.startsWith(STORAGE.user) ||
          k.startsWith(STORAGE.stamps) ||
          k.startsWith(STORAGE.documents),
      )
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
    location.href = "index.html";
  }
}

async function initDashboardUpdates() {
  const main = document.querySelector("main");
  if (!main) return;

  if (getUser()?.role === "student") {
    const points = document.createElement("p");
    points.className = "pill";
    points.textContent = `Points earned: ${serverPortfolio.stats.pointsEarned}`;

    main.appendChild(points);
  }

  const section = document.createElement("section");
  section.className = "card";
  section.style.marginTop = "24px";

  const heading = document.createElement("h2");
  heading.textContent = "Notifications";

  const list = document.createElement("div");
  list.textContent = "Loading notifications...";

  section.append(heading, list);
  main.appendChild(section);

  try {
    const data = await apiRequest("/api/notifications");
    list.replaceChildren();

    if (!data.notifications.length) {
      list.textContent = "No notifications yet.";
      return;
    }

    for (const notification of data.notifications) {
      const item = document.createElement("article");
      item.style.marginBottom = "16px";

      const message = document.createElement("p");
      message.textContent = notification.message;

      const date = document.createElement("small");
      date.textContent = new Date(notification.createdAt).toLocaleString();

      item.append(message, date);

      if (!notification.read) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-ghost btn-small";
        button.textContent = "Mark as read";

        button.addEventListener("click", async () => {
          button.disabled = true;

          try {
            await apiRequest(
              `/api/notifications/${encodeURIComponent(notification.id)}/read`,
              { method: "PATCH" },
            );

            button.textContent = "Read ✓";
          } catch (err) {
            button.disabled = false;
            button.textContent = "Retry marking as read";
            message.textContent = `${notification.message} — ${err.message}`;
          }
        });

        item.appendChild(button);
      }

      list.appendChild(item);
    }
  } catch (err) {
    list.textContent = `Could not load notifications: ${err.message}`;
  }
}

/* ---------- Router ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  const protectedPages = [
    "dashboard",
    "challenges",
    "challenge",
    "portfolio",
    "opportunities",
    "profile",
  ];

  try {
    if (protectedPages.includes(page)) {
      const { user } = await apiRequest("/api/auth/me");
      saveUser(user);

      const challengeData = await apiRequest("/api/challenges");
      challenges = challengeData.challenges;

      const opportunityData = await apiRequest("/api/opportunities");
      opportunities = opportunityData.opportunities;

      if (user.role === "student") {
        serverPortfolio = await apiRequest("/api/portfolio");

        const applicationData = await apiRequest("/api/applications");
        myApplications = applicationData.applications;
      }
    }

    initAvatar();

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

    if (init) await init();
    if (page === "dashboard") {
      await initDashboardUpdates();
    }
  } catch (err) {
    if (err.status === 401) {
      localStorage.removeItem(STORAGE.user);
      location.replace("login.html");
      return;
    }

    const message = document.createElement("p");
    message.className = "form-note";
    message.setAttribute("role", "alert");
    message.textContent = `Could not load this page: ${err.message}`;
    document.querySelector("main")?.prepend(message);
  }
});
