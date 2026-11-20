import type { Category, Movement, Product, User } from "../domain/types";

/*
 * Sample data for the demo: a fictional plumbing & sanitary-ware store in
 * Moharam Bek, Alexandria. Movements are generated for the last 21 days
 * relative to "now", so the charts always look like a live shop.
 * Deterministic (seeded) so tests and screenshots are repeatable.
 */

export const STORE = { name: "السيد للأدوات الصحية", branch: "فرع محرم بك، إسكندرية" };

export const CATEGORIES: Category[] = [
  { id: "mixers", name: "خلاطات ومحابس" },
  { id: "pipes", name: "مواسير" },
  { id: "fittings", name: "وصلات واكسسوار" },
  { id: "heaters", name: "سخانات" },
  { id: "sanitary", name: "أطقم حمام" },
  { id: "tools", name: "عدة وخامات" },
];

export const DEMO_PASSWORD = "Demo@1234";

export const SEED_USERS: (User & { password: string })[] = [
  { id: "u-hesham", name: "هشام السيد", email: "hesham@elsayed.demo", role: "admin", active: true, lastSeenAt: null, password: DEMO_PASSWORD },
  { id: "u-karim", name: "كريم عبد الفتاح", email: "karim@elsayed.demo", role: "staff", active: true, lastSeenAt: null, password: DEMO_PASSWORD },
  { id: "u-sara", name: "سارة منصور", email: "sara@elsayed.demo", role: "staff", active: true, lastSeenAt: null, password: DEMO_PASSWORD },
  { id: "u-ramadan", name: "رمضان عبد العال", email: "ramadan@elsayed.demo", role: "staff", active: false, lastSeenAt: null, password: DEMO_PASSWORD },
];

type Row = [sku: string, name: string, cat: Product["category"], unit: string, cost: number, price: number, supplier: string, dailyDemand: number];

const ROWS: Row[] = [
  ["A-01-1", "خلاط حوض نحاس كروم بذراع واحد", "mixers", "قطعة", 1450, 1850, "الشريف للخلاطات", 1.2],
  ["A-01-2", "خلاط بانيو بدش يدوي", "mixers", "قطعة", 2300, 2950, "الشريف للخلاطات", 0.6],
  ["A-01-3", "خلاط مطبخ برقبة مرنة", "mixers", "قطعة", 1750, 2250, "الشريف للخلاطات", 0.8],
  ["A-02-1", "دش مطري 25 سم ستانلس", "mixers", "قطعة", 640, 850, "الشريف للخلاطات", 0.7],
  ["A-02-2", "محبس زاوية نصف بوصة", "mixers", "قطعة", 85, 120, "الشريف للخلاطات", 6],
  ["B-01-1", "ماسورة PPR 25 مم (4 متر)", "pipes", "ماسورة", 118, 150, "النيل للبلاستيك", 14],
  ["B-01-2", "ماسورة PPR 32 مم (4 متر)", "pipes", "ماسورة", 185, 235, "النيل للبلاستيك", 6],
  ["B-02-1", "ماسورة صرف PVC 4 بوصة (3 متر)", "pipes", "ماسورة", 210, 265, "النيل للبلاستيك", 5],
  ["B-02-2", "ماسورة صرف PVC 2 بوصة (3 متر)", "pipes", "ماسورة", 95, 125, "النيل للبلاستيك", 7],
  ["C-01-1", "كوع PPR 25 مم", "fittings", "قطعة", 6, 9, "النيل للبلاستيك", 60],
  ["C-01-2", "تي PPR 25 مم", "fittings", "قطعة", 8, 12, "النيل للبلاستيك", 35],
  ["C-02-1", "جلبة نحاس نصف بوصة", "fittings", "قطعة", 38, 55, "ورشة عبد الحميد للنحاس", 12],
  ["C-02-2", "شريط تيفلون", "fittings", "بكرة", 7, 12, "المتحدة للخامات", 40],
  ["C-03-1", "جوان سيفون", "fittings", "قطعة", 15, 25, "المتحدة للخامات", 9],
  ["C-03-2", "كوع صرف 4 بوصة 45 درجة", "fittings", "قطعة", 32, 45, "النيل للبلاستيك", 8],
  ["D-01-1", "سخان غاز 10 لتر", "heaters", "قطعة", 4900, 5850, "الدلتا للأجهزة المنزلية", 0.5],
  ["D-01-2", "سخان كهرباء 50 لتر", "heaters", "قطعة", 4300, 5200, "الدلتا للأجهزة المنزلية", 0.45],
  ["D-01-3", "سخان كهرباء 80 لتر", "heaters", "قطعة", 5600, 6700, "الدلتا للأجهزة المنزلية", 0.3],
  ["E-01-1", "قاعدة حمام إفرنجي بخزان", "sanitary", "طقم", 3400, 4250, "سيراميكا الإسكندرية", 0.5],
  ["E-01-2", "حوض معلق 60 سم", "sanitary", "قطعة", 1250, 1600, "سيراميكا الإسكندرية", 0.6],
  ["E-02-1", "سيفون غاطس بلاستيك", "sanitary", "قطعة", 780, 990, "سيراميكا الإسكندرية", 0.8],
  ["E-02-2", "شطاف نحاس", "sanitary", "قطعة", 240, 320, "ورشة عبد الحميد للنحاس", 2.5],
  ["E-03-1", "مراية حمام 60×80", "sanitary", "قطعة", 560, 750, "زجاج الشاطبي", 0.4],
  ["F-01-1", "مفتاح مواسير 14 بوصة", "tools", "قطعة", 260, 340, "المتحدة للخامات", 0.3],
  ["F-01-2", "ماكينة لحام PPR", "tools", "قطعة", 1650, 2100, "المتحدة للخامات", 0.15],
  ["F-02-1", "سيليكون شفاف 280 مل", "tools", "أنبوبة", 55, 80, "المتحدة للخامات", 10],
];

