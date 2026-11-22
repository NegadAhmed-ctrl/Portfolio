// Pure search / filter / sort logic. No DOM here, so all of it is unit-tested.

export const SORTS = {
  newest: "الأحدث",
  "price-asc": "السعر: الأقل الأول",
  "price-desc": "السعر: الأعلى الأول",
  "size-desc": "المساحة: الأكبر الأول",
  ppm: "سعر المتر: الأقل الأول",
};

export const DEFAULT_FILTERS = Object.freeze({
  purpose: "sale",
  areas: [],
  types: [],
  minRooms: 0,
  minPrice: null,
  maxPrice: null,
  bahari: false,
  q: "",
  sort: "newest",
});

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Arabic-Indic / Persian digits -> ASCII digits, Arabic decimal/thousands marks -> . and nothing. */
export function toAsciiDigits(text) {
  return String(text ?? "")
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/[٬،]/g, ",");
}

/** Normalise Arabic for search: no diacritics/tatweel, one form of alef, ta marbuta, ya. */
export function normalizeArabic(text) {
  return toAsciiDigits(text)
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse what people actually type in a budget box:
 * "6500000", "6,500,000", "٦٫٥ مليون", "6.5m", "850 الف", "17.5k".
 * Returns a number in EGP, or null when the box is empty / unreadable.
 */
export function parsePrice(input) {
  const raw = normalizeArabic(input).replace(/ج\.?م|جنيه|egp|le/g, "").trim();
  if (!raw) return null;
  const m = raw.match(/^(\d+(?:[.,]\d+)*)\s*(مليون|م|m|mn|million|الف|الاف|k|الف جنيه)?$/);
  if (!m) return null;
  let numText = m[1];
  const unit = m[2] || "";
  // "6,500,000" -> thousands separators; "6,5" with a unit -> decimal comma.
  if (/^\d{1,3}(,\d{3})+$/.test(numText)) numText = numText.replace(/,/g, "");
  else numText = numText.replace(",", ".");
  const n = Number(numText);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (/^(مليون|م|m|mn|million)$/.test(unit)) return Math.round(n * 1_000_000);
  if (/^(الف|الاف|k|الف جنيه)$/.test(unit)) return Math.round(n * 1_000);
  return Math.round(n);
}

export function pricePerMeter(unit) {
  return unit.purpose === "sale" ? Math.round(unit.price / unit.size) : null;
}

function matchesText(unit, q, areaName) {
  if (!q) return true;
  const hay = normalizeArabic([unit.id, unit.street, unit.note, areaName(unit.area)].join(" "));
  return normalizeArabic(q)
    .split(" ")
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

/** Filter units. `areaName` is injected so this file doesn't depend on the data module. */
export function applyFilters(units, filters, areaName = (x) => x) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  return units.filter(
    (u) =>
      (!f.purpose || u.purpose === f.purpose) &&
      (f.areas.length === 0 || f.areas.includes(u.area)) &&
      (f.types.length === 0 || f.types.includes(u.type)) &&
      u.rooms >= (f.minRooms || 0) &&
      (f.minPrice == null || u.price >= f.minPrice) &&
      (f.maxPrice == null || u.price <= f.maxPrice) &&
      (!f.bahari || u.facing === "بحري") &&
      matchesText(u, f.q, areaName),
  );
}

export function sortUnits(units, sort = "newest") {
  const list = [...units];
  const byId = (a, b) => a.id.localeCompare(b.id);
  const cmp = {
    newest: (a, b) => b.listed.localeCompare(a.listed) || byId(a, b),
    "price-asc": (a, b) => a.price - b.price || byId(a, b),
    "price-desc": (a, b) => b.price - a.price || byId(a, b),
    "size-desc": (a, b) => b.size - a.size || byId(a, b),
    ppm: (a, b) => (pricePerMeter(a) ?? a.price / a.size) - (pricePerMeter(b) ?? b.price / b.size) || byId(a, b),
  }[sort] ?? ((a, b) => 0);
  return list.sort(cmp);
}

/** When nothing matches, say which single filter to drop to get results back. */
export function suggestRelaxation(units, filters, areaName) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const tries = [
    ["maxPrice", { maxPrice: null }, "شيل الحد الأقصى للسعر"],
    ["minPrice", { minPrice: null }, "شيل الحد الأدنى للسعر"],
    ["minRooms", { minRooms: 0 }, "أي عدد غرف"],
    ["bahari", { bahari: false }, "مش لازم بحري"],
    ["types", { types: [] }, "كل الأنواع"],
    ["areas", { areas: [] }, "كل المناطق"],
    ["q", { q: "" }, "امسح كلمة البحث"],
  ];
  for (const [key, patch, label] of tries) {
    const active = Array.isArray(f[key]) ? f[key].length > 0 : Boolean(f[key]);
    if (!active) continue;
    const n = applyFilters(units, { ...f, ...patch }, areaName).length;
    if (n > 0) return { key, patch, label, count: n };
  }
  return null;
}

