/**
 * Offline "demo brain" used until an AI provider is configured in the admin dashboard.
 * Output is deterministic but context-aware so every feature works end-to-end out of the box.
 */
const NOTE = '\n\n> _Offline demo mode — add a Google Gemini API key in **Admin → Settings → AI** for fully generated answers._';

const pick = (arr, seed = 0) => arr[Math.abs(seed) % arr.length];
const hash = (s = '') => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

export function localReply({ task, context = {}, messages = [] }) {
  switch (task) {
    case 'cover-letter':
      return coverLetter(context);
    case 'ats':
      return atsFeedback(context);
    case 'summary':
      return summary(context);
    case 'resume':
      return JSON.stringify(resumeJson(context));
    default:
      return chat(messages.filter((m) => m.role === 'user').at(-1)?.content || '');
  }
}

function chat(q) {
  const t = q.toLowerCase();
  const topics = [
    {
      k: ['ats', 'applicant tracking', 'filter'],
      a: `### Beating ATS filters\n\n- **Mirror the job description** — reuse its exact skill names (e.g. *"Node.js"*, not *"Node"*).\n- **Use standard headings**: Summary, Experience, Education, Skills.\n- **Avoid tables, text boxes and images** for critical information.\n- **Quantify impact**: _"Cut API latency by 38%"_ beats _"Improved performance"_.\n- Save as **PDF or DOCX** with selectable text.\n\nRun your file through the **ATS Checker** to see your score and missing keywords.`,
    },
    {
      k: ['interview', 'question'],
      a: `### Interview preparation framework\n\n1. **Research** — product, tech stack, recent news.\n2. **STAR stories** — prepare 5: a win, a failure, a conflict, leadership, a hard bug.\n3. **Technical drills** — 2 data-structure problems/day, one system-design sketch/week.\n4. **Questions for them** — team rituals, on-call, how success is measured in 90 days.\n\nFor React roles expect: reconciliation, hooks rules, memoisation, state management trade-offs and accessibility.`,
    },
    {
      k: ['salary', 'negotiat', 'offer'],
      a: `### Negotiating an offer\n\n- Anchor on **market data** (levels, local salary surveys), not on your current pay.\n- Ask for the **full package**: base, bonus, equity, learning budget, remote days.\n- Use silence; let them make the next move.\n- Close with enthusiasm: _"If we can reach X, I'm ready to sign this week."_`,
    },
    {
      k: ['summary', 'objective', 'profile'],
      a: `### A strong professional summary\n\nFormula: **Role + years + specialty + proof + direction**.\n\n> _Backend engineer with 4+ years building high-traffic Node.js and MongoDB services. Reduced infrastructure costs 27% at Acme by redesigning caching. Looking to scale developer platforms at a product-led company._\n\nKeep it to 3 lines; put the strongest number first.`,
    },
    {
      k: ['cover letter', 'cover-letter'],
      a: `Open the **Cover Letter Studio**, paste the job description, pick a tone and I'll draft a tailored letter in seconds. Tip: mention one concrete thing about the company in the first paragraph.`,
    },
  ];
  const hit = topics.find((tp) => tp.k.some((k) => t.includes(k)));
  if (hit) return hit.a + NOTE;
  if (!t.trim()) return 'Ask me anything about your career.';
  return `Great question! Here's a practical way to approach **"${q.slice(0, 80)}"**:\n\n1. **Clarify the goal** — what outcome do you want in 90 days?\n2. **Map the gap** — skills, proof (projects, metrics) and network.\n3. **Ship evidence** — a portfolio project, a blog post on HireLoom, or an updated résumé.\n4. **Iterate weekly** — apply, measure response rate, refine.\n\nWant me to look at your résumé summary or a specific job post?${NOTE}`;
}

