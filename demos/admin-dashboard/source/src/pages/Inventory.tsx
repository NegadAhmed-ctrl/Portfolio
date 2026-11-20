import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CATEGORIES } from "../data/seed";
import { count, day, money } from "../domain/format";
import { stockState, type SortKey } from "../domain/inventory";
import { can } from "../domain/permissions";
import type { CategoryId, MovementKind, Product, StockState } from "../domain/types";
import { useLoad, useRole } from "../state/app";
import { errorText } from "../state/errors";
import { Icon } from "../ui/Icon";
import { Button, Notice, Segmented, SkeletonRows } from "../ui/kit";
import { BinCard } from "./BinCard";
import { ProductForm } from "./ProductForm";

const PAGE_SIZE = 8;
const catName = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.name ?? id;

export function MovementTag({ kind, qty }: { kind: MovementKind; qty: number }) {
  const label = kind === "in" ? `+${count(qty)} استلام` : kind === "out" ? `−${count(qty)} صرف` : `${qty >= 0 ? "+" : "−"}${count(Math.abs(qty))} جرد`;
  const cls = kind === "in" ? "text-moss" : kind === "out" ? "text-ink" : "text-ink-3";
  return <span className={`shrink-0 text-[13px] font-semibold num ${cls}`}>{label}</span>;
}

/** Arabic zero "٠" is a dot that disappears at large sizes, so zero is written as a word. */
export const qtyText = (n: number) => (n === 0 ? "صفر" : count(n));

export function StockMeter({ p }: { p: Product }) {
  const s = stockState(p);
  const full = Math.max(p.reorderAt * 3, 1);
  const pct = Math.min(100, (p.stock / full) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className={`w-12 text-[14px] font-semibold num ${s === "out" ? "text-rust" : ""}`}>{qtyText(p.stock)}</span>
      <span className="relative hidden h-1.5 w-20 overflow-hidden rounded-full bg-paper-deep sm:block" aria-hidden="true">
        <span className={`absolute inset-y-0 right-0 ${s === "ok" ? "bg-ink-2" : s === "low" ? "bg-tape-deep" : "bg-rust"}`} style={{ width: `${pct}%` }} />
        {/* re-order point marker */}
        <span className="absolute inset-y-0 w-px bg-ink" style={{ right: `${(p.reorderAt / full) * 100}%` }} />
      </span>
    </div>
  );
}

export function StateLabel({ s }: { s: StockState }) {
  if (s === "ok") return null;
  return s === "out" ? (
    <span className="rounded-tag bg-rust px-1.5 text-[12px] font-medium leading-5 text-white">خلص</span>
  ) : (
    <span className="rounded-tag border border-ink/70 bg-tape px-1.5 text-[12px] font-medium leading-5">اطلب</span>
  );
}

