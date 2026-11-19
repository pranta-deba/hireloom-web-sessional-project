import { getSettings, aiReady } from './settingsService.js';
import { localReply } from './localAi.js';
import { DEFAULT_GEMINI_MODEL, normalizeModel } from './geminiModels.js';

export { DEFAULT_GEMINI_MODEL, normalizeModel };

/**
 * HireLoom AI — Google Gemini only.
 *
 * Resilience strategy (why this exists):
 *  • Google retires model ids regularly (gemini-2.0-flash → 404, gemini-2.5-flash → 404 for new keys).
 *  • Popular flash tiers return 503 "high demand" or hang during traffic spikes.
 *  • Transient network failures surface in Node as "fetch failed".
 *
 * So every request walks a model chain: the admin's preferred model first, then the newest
 * available flash / flash-lite models discovered from the key's own ListModels response.
 * Retired models (404) are skipped permanently, overloaded ones (429/5xx/timeout) are put on a
 * short cool-down, and the last healthy model is tried first next time. A fallback only happens
 * before the first token is streamed, so users never see two half-answers glued together.
 */

const API = 'https://generativelanguage.googleapis.com/v1beta';

/** Static safety net when ListModels is unreachable. Newest first. */
const STATIC_FALLBACKS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
];

const FIRST_TOKEN_TIMEOUT_MS = 25_000; // hard limit for one model to start answering
const HEDGE_AFTER_MS = 5_000; // no first token yet → launch the next model in parallel
const IDLE_TIMEOUT_MS = 45_000; // max silence between streamed chunks
const COOLDOWN_MS = 90_000; // how long an overloaded / hanging model is skipped
const MAX_ATTEMPTS = 6; // models tried per request
const MAX_PARALLEL = 3; // concurrent hedged attempts

const retired = new Set(); // model ids Google answered 404 for (per process)
const cooling = new Map(); // model id → timestamp until which it is skipped
let lastGood = null; // last model that answered successfully
let catalog = { at: 0, key: '', models: null };

/* ───────────────────────── public API ───────────────────────── */

/**
 * Streaming completion with hedged fallback.
 * messages: [{ role: 'system'|'user'|'assistant', content }]
 * onDelta(textChunk) is called for every streamed chunk. Resolves with the full text.
 *
 * The first model in the chain is started immediately. If it fails — or has not produced a
 * single token after HEDGE_AFTER_MS — the next model is started in parallel. The first attempt
 * to stream a token wins; every other attempt is aborted. Only the winner's text reaches the user.
 */
