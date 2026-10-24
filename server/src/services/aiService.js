import { getSettings, aiReady } from './settingsService.js';
import { localReply } from './localAi.js';

/**
 * Provider-agnostic streaming completion.
 * messages: [{ role: 'system'|'user'|'assistant', content }]
 * onDelta(textChunk) is called for every streamed token group.
 * Resolves with the full text.
 */
export async function streamChat({ messages, onDelta = () => {}, signal, task = 'chat', context = {}, json = false }) {
  const s = await getSettings();
  const ai = s.ai;
  if (!aiReady(s)) return streamLocal({ task, context, messages, onDelta, signal });

  const opts = { temperature: Number(ai.temperature) || 0.7, maxTokens: Number(ai.maxTokens) || 1400 };
  try {
    if (ai.provider === 'gemini') return await streamGemini({ ai, messages, onDelta, signal, opts, json });
    const baseUrl = ai.provider === 'openai' ? 'https://api.openai.com/v1' : ai.compatibleBaseUrl.replace(/\/$/, '');
    const apiKey = ai.provider === 'openai' ? ai.openaiApiKey : ai.compatibleApiKey;
    const model = ai.provider === 'openai' ? ai.openaiModel : ai.compatibleModel;
    return await streamOpenAI({ baseUrl, apiKey, model, messages, onDelta, signal, opts, json });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.error('AI provider error:', err.message);
    throw Object.assign(new Error(`AI provider error: ${err.message}`), { status: 502 });
  }
}

export async function completeChat(args) {
  return streamChat({ ...args, onDelta: () => {} });
}

/* ───────────── SSE line reader ───────────── */
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
  if (buffer.trim().startsWith('data:')) yield buffer.trim().slice(5).trim();
}

async function readError(res) {
  const t = await res.text().catch(() => '');
  try {
    const j = JSON.parse(t);
    return j.error?.message || j.message || t.slice(0, 300);
  } catch {
    return t.slice(0, 300) || res.statusText;
  }
}

/* ───────────── OpenAI & any OpenAI-compatible endpoint ───────────── */
async function streamOpenAI({ baseUrl, apiKey, model, messages, onDelta, signal, opts, json }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${await readError(res)}`);
  let full = '';
  for await (const data of sseLines(res.body)) {
    if (data === '[DONE]') break;
    try {
      const delta = JSON.parse(data).choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        onDelta(delta);
      }
    } catch {
      /* keep-alive or partial line */
    }
  }
  return full;
}

/* ───────────── Google Gemini ───────────── */
async function streamGemini({ ai, messages, onDelta, signal, opts, json }) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ai.geminiModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(ai.geminiApiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: {
        temperature: opts.temperature,
        maxOutputTokens: opts.maxTokens,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${await readError(res)}`);
  let full = '';
  for await (const data of sseLines(res.body)) {
    try {
      const parts = JSON.parse(data).candidates?.[0]?.content?.parts || [];
      const delta = parts.map((p) => p.text || '').join('');
      if (delta) {
        full += delta;
        onDelta(delta);
      }
    } catch {
      /* ignore */
    }
  }
  return full;
}

/* ───────────── Offline mode: deterministic, streamed like a real model ───────────── */
async function streamLocal({ task, context, messages, onDelta, signal }) {
  const text = localReply({ task, context, messages });
  const tokens = text.match(/\S+\s*|\s+/g) || [];
  let full = '';
  for (let i = 0; i < tokens.length; i += 2) {
    if (signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
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
