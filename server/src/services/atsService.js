import path from 'node:path';

const STOP = new Set(
  `a an and are as at be been being but by can could did do does for from had has have having he her his i if in into is it its
   just me more most my no nor not of on once only or other our out over own same she should so some such than that the their them
   then there these they this those through to too under until up very was we were what when where which while who whom why will with
   you your yours about above after again against all am any because before below between both during each few further here how
   itself let ll myself off ourselves re s t themselves ve yourself yourselves job role work team position candidate candidates
   company looking ideal including etc using use strong ability skills skill experience years year plus must required requirements
   responsibilities preferred knowledge understanding excellent good great new well also within across per day days apply join`.split(/\s+/)
);

/** Curated multi-word & tech skill dictionary — matched case-insensitively. */
const SKILLS = [
  'javascript', 'typescript', 'react', 'react.js', 'next.js', 'vue', 'angular', 'node.js', 'express', 'mongodb', 'mongoose', 'graphql',
  'rest', 'rest api', 'soap', 'python', 'django', 'flask', 'fastapi', 'java', 'spring boot', 'kotlin', 'swift', 'c#', '.net', 'go', 'rust',
  'php', 'laravel', 'ruby', 'rails', 'sql', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'kafka', 'rabbitmq', 'docker', 'kubernetes',
  'aws', 'azure', 'gcp', 'terraform', 'ci/cd', 'jenkins', 'github actions', 'git', 'linux', 'microservices', 'system design',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'computer vision', 'data analysis', 'pandas', 'power bi',
  'tableau', 'excel', 'figma', 'ui/ux', 'html', 'css', 'sass', 'tailwind', 'jest', 'cypress', 'testing', 'unit testing', 'agile',
  'scrum', 'jira', 'leadership', 'communication', 'stakeholder management', 'project management', 'product management', 'seo',
  'digital marketing', 'content strategy', 'salesforce', 'sap', 'accounting', 'financial analysis', 'autocad', 'revit', 'hvac',
  'nfpa', 'fire safety', 'mep', 'compliance', 'risk assessment', 'customer service', 'socket.io', 'websocket', 'oauth', 'firebase',
];

const ACTION_VERBS = [
  'led', 'built', 'designed', 'developed', 'launched', 'delivered', 'reduced', 'increased', 'improved', 'optimized', 'optimised',
  'automated', 'implemented', 'architected', 'managed', 'mentored', 'created', 'migrated', 'scaled', 'shipped', 'drove', 'negotiated',
  'streamlined', 'spearheaded', 'owned', 'established', 'achieved', 'generated', 'saved', 'resolved', 'analyzed', 'analysed', 'coordinated',
];

const SECTIONS = {
  summary: /(summary|profile|objective|about me)/i,
  experience: /(experience|employment|work history|professional background)/i,
  education: /(education|academic|qualification)/i,
  skills: /(skills|technical skills|competenc|technologies|tools)/i,
  projects: /(projects|portfolio)/i,
  certifications: /(certification|certificate|licen[cs]e|awards)/i,
};

