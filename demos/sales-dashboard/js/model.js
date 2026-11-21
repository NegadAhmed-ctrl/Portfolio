// Pure data logic for the dashboard: filtering, totals, comparisons, series.
// No DOM here, so every number on the page is tested in tests/model.test.mjs.

export const PRESETS = {
  year: { label: 'السنة كلها', from: '2025-11', to: '2026-10' },
  ramadan: { label: 'رمضان والعيد', from: '2026-02', to: '2026-03' },
  summer: { label: 'الصيف', from: '2026-06', to: '2026-09' },
  last3: { label: 'آخر 3 شهور', from: '2026-08', to: '2026-10' },
};

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const WEEKDAYS_AR = ['الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت', 'الحد'];

export function monthName(ym, withYear = false) {
  const [y, m] = ym.split('-').map(Number);
  return withYear ? `${MONTHS_AR[m - 1]} ${y}` : MONTHS_AR[m - 1];
}

/** Index the payload once: day -> month index, weekday. */
export function prepare(payload) {
  const { meta } = payload;
  const start = new Date(meta.start + 'T00:00:00Z');
  const monthIdx = new Map(meta.months.map((m, i) => [m, i]));
  const dayMonth = new Int16Array(meta.days);
  const dayWeekday = new Int8Array(meta.days);
  const dayIso = [];
  for (let i = 0; i < meta.days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    dayIso.push(iso);
    dayMonth[i] = monthIdx.get(iso.slice(0, 7));
    dayWeekday[i] = (d.getUTCDay() + 6) % 7; // Monday = 0, like Python
  }
  return { ...payload, dayMonth, dayWeekday, dayIso };
}

export function defaultState(meta) {
  return { branch: null, from: 0, to: meta.months.length - 1, channels: meta.channels.map((_, i) => i), category: null };
}

/** The equal-length period right before [from, to], or null if the file doesn't reach back. */
export function previousPeriod(from, to) {
  const len = to - from + 1;
  return from - len < 0 ? null : { from: from - len, to: from - 1 };
}

function match(st, b, c) {
  return (st.branch === null || st.branch === b) && st.channels.includes(c);
}

export function totals(data, st, range = st) {
  let net = 0, invoices = 0, gross = 0, returns = 0;
  for (const [d, b, c, inv, g, r] of data.tickets) {
    const m = data.dayMonth[d];
    if (m < range.from || m > range.to || !match(st, b, c)) continue;
    invoices += inv; gross += g; returns += r;
  }
  net = gross - returns;
  return { net, gross, returns, invoices, avgTicket: invoices ? net / invoices : 0, returnRate: gross ? returns / gross : 0 };
}

/** Relative change, or null when there is nothing to compare with. */
export function change(now, before) {
  if (before === null || before === undefined || before === 0) return null;
  return now / before - 1;
}

export function kpiBlock(data, st) {
  const now = totals(data, st);
  const prev = previousPeriod(st.from, st.to);
  const before = prev ? totals(data, st, prev) : null;
  const keys = ['net', 'invoices', 'avgTicket', 'returnRate'];
  return {
    now, before, prev,
    change: Object.fromEntries(keys.map((k) => [k, before ? change(now[k], before[k]) : null])),
  };
}

/** Monthly net per month in range (with optional per-branch split). */
export function monthlySeries(data, st) {
  const out = [];
  for (let m = st.from; m <= st.to; m++) out.push({ month: data.meta.months[m], net: 0, byBranch: [0, 0, 0] });
  for (const [d, b, c, , n] of data.daily) {
    const m = data.dayMonth[d];
    if (m < st.from || m > st.to || !match(st, b, c)) continue;
    out[m - st.from].net += n;
    out[m - st.from].byBranch[b] += n;
  }
  return out;
}

/** Daily net for short ranges. */
export function dailySeries(data, st) {
  const rows = new Map();
  for (const [d, b, c, , n] of data.daily) {
    const m = data.dayMonth[d];
    if (m < st.from || m > st.to || !match(st, b, c)) continue;
    rows.set(d, (rows.get(d) || 0) + n);
  }
  const out = [];
  for (let d = 0; d < data.meta.days; d++) {
    const m = data.dayMonth[d];
    if (m >= st.from && m <= st.to) out.push({ day: data.dayIso[d], net: rows.get(d) || 0 });
  }
  return out;
}

export function byCategory(data, st) {
  const sums = data.meta.categories.map((name, i) => ({ i, name, net: 0 }));
  for (const [d, b, c, k, n] of data.daily) {
    const m = data.dayMonth[d];
    if (m < st.from || m > st.to || !match(st, b, c)) continue;
    sums[k].net += n;
  }
  const total = sums.reduce((s, x) => s + x.net, 0);
  return sums.map((x) => ({ ...x, share: total ? x.net / total : 0 })).sort((a, z) => z.net - a.net);
}

