# HireLoom — সেটআপ ও কনফিগারেশন গাইড

এই গাইডে দুটি অংশ:
- **অংশ A — `server/.env`** (শুধু বুটস্ট্র্যাপ সেটিংস, একবারই লাগবে)
- **অংশ B — Admin Dashboard → Settings & keys** (Firebase, GitHub, AI, SMTP, imgbb, Chatbot, Media, TFLite — সব এখান থেকে, রিস্টার্ট ছাড়াই লাইভ)

> নিয়ম: Dashboard-এ সেভ করা মান সবসময় `.env`-এর মানকে override করে। Dashboard-এ কোনো credential ফাঁকা রাখলে `.env`-এর মান fallback হিসেবে ব্যবহার হয়। Dashboard-এ সেভ করা সব secret (API key, password) MongoDB-তে **AES-256-GCM এনক্রিপ্টেড** থাকে এবং UI-তে মাস্ক করা দেখায় (`••••••••abcd`)।

---

## ০. প্রয়োজনীয়তা

| টুল | ভার্সন | নোট |
|---|---|---|
| Node.js | 18.18+ (20/22 LTS প্রস্তাবিত) | `node -v` |
| MongoDB | 6+ লোকাল **অথবা** MongoDB Atlas (ফ্রি M0) | |

```bash
npm run install:all          # root + server + client সব install
copy server\.env.example server\.env     # Windows
cp server/.env.example server/.env       # macOS / Linux
npm run dev                  # API :5000 + Web :5173
```

---

## অংশ A — `server/.env`

| ভ্যারিয়েবল | কী দেবেন | উদাহরণ |
|---|---|---|
| `NODE_ENV` | `development` লোকালে, `production` সার্ভারে | `development` |
| `PORT` | API পোর্ট | `5000` |
| `MONGO_URI` | MongoDB কানেকশন স্ট্রিং | লোকাল: `mongodb://127.0.0.1:27017/hireloom` · Atlas: `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/hireloom` |
| `CLIENT_URL` | ব্রাউজার যে URL খোলে | ডেভ: `http://localhost:5173` · প্রোডাকশন: `https://yourdomain.com` |
| `SESSION_SECRET` | লম্বা র‍্যান্ডম স্ট্রিং (সেশন কুকি সাইন করে) | নিচের কমান্ড দেখুন |
| `SETTINGS_ENCRYPTION_KEY` | আরেকটি লম্বা র‍্যান্ডম স্ট্রিং (secret এনক্রিপশন) | ⚠ পরে বদলালে আগের সেভ করা key গুলো আবার দিতে হবে |
| `TRUST_PROXY` | Nginx/Cloudflare/HTTPS প্রক্সির পেছনে হলে `1` | `0` |
| `MONGO_COMPAT` | শুধু FerretDB/কিছু Cosmos DB-র জন্য `true` | `false` |
| `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` | প্রথম বুটে অটো-তৈরি অ্যাডমিন | **প্রথম চালুর আগেই পাসওয়ার্ড বদলান** |
| `AUTO_SEED` | খালি DB-তে ডেমো টেমপ্লেট/রেজিউমে/ব্লগ বসাবে | `true` |

র‍্যান্ডম secret তৈরি:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**ঐচ্ছিক ডিফল্ট** (`AI_PROVIDER`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `IMGBB_API_KEY`, `GITHUB_CLIENT_ID/SECRET`, `FIREBASE_*`, `SMTP_*`) — চাইলে `.env`-এ দিতে পারেন, তবে প্রস্তাবিত পথ হলো Dashboard থেকে দেওয়া।

> **MongoDB Atlas:** Network Access → `0.0.0.0/0` (বা আপনার সার্ভারের IP) allow করুন; Database Access-এ একজন user তৈরি করুন; পাসওয়ার্ডে বিশেষ চিহ্ন থাকলে URL-encode করুন।

---

## অংশ B — Admin Dashboard কনফিগারেশন

`admin` হিসেবে লগইন → উপরের মেনু → **Admin dashboard** → **Settings & keys**।

### B1. General
সাইটের নাম, ট্যাগলাইন, হিরো টাইটেল/সাবটাইটেল, অ্যানাউন্সমেন্ট বার, যোগাযোগের ইমেইল/ফোন/ঠিকানা, Google Map কোয়েরি + অফিসের lat/lng, সোশ্যাল লিংক। নাম বদলালে নেভবার, ফুটার, ইমেইল — সব জায়গায় আপডেট হবে।

### B2. Features
- রেজিস্ট্রেশন চালু/বন্ধ
- সাইন-আপে ইমেইল OTP বাধ্যতামূলক কি না
- ফোন ভেরিফিকেশন বাধ্যতামূলক কি না
- অ্যাডমিনের পোস্ট অটো-অ্যাপ্রুভ
- প্রতি পেজে ব্লগ সংখ্যা

