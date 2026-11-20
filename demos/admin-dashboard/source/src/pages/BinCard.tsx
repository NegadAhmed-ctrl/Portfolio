import { useEffect, useState, type FormEvent } from "react";
import { CATEGORIES } from "../data/seed";
import { count, money, when } from "../domain/format";
import { stockState } from "../domain/inventory";
import { can } from "../domain/permissions";
import { parseQty } from "../domain/text";
import type { MovementKind, Product } from "../domain/types";
import { useApp, useLoad, useRole } from "../state/app";
import { errorText } from "../state/errors";
import { Icon } from "../ui/Icon";
import { Button, Field, Notice, Segmented, Sheet, SkeletonRows } from "../ui/kit";
import { useToast } from "../ui/Toast";
import { MovementTag, StateLabel, qtyText } from "./Inventory";

/**
 * "كارت الصنف": the paper bin card every storekeeper knows, as a side sheet.
 * Top: what the item is and how much is on the shelf. Middle: receive / issue.
 * Bottom: the ledger, newest first, with the running balance.
 */
export function BinCard({ productId, onClose, onEdit }: { productId: string | null; onClose(): void; onEdit(p: Product): void }) {
  return (
    <Sheet open={!!productId} onClose={onClose} labelledBy="bin-title" wide>
      {productId && <Card id={productId} onClose={onClose} onEdit={onEdit} />}
    </Sheet>
  );
}

