/*
 * Supabase implementation of AdminApi. Written against @supabase/supabase-js v2
 * and the schema in supabase/schema.sql, but NOT wired in the demo: it needs
 * the client's own Supabase project (URL + anon key). To switch, see README
 * "Connect a real backend". Permissions are enforced by Postgres RLS; the
 * checks here only give friendlier errors.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError, type InventoryQuery, type Page } from "../domain/inventory";
import type { Category, Movement, Product, ProductDraft, Role, User } from "../domain/types";
import type { AdminApi, MovementInput, Session } from "./api";

type ProductRow = {
  id: string; sku: string; name: string; category: Product["category"]; unit: string;
  cost: number; price: number; stock: number; reorder_at: number; supplier: string; updated_at: string;
};

const toProduct = (r: ProductRow): Product => ({
  id: r.id, sku: r.sku, name: r.name, category: r.category, unit: r.unit, cost: r.cost, price: r.price,
  stock: r.stock, reorderAt: r.reorder_at, supplier: r.supplier, updatedAt: r.updated_at,
});

const toRow = (d: Partial<ProductDraft>) => ({
  ...(d.sku !== undefined && { sku: d.sku.trim().toUpperCase() }),
  ...(d.name !== undefined && { name: d.name.trim() }),
  ...(d.category !== undefined && { category: d.category }),
  ...(d.unit !== undefined && { unit: d.unit }),
  ...(d.cost !== undefined && { cost: d.cost }),
  ...(d.price !== undefined && { price: d.price }),
  ...(d.reorderAt !== undefined && { reorder_at: d.reorderAt }),
  ...(d.supplier !== undefined && { supplier: d.supplier.trim() }),
});

function fail(error: { code?: string; message: string } | null): never | void {
  if (!error) return;
  if (error.code === "23505") throw new DomainError("sku_taken", "الكود ده مستخدم");
  if (error.code === "42501") throw new DomainError("forbidden", "الصلاحية دي للمدير بس");
  if (error.code === "P0001") throw new DomainError("insufficient_stock", error.message);
  throw new DomainError("network", error.message);
}

export class SupabaseApi implements AdminApi {
  readonly mode = "supabase" as const;
  constructor(private readonly sb: SupabaseClient) {}

  private async profile(id: string): Promise<User> {
    const { data, error } = await this.sb.from("profiles").select("id,name,email,role,active,last_seen_at").eq("id", id).single();
    fail(error);
    return { id: data!.id, name: data!.name, email: data!.email, role: data!.role, active: data!.active, lastSeenAt: data!.last_seen_at };
  }

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new DomainError("bad_credentials", "الإيميل أو كلمة السر غلط");
    const user = await this.profile(data.user.id);
    if (!user.active) {
      await this.sb.auth.signOut();
      throw new DomainError("inactive", "الحساب ده متوقف، كلم المدير");
    }
    await this.sb.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
    return { user };
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async currentSession(): Promise<Session | null> {
    const { data } = await this.sb.auth.getSession();
    if (!data.session) return null;
    const user = await this.profile(data.session.user.id);
    return user.active ? { user } : null;
  }

  async categories(): Promise<Category[]> {
    const { data, error } = await this.sb.from("categories").select("id,name").order("sort");
    fail(error);
    return data as Category[];
  }

  async queryProducts(q: InventoryQuery): Promise<Page<Product>> {
    const pageSize = q.pageSize ?? 8;
    const page = Math.max(1, q.page ?? 1);
    // the view adds the computed stock_state + value columns
    let req = this.sb.from("products_view").select("*", { count: "exact" });
    if (q.category && q.category !== "all") req = req.eq("category", q.category);
    if (q.state && q.state !== "all") req = req.eq("stock_state", q.state);
    if (q.search?.trim()) req = req.textSearch("search", q.search.trim().split(/\s+/).join(" & "));
    const sortCol = { sku: "sku", name: "name", stock: "stock", price: "price", updatedAt: "updated_at", value: "value" }[q.sort ?? "sku"];
    req = req.order(sortCol, { ascending: (q.dir ?? "asc") === "asc" }).order("sku");
    const { data, count, error } = await req.range((page - 1) * pageSize, page * pageSize - 1);
    fail(error);
    const total = count ?? 0;
    return { items: (data as ProductRow[]).map(toProduct), total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async allProducts() {
    const { data, error } = await this.sb.from("products").select("*");
    fail(error);
    return (data as ProductRow[]).map(toProduct);
  }

  async getProduct(id: string) {
    const { data, error } = await this.sb.from("products").select("*").eq("id", id).single();
    if (!data) throw new DomainError("not_found", "الصنف ده اتمسح أو مش موجود");
    fail(error);
    return toProduct(data as ProductRow);
  }

  async createProduct(draft: ProductDraft) {
    // opening stock goes through the same RPC as every other movement
    const { data, error } = await this.sb.rpc("create_product", { p: toRow(draft), opening_stock: draft.stock ?? 0 });
    fail(error);
    return toProduct(data as ProductRow);
  }

  async updateProduct(id: string, patch: Partial<ProductDraft>) {
    const { data, error } = await this.sb.from("products").update(toRow(patch)).eq("id", id).select().single();
    fail(error);
    return toProduct(data as ProductRow);
  }

  async deleteProduct(id: string) {
    const { error } = await this.sb.from("products").delete().eq("id", id);
    fail(error);
  }

  async recordMovement(input: MovementInput) {
    // one Postgres function locks the row, checks stock and writes both tables
    const { data, error } = await this.sb.rpc("record_movement", { product_id: input.productId, kind: input.kind, qty: input.qty, ref: input.ref });
    fail(error);
    const r = data as { product: ProductRow; movement: { id: string; product_id: string; kind: Movement["kind"]; qty: number; balance: number; ref: string; by_user: string; at: string } };
    const m = r.movement;
    return { product: toProduct(r.product), movement: { id: m.id, productId: m.product_id, kind: m.kind, qty: m.qty, balance: m.balance, ref: m.ref, byUserId: m.by_user, at: m.at } };
  }

  async movements(opts: { productId?: string; limit?: number; sinceDays?: number } = {}) {
    let req = this.sb.from("movements").select("*").order("at", { ascending: false });
    if (opts.productId) req = req.eq("product_id", opts.productId);
    if (opts.sinceDays) req = req.gte("at", new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString());
    if (opts.limit) req = req.limit(opts.limit);
    const { data, error } = await req;
    fail(error);
    return (data ?? []).map((m) => ({ id: m.id, productId: m.product_id, kind: m.kind, qty: m.qty, balance: m.balance, ref: m.ref, byUserId: m.by_user, at: m.at }));
  }

  async users(): Promise<User[]> {
    const { data, error } = await this.sb.from("profiles").select("id,name,email,role,active,last_seen_at").order("name");
    fail(error);
    return (data ?? []).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, lastSeenAt: u.last_seen_at }));
  }

  async inviteUser(input: { name: string; email: string; role: Role }): Promise<User> {
    // inviting needs the service-role key, so it runs in an Edge Function, never in the browser
    const { data, error } = await this.sb.functions.invoke("invite-user", { body: input });
    if (error) throw new DomainError("network", error.message);
    return data as User;
  }

  async updateUser(id: string, patch: { role?: Role; active?: boolean }) {
    const { error } = await this.sb.from("profiles").update(patch).eq("id", id);
    fail(error);
    return this.profile(id);
  }
}
