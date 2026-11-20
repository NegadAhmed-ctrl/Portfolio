import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Tone = "primary" | "plain" | "quiet" | "danger";

const TONES: Record<Tone, string> = {
  // the one loud button on a screen: safety-tape yellow with ink text
  primary: "bg-tape text-ink hover:bg-tape-deep border border-ink/80 shadow-[0_2px_0_#1D2B3A] active:translate-y-[1px] active:shadow-[0_1px_0_#1D2B3A]",
  plain: "bg-white text-ink border border-ink-line hover:border-ink",
  quiet: "text-ink-2 hover:text-ink hover:bg-paper-deep/70",
  danger: "bg-white text-rust border border-rust/40 hover:bg-rust-soft",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; icon?: IconName; busy?: boolean }>(
  function Button({ tone = "plain", icon, busy, children, className = "", disabled, ...rest }, ref) {
    return (
      <button
        ref={ref}
        {...rest}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        className={`inline-flex items-center justify-center gap-2 rounded-box px-3.5 py-2 text-[14px] font-medium transition disabled:cursor-not-allowed disabled:opacity-55 ${TONES[tone]} ${className}`}
      >
        {busy ? <Spinner /> : icon ? <Icon name={icon} size={18} /> : null}
        {children}
      </button>
    );
  },
);

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} role="presentation" />;
}

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="text-[13px] text-rust">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; icon?: IconName }[]; onChange(v: T): void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-box border border-ink-line bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[13.5px] transition ${value === o.value ? "bg-ink text-paper-card" : "text-ink-2 hover:text-ink"}`}
        >
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Empty and error states say what happened and what to do next. */
export function Notice({ title, body, action, tone = "empty" }: { title: string; body?: string; action?: ReactNode; tone?: "empty" | "error" }) {
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`flex flex-col items-start gap-2 border-s-4 px-5 py-6 ${tone === "error" ? "border-rust bg-rust-soft/50" : "border-ink-line bg-paper-card"}`}>
      <p className="font-display text-[18px]">{title}</p>
      {body && <p className="max-w-prose text-[14px] text-ink-2">{body}</p>}
      {action}
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-label="بيحمل" role="status" className="divide-y divide-ink-line/70">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5">
          <span className="h-5 w-14 animate-pulse rounded-tag bg-paper-deep" />
          <span className="h-4 animate-pulse rounded bg-paper-deep" style={{ width: `${38 + ((i * 17) % 30)}%` }} />
          <span className="ms-auto h-4 w-16 animate-pulse rounded bg-paper-deep" />
        </div>
      ))}
    </div>
  );
}

/** Side sheet (left in RTL). Escape and backdrop close it; focus returns to the opener. */
export function Sheet({ open, onClose, labelledBy, children, wide }: { open: boolean; onClose(): void; labelledBy: string; children: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("[data-autofocus], button, input")?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`absolute inset-y-0 left-0 flex w-full flex-col overflow-y-auto bg-paper-card shadow-lift animate-slidein ${wide ? "max-w-[560px]" : "max-w-[460px]"}`}
      >
        {children}
      </div>
    </div>
  );
}