/** Share of each channel per month (ignores the channel filter on purpose: it's the split itself). */
export function channelShareByMonth(data, st) {
  const nC = data.meta.channels.length;
  const rows = [];
  for (let m = st.from; m <= st.to; m++) rows.push({ month: data.meta.months[m], net: new Array(nC).fill(0) });
  for (const [d, b, c, , n] of data.daily) {
    const m = data.dayMonth[d];
    if (m < st.from || m > st.to || (st.branch !== null && st.branch !== b)) continue;
    rows[m - st.from].net[c] += n;
  }
  return rows.map((r) => {
    const t = r.net.reduce((s, x) => s + x, 0);
    return { month: r.month, share: r.net.map((x) => (t ? x / t : 0)), total: t };
  });
}

export function byWeekday(data, st) {
  const sums = new Array(7).fill(0);
  const days = new Array(7).fill(0);
  for (let d = 0; d < data.meta.days; d++) {
    const m = data.dayMonth[d];
    if (m >= st.from && m <= st.to) days[data.dayWeekday[d]]++;
  }
  for (const [d, b, c, , n] of data.daily) {
    const m = data.dayMonth[d];
    if (m < st.from || m > st.to || !match(st, b, c)) continue;
    sums[data.dayWeekday[d]] += n;
  }
  return sums.map((net, i) => ({ i, name: WEEKDAYS_AR[i], net, perDay: days[i] ? net / days[i] : 0 }));
}

/** Product ledger: totals in range, change vs previous period, 12-month sparkline. */
export function productRows(data, st) {
  const P = data.meta.products;
  const nM = data.meta.months.length;
  const rows = P.map((p, i) => ({ i, ...p, qty: 0, net: 0, before: 0, spark: new Array(nM).fill(0) }));
  const prev = previousPeriod(st.from, st.to);
  for (const [m, b, c, p, q, n] of data.products) {
    if (!match(st, b, c)) continue;
    rows[p].spark[m] += n;
    if (m >= st.from && m <= st.to) { rows[p].qty += q; rows[p].net += n; }
    if (prev && m >= prev.from && m <= prev.to) rows[p].before += n;
  }
  const total = rows.reduce((s, r) => s + r.net, 0);
  return rows
    .filter((r) => st.category === null || r.category === st.category)
    .map((r) => ({ ...r, share: total ? r.net / total : 0, change: prev ? change(r.net, r.before) : null }))
    .sort((a, z) => z.net - a.net);
}

/** Events (Ramadan, Eid…) that overlap the range, as month indexes for the chart. */
export function eventsInRange(meta, st) {
  const first = meta.months[st.from], last = meta.months[st.to];
  return meta.events
    .filter((e) => e.end.slice(0, 7) >= first && e.start.slice(0, 7) <= last)
    .map((e) => ({ ...e }));
}

// ---------- state <-> URL hash (so a filtered view can be sent to a partner)
export function encodeState(st, meta) {
  const p = new URLSearchParams();
  if (st.branch !== null) p.set('b', String(st.branch));
  if (st.from !== 0 || st.to !== meta.months.length - 1) p.set('p', `${meta.months[st.from]}_${meta.months[st.to]}`);
  if (st.channels.length !== meta.channels.length) p.set('c', st.channels.join('.') || 'none');
  if (st.category !== null) p.set('k', String(st.category));
  return p.toString();
}

export function decodeState(hash, meta) {
  const st = defaultState(meta);
  const p = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const b = Number(p.get('b'));
  if (p.has('b') && Number.isInteger(b) && b >= 0 && b < meta.branches.length) st.branch = b;
  if (p.has('p')) {
    const [f, t] = p.get('p').split('_').map((m) => meta.months.indexOf(m));
    if (f >= 0 && t >= f) { st.from = f; st.to = t; }
  }
  if (p.has('c')) {
    const cs = p.get('c') === 'none' ? [] : p.get('c').split('.').map(Number).filter((x) => x >= 0 && x < meta.channels.length);
    st.channels = [...new Set(cs)].sort();
  }
  const k = Number(p.get('k'));
  if (p.has('k') && Number.isInteger(k) && k >= 0 && k < meta.categories.length) st.category = k;
  return st;
}

// ---------- formatting (Latin digits: that's what Egyptian invoices and Excel use)
export function fmtInt(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtMoneyShort(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '')} مليون`;
  if (a >= 1e3) return `${Math.round(n / 1e3).toLocaleString('en-US')} ألف`;
  return fmtInt(n);
}

export function fmtPct(x, digits = 0) {
  return `${(x * 100).toFixed(digits)}%`;
}

export function fmtChange(x) {
  if (x === null || !Number.isFinite(x)) return '';
  const v = Math.round(x * 100);
  if (v === 0) return 'زي الفترة اللي قبلها';
  return `${v > 0 ? '+' : '−'}${Math.abs(v)}%`;
}