function coverLetter(c) {
  const name = c.fullName || 'Your Name';
  const company = c.company || 'your company';
  const role = c.role || 'the advertised role';
  const skills = (c.skills || '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const tone = (c.tone || 'professional').toLowerCase();
  const opener = {
    enthusiastic: `I was genuinely excited to see the ${role} opening at ${company}.`,
    confident: `I am applying for the ${role} position at ${company} because my track record maps directly to what your team needs.`,
    friendly: `When I came across the ${role} role at ${company}, it immediately felt like the right next step for me.`,
  }[tone] || `I am writing to express my interest in the ${role} position at ${company}.`;
  const skillLine = skills.length
    ? `My core strengths — ${skills.slice(0, -1).join(', ')}${skills.length > 1 ? ' and ' : ''}${skills.at(-1)} — have been sharpened through real projects with measurable outcomes.`
    : 'I bring a blend of technical depth, ownership and clear communication.';
  return `Dear Hiring Manager,

${opener} With ${c.experience || 'several years of'} experience delivering reliable, user-focused work, I am confident I can contribute from day one.

${skillLine} In my most recent role, I owned features end-to-end — from clarifying requirements with stakeholders to shipping, monitoring and iterating — and consistently looked for ways to make the product faster, simpler and more dependable.

What draws me to ${company} is the opportunity to work on problems that matter with a team that values craft. I would bring the same discipline: writing clean, well-tested work, documenting decisions, and helping teammates move faster.

I would welcome the chance to discuss how my background can support your goals for this role. Thank you for your time and consideration.

Sincerely,
${name}`;
}

function atsFeedback(c) {
  const missing = (c.missingKeywords || []).slice(0, 8);
  const score = c.score ?? 0;
  const verdict = score >= 80 ? 'strong' : score >= 60 ? 'competitive but improvable' : 'at risk of being filtered out';
  return `## Overall verdict\nYour résumé scores **${score}/100** — ${verdict}.\n\n## Highest-impact fixes\n${
    missing.length ? `- Add the missing keywords naturally into Experience bullets: **${missing.join(', ')}**.\n` : '- Keyword coverage is solid — keep wording aligned with the job title.\n'
  }- Start every bullet with a strong action verb (*Led, Built, Reduced, Automated*).\n- Add numbers to at least **60%** of bullets (%, $, time saved, users).\n- Keep section headings standard so parsers map them correctly.\n\n## Formatting\n- One column, no tables or text inside images.\n- Consistent date format (e.g. *Jan 2023 – Present*).\n- File name: \`Firstname-Lastname-Role.pdf\`.\n\n## Rewrite example\n> ❌ _Worked on backend APIs._\n> ✅ _Built 14 REST endpoints in Node.js/Express serving 120k requests/day, cutting p95 latency by 31%._${NOTE}`;
}

function summary(c) {
  const role = c.headline || c.role || 'professional';
  const skills = (c.skills || []).slice(0, 3).join(', ') || 'modern tools';
  const seed = hash(role);
  const verb = pick(['delivering', 'building', 'shipping', 'scaling'], seed);
  return `Results-driven ${role} ${verb} reliable, user-centred solutions with ${skills}. Known for turning ambiguous requirements into measurable outcomes, collaborating across teams and raising the quality bar through clean, well-documented work. Seeking to create outsized impact in a fast-moving, product-focused organisation.`;
}

function resumeJson(c) {
  const role = c.targetRole || 'Software Engineer';
  const skills = (c.skills || 'JavaScript, React, Node.js, MongoDB, Git').split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const years = Number(c.years) || 3;
  const now = new Date().getFullYear();
  return {
    title: `${role} Résumé`,
    personal: {
      fullName: c.fullName || 'Your Name',
      headline: role,
      email: c.email || '',
      phone: c.phone || '',
      location: c.location || '',
      summary: summary({ headline: role, skills }),
    },
    experience: [
      {
        company: c.lastCompany || 'Current Company',
        role,
        location: c.location || '',
        startDate: `${now - Math.min(years, 3)}-01`,
        endDate: '',
        current: true,
        description: `• Led delivery of core features using ${skills.slice(0, 2).join(' and ')}, improving key metrics by 25%+\n• Automated repetitive workflows, saving the team ~6 hours per week\n• Mentored junior colleagues and introduced review checklists that cut defects by 30%`,
      },
      ...(years > 3
        ? [{
            company: 'Previous Company',
            role: `Junior ${role}`,
            location: c.location || '',
            startDate: `${now - years}-01`,
            endDate: `${now - 3}-12`,
            current: false,
            description: `• Built and maintained production features used by thousands of users\n• Collaborated with design and QA to ship on a two-week cadence`,
          }]
        : []),
    ],
    education: [{ school: c.school || 'Your University', degree: c.degree || 'B.Sc.', field: c.field || 'Computer Science', startDate: `${now - years - 4}-01`, endDate: `${now - years}-12`, grade: '' }],
    skills: skills.map((name, i) => ({ name, level: i < 2 ? 'Expert' : i < 4 ? 'Advanced' : 'Intermediate' })),
    languages: [{ name: 'English', proficiency: 'Professional' }],
    projects: [{ name: `${skills[0] || 'Portfolio'} Showcase`, link: '', description: `A production-grade project demonstrating ${skills.slice(0, 3).join(', ')}.` }],
    certifications: [],
    interests: ['Open source', 'Technical writing'],
  };
}
