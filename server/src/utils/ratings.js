import { Rating } from '../models/index.js';

/** Average, count and 1–5 distribution for a rating target (computed in JS — tiny result sets, engine-agnostic). */
export async function ratingStats(match) {
  const rows = await Rating.find(match).select('value -_id').lean();
  const count = rows.length;
  const total = rows.reduce((a, r) => a + r.value, 0);
  const distribution = [5, 4, 3, 2, 1].map((v) => ({ value: v, count: rows.filter((r) => r.value === v).length }));
  return { avg: count ? Math.round((total / count) * 10) / 10 : 0, count, distribution };
}