export async function streamChat({ messages, onDelta = () => {}, signal, task = 'chat', context = {}, json = false, files = [] }) {
  const s = await getSettings();
  if (!aiReady(s)) return streamLocal({ task, context, messages, onDelta, signal });
  const ai = s.ai;
  const maxTokens = Math.max(Number(ai.maxTokens) || 0, json ? 8192 : 2048);
  const opts = { temperature: clampTemp(ai.temperature), maxTokens, json, files };
  const chain = await modelChain(ai);

  return new Promise((resolve, reject) => {
    const errors = [];
    const live = new Map(); // model → AbortController
    let next = 0;
    let launched = 0;
    let winner = null;
    let settled = false;
    let hedgeTimer = null;

    const finish = (fn, v) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      signal?.removeEventListener('abort', onUserAbort);
      live.forEach((c) => c.abort());
      fn(v);
    };
    const onUserAbort = () => finish(reject, abortError());
    if (signal?.aborted) return reject(abortError());
    signal?.addEventListener('abort', onUserAbort, { once: true });

    const failAll = () => {
      console.error('AI provider error: all Gemini models failed →', errors.join(' | '));
      const last = errors.length ? errors[errors.length - 1].err : new Error('No Gemini model available');
      finish(reject, toUserError(last.kind === 'auth' ? last : Object.assign(new Error(last.message), { kind: 'busy' })));
    };

    const scheduleHedge = () => {
      clearTimeout(hedgeTimer);
      hedgeTimer = setTimeout(() => {
        if (!winner && !settled && live.size < MAX_PARALLEL) launch();
      }, HEDGE_AFTER_MS);
    };

    const launch = () => {
      if (settled || winner) return;
      if (next >= chain.length || launched >= MAX_ATTEMPTS) {
        if (live.size === 0) failAll();
        return;
      }
      const model = chain[next++];
      launched += 1;
      const ctrl = new AbortController();
      live.set(model, ctrl);
      scheduleHedge();

      streamGemini({
        apiKey: ai.geminiApiKey,
        model,
        messages,
        signal: ctrl.signal,
        opts,
        onDelta: (d) => {
          if (settled) return;
          if (!winner) {
            winner = model;
            clearTimeout(hedgeTimer);
            // losers were slower than this model → let them rest so the next request starts here
            live.forEach((c, m) => {
              if (m !== model) {
                c.abort();
                cooling.set(m, Date.now() + COOLDOWN_MS);
              }
            });
          }
          if (winner === model) onDelta(d);
        },
      }).then(
        (full) => {
          live.delete(model);
          if (winner === model || (!winner && full)) {
            lastGood = model;
            cooling.delete(model);
            finish(resolve, full);
          }
        },
        (err) => {
          live.delete(model);
          if (settled) return;
          if (winner && winner !== model) return; // aborted loser
          if (err.name === 'AbortError' && !winner) return; // aborted by us
          errors.push({ model, err });
          console.warn(`[gemini] ${model} failed (${err.kind || 'error'}): ${err.message}`);
          if (err.kind === 'retired') {
            retired.add(model);
            if (err.suggested && !retired.has(err.suggested) && !chain.includes(err.suggested)) chain.splice(next, 0, err.suggested);
          } else if (err.kind === 'busy') {
            cooling.set(model, Date.now() + Math.min(Math.max(err.retryMs || 0, COOLDOWN_MS), 24 * 3600_000));
          }
          if (lastGood === model) lastGood = null;
          // Non-recoverable: bad key, safety block, or the user already saw part of this answer.
          if (err.kind === 'auth' || err.kind === 'blocked' || winner === model) return finish(reject, toUserError(err));
          if (live.size < MAX_PARALLEL) launch();
          else if (live.size === 0) failAll();
        }
      );
    };

    launch();
  });
}

export async function completeChat(args) {
  return streamChat({ ...args, onDelta: () => {} });
}

/** Admin diagnostics: which models this key can use and which one the chain starts with. */
export async function geminiDiagnostics() {
  const s = await getSettings();
  const ai = s.ai;
  if (!ai.geminiApiKey) return { configured: false, models: [], chain: [] };
  const models = await listModels(ai.geminiApiKey, true);
  return {
    configured: true,
    preferred: ai.geminiModel || DEFAULT_GEMINI_MODEL,
    lastGood,
    models: models || [],
    chain: await modelChain(ai),
    cooling: [...cooling.entries()].filter(([, t]) => t > Date.now()).map(([m]) => m),
    retired: [...retired],
  };
}

/* ───────────────────────── model selection ───────────────────────── */

async function listModels(apiKey, force = false) {
  if (!force && catalog.models && catalog.key === apiKey && Date.now() - catalog.at < 6 * 3600_000) return catalog.models;
  try {
    const res = await fetchWithTimeout(`${API}/models?pageSize=1000&key=${encodeURIComponent(apiKey)}`, {}, 15_000);
    if (!res.ok) return catalog.models;
    const data = await res.json();
    const models = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      // text chat models only — skip image / tts / audio / embedding / robotics / preview-tool variants
      .filter((id) => /^gemini-/.test(id) && !/(image|tts|audio|live|embedding|robotics|computer-use|transcribe|customtools|omni|banana)/.test(id));
    catalog = { at: Date.now(), key: apiKey, models };
    return models;
  } catch {
    return catalog.models;
  }
}

