import { Router } from 'express';
import { AtsReport, Resume } from '../models/index.js';
import { asyncHandler, ApiError, paginate, pageMeta } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { documentUpload } from '../middleware/upload.js';
import { analyzeResume, extractText, resumeToText, geminiReadableMime } from '../services/atsService.js';
import { completeChat } from '../services/aiService.js';
import { getSettings, aiReady } from '../services/settingsService.js';

const r = Router();
r.use(requireAuth);

/** Upload PDF/DOCX/TXT → plain text. */
r.post('/extract', documentUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Attach a résumé file.');
  let text = (await extractText(req.file)).replace(/\u0000/g, '').trim();
  let via = 'parser';
  // Scanned PDF or image → let Gemini read the document itself.
  const mime = geminiReadableMime(req.file);
  if (text.length < 40 && mime && req.file.size <= 15 * 1024 * 1024 && aiReady(await getSettings())) {
    try {
      const out = await completeChat({
        task: 'extract',
        files: [{ mimeType: mime, data: req.file.buffer.toString('base64') }],
        messages: [
          { role: 'system', content: 'You transcribe résumé documents to plain text. Output only the document text in reading order, keeping section headings and bullet points. No commentary.' },
          { role: 'user', content: 'Transcribe this résumé.' },
        ],
      });
      text = out.replace(/```[a-z]*\n?|```/gi, '').trim();
      via = 'gemini';
    } catch (e) {
      console.warn('[ats] Gemini OCR failed:', e.message);
    }
  }
  if (text.length < 40) throw new ApiError(422, 'Could not read text from this file. If it is a scanned image, paste the text instead.');
  res.json({ text, fileName: req.file.originalname, words: text.split(/\s+/).length, via });
}));

/** Instant deterministic scoring — AI deep feedback streams separately over WebSocket. */
r.post('/analyze', asyncHandler(async (req, res) => {
  let { resumeText = '', jobDescription = '', fileName = '', jobTitle = '', resumeId } = req.body;
  if (resumeId) {
    const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
    if (!resume) throw new ApiError(404, 'Resume not found.');
    resumeText = resumeToText(resume.data);
    fileName = resume.title;
  }
  if (resumeText.trim().length < 40) throw new ApiError(400, 'Résumé text is too short to analyse.');
  const result = analyzeResume(resumeText, jobDescription);
  const report = await AtsReport.create({ user: req.user._id, fileName: fileName || 'Pasted text', jobTitle, score: result.score, breakdown: result.breakdown, matchedKeywords: result.matchedKeywords, missingKeywords: result.missingKeywords, stats: result.stats });
  res.json({ reportId: report._id, ...result, resumeText });
}));

r.get('/history', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 8 });
  const q = { user: req.user._id };
  const [items, total] = await Promise.all([AtsReport.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-aiFeedback'), AtsReport.countDocuments(q)]);
  res.json({ items, ...pageMeta(total, page, limit) });
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const report = await AtsReport.findOne({ _id: req.params.id, user: req.user._id });
  if (!report) throw new ApiError(404, 'Report not found.');
  res.json({ report });
}));

r.delete('/:id', asyncHandler(async (req, res) => {
  await AtsReport.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
}));

export default r;
