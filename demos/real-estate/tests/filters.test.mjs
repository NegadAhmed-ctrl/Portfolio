import test from "node:test";
import assert from "node:assert/strict";
import { UNITS, AREAS, TYPES, areaName } from "../js/units.js";
import {
  parsePrice, normalizeArabic, applyFilters, sortUnits, filtersToQuery, queryToFilters,
  suggestRelaxation, formatPrice, countUnits, pricePerMeter, DEFAULT_FILTERS,
} from "../js/filters.js";

const known = { areas: AREAS.map((a) => a.id), types: TYPES.map((t) => t.id) };
const ids = (list) => list.map((u) => u.id);

test("parsePrice reads what people type", () => {
  assert.equal(parsePrice("6500000"), 6_500_000);
  assert.equal(parsePrice("6,500,000"), 6_500_000);
  assert.equal(parsePrice("٦٫٥ مليون"), 6_500_000);
  assert.equal(parsePrice("6.5m"), 6_500_000);
  assert.equal(parsePrice("6,5 مليون"), 6_500_000);
  assert.equal(parsePrice("850 ألف"), 850_000);
  assert.equal(parsePrice("٢٠ الف"), 20_000);
  assert.equal(parsePrice("17.5k"), 17_500);
  assert.equal(parsePrice("٣٢٬٠٠٠ ج.م"), 32_000);
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("كتير"), null);
  assert.equal(parsePrice("-5"), null);
});

test("normalizeArabic ignores hamza / ta marbuta / diacritics / digits", () => {
  assert.equal(normalizeArabic("الإسكندريّة"), normalizeArabic("الاسكندريه"));
  assert.equal(normalizeArabic("٤٥"), "45");
});

test("default view = for sale only", () => {
  const list = applyFilters(UNITS, DEFAULT_FILTERS, areaName);
  assert.ok(list.length > 0);
  assert.ok(list.every((u) => u.purpose === "sale"));
});

test("area + type + rooms + price + bahari combine with AND, areas/types with OR", () => {
  const list = applyFilters(UNITS, { purpose: "sale", areas: ["loran", "sporting"], minRooms: 2, maxPrice: 8_000_000, bahari: true }, areaName);
  assert.deepEqual(ids(list).sort(), ["LR-0412", "SP-1102"]);
  const types = applyFilters(UNITS, { purpose: "sale", types: ["duplex", "roof"] }, areaName);
  assert.deepEqual(ids(types).sort(), ["LR-0909", "SM-1201"]);
});

test("price bounds are inclusive", () => {
  const exact = applyFilters(UNITS, { purpose: "sale", minPrice: 7_250_000, maxPrice: 7_250_000 }, areaName);
  assert.deepEqual(ids(exact), ["LR-0412"]);
});

test("rent filter uses monthly price", () => {
  const list = applyFilters(UNITS, { purpose: "rent", maxPrice: 15_000 }, areaName);
  assert.deepEqual(ids(list).sort(), ["MA-0102R", "MI-0702R", "SP-0201R"]);
});

test("text search matches street, code and area name, any spelling", () => {
  assert.deepEqual(ids(applyFilters(UNITS, { purpose: "sale", q: "مصطفى كامل" }, areaName)), ["RS-0601"]);
  assert.deepEqual(ids(applyFilters(UNITS, { purpose: "sale", q: "sm-0907" }, areaName)), ["SM-0907"]);
  assert.ok(applyFilters(UNITS, { purpose: "sale", q: "سموحه" }, areaName).length >= 2);
  assert.deepEqual(ids(applyFilters(UNITS, { purpose: "sale", q: "مصطفى سموحة" }, areaName)), []);
});

test("sorting", () => {
  const sale = applyFilters(UNITS, { purpose: "sale" });
  const asc = sortUnits(sale, "price-asc").map((u) => u.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  assert.equal(sortUnits(sale, "newest")[0].listed, "2026-11-20");
  assert.equal(sortUnits(sale, "size-desc")[0].id, "LR-0909");
  const ppm = sortUnits(sale, "ppm").map(pricePerMeter);
  assert.deepEqual(ppm, [...ppm].sort((a, b) => a - b));
  assert.equal(sale.length, sortUnits(sale, "unknown").length);
});

test("filters survive a round trip through the URL", () => {
  const f = { ...DEFAULT_FILTERS, purpose: "rent", areas: ["smouha", "loran"], types: ["apartment"], minRooms: 3, maxPrice: 35000, bahari: true, q: "مفروشة", sort: "price-asc" };
  assert.deepEqual(queryToFilters(filtersToQuery(f), known), f);
  assert.equal(filtersToQuery(DEFAULT_FILTERS), "");
});

test("bad URL values are dropped, not trusted", () => {
  const f = queryToFilters("?p=steal&a=loran,mars&t=castle&r=99&max=-4&sort=evil&q=" + "x".repeat(200), known);
  assert.equal(f.purpose, "sale");
  assert.deepEqual(f.areas, ["loran"]);
  assert.deepEqual(f.types, []);
  assert.equal(f.minRooms, 5);
  assert.equal(f.maxPrice, null);
  assert.equal(f.sort, "newest");
  assert.equal(f.q.length, 60);
});

test("empty result suggests the one filter to drop", () => {
  const f = { purpose: "sale", areas: ["kafr-abdo"], maxPrice: 5_000_000 };
  assert.equal(applyFilters(UNITS, f, areaName).length, 0);
  const tip = suggestRelaxation(UNITS, f, areaName);
  assert.equal(tip.key, "maxPrice");
  assert.equal(tip.count, 1);
  assert.equal(suggestRelaxation(UNITS, { purpose: "sale" }, areaName), null);
});

test("price formatting and Arabic counting", () => {
  assert.equal(formatPrice({ purpose: "sale", price: 7_250_000 }), "٧٫٢٥ مليون ج.م");
  assert.equal(formatPrice({ purpose: "rent", price: 17_500 }), "١٧٬٥٠٠ ج.م في الشهر");
  assert.equal(countUnits(1), "وحدة واحدة");
  assert.equal(countUnits(2), "وحدتين");
  assert.equal(countUnits(7), "٧ وحدات");
  assert.equal(countUnits(16), "١٦ وحدة");
});

test("sample data is consistent", () => {
  const seen = new Set();
  for (const u of UNITS) {
    assert.ok(!seen.has(u.id), `duplicate ${u.id}`);
    seen.add(u.id);
    assert.ok(known.areas.includes(u.area) && known.types.includes(u.type), u.id);
    assert.ok(u.floor >= 1 && u.floor <= u.floors, u.id);
    assert.ok(["بحري", "قبلي", "شرقي", "غربي"].includes(u.facing), u.id);
    assert.ok(u.purpose === "rent" ? u.id.endsWith("R") : !u.id.endsWith("R"), u.id);
  }
});