/** Rank discovered models: stable before preview, flash before flash-lite before pro, newest version first. */
function rankModels(ids) {
  const version = (id) => {
    const m = id.match(/gemini-(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : id.includes('latest') ? 99 : 0;
  };
  const tier = (id) => (/flash-lite/.test(id) ? 1 : /flash/.test(id) ? 0 : /pro/.test(id) ? 2 : 3);
  const preview = (id) => (/preview|exp/.test(id) ? 1 : 0);
  return [...ids]
    .filter((id) => /flash|pro/.test(id) && !/^gemini-[12]\./.test(id))
    .sort((a, b) => preview(a) - preview(b) || tier(a) - tier(b) || version(b) - version(a));
}

async function modelChain(ai) {
  const preferred = normalizeModel(ai.geminiModel) || DEFAULT_GEMINI_MODEL;
  const available = await listModels(ai.geminiApiKey);
  const ranked = available ? rankModels(available).filter((id) => !/pro/.test(id)) : STATIC_FALLBACKS;
  // Alternate full flash and flash-lite tiers: when one tier is overloaded the other usually is not.
  const flash = ranked.filter((id) => !/lite/.test(id)).slice(0, 4);
  const lite = ranked.filter((id) => /lite/.test(id)).slice(0, 4);
  const mixed = [];
  for (let i = 0; i < Math.max(flash.length, lite.length); i++) mixed.push(lite[i], flash[i]);
  const base = [preferred, lastGood, ...mixed, ...STATIC_FALLBACKS];
  const unique = [...new Set(base.filter(Boolean))].filter((m) => !retired.has(m) && (!available || available.includes(m) || m === preferred));
  // healthy models first, cooling ones last (still tried as a last resort)
  const now = Date.now();
  const healthy = unique.filter((m) => !(cooling.get(m) > now));
  const cold = unique.filter((m) => cooling.get(m) > now);
  if (lastGood && healthy.includes(lastGood) && lastGood !== preferred && cooling.get(preferred) > now) {
    healthy.splice(healthy.indexOf(lastGood), 1);
    healthy.unshift(lastGood);
  }
  return [...healthy, ...cold];
}

/* ───────────────────────── Gemini transport ───────────────────────── */

async function streamGemini({ apiKey, model, messages, signal, opts, onDelta }) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = mergeTurns(
    messages.filter((m) => m.role !== 'system' && String(m.content || '').trim()).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] }))
  );
  if (opts.files?.length && contents.length) {
    const last = contents[contents.length - 1];
    last.parts = [...opts.files.map((f) => ({ inline_data: { mime_type: f.mimeType, data: f.data } })), ...last.parts];
  }

  const generationConfig = {
    temperature: opts.temperature,
    maxOutputTokens: opts.maxTokens,
    ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    ...(/^gemini-3|latest/.test(model) ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
  };
  const body = { contents, generationConfig, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}) };

  let res = await geminiFetch(model, apiKey, body, signal);
  // Some models reject thinkingConfig — retry once without it.
  if (res.status === 400 && generationConfig.thinkingConfig) {
    const msg = await readError(res);
    if (/thinking|invalid argument/i.test(msg)) {
      delete generationConfig.thinkingConfig;
      res = await geminiFetch(model, apiKey, body, signal);
    } else throw classify(400, msg);
  }
  if (!res.ok || !res.body) throw classify(res.status, await readError(res));

  let full = '';
  let finish = null;
  let blocked = null;
  const reader = withIdleTimeout(res.body, IDLE_TIMEOUT_MS, signal);
  for await (const data of sseLines(reader)) {
    let j;
    try {
      j = JSON.parse(data);
    } catch {
      continue;
    }
    if (j.error) throw classify(j.error.code || 500, j.error.message);
    if (j.promptFeedback?.blockReason) blocked = j.promptFeedback.blockReason;
    const cand = j.candidates?.[0];
    if (cand?.finishReason) finish = cand.finishReason;
    const delta = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
    if (delta) {
      full += delta;
      onDelta(delta);
    }
  }
  if (!full.trim()) {
    if (blocked || finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT' || finish === 'BLOCKLIST')
      throw Object.assign(new Error('Gemini declined this request for safety reasons. Please rephrase and try again.'), { kind: 'blocked' });
    throw Object.assign(new Error(`empty response (finishReason: ${finish || 'none'})`), { kind: 'busy' });
  }
  return full;
}

