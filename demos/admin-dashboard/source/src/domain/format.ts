const egp = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("ar-EG");

export const money = (v: number) => `${egp.format(Math.round(v))} ج.م`;
export const count = (v: number) => num.format(v);

const dateTime = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short" });
const weekday = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", weekday: "short" });
const longDate = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long" });

export const when = (iso: string) => dateTime.format(new Date(iso));
export const day = (iso: string) => dateOnly.format(new Date(iso));
export const dayName = (yyyyMmDd: string) => weekday.format(new Date(`${yyyyMmDd}T12:00:00+02:00`));
export const today = (d: Date) => longDate.format(d);

/** "منذ ٣ دقائق" style, for the activity list. */
export function ago(iso: string, now = new Date()): string {
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "دلوقتي";
  const m = Math.floor(s / 60);
  if (m < 60) return `من ${num.format(m)} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `من ${num.format(h)} ساعة`;
  const d = Math.floor(h / 24);
  return d === 1 ? "امبارح" : `من ${num.format(d)} يوم`;
}