// Items that end the period short, so the "order now" list has real content.
const ENDS_LOW = new Set(["A-01-1", "B-01-1", "C-02-2", "D-01-1", "E-02-2"]);
const ENDS_OUT = new Set(["E-01-2", "F-02-1"]);

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Poisson-ish draw that stays small for slow movers. */
function demand(rand: () => number, mean: number): number {
  let n = 0;
  let p = Math.exp(-mean);
  let s = p;
  const u = rand();
  while (u > s && n < mean * 4 + 4) {
    n++;
    p *= mean / n;
    s += p;
  }
  return n;
}

const DAY = 86_400_000;

/** Cairo is UTC+2 in winter; a fixed offset is fine for sample data. */
function atCairo(base: Date, daysAgo: number, hour: number, minute: number): Date {
  const d = new Date(base.getTime() - daysAgo * DAY);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return new Date(`${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`);
}

export function buildSeed(now: Date, seed = 20261120): { products: Product[]; movements: Movement[] } {
  const rand = mulberry32(seed);
  const products: Product[] = [];
  const movements: Movement[] = [];
  let invoice = 4710;
  let receipt = 1062;
  let mid = 0;
  const staff = ["u-karim", "u-sara", "u-karim", "u-hesham"];

  ROWS.forEach(([sku, name, category, unit, cost, price, supplier, daily], idx) => {
    const id = `p-${sku.toLowerCase()}`;
    const reorderBase = Math.max(2, Math.ceil(daily * 5));
    let stock = Math.ceil(daily * 18) + 3;
    const push = (kind: Movement["kind"], qty: number, ref: string, at: Date, by: string) => {
      stock = kind === "in" ? stock + qty : kind === "out" ? stock - qty : qty;
      movements.push({ id: `m-${++mid}`, productId: id, kind, qty, balance: stock, ref, byUserId: by, at: at.toISOString() });
    };

    push("adjust", stock, "رصيد أول المدة (جرد)", atCairo(now, 21, 9, 5 + idx), "u-hesham");

    for (let d = 20; d >= 0; d--) {
      const date = atCairo(now, d, 9, 0);
      const isFriday = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", weekday: "short" }).format(date) === "Fri";
      const want = demand(rand, isFriday ? daily * 0.4 : daily);
      const qty = Math.min(want, stock);
      // today: only movements that already happened (before "now")
      const hour = 10 + Math.floor(rand() * 10);
      const at = atCairo(now, d, hour, Math.floor(rand() * 60));
      // keep today's activity a few hours back, so the closing movements below stay last
      const sold = qty > 0 && at.getTime() < now.getTime() - 4 * 3600_000;
      if (sold) push("out", qty, `فاتورة بيع ${++invoice}`, at, staff[Math.floor(rand() * staff.length)]);

      const ending = ENDS_LOW.has(sku) || ENDS_OUT.has(sku);
      // a restock arrives after the sale that triggered it, never before it
      const restockAt = sold ? new Date(at.getTime() + (20 + Math.floor(rand() * 40)) * 60_000) : atCairo(now, d, 9, 30);
      if (stock <= reorderBase && (!ending || d > 6) && restockAt.getTime() < now.getTime() - 3.5 * 3600_000) {
        push("in", Math.ceil(daily * 14) + 2, `إذن استلام ${++receipt} · ${supplier}`, restockAt, "u-karim");
      }
    }

    if (ENDS_OUT.has(sku) && stock > 0) push("out", stock, `فاتورة بيع ${++invoice}`, new Date(now.getTime() - 3 * 3600_000 - idx * 60_000), "u-sara");

    if (stock === 0 && !ENDS_OUT.has(sku)) {
      const qty = ENDS_LOW.has(sku) ? Math.max(1, Math.round(daily * 2)) : Math.ceil(daily * 14) + 2;
      push("in", qty, `إذن استلام ${++receipt} · ${supplier}`, new Date(now.getTime() - 2 * 3600_000), "u-karim");
    }
    const reorderAt = reorderBase;
    if (ENDS_LOW.has(sku) && stock > reorderAt) {
      // a contractor's big order this morning leaves the shelf below the re-order point
      const leave = Math.max(1, Math.floor(reorderAt * 0.6));
      push("out", stock - leave, `فاتورة بيع ${++invoice} · مقاول`, new Date(now.getTime() - 2.5 * 3600_000 - idx * 60_000), "u-sara");
    }

    products.push({ id, sku, name, category, unit, cost, price, stock, reorderAt, supplier, updatedAt: movements[movements.length - 1].at });
  });

  return { products, movements };
}