async function geminiFetch(model, apiKey, body, signal) {
  const url = `${API}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => ctrl.abort(new Error('timeout')), FIRST_TOKEN_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (signal?.aborted) throw abortError();
    const cause = err.cause?.code || err.cause?.message || '';
    const timedOut = ctrl.signal.aborted;
    throw Object.assign(new Error(timedOut ? `no response within ${FIRST_TOKEN_TIMEOUT_MS / 1000}s` : `network error (${err.message}${cause ? `: ${cause}` : ''})`), { kind: 'busy' });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Gemini requires alternating user/model turns — merge consecutive same-role messages. */
function mergeTurns(list) {
  const out = [];
  for (const m of list) {
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) prev.parts.push(...m.parts);
    else out.push({ role: m.role, parts: [...m.parts] });
  }
  if (out[0]?.role === 'model') out.unshift({ role: 'user', parts: [{ text: '(conversation continues)' }] });
  return out;
}

function classify(status, message = '') {
  const err = new Error(`${status} ${message}`.trim());
  if (status === 404 || /no longer available|not found for api version|is not supported/i.test(message)) {
    err.kind = 'retired';
    const m = message.match(/use models\/([\w.-]+)/i);
    if (m) err.suggested = m[1];
  } else if (status === 401 || status === 403 || /api key|API_KEY|permission denied|unauthenticated/i.test(message)) {
    err.kind = 'auth';
  } else if (status === 429 || status >= 500) {
    err.kind = 'busy';
    // Quota errors say how long to wait ("Please retry in 1h29m25s"); daily free-tier caps can last hours.
    const m = message.match(/retry in\s+(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:([\d.]+)s)?/i);
    if (m && (m[1] || m[2] || m[3])) err.retryMs = ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 1000;
    else if (status === 429 && /per day|daily/i.test(message)) err.retryMs = 3600_000;
  } else {
    err.kind = 'bad-request';
  }
  return err;
}

function toUserError(err) {
  const map = {
    auth: 'The Gemini API key is invalid or lacks permission. An administrator should update it in Admin → Settings → AI (get a key at aistudio.google.com/apikey).',
    busy: 'Gemini is under heavy load right now and every fallback model was busy. Please try again in a few seconds.',
    retired: 'The configured Gemini model is no longer available. Please pick a model from Admin → Settings → AI.',
    blocked: err.message,
  };
  let message = map[err.kind] || `AI request failed: ${err.message}`;
  if (err.kind === 'busy' && /quota|rate.?limit/i.test(err.message))
    message = 'The Gemini API quota for this key is used up for now (free tier has daily limits). Please try again later, or enable billing on the key in Google AI Studio.';
  return Object.assign(new Error(message), { status: err.kind === 'auth' ? 503 : 502, detail: err.message });
}

/* ───────────────────────── stream helpers ───────────────────────── */

async function* withIdleTimeout(body, ms, signal) {
  const it = body[Symbol.asyncIterator]();
  while (true) {
    let timer;
    const timeout = new Promise((_, rej) => {
      timer = setTimeout(() => rej(Object.assign(new Error('stream stalled'), { kind: 'busy' })), ms);
    });
    try {
      const { value, done } = await Promise.race([it.next(), timeout]);
      if (done) return;
      if (signal?.aborted) throw abortError();
      yield value;
    } catch (e) {
      it.return?.().catch(() => {});
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function* sseLines(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.startsWith('data:')) yield line.slice(5).trim();
    }
  }
  const rest = buffer.trim();
  if (rest.startsWith('data:')) yield rest.slice(5).trim();
  else if (rest.startsWith('{') || rest.startsWith('[')) yield rest; // non-SSE error payloads
}

async function readError(res) {
  const t = await res.text().catch(() => '');
  try {
    const j = JSON.parse(t);
    const e = Array.isArray(j) ? j[0]?.error : j.error;
    return e?.message || j.message || t.slice(0, 300);
  } catch {
    return t.slice(0, 300) || res.statusText;
  }
}

async function fetchWithTimeout(url, init, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

const clampTemp = (t) => {
  const n = Number(t);
  return Number.isFinite(n) ? Math.min(2, Math.max(0, n)) : 0.7;
};
const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });

/* ───────────── No key configured: deterministic offline demo, streamed like a real model ───────────── */
async function streamLocal({ task, context, messages, onDelta, signal }) {
  const text = localReply({ task, context, messages });
  const tokens = text.match(/\S+\s*|\s+/g) || [];
  let full = '';
  for (let i = 0; i < tokens.length; i += 2) {
    if (signal?.aborted) throw abortError();
    const piece = tokens.slice(i, i + 2).join('');
    full += piece;
    onDelta(piece);
    await new Promise((r) => setTimeout(r, 18));
  }
  return full;
}

/** Extract a JSON object from model output (handles ```json fences and chatter). */
export function parseJsonLoose(text) {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
