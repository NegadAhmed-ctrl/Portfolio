import { useEffect, useState, type FormEvent } from "react";
import { CATEGORIES } from "../data/seed";
import { validateDraft, type DraftErrors } from "../domain/inventory";
import { parseQty, toLatinDigits } from "../domain/text";
import type { CategoryId, Product, ProductDraft } from "../domain/types";
import { useApp } from "../state/app";
import { errorText } from "../state/errors";
import { Icon } from "../ui/Icon";
import { Button, Field, Sheet } from "../ui/kit";
import { useToast } from "../ui/Toast";

const UNITS = ["قطعة", "طقم", "ماسورة", "بكرة", "أنبوبة", "كرتونة", "متر"];

type Form = { sku: string; name: string; category: CategoryId; unit: string; cost: string; price: string; reorderAt: string; supplier: string; stock: string };

const empty: Form = { sku: "", name: "", category: "mixers", unit: "قطعة", cost: "", price: "", reorderAt: "", supplier: "", stock: "0" };
const money = (s: string) => {
  const t = toLatinDigits(s).replace(/[,\s]/g, "");
  return t === "" ? NaN : Number(t);
};

export function ProductForm({ editing, onClose, onSaved }: { editing: Product | "new" | null; onClose(): void; onSaved(p: Product): void }) {
  const { api, changed } = useApp();
  const toast = useToast();
  const isNew = editing === "new";
  const [f, setF] = useState<Form>(empty);
  const [errors, setErrors] = useState<DraftErrors & { form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setErrors({});
    setTried(false);
    if (editing && editing !== "new")
      setF({ sku: editing.sku, name: editing.name, category: editing.category, unit: editing.unit, cost: String(editing.cost), price: String(editing.price), reorderAt: String(editing.reorderAt), supplier: editing.supplier, stock: String(editing.stock) });
    else setF(empty);
  }, [editing]);

  const draft = (): ProductDraft => ({
    sku: f.sku.trim().toUpperCase(),
    name: f.name,
    category: f.category,
    unit: f.unit,
    cost: money(f.cost),
    price: money(f.price),
    reorderAt: parseQty(f.reorderAt),
    supplier: f.supplier,
    ...(isNew && { stock: parseQty(f.stock) }),
  });

  // after the first save attempt, errors update while typing
  useEffect(() => {
    if (tried) setErrors(validateDraft(draft()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, tried]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    const d = draft();
    const v = validateDraft(d);
    setErrors(v);
    if (Object.keys(v).length) {
      document.getElementById(`pf-${Object.keys(v)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const saved = isNew ? await api.createProduct(d) : await api.updateProduct((editing as Product).id, d);
      toast(isNew ? `اتضاف ${saved.name}` : "اتحفظت التعديلات");
      changed();
      onClose();
      onSaved(saved);
    } catch (err) {
      setErrors({ form: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  const bind = (k: keyof Form) => ({
    id: `pf-${k}`,
    value: f[k],
    onChange: (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })),
    "aria-invalid": !!errors[k as keyof DraftErrors],
    "aria-describedby": errors[k as keyof DraftErrors] ? `pf-${k}-err` : undefined,
    className: "field",
  });

  return (
    <Sheet open={editing !== null} onClose={onClose} labelledBy="pf-title">
      <form onSubmit={submit} noValidate className="flex min-h-full flex-col">
        <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
          <h2 id="pf-title" className="font-display text-[20px]">{isNew ? "صنف جديد" : "تعديل الصنف"}</h2>
          <button type="button" onClick={onClose} className="rounded-box p-1.5 text-ink-2 hover:bg-paper-deep" aria-label="قفل">
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 space-y-4 px-5 py-5">
          {errors.form && <p role="alert" className="border-s-4 border-rust bg-rust-soft/60 px-3 py-2 text-[14px] text-rust">{errors.form}</p>}
          <Field id="pf-name" label="اسم الصنف" error={errors.name}>
            <input {...bind("name")} data-autofocus placeholder="مثلا: خلاط حوض نحاس كروم" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pf-sku" label="كود الرف" error={errors.sku} hint="ممر - رف - دور، زي B-03-2">
              <input {...bind("sku")} dir="ltr" className="field uppercase num" placeholder="B-03-2" />
            </Field>
            <Field id="pf-category" label="القسم">
              <select {...bind("category")}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pf-cost" label="سعر الشراء (ج.م)" error={errors.cost}>
              <input {...bind("cost")} inputMode="decimal" className="field num" />
            </Field>
            <Field id="pf-price" label="سعر البيع (ج.م)" error={errors.price}>
              <input {...bind("price")} inputMode="decimal" className="field num" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pf-unit" label="الوحدة" error={errors.unit}>
              <select {...bind("unit")}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
            </Field>
            <Field id="pf-reorderAt" label="حد الطلب" error={errors.reorderAt} hint="لما الرصيد يوصله يظهر في قايمة الطلب">
              <input {...bind("reorderAt")} inputMode="numeric" className="field num" />
            </Field>
          </div>
          <Field id="pf-supplier" label="المورد" error={errors.supplier}>
            <input {...bind("supplier")} placeholder="مثلا: النيل للبلاستيك" />
          </Field>
          {isNew ? (
            <Field id="pf-stock" label="الرصيد الافتتاحي" error={errors.stock} hint="بيتسجل في كارت الصنف كأول حركة">
              <input {...bind("stock")} inputMode="numeric" className="field num" />
            </Field>
          ) : (
            <p className="text-[13px] text-ink-3">الرصيد مش بيتعدل من هنا. سجّل استلام أو صرف أو جرد من كارت الصنف عشان كل تغيير يبقى ليه مستند.</p>
          )}
        </div>
        <div className="sticky bottom-0 flex gap-2 border-t border-ink-line bg-paper-card px-5 py-3">
          <Button tone="primary" type="submit" busy={busy}>{isNew ? "أضف الصنف" : "احفظ التعديلات"}</Button>
          <Button type="button" tone="quiet" onClick={onClose}>إلغاء</Button>
        </div>
      </form>
    </Sheet>
  );
}
