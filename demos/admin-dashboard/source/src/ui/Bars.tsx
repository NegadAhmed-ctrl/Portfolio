import { useState } from "react";
import type { DayBucket } from "../domain/kpis";
import { count, dayName, money } from "../domain/format";

/**
 * 14-day bar chart drawn with plain SVG/divs (no chart library: ~0 KB, RTL-safe).
 * Bars = what left the store; a small ink mark under a day = goods received.
 */
export function DayBars({ days, mode }: { days: DayBucket[]; mode: "value" | "qty" }) {
  const [focus, setFocus] = useState<number>(days.length - 1);
  const v = (d: DayBucket) => (mode === "value" ? d.outValue : d.outQty);
  const max = Math.max(1, ...days.map(v));
  const f = days[focus];

  return (
    <figure className="m-0">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] text-ink-2">
          {dayName(f.day)} {Number(f.day.slice(8))}/{Number(f.day.slice(5, 7))}
        </span>
        <span className="font-display text-[22px] num">
          {mode === "value" ? money(f.outValue) : `${count(f.outQty)} قطعة`}
          {f.inQty > 0 && <span className="ms-3 font-sans text-[13px] text-moss">+ استلام {count(f.inQty)}</span>}
        </span>
      </figcaption>
      <div className="flex h-[180px] items-end gap-[6px]" role="list" aria-label="الصرف اليومي آخر ١٤ يوم">
        {days.map((d, i) => {
          const h = Math.max(2, Math.round((v(d) / max) * 100));
          const isToday = i === days.length - 1;
          return (
            <button
              key={d.day}
              role="listitem"
              type="button"
              onMouseEnter={() => setFocus(i)}
              onFocus={() => setFocus(i)}
              onClick={() => setFocus(i)}
              aria-label={`${dayName(d.day)}: ${mode === "value" ? money(d.outValue) : count(d.outQty)}${d.inQty ? `، استلام ${count(d.inQty)}` : ""}`}
              className="group relative flex h-full flex-1 flex-col justify-end"
            >
              <span
                className={`block w-full origin-bottom animate-rise rounded-t-[2px] transition-colors ${i === focus ? "bg-ink" : isToday ? "bg-ink-2" : "bg-ink/25 group-hover:bg-ink/45"}`}
                style={{ height: `${h}%`, animationDelay: `${i * 25}ms` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[6px] border-t border-ink pt-1.5" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.day} className={`flex flex-1 flex-col items-center text-[10.5px] leading-tight ${i === focus ? "text-ink" : "text-ink-3"}`}>
            <span className={`mb-1 h-1.5 w-1.5 rotate-45 ${d.inQty > 0 ? "bg-moss" : "bg-transparent"}`} />
            <span className="num">{Number(d.day.slice(8))}</span>
          </span>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[12px] text-ink-3">
        <span className="h-1.5 w-1.5 rotate-45 bg-moss" /> يوم اتسلمت فيه بضاعة
      </p>
    </figure>
  );
}
