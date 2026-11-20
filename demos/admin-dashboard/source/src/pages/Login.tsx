import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { DEMO_PASSWORD, SEED_USERS, STORE } from "../data/seed";
import { ROLE_LABEL } from "../domain/permissions";
import { useApp } from "../state/app";
import { errorText } from "../state/errors";
import { Button, Field } from "../ui/kit";

const DEMO = SEED_USERS.filter((u) => u.id === "u-hesham" || u.id === "u-karim");

export function Login() {
  const { session, signIn, api } = useApp();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={loc.state?.from ?? "/"} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("اكتب الإيميل وكلمة السر");
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh md:grid-cols-[1.05fr_1fr]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-ink px-6 py-8 text-paper-card md:px-12 md:py-12">
        <p className="text-[13px] text-paper-card/60">{STORE.branch}</p>
        <div className="my-10 md:my-0">
          <h1 className="font-display text-[40px] leading-[1.15] md:text-[58px]">{STORE.name}</h1>
          <p className="mt-4 max-w-[30ch] text-[16px] text-paper-card/75">
            المخزن كله في شاشة واحدة: الرصيد، الصرف والاستلام، والأصناف اللي لازم تتطلب قبل ما تخلص.
          </p>
        </div>
        {/* a row of shelf labels, the way the aisles are marked */}
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {["A-01", "B-01", "C-02", "D-01", "E-03", "F-02"].map((s) => (
            <span key={s} className="rounded-tag border border-paper-card/30 px-2 py-0.5 text-[12px] tracking-wide text-paper-card/60 num" dir="ltr">
              {s}
            </span>
          ))}
        </div>
        <div className="tape-stripe absolute inset-x-0 bottom-0 h-2 md:inset-y-0 md:left-0 md:right-auto md:h-auto md:w-2" aria-hidden="true" />
      </section>

      <section className="flex items-center px-6 py-10 md:px-14">
        <form onSubmit={submit} noValidate className="w-full max-w-[380px] space-y-5">
          <div>
            <h2 className="font-display text-[26px]">تسجيل الدخول</h2>
            <p className="text-[14px] text-ink-2">ادخل بحساب الشغل اللي المدير عمله لك.</p>
          </div>
          {error && (
            <p role="alert" className="border-s-4 border-rust bg-rust-soft/60 px-3 py-2 text-[14px] text-rust">
              {error}
            </p>
          )}
          <Field id="email" label="الإيميل">
            <input id="email" className="field" type="email" inputMode="email" autoComplete="username" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field id="password" label="كلمة السر">
            <input id="password" className="field" type="password" autoComplete="current-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button tone="primary" type="submit" busy={busy} className="w-full py-2.5 text-[15px]">
            دخول
          </Button>

          {api.mode === "demo" && (
            <div className="border-t border-ink-line pt-5">
              <p className="mb-3 text-[13px] text-ink-2">حسابات الديمو (اضغط على أي واحد يتملى لوحده):</p>
              <div className="grid grid-cols-2 gap-3">
                {DEMO.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword(DEMO_PASSWORD);
                      setError(null);
                    }}
                    className="group rounded-box border border-ink-line bg-white p-3 text-start transition hover:border-ink"
                  >
                    {/* staff ID tag: punched hole + role band */}
                    <span className="mx-auto mb-2 block h-1.5 w-8 rounded-full bg-paper-deep" />
                    <span className="block text-[14px] font-medium">{u.name}</span>
                    <span className={`mt-1 inline-block rounded-tag px-1.5 text-[12px] ${u.role === "admin" ? "bg-ink text-paper-card" : "bg-tape-soft text-ink"}`}>{ROLE_LABEL[u.role]}</span>
                    <span className="mt-1 block text-[11.5px] text-ink-3" dir="ltr">
                      {u.email}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[12.5px] text-ink-3">
                كلمة السر للاتنين: <span dir="ltr" className="num">{DEMO_PASSWORD}</span>. المدير يشوف كل حاجة، وأمين المخزن يصرف ويستلم بس.
              </p>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
