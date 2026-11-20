const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

/** Arabic-Indic / Persian digits → ASCII, so "٢٥" finds "25". */
export function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_INDIC.indexOf(d);
    return String(i >= 0 ? i : PERSIAN.indexOf(d));
  });
}

/**
 * Loose Arabic matching for search: ignores diacritics and tatweel, and treats
 * أ/إ/آ/ا, ى/ي and ة/ه as the same letter. Staff type fast on a phone.
 */
export function normalizeArabic(s: string): string {
  return toLatinDigits(s)
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses a quantity typed by a person: "١٢", " 12 ", "12.0" → 12. Returns NaN if not a whole number. */
export function parseQty(raw: string): number {
  const t = toLatinDigits(raw).trim();
  if (!/^\d+(\.0+)?$/.test(t)) return NaN;
  return Number(t);
}
