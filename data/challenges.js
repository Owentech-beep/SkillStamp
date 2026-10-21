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

function evaluateChallenge(challenge, answer) {
  const text = answer.toLowerCase().replace(/\s+/g, " ").trim();

  if (!text) {
    return {
      pass: false,
      score: 0,
      matched: 0,
      total: (challenge.checklist || challenge.keywords || []).length,
      checklistResults: [],
      feedback: "Please enter an answer before submitting.",
    };
  }

  if (challenge.checklist?.length) {
    const checklistResults = challenge.checklist.map((item) => ({
      id: item.id,
      label: item.label,
      passed: item.test(text),
    }));

    const matched = checklistResults.filter((item) => item.passed).length;
    const total = checklistResults.length;

    const threshold = challenge.requiredMatches
      ? Math.min(challenge.requiredMatches, total)
      : Math.ceil(total * 0.7);

    const pass = matched >= threshold;

    return {
      pass,
      matched,
      total,
      score: Math.round((matched / total) * 100),
      checklistResults,
      feedback: pass
        ? challenge.passMessage
        : "Review the checklist, strengthen the missing parts and try again.",
    };
  }

  const keywords = challenge.keywords || [];
  const matched = keywords.filter((word) => text.includes(word)).length;
  const required = challenge.requiredMatches ?? 2;
  const pass = matched >= required;

  return {
    pass,
    matched,
    total: keywords.length,
    score: pass ? 100 : Math.round((matched / required) * 100),
    checklistResults: [],
    feedback: pass
      ? challenge.passMessage
      : "Review the instructions, add more detail and try again. This demo uses simple keyword checks.",
  };
}
export { challenges, evaluateChallenge };
