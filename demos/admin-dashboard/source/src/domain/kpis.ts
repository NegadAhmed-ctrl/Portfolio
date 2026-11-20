import type { CategoryId, Movement, Product } from "./types";
import { stockState } from "./inventory";

export interface DayBucket {
  /** yyyy-mm-dd in Cairo time */
  day: string;
  inQty: number;
  outQty: number;
  /** value of issued goods at selling price (what left the store) */
  outValue: number;
}

export interface Overview {
  stockValue: number; // at cost
  retailValue: number; // at selling price
  skuCount: number;
  low: Product[];
  out: Product[];
  days: DayBucket[];
  issuedThisWeek: number; // value, last 7 days
  issuedPrevWeek: number; // value, the 7 days before
  byCategory: { category: CategoryId; value: number }[];
  topIssued: { product: Product; qty: number }[];
}

const DAY_MS = 86_400_000;

/** Calendar day in Africa/Cairo for an ISO timestamp. */
export function cairoDay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function computeOverview(products: readonly Product[], movements: readonly Movement[], now: Date, days = 14): Overview {
  const byId = new Map(products.map((p) => [p.id, p]));

  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    buckets.push({ day: cairoDay(new Date(now.getTime() - i * DAY_MS)), inQty: 0, outQty: 0, outValue: 0 });
  }
  const bucketIndex = new Map(buckets.map((b, i) => [b.day, i]));

  let issuedThisWeek = 0;
  let issuedPrevWeek = 0;
  const issuedQty = new Map<string, number>();

  for (const m of movements) {
    const p = byId.get(m.productId);
    if (!p) continue; // deleted product: history kept, not counted
    const age = now.getTime() - new Date(m.at).getTime();
    const i = bucketIndex.get(cairoDay(m.at));
    if (m.kind === "in" && i !== undefined) buckets[i].inQty += m.qty;
    if (m.kind === "out") {
      const value = m.qty * p.price;
      if (i !== undefined) {
        buckets[i].outQty += m.qty;
        buckets[i].outValue += value;
      }
      if (age >= 0 && age < 7 * DAY_MS) {
        issuedThisWeek += value;
        issuedQty.set(p.id, (issuedQty.get(p.id) ?? 0) + m.qty);
      } else if (age >= 7 * DAY_MS && age < 14 * DAY_MS) issuedPrevWeek += value;
    }
  }

  const catTotals = new Map<CategoryId, number>();
  for (const p of products) catTotals.set(p.category, (catTotals.get(p.category) ?? 0) + p.stock * p.cost);

  return {
    stockValue: products.reduce((s, p) => s + p.stock * p.cost, 0),
    retailValue: products.reduce((s, p) => s + p.stock * p.price, 0),
    skuCount: products.length,
    low: products.filter((p) => stockState(p) === "low").sort((a, b) => a.stock / (a.reorderAt || 1) - b.stock / (b.reorderAt || 1)),
    out: products.filter((p) => stockState(p) === "out"),
    days: buckets,
    issuedThisWeek,
    issuedPrevWeek,
    byCategory: [...catTotals].map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value),
    topIssued: [...issuedQty]
      .map(([id, qty]) => ({ product: byId.get(id)!, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5),
  };
}

/** Percentage change, null when there is nothing to compare with. */
export function change(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