export function Inventory() {
  const role = useRole();
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const category = (params.get("cat") ?? "all") as CategoryId | "all";
  const state = (params.get("state") ?? "all") as StockState | "all";
  const sort = (params.get("sort") ?? "sku") as SortKey;
  const dir = (params.get("dir") ?? "asc") as "asc" | "desc";
  const page = Number(params.get("page") ?? 1) || 1;
  const openId = params.get("open");
  const [draftSearch, setDraftSearch] = useState(search);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const set = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v === null || v === "" || v === "all" ? next.delete(k) : next.set(k, v);
    if (resetPage && !("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  // debounce typing so the list doesn't jump on every letter
  useEffect(() => {
    const t = setTimeout(() => draftSearch !== search && set({ q: draftSearch.trim() }), 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSearch]);

  const { data, error, loading, reload } = useLoad((api) => api.queryProducts({ search, category, state, sort, dir, page, pageSize: PAGE_SIZE }), [search, category, state, sort, dir, page]);
  const showMoney = can(role, "reports.money");
  const filtered = search || category !== "all" || state !== "all";

  const sortBy = (k: SortKey) => set({ sort: k, dir: sort === k && dir === "asc" ? "desc" : "asc" });
  const header = useMemo(
    () => [
      { k: "name" as SortKey, label: "الصنف" },
      { k: "stock" as SortKey, label: "الرصيد" },
      { k: "price" as SortKey, label: "سعر البيع" },
      ...(showMoney ? [{ k: "value" as SortKey, label: "قيمته" }] : []),
      { k: "updatedAt" as SortKey, label: "آخر حركة" },
    ],
    [showMoney],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] leading-tight md:text-[34px]">الأصناف</h1>
          <p className="text-[14px] text-ink-2">{data ? `${count(data.total)} صنف${filtered ? " مطابق للبحث" : ""}` : " "}</p>
        </div>
        {can(role, "inventory.create") && (
          <Button tone="primary" icon="plus" onClick={() => setEditing("new")}>
            صنف جديد
          </Button>
        )}
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block lg:w-[320px]">
          <span className="sr-only">بحث</span>
          <Icon name="search" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" size={18} />
          <input className="field pl-3 pr-10" placeholder="اسم الصنف، كود الرف، أو المورد" value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} type="search" />
        </label>
        <select aria-label="القسم" className="field lg:w-[190px]" value={category} onChange={(e) => set({ cat: e.target.value })}>
          <option value="all">كل الأقسام</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="overflow-x-auto">
          <Segmented
            label="حالة الرصيد"
            value={state}
            onChange={(v) => set({ state: v })}
            options={[
              { value: "all", label: "الكل" },
              { value: "low", label: "تحت الحد" },
              { value: "out", label: "خلصت" },
              { value: "ok", label: "متوفر" },
            ]}
          />
        </div>
      </div>

      {error ? (
        <Notice tone="error" title="مش قادرين نجيب الأصناف" body={errorText(error)} action={<Button onClick={reload} icon="rewind">حاول تاني</Button>} />
      ) : !data ? (
        <SkeletonRows rows={PAGE_SIZE} />
      ) : data.total === 0 ? (
        filtered ? (
          <Notice
            title="مفيش صنف بالمواصفات دي"
            body="جرب كلمة أقصر، أو كود الرف زي B-01، أو شيل الفلتر."
            action={
              <Button
                onClick={() => {
                  setDraftSearch("");
                  set({ q: null, cat: null, state: null });
                }}
              >
                امسح البحث والفلاتر
              </Button>
            }
          />
        ) : (
          <Notice title="لسه مفيش أصناف" body="ابدأ بأول صنف وحط رصيده الافتتاحي." action={can(role, "inventory.create") && <Button tone="primary" icon="plus" onClick={() => setEditing("new")}>صنف جديد</Button>} />
        )
      ) : (
        <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* table on wide screens */}
          <table className="hidden w-full border-collapse text-start md:table">
            <thead>
              <tr className="border-y border-ink text-[13px] text-ink-2">
                <th className="w-[92px] py-2 text-start font-medium" aria-sort={sort === "sku" ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                  <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => sortBy("sku")}>
                    الرف
                    <span aria-hidden="true" className={`text-[10px] ${sort === "sku" ? "text-ink" : "text-transparent"}`}>{dir === "asc" ? "▲" : "▼"}</span>
                  </button>
                </th>
                {header.map((h) => (
                  <th key={h.k} className="py-2 text-start font-medium" aria-sort={sort === h.k ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                    <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => sortBy(h.k)}>
                      {h.label}
                      <span aria-hidden="true" className={`text-[10px] ${sort === h.k ? "text-ink" : "text-transparent"}`}>{dir === "asc" ? "▲" : "▼"}</span>
                    </button>
                  </th>
                ))}
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="ledger-row group cursor-pointer hover:bg-paper-card" onClick={() => set({ open: p.id }, false)}>
                  <td className="py-3">
                    <span className="shelf">{p.sku}</span>
                  </td>
                  <td className="py-3 pe-4">
                    <button className="text-start text-[14.5px] font-medium hover:underline" onClick={(e) => (e.stopPropagation(), set({ open: p.id }, false))}>
                      {p.name}
                    </button>
                    <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-3">
                      {catName(p.category)} <StateLabel s={stockState(p)} />
                    </span>
                  </td>
                  <td className="py-3">
                    <StockMeter p={p} />
                  </td>
                  <td className="py-3 text-[14px] num">{money(p.price)}</td>
                  {showMoney && <td className="py-3 text-[14px] text-ink-2 num">{money(p.stock * p.cost)}</td>}
                  <td className="py-3 text-[13px] text-ink-3">{day(p.updatedAt)}</td>
                  <td className="py-3 text-end">
                    <span className="text-[13px] text-ink-3 opacity-0 transition group-hover:opacity-100">كارت الصنف</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* list on phones */}
          <ul className="border-t border-ink md:hidden">
            {data.items.map((p) => (
              <li key={p.id} className="ledger-row">
                <button className="flex w-full items-center gap-3 py-3 text-start" onClick={() => set({ open: p.id }, false)}>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="shelf">{p.sku}</span>
                      <StateLabel s={stockState(p)} />
                    </span>
                    <span className="mt-1 block truncate text-[14.5px] font-medium">{p.name}</span>
                    <span className="text-[12.5px] text-ink-3 num">{money(p.price)} · {p.unit}</span>
                  </span>
                  <span className="text-end">
                    <span className={`block font-display text-[22px] leading-none num ${p.stock === 0 ? "text-rust" : ""}`}>{qtyText(p.stock)}</span>
                    <span className="text-[11.5px] text-ink-3">على الرف</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <Pager page={data.page} pageCount={data.pageCount} total={data.total} size={PAGE_SIZE} onPage={(n) => set({ page: String(n) }, false)} />
        </div>
      )}

      <BinCard productId={openId} onClose={() => set({ open: null }, false)} onEdit={(p) => setEditing(p)} />
      <ProductForm editing={editing} onClose={() => setEditing(null)} onSaved={(p) => set({ open: p.id }, false)} />
    </div>
  );
}

function Pager({ page, pageCount, total, size, onPage }: { page: number; pageCount: number; total: number; size: number; onPage(n: number): void }) {
  if (pageCount <= 1) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return (
    <nav aria-label="الصفحات" className="mt-4 flex items-center justify-between gap-3 text-[13.5px]">
      <span className="text-ink-3 num">
        {count(from)}–{count(to)} من {count(total)}
      </span>
      <span className="flex items-center gap-1">
        <Button tone="quiet" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="الصفحة اللي قبل">
          <Icon name="chevron" className="rotate-180" size={18} />
        </Button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined} className={`h-8 w-8 rounded-box num ${n === page ? "bg-ink text-paper-card" : "text-ink-2 hover:bg-paper-deep"}`}>
            {count(n)}
          </button>
        ))}
        <Button tone="quiet" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="الصفحة اللي بعد">
          <Icon name="chevron" size={18} />
        </Button>
      </span>
    </nav>
  );
}