const norm = (s = '') => s.toLowerCase().replace(/[^\w+#./\s-]/g, ' ').replace(/\s+/g, ' ');
const has = (text, kw) => new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(text);

export function extractKeywords(jd, limit = 28) {
  const t = norm(jd);
  const found = new Map();
  SKILLS.forEach((sk) => {
    if (has(t, sk)) found.set(sk, (found.get(sk) || 0) + 5);
  });
  const words = t.split(' ').filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  const freq = new Map();
  words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
  for (let i = 0; i < words.length - 1; i++) {
    const bi = `${words[i]} ${words[i + 1]}`;
    freq.set(bi, (freq.get(bi) || 0) + 0.8);
  }
  [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .forEach(([w, n]) => {
      if (![...found.keys()].some((k) => k.includes(w) || w.includes(k))) found.set(w, n);
    });
  return [...found.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
}

export function analyzeResume(resumeText = '', jobDescription = '') {
  const text = norm(resumeText);
  const raw = resumeText || '';
  const words = text.split(' ').filter(Boolean);
  const wordCount = words.length;
  const breakdown = [];

  // 1. Keyword match (40)
  const keywords = jobDescription.trim() ? extractKeywords(jobDescription) : SKILLS.filter((s) => has(text, s)).slice(0, 20);
  const matched = keywords.filter((k) => has(text, k));
  const missing = keywords.filter((k) => !has(text, k));
  const kwRatio = jobDescription.trim() ? (keywords.length ? matched.length / keywords.length : 0) : Math.min(1, matched.length / 10);
  const kwScore = Math.round(40 * kwRatio);
  breakdown.push({
    key: 'keywords',
    label: jobDescription.trim() ? 'Job keyword match' : 'Skill keyword density',
    score: kwScore,
    max: 40,
    tip: missing.length ? `Work in: ${missing.slice(0, 6).join(', ')}` : 'Excellent keyword alignment.',
  });

  // 2. Sections (20)
  const present = Object.entries(SECTIONS).filter(([, re]) => re.test(raw)).map(([k]) => k);
  const core = ['summary', 'experience', 'education', 'skills'];
  const coreHit = core.filter((c) => present.includes(c)).length;
  const secScore = Math.round((coreHit / core.length) * 16 + Math.min(2, present.length - coreHit) * 2);
  breakdown.push({
    key: 'sections',
    label: 'Standard sections',
    score: Math.min(20, secScore),
    max: 20,
    tip: coreHit < 4 ? `Add clearly titled: ${core.filter((c) => !present.includes(c)).join(', ')}` : 'All core sections detected.',
  });

  // 3. Contact info (10)
  const email = /[\w.+-]+@[\w-]+\.[\w.]+/.test(raw);
  const phone = /(\+?\d[\d\s().-]{7,}\d)/.test(raw);
  const link = /(linkedin\.com|github\.com|https?:\/\/)/i.test(raw);
  const contactScore = (email ? 4 : 0) + (phone ? 4 : 0) + (link ? 2 : 0);
  breakdown.push({
    key: 'contact',
    label: 'Contact details',
    score: contactScore,
    max: 10,
    tip: [!email && 'email', !phone && 'phone number', !link && 'LinkedIn/portfolio link'].filter(Boolean).join(', ') ? `Missing: ${[!email && 'email', !phone && 'phone', !link && 'LinkedIn/portfolio'].filter(Boolean).join(', ')}` : 'Contact block complete.',
  });

  // 4. Quantified impact (10)
  const numbers = (raw.match(/\b\d+(\.\d+)?\s?(%|percent|k\b|m\b|x\b|\+|users|clients|hours|days|projects|million|bn)/gi) || []).length;
  const quantScore = Math.min(10, numbers * 2);
  breakdown.push({ key: 'impact', label: 'Quantified achievements', score: quantScore, max: 10, tip: numbers < 5 ? 'Add metrics (%, time saved, revenue, users) to more bullets.' : 'Great use of metrics.' });

  // 5. Action verbs (10)
  const verbs = ACTION_VERBS.filter((v) => has(text, v));
  const verbScore = Math.min(10, verbs.length * 1.5);
  breakdown.push({ key: 'verbs', label: 'Action verbs', score: Math.round(verbScore), max: 10, tip: verbs.length < 6 ? 'Start bullets with verbs like Led, Built, Reduced, Automated.' : 'Strong, active language.' });

  // 6. Length (10)
  const lenScore = wordCount >= 350 && wordCount <= 900 ? 10 : wordCount >= 250 && wordCount <= 1200 ? 7 : wordCount >= 150 ? 4 : 1;
  breakdown.push({ key: 'length', label: 'Length & density', score: lenScore, max: 10, tip: wordCount < 350 ? 'Too short — expand impact bullets.' : wordCount > 900 ? 'Consider trimming to 1–2 pages.' : 'Ideal length.' });

  const score = Math.max(0, Math.min(100, breakdown.reduce((a, b) => a + b.score, 0)));
  const suggestions = breakdown.filter((b) => b.score / b.max < 0.75).map((b) => b.tip);

  return {
    score,
    grade: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'Needs work',
    breakdown,
    matchedKeywords: matched,
    missingKeywords: missing,
    stats: { wordCount, sections: present, actionVerbs: verbs.length, metrics: numbers },
    suggestions,
  };
}

/** Extract plain text from an uploaded PDF / DOCX / TXT buffer. */
export async function extractText(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext === '.pdf' || file.mimetype === 'application/pdf') {
    const { default: pdf } = await import('pdf-parse/lib/pdf-parse.js');
    const out = await pdf(file.buffer);
    return out.text || '';
  }
  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const out = await (mammoth.default || mammoth).extractRawText({ buffer: file.buffer });
    return out.value || '';
  }
  if (['.txt', '.md'].includes(ext) || file.mimetype?.startsWith('text/')) return file.buffer.toString('utf8');
  throw Object.assign(new Error('Unsupported file type. Upload PDF, DOCX or TXT.'), { status: 400 });
}

/** Flatten a stored resume document into text for scoring. */
export function resumeToText(data = {}) {
  const p = data.personal || {};
  const lines = [
    p.fullName, p.headline, p.email, p.phone, p.location, p.website, p.linkedin, p.github,
    'Summary', p.summary,
    'Experience', ...(data.experience || []).map((e) => `${e.role} ${e.company} ${e.startDate} ${e.endDate} ${e.description}`),
    'Education', ...(data.education || []).map((e) => `${e.degree} ${e.field} ${e.school}`),
    'Skills', (data.skills || []).map((s) => s.name).join(', '),
    'Projects', ...(data.projects || []).map((pr) => `${pr.name} ${pr.description}`),
    'Certifications', ...(data.certifications || []).map((c) => `${c.name} ${c.issuer}`),
  ];
  return lines.filter(Boolean).join('\n');
}
