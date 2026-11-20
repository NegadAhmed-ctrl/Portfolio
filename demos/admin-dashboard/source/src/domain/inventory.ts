import type { CategoryId, Movement, MovementKind, Product, ProductDraft, StockState } from "./types";
import { normalizeArabic } from "./text";

export function stockState(p: Pick<Product, "stock" | "reorderAt">): StockState {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.reorderAt) return "low";
  return "ok";
}

export type SortKey = "sku" | "name" | "stock" | "price" | "updatedAt" | "value";
export type SortDir = "asc" | "desc";

export interface InventoryQuery {
  search?: string;
  category?: CategoryId | "all";
  state?: StockState | "all";
  sort?: SortKey;
  dir?: SortDir;
  page?: number; // 1-based
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export function matchesSearch(p: Product, search: string): boolean {
  const q = normalizeArabic(search);
  if (!q) return true;
  const hay = normalizeArabic(`${p.name} ${p.sku} ${p.supplier}`);
  // every word must appear somewhere: "خلاط كروم" finds "خلاط حوض نحاس كروم"
  return q.split(" ").every((w) => hay.includes(w));
}

const collator = new Intl.Collator("ar", { sensitivity: "base", numeric: true });

function compare(a: Product, b: Product, key: SortKey): number {
  switch (key) {
    case "sku":
      return a.sku.localeCompare(b.sku);
    case "name":
      return collator.compare(a.name, b.name);
    case "stock":
      return a.stock - b.stock;
    case "price":
      return a.price - b.price;
    case "value":
      return a.stock * a.cost - b.stock * b.cost;
    case "updatedAt":
      return a.updatedAt.localeCompare(b.updatedAt);
  }
}

export function queryInventory(all: readonly Product[], q: InventoryQuery = {}): Page<Product> {
  const pageSize = Math.max(1, q.pageSize ?? 8);
  const sort = q.sort ?? "sku";
  const dir = q.dir ?? "asc";

  const filtered = all.filter(
    (p) =>
      (!q.category || q.category === "all" || p.category === q.category) &&
      (!q.state || q.state === "all" || stockState(p) === q.state) &&
      matchesSearch(p, q.search ?? ""),
  );

  const sorted = [...filtered].sort((a, b) => {
    const c = compare(a, b, sort);
    // stable tie-break by SKU so pages never shuffle between renders
    return (dir === "asc" ? c : -c) || a.sku.localeCompare(b.sku);
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(1, q.page ?? 1), pageCount);
  const start = (page - 1) * pageSize;
  return { items: sorted.slice(start, start + pageSize), total: sorted.length, page, pageCount, pageSize };
}

export class DomainError extends Error {
  constructor(
    public readonly code:
      | "qty_invalid"
      | "insufficient_stock"
      | "ref_required"
      | "not_found"
      | "forbidden"
      | "sku_taken"
      | "email_taken"
      | "last_admin"
      | "bad_credentials"
      | "inactive"
      | "network",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * Applies a stock movement and returns the new stock. Issuing more than what
 * is on the shelf is refused: in a real store that is how stock "disappears".
 */
export function applyMovement(stock: number, kind: MovementKind, qty: number): number {
  if (kind === "adjust") {
    if (!Number.isInteger(qty) || qty < 0) throw new DomainError("qty_invalid", "الكمية بعد الجرد لازم تكون رقم صحيح من 0 أو أكتر");
    return qty; // adjust = the counted quantity
  }
  if (!Number.isInteger(qty) || qty <= 0) throw new DomainError("qty_invalid", "اكتب كمية صحيحة أكبر من صفر");
  if (kind === "out" && qty > stock)
    throw new DomainError("insufficient_stock", `الموجود على الرف ${stock} بس، مينفعش تصرف ${qty}`);
  return kind === "in" ? stock + qty : stock - qty;
}

export type DraftErrors = Partial<Record<keyof ProductDraft, string>>;

export function validateDraft(d: ProductDraft): DraftErrors {
  const e: DraftErrors = {};
  if (d.name.trim().length < 3) e.name = "اسم الصنف لازم يكون 3 حروف على الأقل";
  if (!/^[A-Z]-\d{2}-\d$/.test(d.sku.trim().toUpperCase())) e.sku = "كود الرف بالشكل ده: B-03-2 (ممر - رف - دور)";
  if (!d.unit.trim()) e.unit = "اختار الوحدة";
  if (!Number.isFinite(d.cost) || d.cost <= 0) e.cost = "سعر الشراء لازم يكون أكبر من صفر";
  if (!Number.isFinite(d.price) || d.price <= 0) e.price = "سعر البيع لازم يكون أكبر من صفر";
  else if (Number.isFinite(d.cost) && d.price < d.cost) e.price = "سعر البيع أقل من سعر الشراء";
  if (!Number.isInteger(d.reorderAt) || d.reorderAt < 0) e.reorderAt = "حد الطلب رقم صحيح من 0 أو أكتر";
  if (d.stock !== undefined && (!Number.isInteger(d.stock) || d.stock < 0)) e.stock = "الرصيد الافتتاحي رقم صحيح من 0 أو أكتر";
  if (!d.supplier.trim()) e.supplier = "اكتب اسم المورد";
  return e;
}

/** Last movements of one product, newest first, the way the bin card is read. */
export function binCard(movements: readonly Movement[], productId: string, limit = 12): Movement[] {
  return movements
    .filter((m) => m.productId === productId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
