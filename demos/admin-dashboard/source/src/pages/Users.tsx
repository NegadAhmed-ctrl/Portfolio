import { useState, type FormEvent } from "react";
import { matchUser } from "../data/localApi";
import { ago } from "../domain/format";
import { can, ROLE_LABEL } from "../domain/permissions";
import type { Role, User } from "../domain/types";
import { useApp, useLoad, useRole } from "../state/app";
import { errorText } from "../state/errors";
import { Button, Field, Notice, SkeletonRows } from "../ui/kit";
import { useToast } from "../ui/Toast";

export function Users() {
  const role = useRole();
  const { api, session, changed } = useApp();
  const toast = useToast();
  const { data, error, reload } = useLoad((a) => a.users(), []);
  const [q, setQ] = useState("");
  const manage = can(role, "users.manage");

  async function patch(u: User, p: { role?: Role; active?: boolean }) {
    try {
      await api.updateUser(u.id, p);
      toast(p.active === false ? `اتوقف حساب ${u.name}` : p.active ? `اتفعل حساب ${u.name}` : `${u.name} بقى ${ROLE_LABEL[p.role!]}`);
      changed();
    } catch (e) {
      toast(errorText(e), "error");
    }
  }

  const list = (data ?? []).filter((u) => matchUser(u, q));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <header>
          <h1 className="font-display text-[30px] leading-tight md:text-[34px]">فريق العمل</h1>
          <p className="text-[14px] text-ink-2">مين يدخل اللوحة، وكل واحد يقدر يعمل إيه.</p>
        </header>
        <input className="field max-w-[320px]" type="search" placeholder="دور بالاسم أو الإيميل" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث في الفريق" />
        {error ? (
          <Notice tone="error" title="مش قادرين نجيب الفريق" body={errorText(error)} action={<Button onClick={reload}>حاول تاني</Button>} />
        ) : !data ? (
          <SkeletonRows rows={4} />
        ) : list.length === 0 ? (
          <Notice title="مفيش حد بالاسم ده" body="جرب جزء من الاسم أو الإيميل." />
        ) : (
          <ul className="border-t border-ink">
            {list.map((u) => (
              <li key={u.id} className={`ledger-row flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5 ${u.active ? "" : "opacity-60"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper-deep font-display text-[16px]">{u.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium">
                    {u.name} {u.id === session?.user.id && <span className="text-[12px] text-ink-3">(انت)</span>}
                  </span>
                  <span className="block text-[12.5px] text-ink-3" dir="ltr" style={{ textAlign: "right" }}>{u.email}</span>
                </span>
                <span className="w-[110px] text-[12.5px] text-ink-3">{!u.active ? "متوقف" : u.lastSeenAt ? `دخل ${ago(u.lastSeenAt)}` : "لسه مدخلش"}</span>
                {manage ? (
                  <span className="flex items-center gap-2">
                    <select aria-label={`صلاحية ${u.name}`} className="field w-[120px] py-1.5 text-[13.5px]" value={u.role} onChange={(e) => patch(u, { role: e.target.value as Role })} disabled={!u.active}>
                      <option value="admin">{ROLE_LABEL.admin}</option>
                      <option value="staff">{ROLE_LABEL.staff}</option>
                    </select>
                    <Button tone={u.active ? "quiet" : "plain"} className="py-1.5 text-[13px]" onClick={() => patch(u, { active: !u.active })}>
                      {u.active ? "وقّف" : "فعّل"}
                    </Button>
                  </span>
                ) : (
                  <span className="text-[13px]">{ROLE_LABEL[u.role]}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="space-y-8">
        {manage && <Invite onDone={changed} />}
        <section>
          <h2 className="mb-2 font-display text-[18px]">مين يقدر يعمل إيه</h2>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-y border-ink text-ink-2">
                <th className="py-1.5 text-start font-medium" />
                <th className="py-1.5 font-medium">{ROLE_LABEL.admin}</th>
                <th className="py-1.5 font-medium">{ROLE_LABEL.staff}</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["يشوف الأصناف والرصيد", "inventory.view"],
                  ["يسجل صرف واستلام", "inventory.move"],
                  ["يضيف ويعدل الأسعار", "inventory.edit"],
                  ["يمسح صنف", "inventory.delete"],
                  ["يشوف قيمة المخزون والمكسب", "reports.money"],
                  ["يدير الفريق", "users.manage"],
                ] as const
              ).map(([label, a]) => (
                <tr key={a} className="ledger-row">
                  <td className="py-2">{label}</td>
                  <td className="py-2 text-center">{can("admin", a) ? "✓" : "–"}</td>
                  <td className="py-2 text-center">{can("staff", a) ? "✓" : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </aside>
    </div>
  );
}

function Invite({ onDone }: { onDone(): void }) {
  const { api } = useApp();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const u = await api.inviteUser({ name, email, role });
      toast(api.mode === "demo" ? `اتضاف ${u.name}. في الديمو كلمة السر Demo@1234` : `اتبعت دعوة لـ ${u.email}`);
      setName("");
      setEmail("");
      onDone();
    } catch (e2) {
      setErr(errorText(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-box border border-ink-line bg-paper-card p-4">
      <h2 className="font-display text-[18px]">ضيف حد للفريق</h2>
      {err && <p role="alert" className="text-[13.5px] text-rust">{err}</p>}
      <Field id="inv-name" label="الاسم">
        <input id="inv-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field id="inv-email" label="الإيميل">
        <input id="inv-email" className="field" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field id="inv-role" label="الصلاحية">
        <select id="inv-role" className="field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="staff">{ROLE_LABEL.staff}</option>
          <option value="admin">{ROLE_LABEL.admin}</option>
        </select>
      </Field>
      <Button tone="primary" type="submit" busy={busy}>ضيف</Button>
    </form>
  );
}