### B3. Firebase (Google + Phone/SMS লগইন)
1. https://console.firebase.google.com → **Add project**
2. Project settings → **Your apps → Web (</>)** → অ্যাপ রেজিস্টার → config কপি করুন
3. Dashboard-এ বসান: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` (+ ঐচ্ছিক `measurementId`)
4. Firebase → **Authentication → Sign-in method** → **Google** Enable, **Phone** Enable
5. Authentication → **Settings → Authorized domains** → `localhost` ও আপনার ডোমেইন যোগ করুন
6. Dashboard-এ **Enable Firebase authentication** অন → Save

> সার্ভিস-অ্যাকাউন্ট JSON লাগবে না — সার্ভার Firebase ID token Google-এর `accounts:lookup` API দিয়ে Web API key ব্যবহার করে যাচাই করে।
> Phone Auth-এর জন্য Firebase Blaze প্ল্যান লাগতে পারে; টেস্টিং-এর জন্য Authentication → Sign-in method → Phone → **test phone numbers** ব্যবহার করুন।
> Firebase phone বন্ধ থাকলে সিস্টেম **ডেমো SMS মোডে** চলে (ডেভেলপমেন্টে কোড স্ক্রিনে দেখায়)।

### B4. GitHub লগইন
1. https://github.com/settings/applications/new
2. **Homepage URL:** `http://localhost:5173` (প্রোডাকশনে আপনার ডোমেইন)
3. **Authorization callback URL:** Dashboard-এর GitHub ট্যাবে দেখানো URL কপি করুন — ডিফল্ট `CLIENT_URL/api/auth/github/callback` (যেমন `http://localhost:5173/api/auth/github/callback`)
4. **Client ID** ও **Generate a new client secret** → Dashboard-এ বসান → **Enable GitHub sign-in** অন → Save

বিকল্প: Firebase ট্যাবে “Use Firebase for GitHub sign-in” অন করলে GitHub-ও Firebase দিয়ে চলবে (তখন GitHub OAuth app-এর callback হবে Firebase-এর দেওয়া URL)।

### B5. AI Provider (Chatbot, Cover Letter, ATS Coach, Résumé Generator)
| Provider | কোথায় key পাবেন | মডেল উদাহরণ |
|---|---|---|
| **Offline demo** | key লাগবে না — সব ফিচার ডেমো আউটপুটে চলে | — |
| **OpenAI** | https://platform.openai.com/api-keys | `gpt-4o-mini` |
| **Google Gemini** (ফ্রি টিয়ার) | https://aistudio.google.com/apikey | `gemini-2.0-flash` |
| **OpenAI-compatible** | Groq: `https://api.groq.com/openai/v1` · OpenRouter: `https://openrouter.ai/api/v1` · Ollama (লোকাল): `http://localhost:11434/v1` | `llama-3.3-70b-versatile` ইত্যাদি |

Provider সিলেক্ট → key + model → **Save & test connection**। এখান থেকেই temperature, max tokens এবং তিনটি system prompt (résumé writer, cover letter, ATS coach) কাস্টমাইজ করা যায়। সব AI রেসপন্স **WebSocket দিয়ে টোকেন-বাই-টোকেন** স্ট্রিম হয়।

### B6. Chatbot
চালু/বন্ধ, নাম, গ্রিটিং, system prompt (ব্যক্তিত্ব ও নিয়ম), কতগুলো আগের মেসেজ মনে রাখবে, এবং suggested questions (যোগ/মুছুন)।

### B7. Email (Nodemailer / SMTP) — ওয়েলকাম ইমেইল ও OTP
**Gmail দিয়ে (আপনার পার্সোনাল ইমেইল থেকে):**
1. Google Account → Security → **2-Step Verification** চালু
2. https://myaccount.google.com/apppasswords → নতুন **App Password** (১৬ অক্ষর)
3. Dashboard-এ:
   - Host: `smtp.gmail.com` · Port: `465` · SSL/TLS: **অন**
   - Username: `আপনার@gmail.com` · Password: ১৬ অক্ষরের app password
   - From name: `HireLoom` · From email: `আপনার@gmail.com`
4. **Enable outgoing email** অন → **Send SMTP test** → ইনবক্স চেক
5. **Welcome email HTML** এডিট করুন (প্লেসহোল্ডার: `{{name}} {{username}} {{siteName}} {{loginUrl}} {{year}}`) → **Preview** → **Send welcome test**

নতুন ইউজার রেজিস্টার করলেই (পাসওয়ার্ড, Google, GitHub বা Phone — যেকোনো পদ্ধতিতে) এই টেমপ্লেটে ওয়েলকাম ইমেইল যাবে। অন্য SMTP (Zoho, Outlook `smtp.office365.com:587` secure=off, Brevo, Mailgun, Hostinger) একইভাবে কাজ করে।

