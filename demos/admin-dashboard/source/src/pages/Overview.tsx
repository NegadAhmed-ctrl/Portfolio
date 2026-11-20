import { Link } from "react-router-dom";
import { CATEGORIES } from "../data/seed";
import { ago, count, money, today } from "../domain/format";
import { change, computeOverview } from "../domain/kpis";
import { can } from "../domain/permissions";
import type { Movement, Product, User } from "../domain/types";
import { useApp, useLoad, useRole } from "../state/app";
import { errorText } from "../state/errors";
import { DayBars } from "../ui/Bars";
import { Button, Notice, SkeletonRows } from "../ui/kit";
import { MovementTag, qtyText } from "./Inventory";

const CAT_TONES = ["#1D2B3A", "#3C4C5D", "#6B7886", "#98A3AC", "#C2C9CE", "#DFE3DE"];

export function Overview() {
  const role = useRole();
  const { session } = useApp();
  const money_ = can(role, "reports.money");
  const { data, error, loading, reload } = useLoad(async (api) => {
    const [products, movements, users] = await Promise.all([api.allProducts(), api.movements({ sinceDays: 15 }), can(role, "users.view") ? api.users() : Promise.resolve<User[]>([])]);
    return { products, movements, users };
  }, [role]);

  const now = new Date();
  const first = session!.user.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[13px] text-ink-3">{today(now)}</p>
        <h1 className="font-display text-[30px] leading-tight md:text-[34px]">{greeting(now)} يا {first}</h1>
      </header>

      {error ? (
        <Notice tone="error" title="مش قادرين نجيب أرقام المخزن" body={errorText(error)} action={<Button onClick={reload} icon="rewind">حاول تاني</Button>} />
      ) : !data ? (
        <SkeletonRows rows={7} />
      ) : (
        <Board products={data.products} movements={data.movements} users={data.users} showMoney={money_} now={now} refreshing={loading} />
      )}
    </div>
  );
}