/** Filters <-> URL query, so a filtered list can be sent on WhatsApp and survives reload. */
export function filtersToQuery(filters) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const p = new URLSearchParams();
  if (f.purpose !== DEFAULT_FILTERS.purpose) p.set("p", f.purpose);
  if (f.areas.length) p.set("a", f.areas.join(","));
  if (f.types.length) p.set("t", f.types.join(","));
  if (f.minRooms) p.set("r", String(f.minRooms));
  if (f.minPrice != null) p.set("min", String(f.minPrice));
  if (f.maxPrice != null) p.set("max", String(f.maxPrice));
  if (f.bahari) p.set("bahari", "1");
  if (f.q) p.set("q", f.q);
  if (f.sort !== DEFAULT_FILTERS.sort) p.set("sort", f.sort);
  return p.toString();
}

export function queryToFilters(search, known = {}) {
  const p = new URLSearchParams(search);
  const list = (key, allowed) =>
    (p.get(key) || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && (!allowed || allowed.includes(s)));
  const num = (key) => {
    const n = Number(p.get(key));
    return p.has(key) && Number.isFinite(n) && n > 0 ? n : null;
  };
  const purpose = p.get("p");
  const sort = p.get("sort");
  return {
    ...DEFAULT_FILTERS,
    purpose: purpose === "rent" || purpose === "sale" ? purpose : DEFAULT_FILTERS.purpose,
    areas: list("a", known.areas),
    types: list("t", known.types),
    minRooms: Math.min(Math.max(Number(p.get("r")) || 0, 0), 5),
    minPrice: num("min"),
    maxPrice: num("max"),
    bahari: p.get("bahari") === "1",
    q: (p.get("q") || "").slice(0, 60),
    sort: sort && sort in SORTS ? sort : DEFAULT_FILTERS.sort,
  };
}

const nf = new Intl.NumberFormat("ar-EG");
const nf2 = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

export function formatNumber(n) {
  return nf.format(n);
}

/** "٧٫٢٥ مليون ج.م" for sales, "١٧٬٥٠٠ ج.م في الشهر" for rent. */
export function formatPrice(unit) {
  if (unit.purpose === "rent") return `${nf.format(unit.price)} ج.م في الشهر`;
  if (unit.price >= 1_000_000) return `${nf2.format(unit.price / 1_000_000)} مليون ج.م`;
  return `${nf.format(unit.price)} ج.م`;
}

export function formatPriceShort(unit) {
  if (unit.purpose === "rent") return `${nf.format(unit.price)} / شهر`;
  return `${nf2.format(unit.price / 1_000_000)} مليون`;
}

/** Arabic counting: "وحدة واحدة"، "وحدتين"، "٣ وحدات"، "١٦ وحدة". */
export function countUnits(n) {
  if (n === 1) return "وحدة واحدة";
  if (n === 2) return "وحدتين";
  if (n >= 3 && n <= 10) return `${nf.format(n)} وحدات`;
  return `${nf.format(n)} وحدة`;
}
