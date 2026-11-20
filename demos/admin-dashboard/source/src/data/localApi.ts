import { DomainError, applyMovement, queryInventory, validateDraft, type InventoryQuery } from "../domain/inventory";
import { can, type Action } from "../domain/permissions";
import { normalizeArabic } from "../domain/text";
import type { Movement, Product, ProductDraft, Role, User } from "../domain/types";
import type { AdminApi, MovementInput, Session } from "./api";
import { CATEGORIES, DEMO_PASSWORD, SEED_USERS, buildSeed } from "./seed";

/** Minimal storage port: window.localStorage in the browser, a Map in tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

interface DB {
  version: 1;
  products: Product[];
  movements: Movement[];
  users: (User & { password: string })[];
  sessionUserId: string | null;
}

export interface LocalApiOptions {
  store: KeyValueStore;
  now?: () => Date;
  /** Simulated network latency in ms (0 in tests). */
  latency?: number;
  /** Makes every data call fail, to show the error states in the demo (?demo-error). */
  failing?: boolean;
}

const KEY = "negadbuilds.admin-dashboard.v1";

export class LocalApi implements AdminApi {
  readonly mode = "demo" as const;
  private db: DB;
  private readonly now: () => Date;

  constructor(private readonly opts: LocalApiOptions) {
    this.now = opts.now ?? (() => new Date());
    this.db = this.load();
  }

  // ---------- plumbing ----------

