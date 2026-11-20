import { beforeEach, describe, expect, it } from "vitest";
import { LocalApi, memoryStore } from "../src/data/localApi";
import { DEMO_PASSWORD } from "../src/data/seed";
import { DomainError } from "../src/domain/inventory";

const NOW = new Date("2026-11-20T14:00:00+02:00");
let api: LocalApi;
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (e) {
    return (e as DomainError).code;
  }
};

beforeEach(() => {
  api = new LocalApi({ store: memoryStore(), now: () => NOW });
});

describe("auth", () => {
  it("same error for unknown email and wrong password; blocks inactive accounts", async () => {
    expect(await code(api.signIn("nobody@x.com", DEMO_PASSWORD))).toBe("bad_credentials");
    expect(await code(api.signIn("hesham@elsayed.demo", "wrong"))).toBe("bad_credentials");
    expect(await code(api.signIn("ramadan@elsayed.demo", DEMO_PASSWORD))).toBe("inactive");
  });
  it("keeps the session in storage across instances", async () => {
    const store = memoryStore();
    const a = new LocalApi({ store, now: () => NOW });
    await a.signIn("  KARIM@elsayed.demo ", DEMO_PASSWORD);
    const b = new LocalApi({ store, now: () => NOW });
    expect((await b.currentSession())?.user.role).toBe("staff");
    await b.signOut();
    expect(await new LocalApi({ store, now: () => NOW }).currentSession()).toBeNull();
  });
  it("needs a session for data", async () => {
    expect(await code(api.allProducts())).toBe("forbidden");
  });
});

describe("staff (أمين مخزن)", () => {
  beforeEach(() => api.signIn("karim@elsayed.demo", DEMO_PASSWORD));
  it("can issue stock with a reference, and the bin card records it", async () => {
    const [first] = (await api.queryProducts({ search: "A-02-2" })).items;
    const { product, movement } = await api.recordMovement({ productId: first.id, kind: "out", qty: 2, ref: "فاتورة بيع 4999" });
    expect(product.stock).toBe(first.stock - 2);
    expect(movement).toMatchObject({ kind: "out", qty: 2, balance: first.stock - 2, byUserId: "u-karim" });
    expect((await api.movements({ productId: first.id, limit: 1 }))[0].id).toBe(movement.id);
  });
  it("cannot issue without a reference or beyond stock", async () => {
    const [first] = (await api.queryProducts({ search: "A-02-2" })).items;
    expect(await code(api.recordMovement({ productId: first.id, kind: "out", qty: 1, ref: " " }))).toBe("ref_required");
    expect(await code(api.recordMovement({ productId: first.id, kind: "out", qty: first.stock + 1, ref: "ف 1" }))).toBe("insufficient_stock");
  });
  it("cannot edit prices, delete items or see users", async () => {
    const [first] = (await api.queryProducts({})).items;
    expect(await code(api.updateProduct(first.id, { price: 1 }))).toBe("forbidden");
    expect(await code(api.deleteProduct(first.id))).toBe("forbidden");
    expect(await code(api.users())).toBe("forbidden");
  });
});

describe("admin (مدير)", () => {
  beforeEach(() => api.signIn("hesham@elsayed.demo", DEMO_PASSWORD));
  const draft = { sku: "f-03-1", name: "منشار حديد", category: "tools" as const, unit: "قطعة", cost: 120, price: 160, reorderAt: 2, supplier: "المتحدة للخامات", stock: 6 };

  it("creates, edits and deletes an item; SKU stays unique", async () => {
    const created = await api.createProduct(draft);
    expect(created).toMatchObject({ sku: "F-03-1", stock: 6 });
    expect(await code(api.createProduct(draft))).toBe("sku_taken");
    const edited = await api.updateProduct(created.id, { price: 175, stock: 999 });
    expect(edited.price).toBe(175);
    expect(edited.stock).toBe(6); // stock only changes through movements
    expect(await code(api.updateProduct(created.id, { price: 50 }))).toBe("qty_invalid"); // below cost
    await api.deleteProduct(created.id);
    expect(await code(api.getProduct(created.id))).toBe("not_found");
  });
  it("stock count (adjust) stores the signed difference", async () => {
    const [first] = (await api.queryProducts({ search: "C-01-1" })).items;
    const { movement } = await api.recordMovement({ productId: first.id, kind: "adjust", qty: first.stock - 3, ref: "" });
    expect(movement).toMatchObject({ qty: -3, balance: first.stock - 3, ref: "جرد" });
  });
  it("invites users and never leaves the shop without an active admin", async () => {
    const u = await api.inviteUser({ name: "نورهان خالد", email: "Nourhan@elsayed.demo", role: "staff" });
    expect(u.email).toBe("nourhan@elsayed.demo");
    expect(await code(api.inviteUser({ name: "تاني", email: "nourhan@elsayed.demo", role: "staff" }))).toBe("email_taken");
    expect(await code(api.updateUser("u-hesham", { role: "staff" }))).toBe("last_admin");
    expect(await code(api.updateUser("u-hesham", { active: false }))).toBe("last_admin");
    await api.updateUser(u.id, { role: "admin" });
    expect((await api.users()).filter((x) => x.role === "admin")).toHaveLength(2);
  });
  it("reset() restores the sample data but keeps the session", async () => {
    const created = await api.createProduct(draft);
    api.reset();
    expect(await code(api.getProduct(created.id))).toBe("not_found");
    expect((await api.currentSession())?.user.id).toBe("u-hesham");
  });
  it("failing mode rejects data calls with a network error", async () => {
    const store = memoryStore();
    const ok = new LocalApi({ store, now: () => NOW });
    await ok.signIn("hesham@elsayed.demo", DEMO_PASSWORD);
    const broken = new LocalApi({ store, now: () => NOW, failing: true });
    expect(await code(broken.allProducts())).toBe("network");
    expect((await broken.currentSession())?.user.id).toBe("u-hesham");
  });
});