function Card({ id, onClose, onEdit }: { id: string; onClose(): void; onEdit(p: Product): void }) {
  const role = useRole();
  const { api, changed } = useApp();
  const toast = useToast();
  const { data, error, reload } = useLoad(async (a) => {
    const [product, moves] = await Promise.all([a.getProduct(id), a.movements({ productId: id, limit: 12 })]);
    return { product, moves };
  }, [id]);
  const [stamp, setStamp] = useState<{ kind: MovementKind; key: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (error) return <div className="p-6"><Notice tone="error" title="مش قادرين نفتح كارت الصنف" body={errorText(error)} action={<Button onClick={reload}>حاول تاني</Button>} /></div>;
  if (!data) return <div className="p-6"><SkeletonRows rows={8} /></div>;
  const p = data.product;
  const s = stockState(p);
  const margin = Math.round(((p.price - p.cost) / p.price) * 100);

  async function remove() {
    try {
      await api.deleteProduct(p.id);
      toast(`اتمسح ${p.name}`);
      changed();
      onClose();
    } catch (e) {
      toast(errorText(e), "error");
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-line bg-paper-card/95 px-5 py-3 backdrop-blur">
        <span className="text-[13px] text-ink-2">كارت الصنف</span>
        <button onClick={onClose} className="rounded-box p-1.5 text-ink-2 hover:bg-paper-deep" aria-label="قفل">
          <Icon name="close" />
        </button>
      </div>

      <div className="relative px-5 pb-6 pt-5">
        {s !== "ok" && <div className={`absolute inset-x-0 top-0 h-1.5 ${s === "out" ? "bg-rust" : "tape-stripe"}`} aria-hidden="true" />}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="shelf text-[13px]">{p.sku}</span>
            <h2 id="bin-title" className="mt-2 font-display text-[24px] leading-snug">
              {p.name}
            </h2>
            <p className="text-[13px] text-ink-3">
              {CATEGORIES.find((c) => c.id === p.category)?.name}، المورد: {p.supplier}
            </p>
          </div>
          <div className="relative shrink-0 text-end">

            <p className={`font-display text-[44px] leading-none num ${s === "out" ? "text-rust" : ""}`}>{qtyText(p.stock)}</p>
            <p className="text-[12.5px] text-ink-3">{p.unit} على الرف</p>
            <div className="mt-1"><StateLabel s={s} /></div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 border-y border-ink-line py-3 text-[13px]">
          <div>
            <dt className="text-ink-3">حد الطلب</dt>
            <dd className="font-semibold num">{count(p.reorderAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">سعر البيع</dt>
            <dd className="font-semibold num">{money(p.price)}</dd>
          </div>
          {can(role, "reports.money") ? (
            <div>
              <dt className="text-ink-3">الشراء / المكسب</dt>
              <dd className="font-semibold num">
                {money(p.cost)} <span className="font-normal text-moss">({count(margin)}٪)</span>
              </dd>
            </div>
          ) : (
            <div>
              <dt className="text-ink-3">الوحدة</dt>
              <dd className="font-semibold">{p.unit}</dd>
            </div>
          )}
        </dl>

        {can(role, "inventory.move") && (
          <MoveForm
            product={p}
            stamp={stamp && <Stamp key={stamp.key} kind={stamp.kind} />}
            onDone={(kind) => {
              setStamp({ kind, key: Date.now() });
              changed();
            }}
          />
        )}

        <h3 className="mb-2 mt-7 font-display text-[17px]">الحركات</h3>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-y border-ink text-ink-2">
              <th className="py-1.5 text-start font-medium">التاريخ</th>
              <th className="py-1.5 text-start font-medium">الحركة</th>
              <th className="py-1.5 text-start font-medium">المستند</th>
              <th className="py-1.5 text-end font-medium">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {data.moves.map((m) => (
              <tr key={m.id} className="ledger-row">
                <td className="py-2 text-ink-3 num">{when(m.at)}</td>
                <td className="py-2"><MovementTag kind={m.kind} qty={m.qty} /></td>
                <td className="max-w-[150px] truncate py-2 text-ink-2">{m.ref}</td>
                <td className="py-2 text-end font-semibold num">{count(m.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(can(role, "inventory.edit") || can(role, "inventory.delete")) && (
          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-ink-line pt-4">
            {can(role, "inventory.edit") && <Button icon="pen" onClick={() => onEdit(p)}>تعديل بيانات الصنف</Button>}
            {can(role, "inventory.delete") &&
              (confirmDelete ? (
                <span className="flex items-center gap-2 text-[13px]">
                  تمسح الصنف؟ الحركات القديمة هتفضل في السجل.
                  <Button tone="danger" onClick={remove}>أيوه امسح</Button>
                  <Button tone="quiet" onClick={() => setConfirmDelete(false)}>لا</Button>
                </span>
              ) : (
                <Button tone="danger" icon="bin" onClick={() => setConfirmDelete(true)}>مسح</Button>
              ))}
          </div>
        )}
      </div>
    </>
  );
}

function MoveForm({ product, onDone, stamp }: { product: Product; onDone(kind: MovementKind): void; stamp: React.ReactNode }) {
  const role = useRole();
  const { api } = useApp();
  const toast = useToast();
  const [kind, setKind] = useState<MovementKind>("out");
  const [qty, setQty] = useState("");
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<{ qty?: string; ref?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => setErr({}), [kind]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = parseQty(qty);
    const local: typeof err = {};
    if (Number.isNaN(n) || (kind !== "adjust" && n === 0)) local.qty = kind === "adjust" ? "اكتب العدد اللي لقيته على الرف" : "اكتب كمية صحيحة أكبر من صفر";
    else if (kind === "out" && n > product.stock) local.qty = `الموجود ${count(product.stock)} بس`;
    if (kind !== "adjust" && ref.trim().length < 2) local.ref = kind === "out" ? "رقم فاتورة البيع" : "رقم إذن الاستلام";
    setErr(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const { product: after } = await api.recordMovement({ productId: product.id, kind, qty: n, ref });
      toast(kind === "in" ? `اتسجل استلام ${count(n)}، الرصيد بقى ${count(after.stock)}` : kind === "out" ? `اتسجل صرف ${count(n)}، الرصيد بقى ${count(after.stock)}` : `اتسجل الجرد، الرصيد ${count(after.stock)}`);
      setQty("");
      setRef("");
      onDone(kind);
    } catch (e2) {
      setErr({ form: errorText(e2) });
    } finally {
      setBusy(false);
    }
  }

  const options = [
    { value: "out" as const, label: "صرف", icon: "arrowOut" as const },
    { value: "in" as const, label: "استلام", icon: "arrowIn" as const },
    ...(can(role, "inventory.edit") ? [{ value: "adjust" as const, label: "جرد", icon: "count" as const }] : []),
  ];

  return (
    <form onSubmit={submit} noValidate className="relative mt-6 space-y-4 rounded-box border border-ink-line bg-white p-4">
      {stamp && <span className="pointer-events-none absolute left-5 top-3 z-10">{stamp}</span>}
      <Segmented<MovementKind> label="نوع الحركة" value={kind} onChange={setKind} options={options} />
      {err.form && <p role="alert" className="text-[13.5px] text-rust">{err.form}</p>}
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <Field id="mv-qty" label={kind === "adjust" ? "العدد على الرف" : "الكمية"} error={err.qty}>
          <input id="mv-qty" data-autofocus className="field num" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} aria-invalid={!!err.qty} aria-describedby={err.qty ? "mv-qty-err" : undefined} />
        </Field>
        <Field id="mv-ref" label={kind === "out" ? "رقم فاتورة البيع" : kind === "in" ? "رقم إذن الاستلام" : "ملاحظة (اختياري)"} error={err.ref}>
          <input id="mv-ref" className="field" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={kind === "out" ? "مثلا: فاتورة بيع 4932" : kind === "in" ? "مثلا: إذن 1101" : "جرد آخر الشهر"} aria-invalid={!!err.ref} />
        </Field>
      </div>
      <Button tone="primary" type="submit" busy={busy} className="w-full sm:w-auto">
        {kind === "out" ? "سجّل الصرف" : kind === "in" ? "سجّل الاستلام" : "سجّل الجرد"}
      </Button>
    </form>
  );
}

/** The rubber stamp a storekeeper would press on the paper card. */
function Stamp({ kind }: { kind: MovementKind }) {
  const text = kind === "in" ? "تم الاستلام" : kind === "out" ? "تم الصرف" : "تم الجرد";
  const color = kind === "in" ? "#3F6B4F" : kind === "out" ? "#1D2B3A" : "#6B7886";
  return (
    <span
      role="status"
      className="inline-block animate-stamp bg-white/60 whitespace-nowrap rounded-[4px] border-[2.5px] px-2.5 py-0.5 font-display text-[17px] opacity-90 mix-blend-multiply"
      style={{ color, borderColor: color, boxShadow: `inset 0 0 0 2px #fff, inset 0 0 0 3.5px ${color}` }}
    >
      {text}
    </span>
  );
}
