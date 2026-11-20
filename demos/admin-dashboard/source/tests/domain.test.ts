import { describe, expect, it } from "vitest";
import { DomainError, applyMovement, binCard, queryInventory, stockState, validateDraft } from "../src/domain/inventory";
import { can } from "../src/domain/permissions";
import { normalizeArabic, parseQty, toLatinDigits } from "../src/domain/text";
import { change, computeOverview } from "../src/domain/kpis";
import { buildSeed } from "../src/data/seed";
import type { Product } from "../src/domain/types";

const NOW = new Date("2026-11-20T14:00:00+02:00");
const { products, movements } = buildSeed(NOW);

const p = (over: Partial<Product>): Product => ({
  id: "x", sku: "A-01-1", name: "صنف", category: "mixers", unit: "قطعة", cost: 10, price: 15, stock: 10, reorderAt: 3, supplier: "مورد", updatedAt: NOW.toISOString(), ...over,
});

describe("text helpers", () => {
  it("normalizes Arabic spelling variants and digits", () => {
    expect(normalizeArabic("إفرنجيّ")).toBe(normalizeArabic("افرنجي"));
    expect(normalizeArabic("مراية")).toBe(normalizeArabic("مرايه"));
    expect(toLatinDigits("٢٥ مم")).toBe("25 مم");
  });
  it("parses whole quantities typed in any digits", () => {
    expect(parseQty(" ١٢ ")).toBe(12);
    expect(parseQty("12.0")).toBe(12);
    expect(parseQty("1.5")).toBeNaN();
    expect(parseQty("-3")).toBeNaN();
    expect(parseQty("")).toBeNaN();
  });
});

describe("stock state", () => {
  it("out at zero, low at or below the re-order point", () => {
    expect(stockState({ stock: 0, reorderAt: 3 })).toBe("out");
    expect(stockState({ stock: 3, reorderAt: 3 })).toBe("low");
    expect(stockState({ stock: 4, reorderAt: 3 })).toBe("ok");
  });
});

