import { Server } from 'socket.io';
import { User, ChatThread, AtsReport } from '../models/index.js';
import { streamChat } from '../services/aiService.js';
import { getSettings } from '../services/settingsService.js';
import { env } from '../config/env.js';

/**
 * Real-time layer:
 *  • blog rooms for live comments / reactions / ratings / typing indicators
 *  • AI streaming (chatbot, cover letters, ATS feedback, summary rewrite) token-by-token
 *  • presence counter & admin notifications
 */
export function initSocket(httpServer, sessionMiddleware) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
    path: '/socket.io',
  });

  io.engine.use(sessionMiddleware);

  io.use(async (socket, next) => {
    try {
      const uid = socket.request.session?.userId;
      if (uid) {
        const u = await User.findById(uid).select('username name avatar role status');
        if (u && u.status === 'active') socket.data.user = u;
      }
      next();
    } catch (e) {
      next(e);
    }
  });

  const broadcastPresence = () => io.emit('presence:count', { online: io.engine.clientsCount });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (user) {
      socket.join(`user:${user._id}`);
      if (user.role === 'admin') socket.join('admins');
    }
    broadcastPresence();

    /* ── blog rooms ── */
    socket.on('blog:join', ({ blogId } = {}) => blogId && socket.join(`blog:${blogId}`));
    socket.on('blog:leave', ({ blogId } = {}) => blogId && socket.leave(`blog:${blogId}`));
    socket.on('comment:typing', ({ blogId, typing } = {}) => {
      if (!user || !blogId) return;
      socket.to(`blog:${blogId}`).emit('comment:typing', { user: { username: user.username, name: user.name, avatar: user.avatar }, typing: !!typing });
    });

    /* ── AI streaming ── */
    const controllers = new Map();

    socket.on('ai:request', async (payload = {}, ack) => {
      const { requestId, task = 'chat' } = payload;
      if (!requestId) return;
      const reply = (event, data) => socket.emit(event, { requestId, ...data });
      if (!user) {
        reply('ai:error', { message: 'Please sign in to use AI features.' });
        return ack?.({ ok: false });
      }
      ack?.({ ok: true });
      const controller = new AbortController();
      controllers.set(requestId, controller);
      try {
        const s = await getSettings();
        const { messages, context, onFinish } = await buildPrompt(task, payload, s, user);
        reply('ai:start', { provider: s.ai.provider });
        const full = await streamChat({ messages, task, context, signal: controller.signal, onDelta: (delta) => reply('ai:chunk', { delta }) });
        await onFinish?.(full);
        reply('ai:done', { content: full });
      } catch (err) {
        if (err.name === 'AbortError') reply('ai:done', { content: null, aborted: true });
        else reply('ai:error', { message: err.message || 'AI request failed.' });
      } finally {
        controllers.delete(requestId);
      }
    });

    socket.on('ai:cancel', ({ requestId } = {}) => controllers.get(requestId)?.abort());

    socket.on('chat:history', async (_p, ack) => {
      if (!user) return ack?.({ messages: [] });
      const t = await ChatThread.findOne({ user: user._id });
      ack?.({ messages: t?.messages?.slice(-30) || [] });
    });
    socket.on('chat:clear', async (_p, ack) => {
      if (user) await ChatThread.deleteOne({ user: user._id });
      ack?.({ ok: true });
    });

    socket.on('disconnect', () => {
      controllers.forEach((c) => c.abort());
      broadcastPresence();
    });
  });

  return io;
}

async function buildPrompt(task, p, s, user) {
  if (task === 'chat') {
    if (!s.chatbot.enabled) throw new Error('The assistant is currently disabled by the administrator.');
    const text = String(p.message || '').slice(0, 4000);
    if (!text.trim()) throw new Error('Message is empty.');
    let thread = await ChatThread.findOne({ user: user._id });
    if (!thread) thread = new ChatThread({ user: user._id, messages: [] });
    const history = thread.messages.slice(-(s.chatbot.historyLimit || 12)).map((m) => ({ role: m.role, content: m.content }));
    return {
      messages: [{ role: 'system', content: `${s.chatbot.systemPrompt}\nThe user's name is ${user.name}.` }, ...history, { role: 'user', content: text }],
      onFinish: async (full) => {
        thread.messages.push({ role: 'user', content: text }, { role: 'assistant', content: full });
        thread.messages = thread.messages.slice(-60);
        await thread.save();
      },
    };
  }

  if (task === 'cover-letter') {
    const f = p.form || {};
    const prompt = `Write a ${f.tone || 'professional'} cover letter (${f.length === 'short' ? '180–230' : f.length === 'long' ? '380–450' : '260–340'} words).
Applicant: ${f.fullName || user.name}
Target role: ${f.role || 'not specified'} at ${f.company || 'the company'}${f.hiringManager ? ` (hiring manager: ${f.hiringManager})` : ''}
Experience: ${f.experience || 'not specified'}
Key skills: ${f.skills || 'not specified'}
Achievements to highlight: ${f.highlights || 'none provided'}
Job description:\n${(f.jobDescription || 'not provided').slice(0, 5000)}
Return only the letter text, starting with a greeting and ending with a sign-off and the applicant's name.`;
    return { context: f, messages: [{ role: 'system', content: s.ai.coverLetterSystemPrompt }, { role: 'user', content: prompt }] };
  }

  if (task === 'ats') {
    const prompt = `Analyse this résumé against the job description. The rule-based ATS score is ${p.score}/100.
Missing keywords: ${(p.missingKeywords || []).join(', ') || 'none'}.
Matched keywords: ${(p.matchedKeywords || []).join(', ') || 'none'}.
Structure your answer as Markdown sections: "Overall verdict", "Highest-impact fixes" (5 bullets), "Keyword strategy", "Rewrite examples" (2 before/after bullet rewrites from the résumé), "Formatting checks".
--- RÉSUMÉ ---\n${String(p.resumeText || '').slice(0, 9000)}\n--- JOB DESCRIPTION ---\n${String(p.jobDescription || 'Not provided — give general ATS advice.').slice(0, 5000)}`;
    return {
      context: p,
      messages: [{ role: 'system', content: s.ai.atsSystemPrompt }, { role: 'user', content: prompt }],
      onFinish: async (full) => {
        if (p.reportId) await AtsReport.updateOne({ _id: p.reportId, user: user._id }, { aiFeedback: full });
      },
    };
  }

  if (task === 'summary') {
    const c = p.context || {};
    const prompt = `Write a 3-sentence professional résumé summary (max 70 words) for: headline "${c.headline || ''}", skills: ${(c.skills || []).join(', ')}, experience: ${(c.experience || []).map((e) => `${e.role} at ${e.company}`).join('; ')}. Current draft: "${c.summary || ''}". Return only the summary text.`;
    return { context: c, messages: [{ role: 'system', content: s.ai.resumeSystemPrompt }, { role: 'user', content: prompt }] };
  }

  throw new Error(`Unknown AI task: ${task}`);
}