function Board({ products, movements, users, showMoney, now, refreshing }: { products: Product[]; movements: Movement[]; users: User[]; showMoney: boolean; now: Date; refreshing: boolean }) {
  const o = computeOverview(products, movements, now);
  const delta = change(o.issuedThisWeek, o.issuedPrevWeek);
  const todayMoves = movements.filter((m) => now.getTime() - new Date(m.at).getTime() < 86_400_000 && m.kind !== "adjust").length;
  const byId = new Map(products.map((p) => [p.id, p]));
  const name = (id: string) => users.find((u) => u.id === id)?.name.split(" ")[0];
  const needOrder = [...o.out, ...o.low];

  return (
    <div className={`space-y-10 transition-opacity ${refreshing ? "opacity-70" : ""}`}>
      {/* ledger strip: one big figure, the rest quiet */}
      <section className="grid grid-cols-2 gap-x-4 gap-y-6 border-y border-ink py-5 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-x-0 md:divide-x md:divide-x-reverse md:divide-ink-line">
        <div className="col-span-2 md:col-span-1 md:pe-6">
          <p className="text-[13px] text-ink-2">{showMoney ? "قيمة البضاعة على الرفوف (بسعر الشراء)" : "أصناف على الرفوف"}</p>
          <p className="font-display text-[40px] leading-none num md:text-[46px]">{showMoney ? money(o.stockValue) : count(o.skuCount)}</p>
          {showMoney && <p className="mt-2 text-[13px] text-ink-3 num">بسعر البيع {money(o.retailValue)}</p>}
        </div>
        <Figure wide label={showMoney ? "اتباع الأسبوع ده" : "حركات آخر ٢٤ ساعة"} value={showMoney ? money(o.issuedThisWeek) : count(todayMoves)}>
          {showMoney && delta !== null && (
            <span className={delta >= 0 ? "text-moss" : "text-rust"}>
              {delta >= 0 ? "أعلى" : "أقل"} {count(Math.abs(delta))}٪ من الأسبوع اللي فات
            </span>
          )}
        </Figure>
        <Figure label="لازم تتطلب" value={qtyText(o.low.length)} mark="tape">
          وصلت لحد الطلب أو أقل
        </Figure>
        <Figure label="خلصت من المخزن" value={qtyText(o.out.length)} mark="rust">
          {o.out.length ? "مفيش ولا قطعة على الرف" : "كل الأصناف موجودة"}
        </Figure>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-1 font-display text-[20px]">{showMoney ? "قيمة الصرف كل يوم" : "القطع اللي اتصرفت كل يوم"}</h2>
          <p className="mb-5 text-[13px] text-ink-3">آخر ١٤ يوم. عدّي على أي يوم تشوف رقمه.</p>
          <DayBars days={o.days} mode={showMoney ? "value" : "qty"} />
        </div>

        <div>
          <h2 className="mb-1 font-display text-[20px]">قايمة الطلب</h2>
          <p className="mb-4 text-[13px] text-ink-3">الأصناف اللي خلصت أو قربت، الأقل الأول.</p>
          {needOrder.length === 0 ? (
            <Notice title="مفيش حاجة محتاجة تتطلب" body="كل الأصناف فوق حد الطلب." />
          ) : (
            <ul className="relative border border-ink-line bg-paper-card">
              <span className="tape-stripe absolute inset-y-0 right-0 w-1.5" aria-hidden="true" />
              {needOrder.slice(0, 7).map((p) => (
                <li key={p.id} className="ledger-row flex items-center gap-3 py-2.5 pe-3 ps-5">
                  <span className="shelf">{p.sku}</span>
                  <Link to={`/inventory?open=${p.id}`} className="min-w-0 flex-1 truncate text-[14px] hover:underline">
                    {p.name}
                  </Link>
                  <span className={`shrink-0 text-[13px] num ${p.stock === 0 ? "font-semibold text-rust" : "text-ink-2"}`}>
                    {p.stock === 0 ? "خلص" : `باقي ${count(p.stock)} / ${count(p.reorderAt)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {needOrder.length > 7 && (
            <Link to="/inventory?state=low" className="mt-2 inline-block text-[13px] underline underline-offset-4">
              كل الأصناف تحت الحد ({count(needOrder.length)})
            </Link>
          )}
        </div>
      </section>

      {showMoney && (
        <section>
          <h2 className="mb-3 font-display text-[20px]">فلوسك متشالة في إيه</h2>
          <div className="flex h-9 w-full overflow-hidden rounded-tag border border-ink">
            {o.byCategory.map((c, i) => (
              <span key={c.category} title={CATEGORIES.find((x) => x.id === c.category)?.name} style={{ width: `${(c.value / o.stockValue) * 100}%`, background: CAT_TONES[i] }} />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13.5px] sm:grid-cols-3">
            {o.byCategory.map((c, i) => (
              <li key={c.category} className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-[2px] border border-ink/30" style={{ background: CAT_TONES[i] }} />
                <span className="text-ink-2">{CATEGORIES.find((x) => x.id === c.category)?.name}</span>
                <span className="ms-auto num">{count(Math.round((c.value / o.stockValue) * 100))}٪</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[20px]">آخر الحركات</h2>
          <Link to="/inventory" className="text-[13px] underline underline-offset-4">
            كل الأصناف
          </Link>
        </div>
        <ol className="border-t border-ink">
          {movements.slice(0, 8).map((m) => {
            const p = byId.get(m.productId);
            return (
              <li key={m.id} className="ledger-row grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 py-2.5 md:grid-cols-[110px_auto_1fr_auto_auto]">
                <span className="hidden text-[12.5px] text-ink-3 md:block">{ago(m.at, now)}</span>
                <MovementTag kind={m.kind} qty={m.qty} />
                <span className="min-w-0 truncate text-[14px]">{p?.name ?? "صنف اتمسح"}</span>
                <span className="hidden text-[12.5px] text-ink-3 md:block">{m.ref}</span>
                <span className="text-[12.5px] text-ink-3">{name(m.byUserId) ?? ""}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Figure({ label, value, mark, children, wide }: { label: string; value: string; mark?: "tape" | "rust"; children?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`md:px-6 ${wide ? "col-span-2 md:col-span-1" : ""}`}>
      <p className="flex items-center gap-2 text-[13px] text-ink-2">
        {mark && <span className={`h-2.5 w-2.5 rounded-[2px] ${mark === "tape" ? "bg-tape ring-1 ring-ink/60" : "bg-rust"}`} />}
        {label}
      </p>
      <p className="font-display text-[28px] leading-tight num">{value}</p>
      {children && <p className="mt-1 text-[12.5px] text-ink-3">{children}</p>}
    </div>
  );
}

function greeting(d: Date) {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", hour: "numeric", hourCycle: "h23" }).format(d));
  return h < 12 ? "صباح الخير" : "مساء الخير";
}
