# HireLoom — Fix Log (Gemini-only release)

## 1. AI: Google Gemini only
| Problem | Root cause | Fix |
|---|---|---|
| `404 models/gemini-2.0-flash is no longer available` / `gemini-2.5-flash ... no longer available to new users` | Google retired those model IDs; DB/env still pointed at them | Old `gemini-1.x / 2.0 / 2.5` settings auto-upgrade to `gemini-3.8-flash`. A 404 marks the model retired and the model Google suggests is tried next |
| `503 This model is currently experiencing high demand` / requests hanging | Flash tier overloaded | **Hedged fallback**: if the preferred model has no first token after 5 s, the next model (flash-lite tier) starts in parallel. The first to stream wins, and the others are aborted. Overloaded models are skipped for 90 s |
| `429 quota exceeded` (free tier: 20 req/day on gemini-3.8-flash) | Daily free-tier cap | The model is skipped for the exact "retry in …" time Google returns, and other models keep serving |
| `AI provider error: fetch failed` | Network failure or timeout with no retry | 25 s connect limit, 45 s stall limit, then automatic fallback. Logs now include the underlying network cause |
| OpenAI / OpenAI-compatible / provider picker | — | Removed from server, settings, admin UI and docs. With no key the site uses offline demo mode |

Model list comes live from the key's `ListModels` API (cached 6 h). Admin → Settings → **Gemini AI** shows the available models and the live fallback chain, marking the last good model ✓ and busy models.

## 2. ATS `/api/ats/extract` 500
- A corrupt or scanned PDF made `pdf-parse` throw, which returned a 500. Now it returns a friendly 422, or **Gemini reads the document** (scanned PDFs, PNG/JPG/WEBP photos).
- Password-protected PDFs, `.doc`, and non-PDF files renamed to `.pdf` each get a clear message.

## 3. GitHub login: "redirect_uri is not associated with this application"
- By default `redirect_uri` is no longer sent, so GitHub uses the callback registered on the OAuth app. This removes localhost/127.0.0.1, port, and trailing-slash mismatches. Strict mode can be turned on in Admin → GitHub.
- The callback now handles `access_denied` and `redirect_uri_mismatch`, and network errors redirect to `/login` with a message instead of showing JSON.
- **Still do this once:** GitHub → Settings → Developer settings → OAuth Apps → your app → *Authorization callback URL* = `http://localhost:5173/api/auth/github/callback`

## 4. WebSocket / Vite proxy noise
- In dev the socket connects directly to the API (`:5000`), so the Vite ws proxy `ECONNRESET` / `ECONNABORTED` spam is gone. The session cookie still works because cookies are scoped by host, not port.
- Socket creation is deferred, which fixes "WebSocket is closed before the connection is established" under React StrictMode.
- AI requests wait up to 8 s for a reconnecting socket. A dropped connection mid-answer now shows a clear error instead of spinning forever.
- The Vite proxy returns a clean 503 JSON while the API restarts (`node --watch`).
- Dev CORS accepts localhost, 127.0.0.1 and LAN IPs. Production stays locked to `CLIENT_URL`.

## 5. React Router warnings
- `v7_startTransition` and `v7_relativeSplatPath` future flags enabled.

## Not bugs
- `[Violation] Forced reflow …` / `'message' handler took …ms` are Chrome dev-mode performance hints (GSAP animations, Vite HMR). They do not appear in production builds.