describe("queryInventory", () => {
  it("searches name, shelf code and supplier with every word", () => {
    const r = queryInventory(products, { search: "خلاط كروم" });
    expect(r.items.map((x) => x.sku)).toEqual(["A-01-1"]);
    expect(queryInventory(products, { search: "b-01" }).total).toBe(2);
    expect(queryInventory(products, { search: "سيراميكا" }).total).toBe(3);
    expect(queryInventory(products, { search: "PPR ٢٥" }).total).toBeGreaterThanOrEqual(3);
  });
  it("filters by category and stock state together", () => {
    const r = queryInventory(products, { category: "sanitary", state: "out", pageSize: 50 });
    expect(r.items.every((x) => x.category === "sanitary" && x.stock === 0)).toBe(true);
    expect(r.total).toBe(1);
  });
  it("sorts both ways with a stable tie-break", () => {
    const asc = queryInventory(products, { sort: "price", dir: "asc", pageSize: 100 }).items.map((x) => x.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = queryInventory(products, { sort: "value", dir: "desc", pageSize: 100 }).items;
    expect(desc[0].stock * desc[0].cost).toBeGreaterThanOrEqual(desc[1].stock * desc[1].cost);
  });
  it("paginates and clamps the page number", () => {
    const r = queryInventory(products, { pageSize: 8, page: 99 });
    expect(r.pageCount).toBe(Math.ceil(products.length / 8));
    expect(r.page).toBe(r.pageCount);
    expect(r.items.length).toBe(products.length - (r.pageCount - 1) * 8);
    expect(queryInventory(products, { search: "مفيش حاجة كده" })).toMatchObject({ total: 0, page: 1, pageCount: 1, items: [] });
  });
});

describe("applyMovement", () => {
  it("receives, issues and counts", () => {
    expect(applyMovement(5, "in", 3)).toBe(8);
    expect(applyMovement(5, "out", 5)).toBe(0);
    expect(applyMovement(5, "adjust", 2)).toBe(2);
  });
  it("refuses issuing more than the shelf has", () => {
    expect(() => applyMovement(2, "out", 3)).toThrowError(/الموجود على الرف ٢|الموجود على الرف 2/);
    try {
      applyMovement(2, "out", 3);
    } catch (e) {
      expect((e as DomainError).code).toBe("insufficient_stock");
    }
  });
  it("refuses zero, negative and fractional quantities", () => {
    expect(() => applyMovement(5, "in", 0)).toThrow(DomainError);
    expect(() => applyMovement(5, "out", -1)).toThrow(DomainError);
    expect(() => applyMovement(5, "in", 1.5)).toThrow(DomainError);
    expect(() => applyMovement(5, "adjust", -1)).toThrow(DomainError);
  });
});

describe("validateDraft", () => {
  const ok = { sku: "B-03-2", name: "ماسورة", category: "pipes" as const, unit: "ماسورة", cost: 100, price: 130, reorderAt: 5, supplier: "النيل" };
  it("accepts a correct item", () => expect(validateDraft(ok)).toEqual({}));
  it("explains each wrong field", () => {
    const e = validateDraft({ ...ok, sku: "B3", name: "ما", price: 90, reorderAt: -1, supplier: " " });
    expect(Object.keys(e).sort()).toEqual(["name", "price", "reorderAt", "sku", "supplier"]);
    expect(e.price).toContain("أقل من سعر الشراء");
  });
});

describe("permissions", () => {
  it("staff can view and move stock, nothing else", () => {
    expect(can("staff", "inventory.move")).toBe(true);
    expect(can("staff", "inventory.edit")).toBe(false);
    expect(can("staff", "users.view")).toBe(false);
    expect(can("staff", "reports.money")).toBe(false);
    expect(can("admin", "users.manage")).toBe(true);
    expect(can(null, "inventory.view")).toBe(false);
  });
});

describe("seed + overview", () => {
  it("keeps every bin card consistent: balances add up to the current stock", () => {
    for (const prod of products) {
      const card = movements.filter((m) => m.productId === prod.id).sort((a, b) => a.at.localeCompare(b.at));
      let s = 0;
      for (const m of card) {
        s = m.kind === "in" ? s + m.qty : m.kind === "out" ? s - m.qty : m.qty;
        expect(m.balance).toBe(s);
        expect(s).toBeGreaterThanOrEqual(0);
      }
      expect(s).toBe(prod.stock);
      expect(card.every((m) => new Date(m.at) <= NOW)).toBe(true);
    }
  });
  it("has items to re-order and out of stock", () => {
    const o = computeOverview(products, movements, NOW);
    expect(o.low.length).toBeGreaterThanOrEqual(4);
    expect(o.out.map((x) => x.sku).sort()).toEqual(["E-01-2", "F-02-1"]);
    expect(o.days).toHaveLength(14);
    expect(o.days.at(-1)!.day).toBe("2026-11-20");
    expect(o.issuedThisWeek).toBeGreaterThan(0);
    expect(o.stockValue).toBe(products.reduce((s, x) => s + x.stock * x.cost, 0));
    expect(o.byCategory.reduce((s, c) => s + c.value, 0)).toBe(o.stockValue);
  });
  it("ignores movements of deleted products and buckets by Cairo day", () => {
    const o = computeOverview([p({ id: "a", price: 10 })], [
      { id: "1", productId: "a", kind: "out", qty: 2, balance: 8, ref: "x", byUserId: "u", at: "2026-11-19T22:30:00Z" }, // 00:30 on the 20th in Cairo
      { id: "2", productId: "gone", kind: "out", qty: 9, balance: 0, ref: "x", byUserId: "u", at: "2026-11-20T09:00:00Z" },
    ], NOW);
    expect(o.days.at(-1)).toMatchObject({ day: "2026-11-20", outQty: 2, outValue: 20 });
    expect(o.issuedThisWeek).toBe(20);
  });
  it("change() returns null without a baseline", () => {
    expect(change(120, 100)).toBe(20);
    expect(change(5, 0)).toBeNull();
  });
  it("bin card is newest first and limited", () => {
    const id = products[0].id;
    const card = binCard(movements, id, 5);
    expect(card.length).toBeLessThanOrEqual(5);
    expect(card[0].at >= card[card.length - 1].at).toBe(true);
  });
});
