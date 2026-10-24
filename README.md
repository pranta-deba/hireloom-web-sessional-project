# HireLoom — AI Career Workspace (MERN)

> Résumé & CV builder · ATS checker · AI cover-letter studio · AI résumé generator · Community tech journal · Admin control centre

**Stack:** React 18 (Vite) · Context API · SASS · GSAP · Socket.IO · Express · Mongoose (MongoDB) · GraphQL · SOAP · Firebase Auth · GitHub OAuth · Nodemailer · imgbb · TensorFlow Lite (WASM)

---

## ⚡ Quick start

```bash
# 1. Requirements: Node.js 18.18+ and MongoDB (local or Atlas)
# 2. Install everything
npm run install:all

# 3. Create the server environment file
cp server/.env.example server/.env        # Windows: copy server\.env.example server\.env
#    → set MONGO_URI, SESSION_SECRET, SETTINGS_ENCRYPTION_KEY (see SETUP_GUIDE.md)

# 4. Run API (5000) + web (5173) together
npm run dev
```

Open **http://localhost:5173** · Admin: `admin` / `Admin@12345` (change it in `.env` before first boot) · Demo users: `nadia.rahman`, `arif.hossain`, `sara.khan`, `tanvir.ahmed` / `Demo@12345`

On first boot the database is seeded automatically with 9 templates, 4 sample résumés/CVs, 12 blog posts (10 approved + 2 pending), comments, ratings and reviews.

**Everything else — Firebase, GitHub, AI keys, SMTP, imgbb, chatbot, media, TFLite model — is configured from `Admin → Settings & keys`.** No restart needed. Full guide: **[SETUP_GUIDE.md](SETUP_GUIDE.md)**.

### Production

```bash
npm run build          # builds client/dist
npm start              # Express serves the API + the built React app on PORT
```

Set `NODE_ENV=production`, `CLIENT_URL=https://your-domain` and `TRUST_PROXY=1` (behind Nginx/HTTPS).

---

## ✅ Requirement coverage

| # | Requirement | Where it lives |
|---|---|---|
| — | Résumé/CV templates + editor | `pages/Templates.jsx`, `pages/ResumeBuilder.jsx`, 6 layouts in `components/resume/ResumeRenderer.jsx` |
| — | Generate new CV/résumé (AI) | `pages/AiGenerate.jsx` → `POST /api/resumes/generate` |
| — | ATS checker | `pages/AtsChecker.jsx`, `server/services/atsService.js` (+ AI coach over WebSocket) |
| — | Cover-letter builder (OpenAI / Gemini / any OpenAI-compatible / offline) | `pages/CoverLetter.jsx`, `server/services/aiService.js` |
| — | Tech blog with admin approval | `pages/WriteBlog.jsx` → status `pending` → `admin/AdminBlogs.jsx` approves → live on landing & journal |
| 2 | Real-time comments without reload | `components/blog/CommentSection.jsx` + Socket.IO rooms (`blog:<id>`), typing indicator, replies, edit/delete |
| 3 | Like / dislike with counts | Posts & comments, optimistic UI + live broadcast (`blog:reactions`) |
| 4 | Real-time unique-username check | `Register.jsx › UsernameStep` → `GET /api/auth/check-username` (debounced) with suggestions |
| 5 | Email & phone verification (Gmail-style) | 6-step register wizard; email OTP via Nodemailer; phone OTP via Firebase SMS (demo mode fallback) |
| 6 | Multiple text boxes & dropdowns | Résumé `ListEditor` (dynamic rows), country→city cascading dropdowns, social-link rows, media rows |
| 7 | Real-time rating | Post star rating (`blog:rating`) + site rating in footer (`site:rating`) |
| 8 | Pagination | Blogs, templates, comments, résumés, ATS history, letters, all admin tables |
| 9 | External audio/video | YouTube embeds (blog posts, landing, Resources) + external MP3 streams |
| 10 | Google Map + real-time location | `pages/Contact.jsx` — office map, live `watchPosition` tracking, route & distance |
| 11 | Session info on login/logout | `express-session` + `connect-mongo`; session card on Dashboard (method, time, IP, device, expiry) |
| 12 | TensorFlow Lite real-time prediction | `pages/AiLab.jsx` + `lib/tflite.js` — webcam classification in the browser |
| 13 | Upload & show images/files | imgbb uploads (avatars, covers, résumé photo, blog images) + PDF/DOCX upload for ATS |
| 14 | Datepicker | Résumé month pickers, DOB, blog event date, contact call scheduling |
| 15 | GSAP animations | Hero timeline, scroll reveals, score ring, counters, mobile menu, auth panel |
| 16 | SASS | `client/src/styles` — abstracts / base / layout / components / pages |
| 18 | GraphQL | `POST /graphql` — landing stats, newsletter mutation, Developers playground |
| 19 | REST & SOAP | `/api/*` REST + SOAP 1.1 service `/soap/hireloom?wsdl` (`GetAtsScore`, `GetSiteStats`) |

Also: Context API (`Auth`, `Config`, `Theme`, `Socket`), WebSocket AI streaming for chatbot / cover letters / ATS / summary rewrite, Nodemailer welcome email with editable template, dark mode, Sonner toasts, responsive on every breakpoint, AES-256-GCM encryption of stored API secrets.

---

## 🗂 Structure

```
hireloom/
├── package.json              # root scripts (install:all, dev, build, start, seed)
├── SETUP_GUIDE.md            # .env + dashboard configuration guide (বাংলা)
├── server/
│   ├── .env.example
│   └── src/
│       ├── index.js          # Express + Socket.IO + GraphQL + SOAP bootstrap
│       ├── config/           # env, db
│       ├── models/           # User, Template, Resume, CoverLetter, AtsReport, Blog, Comment, Rating, Visit, Setting…
│       ├── middleware/       # auth (session), upload (multer), error
│       ├── routes/           # auth, users, templates, resumes, cover-letters, ats, blogs, comments, admin, misc
│       ├── services/         # settings (encrypted), ai (OpenAI/Gemini/compatible/offline), ats, mail, upload (imgbb)
│       ├── socket/           # real-time rooms + AI token streaming
│       ├── graphql/          # schema + resolvers
│       ├── soap/             # WSDL + service
│       ├── seed/             # demo data + bootstrap
│       └── utils/
└── client/
    ├── index.html · vite.config.js
    └── src/
        ├── context/          # Auth, Config, Theme, Socket (Context API)
        ├── hooks/            # useAIStream, useReveal (GSAP), useDebounce, usePageTracking
        ├── lib/              # api, firebase, tflite, constants, utils
        ├── components/       # layout, common, resume, blog, chat, auth
        ├── pages/            # public pages, auth, dashboard, admin/*
        └── styles/           # SASS architecture
```

## 🔌 API surface

- **REST:** `/api/auth`, `/api/users`, `/api/templates`, `/api/resumes`, `/api/cover-letters`, `/api/ats`, `/api/blogs`, `/api/comments`, `/api/ratings`, `/api/upload`, `/api/analytics`, `/api/contact`, `/api/admin/*`, `/api/config/public`
- **GraphQL:** `POST /graphql` — `blogs`, `blog`, `trending`, `templates`, `siteStats`, `viewer`, `subscribe`
- **SOAP:** `/soap/hireloom?wsdl`
- **WebSocket events:** `blog:join`, `comment:new|updated|deleted|reactions|typing`, `blog:reactions|rating`, `site:rating`, `presence:count`, `ai:request → ai:start|chunk|done|error`, `admin:*`, `notify`