### B8. imgbb (ইমেজ আপলোড)
https://api.imgbb.com → **Get API key** → Dashboard-এ বসান → Save। অ্যাভাটার, কভার, রেজিউমে ফটো, ব্লগ কভার/ইনলাইন ইমেজ, টেমপ্লেট থাম্বনেইল — সব imgbb-তে যাবে। key না থাকলে সার্ভারের `server/uploads/` ফোল্ডারে সেভ হয় (fallback)।

### B9. Media
ল্যান্ডিং ও Resources পেজের YouTube ভিডিও (ID বা পুরো URL পেস্ট করলেই হবে) এবং অডিও স্ট্রিম (MP3 URL) যোগ/এডিট/মুছুন।

### B10. TensorFlow Lite
ডিফল্ট মডেল: MediaPipe EfficientNet-Lite0 (`.tflite`, CORS-enabled)। যেকোনো image-classification `.tflite` মডেল URL + labels ফাইল + WASM path এখানে বদলানো যায়। মডেল সম্পূর্ণ ব্রাউজারে চলে।

---

## অংশ C — অন্যান্য অ্যাডমিন কন্ট্রোল

| মেনু | কী করা যায় |
|---|---|
| **Overview** | মোট/আজকের ভিজিট, ইউনিক ভিজিটর, লাইভ অনলাইন ইউজার, ১৪ দিনের ট্রাফিক চার্ট, সাইন-আপ চার্ট, টপ পেজ, নতুন মেম্বার |
| **Users** | সার্চ/ফিল্টার, রোল (user ⇄ admin), ব্যান/আনব্যান, ডিলিট (সব কনটেন্টসহ) |
| **Blog moderation** | Pending পোস্ট রিভিউ → Approve (সাথে সাথে ল্যান্ডিং পেজে) / Reject (কারণসহ, লেখক রিয়েল-টাইম নোটিফিকেশন পায়) / Feature / Delete |
| **Templates** | নতুন টেমপ্লেট: লেআউট (৬টি), রং, ফন্ট, থাম্বনেইল, ট্যাগ, visible/featured — লাইভ প্রিভিউসহ; এডিট/ডিলিট |
| **Résumés & CVs** | সব ডকুমেন্ট, public/gallery-sample টগল (sample গুলো ল্যান্ডিং ও টেমপ্লেট পেজে দেখায়) |
| **Comments** | মডারেশন ও ডিলিট |
| **Messages** | কন্টাক্ট ফর্মের মেসেজ, read/unread, ইমেইলে রিপ্লাই |

---

## অংশ D — প্রোডাকশন ডিপ্লয় (VPS / Hostinger)

```bash
# .env
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
TRUST_PROXY=1

npm run install:all
npm run build           # client/dist তৈরি
npm start               # Express একসাথে API + React সার্ভ করে (PORT=5000)
```
PM2: `pm2 start "npm start" --name hireloom` · Nginx-এ `proxy_pass http://127.0.0.1:5000;` এবং WebSocket-এর জন্য:
```nginx
location / {
  proxy_pass http://127.0.0.1:5000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```
ডিপ্লয়ের পর আপডেট করুন: Firebase Authorized domains, GitHub OAuth callback URL (`https://yourdomain.com/api/auth/github/callback`)।

---

## সমস্যা সমাধান

| লক্ষণ | কারণ ও সমাধান |
|---|---|
| `Failed to start server … ECONNREFUSED` | MongoDB চলছে না বা `MONGO_URI` ভুল |
| OTP ইমেইল আসছে না | Settings → Email → Enable অন? Gmail-এ সাধারণ পাসওয়ার্ড নয়, **App Password** দিন; Send SMTP test চালান |
| Google লগইনে `unauthorized-domain` | Firebase → Authorized domains-এ ডোমেইন যোগ করুন |
| GitHub লগইনে redirect mismatch | GitHub app-এর callback URL ঠিক Dashboard-এ দেখানো URL-এর মতো হতে হবে |
| AI “Offline demo mode” দেখায় | Settings → AI provider-এ provider + key সেভ করুন |
| `SETTINGS_ENCRYPTION_KEY` বদলানোর পর key কাজ করছে না | Dashboard-এ secret গুলো আবার দিন |
| ছবি আপলোড ব্যর্থ | imgbb key যাচাই করুন; ৮ MB-এর ছোট PNG/JPG/WEBP দিন |
| লগইন করার পর আবার লগআউট হয়ে যায় (প্রোডাকশন) | HTTPS প্রক্সির পেছনে `TRUST_PROXY=1` দিন; `CLIENT_URL` আসল ডোমেইন হতে হবে |
