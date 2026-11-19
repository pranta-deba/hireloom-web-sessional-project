/** Shared Gemini model helpers (kept dependency-free to avoid import cycles). */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/** Normalise a saved model id and transparently upgrade retired generations (1.x, 2.0, 2.5). */
export function normalizeModel(m) {
  const id = String(m || '').trim().replace(/^models\//, '');
  if (!id) return '';
  if (/^gemini-(1(\.\d+)?|2\.0|2\.5)(-|$)/.test(id)) return DEFAULT_GEMINI_MODEL;
  return id;
}
