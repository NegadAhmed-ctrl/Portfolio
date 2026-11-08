// Time helpers that work the same in Node and in the browser.
// All appointment times are kept as LOCAL wall-clock strings in the business
// timezone ("2026-11-08T17:00"), which is what staff and patients think in.

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(dateStr) {
  return DAY_KEYS[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(min) {
  return pad(Math.floor(min / 60)) + ':' + pad(min % 60);
}

// Current local date/time in the business timezone.
export function nowLocal(tz, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map((p) => [p.type, p.value])
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function offsetMinutes(tz, utcMs) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value])
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - utcMs) / 60000);
}

// "2026-11-08T17:00" in tz -> Date (UTC instant)
export function localToDate(local, tz) {
  const [d, t] = local.split('T');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  let off = offsetMinutes(tz, guess);
  let ms = guess - off * 60000;
  const off2 = offsetMinutes(tz, ms);
  if (off2 !== off) ms = guess - off2 * 60000;
  return new Date(ms);
}

// Date (UTC instant) -> "2026-11-08T17:00" in tz
export function dateToLocal(date, tz) {
  const { date: d, minutes } = nowLocal(tz, date);
  return d + 'T' + fromMinutes(minutes);
}

export function addMinutesLocal(local, mins) {
  const [d, t] = local.split('T');
  let total = toMinutes(t) + mins;
  let day = d;
  while (total >= 1440) { total -= 1440; day = addDays(day, 1); }
  while (total < 0) { total += 1440; day = addDays(day, -1); }
  return day + 'T' + fromMinutes(total);
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function toArabicDigits(s) {
  return String(s).replace(/[0-9]/g, (d) => AR_DIGITS[d]);
}

export function formatDate(dateStr, lang) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(d);
}

export function formatTime(hhmm, lang) {
  let [h, m] = hhmm.split(':').map(Number);
  const pm = h >= 12;
  const h12 = ((h + 11) % 12) + 1;
  if (lang === 'ar') {
    const part = h < 12 ? 'الصبح' : h < 15 ? 'الضهر' : h < 18 ? 'العصر' : 'بالليل';
    return toArabicDigits(`${h12}${m ? ':' + pad(m) : ''}`) + ' ' + part;
  }
  return `${h12}${m ? ':' + pad(m) : ''} ${pm ? 'pm' : 'am'}`;
}

export function formatSlot(local, lang) {
  const [d, t] = local.split('T');
  return `${formatDate(d, lang)} – ${formatTime(t, lang)}`;
}