  private load(): DB {
    const raw = this.opts.store.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DB;
        if (parsed.version === 1) return parsed;
      } catch {
        /* corrupted storage: start over below */
      }
    }
    return this.fresh();
  }

  private fresh(): DB {
    const { products, movements } = buildSeed(this.now());
    const db: DB = { version: 1, products, movements, users: SEED_USERS.map((u) => ({ ...u })), sessionUserId: null };
    this.opts.store.setItem(KEY, JSON.stringify(db));
    return db;
  }

  /** Demo button: put the sample data back (keeps the signed-in user). */
  reset(): void {
    const keep = this.db?.sessionUserId ?? null;
    this.db = this.fresh();
    this.db.sessionUserId = keep;
    this.save();
  }

  private save() {
    this.opts.store.setItem(KEY, JSON.stringify(this.db));
  }

  private async tick<T>(fn: () => T, { data = true } = {}): Promise<T> {
    const ms = this.opts.latency ?? 0;
    if (ms) await new Promise((r) => setTimeout(r, ms * (0.6 + Math.random() * 0.8)));
    if (data && this.opts.failing) throw new DomainError("network", "السيرفر مش بيرد");
    return fn();
  }

  private me(): User & { password: string } {
    const u = this.db.users.find((x) => x.id === this.db.sessionUserId && x.active);
    if (!u) throw new DomainError("forbidden", "سجل دخول الأول");
    return u;
  }

  private require(action: Action): User {
    const u = this.me();
    if (!can(u.role, action)) throw new DomainError("forbidden", "الصلاحية دي للمدير بس");
    return u;
  }

  private product(id: string): Product {
    const p = this.db.products.find((x) => x.id === id);
    if (!p) throw new DomainError("not_found", "الصنف ده اتمسح أو مش موجود");
    return p;
  }

  private static publicUser({ password: _pw, ...u }: User & { password: string }): User {
    return u;
  }

  // ---------- auth ----------

  signIn(email: string, password: string): Promise<Session> {
    return this.tick(() => {
      const u = this.db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
      // same message for "no such user" and "wrong password"
      if (!u || u.password !== password) throw new DomainError("bad_credentials", "الإيميل أو كلمة السر غلط");
      if (!u.active) throw new DomainError("inactive", "الحساب ده متوقف، كلم المدير");
      u.lastSeenAt = this.now().toISOString();
      this.db.sessionUserId = u.id;
      this.save();
      return { user: LocalApi.publicUser(u) };
    }, { data: false });
  }

  signOut(): Promise<void> {
    return this.tick(() => {
      this.db.sessionUserId = null;
      this.save();
    }, { data: false });
  }

  currentSession(): Promise<Session | null> {
    return this.tick(() => {
      const u = this.db.users.find((x) => x.id === this.db.sessionUserId && x.active);
      return u ? { user: LocalApi.publicUser(u) } : null;
    }, { data: false });
  }

  // ---------- inventory ----------

  categories() {
    return this.tick(() => CATEGORIES.map((c) => ({ ...c })));
  }

  queryProducts(q: InventoryQuery) {
    return this.tick(() => {
      this.require("inventory.view");
      const page = queryInventory(this.db.products, q);
      return { ...page, items: page.items.map((p) => ({ ...p })) };
    });
  }

  allProducts() {
    return this.tick(() => {
      this.require("inventory.view");
      return this.db.products.map((p) => ({ ...p }));
    });
  }

  getProduct(id: string) {
    return this.tick(() => {
      this.require("inventory.view");
      return { ...this.product(id) };
    });
  }

  createProduct(draft: ProductDraft) {
    return this.tick(() => {
      const me = this.require("inventory.create");
      this.assertValid(draft);
      const sku = draft.sku.trim().toUpperCase();
      if (this.db.products.some((p) => p.sku === sku)) throw new DomainError("sku_taken", `كود الرف ${sku} مستخدم لصنف تاني`);
      const at = this.now().toISOString();
      const p: Product = {
        id: `p-${sku.toLowerCase()}-${Date.now().toString(36)}`,
        sku,
        name: draft.name.trim(),
        category: draft.category,
        unit: draft.unit.trim(),
        cost: draft.cost,
        price: draft.price,
        stock: draft.stock ?? 0,
        reorderAt: draft.reorderAt,
        supplier: draft.supplier.trim(),
        updatedAt: at,
      };
      this.db.products.push(p);
      this.db.movements.push({ id: `m-${Date.now().toString(36)}`, productId: p.id, kind: "adjust", qty: p.stock, balance: p.stock, ref: "صنف جديد · رصيد افتتاحي", byUserId: me.id, at });
      this.save();
      return { ...p };
    });
  }

  updateProduct(id: string, patch: Partial<ProductDraft>) {
    return this.tick(() => {
      this.require("inventory.edit");
      const p = this.product(id);
      // stock never changes through "edit": only through a movement with a reference
      const { stock: _ignored, ...rest } = patch;
      const next = { ...p, ...rest, sku: (rest.sku ?? p.sku).trim().toUpperCase() };
      this.assertValid(next);
      if (this.db.products.some((x) => x.id !== id && x.sku === next.sku)) throw new DomainError("sku_taken", `كود الرف ${next.sku} مستخدم لصنف تاني`);
      Object.assign(p, next, { name: next.name.trim(), supplier: next.supplier.trim(), updatedAt: this.now().toISOString() });
      this.save();
      return { ...p };
    });
  }

  deleteProduct(id: string) {
    return this.tick(() => {
      this.require("inventory.delete");
      this.product(id);
      this.db.products = this.db.products.filter((p) => p.id !== id);
      this.save();
    });
  }

  recordMovement(input: MovementInput) {
    return this.tick(() => {
      const me = this.require("inventory.move");
      const p = this.product(input.productId);
      const ref = input.ref.trim();
      if (input.kind !== "adjust" && ref.length < 2) throw new DomainError("ref_required", "اكتب رقم الفاتورة أو إذن الاستلام");
      const before = p.stock;
      const after = applyMovement(before, input.kind, input.qty);
      const at = this.now().toISOString();
      const movement: Movement = {
        id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        productId: p.id,
        kind: input.kind,
        qty: input.kind === "adjust" ? after - before : input.qty,
        balance: after,
        ref: ref || "جرد",
        byUserId: me.id,
        at,
      };
      p.stock = after;
      p.updatedAt = at;
      this.db.movements.push(movement);
      this.save();
      return { product: { ...p }, movement };
    });
  }

  movements(opts: { productId?: string; limit?: number; sinceDays?: number } = {}) {
    return this.tick(() => {
      this.require("inventory.view");
      const since = opts.sinceDays ? this.now().getTime() - opts.sinceDays * 86_400_000 : -Infinity;
      return this.db.movements
        .filter((m) => (!opts.productId || m.productId === opts.productId) && new Date(m.at).getTime() >= since)
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, opts.limit ?? Infinity);
    });
  }

  // ---------- users ----------

  users() {
    return this.tick(() => {
      this.require("users.view");
      return this.db.users.map(LocalApi.publicUser);
    });
  }

  inviteUser(input: { name: string; email: string; role: Role }) {
    return this.tick(() => {
      this.require("users.manage");
      const email = input.email.trim().toLowerCase();
      if (input.name.trim().length < 3) throw new DomainError("qty_invalid", "اكتب الاسم بالكامل");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new DomainError("qty_invalid", "الإيميل مش مكتوب صح");
      if (this.db.users.some((u) => u.email === email)) throw new DomainError("email_taken", "الإيميل ده عنده حساب بالفعل");
      const u = { id: `u-${Date.now().toString(36)}`, name: input.name.trim(), email, role: input.role, active: true, lastSeenAt: null, password: DEMO_PASSWORD };
      this.db.users.push(u);
      this.save();
      return LocalApi.publicUser(u);
    });
  }

  updateUser(id: string, patch: { role?: Role; active?: boolean }) {
    return this.tick(() => {
      const me = this.require("users.manage");
      const u = this.db.users.find((x) => x.id === id);
      if (!u) throw new DomainError("not_found", "المستخدم مش موجود");
      const next = { ...u, ...patch };
      const adminsLeft = this.db.users.filter((x) => x.id !== id && x.active && x.role === "admin").length + (next.active && next.role === "admin" ? 1 : 0);
      if (adminsLeft === 0) throw new DomainError("last_admin", "لازم يفضل مدير واحد على الأقل شغال");
      if (id === me.id && patch.active === false) throw new DomainError("last_admin", "مينفعش توقف حسابك وانت داخل بيه");
      Object.assign(u, patch);
      this.save();
      return LocalApi.publicUser(u);
    });
  }

  private assertValid(d: ProductDraft) {
    const errors = validateDraft(d);
    const first = Object.values(errors)[0];
    if (first) throw new DomainError("qty_invalid", first);
  }
}

/** Used by the user search box: name or email, Arabic-insensitive. */
export function matchUser(u: User, q: string): boolean {
  const n = normalizeArabic(q);
  return !n || normalizeArabic(`${u.name} ${u.email}`).includes(n);
}
