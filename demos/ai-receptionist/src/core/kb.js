// Tiny knowledge-base search over the business's own FAQ + service list.
// Answers ONLY come from this data. If nothing matches well enough, the
// assistant says it doesn't know and offers a human, instead of guessing.

import { normalize, tokens } from './nlu.js';
import { toArabicDigits } from './time.js';

export function priceList(business, lang) {
  const cur = business.currency[lang];
  const lines = business.services.map((s) => {
    const price = lang === 'ar' ? (s.priceAr || toArabicDigits(s.price)) : s.price;
    return `• ${s.name[lang]}: ${price} ${cur}`;
  });
  const head = lang === 'ar' ? 'دي أسعارنا الحالية:' : 'Here are our current prices:';
  const tail = lang === 'ar'
    ? 'السعر النهائي للعلاج بيحدده الدكتور بعد الكشف.'
    : 'Final treatment cost is confirmed by the doctor after the check-up.';
  return [head, ...lines, tail].join('\n');
}

export function buildEntries(business) {
  const entries = business.faq.map((f) => ({
    id: f.id,
    keywords: f.keywords.map(normalize),
    en: f.en === '__PRICE_LIST__' ? priceList(business, 'en') : f.en,
    ar: f.ar === '__PRICE_LIST__' ? priceList(business, 'ar') : f.ar,
  }));
  // One entry per service, so "how much is whitening?" gets a direct answer.
  for (const s of business.services) {
    entries.push({
      id: 'service:' + s.id,
      serviceId: s.id,
      keywords: s.keywords.map(normalize),
      en: `${s.name.en}: ${s.price} ${business.currency.en}, about ${s.duration} minutes. Final cost is confirmed by the doctor after the check-up.`,
      ar: `${s.name.ar}: ${s.priceAr || toArabicDigits(s.price)} ${business.currency.ar}، حوالي ${toArabicDigits(s.duration)} دقيقة. السعر النهائي بيحدده الدكتور بعد الكشف.`,
    });
  }
  return entries;
}

// Score = keyword phrase hits (strong) + token overlap (weak).
export function search(entries, question, k = 3) {
  const n = ' ' + normalize(question) + ' ';
  const qTokens = new Set(tokens(question));
  const scored = entries.map((e) => {
    let score = 0;
    for (const kw of e.keywords) {
      if (!kw) continue;
      const hit = /^[a-z ]+$/.test(kw) ? n.includes(' ' + kw + ' ') || n.includes(' ' + kw) : n.includes(kw);
      if (hit) score += (kw.includes(' ') ? 3 : 2) + (e.serviceId ? 2 : 0); // a named service beats the general price list
      else if (kw.split(' ').some((w) => w.length > 2 && qTokens.has(w))) score += 0.5;
    }
    return { entry: e, score };
  });
  return scored.filter((s) => s.score >= 2).sort((a, b) => b.score - a.score || (b.entry.serviceId ? 1 : 0) - (a.entry.serviceId ? 1 : 0)).slice(0, k);
}
