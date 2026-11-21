// Hand-drawn SVG charts (no chart library: small, RTL-aware, and styled like the pad).
// Every function returns an SVG string; the page sets innerHTML.
import { fmtInt, fmtMoneyShort, fmtPct, monthName } from './model.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/**
 * Monthly columns (or a daily line for short ranges), right-to-left: the first month sits on the right,
 * like the columns of an Arabic ledger. Events (Ramadan, Eid…) are highlighter bands behind the bars.
 */
export function trendChart(series, { mode, events = [], width = 860, height = 300 }) {
  const tight = width < 560;
  const pad = { t: tight ? 52 : 38, r: 62, b: 34, l: 6 };
  const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
  const vals = series.map((s) => s.net);
  const max = niceMax(Math.max(...vals, 1));
  const y = (v) => pad.t + H - (v / max) * H;
  const n = series.length;
  const slot = W / n;
  const x = (i) => pad.l + W - (i + 0.5) * slot; // RTL
  const keyOf = (s) => (mode === 'month' ? s.month : s.day);
  let out = `<svg viewBox="0 0 ${width} ${height}" class="chart trend" role="img" aria-label="صافي المبيعات ${mode === 'month' ? 'شهر بشهر' : 'يوم بيوم'}">`;

  // grid: 4 ruled lines like the pad
  for (let k = 0; k <= 4; k++) {
    const v = (max / 4) * k;
    out += `<line class="rule" x1="${pad.l}" x2="${pad.l + W}" y1="${y(v)}" y2="${y(v)}"/>`;
    out += `<text class="axis" x="${pad.l + W + 8}" y="${y(v) + 4}" text-anchor="end">${k === 0 ? '0' : fmtMoneyShort(v)}</text>`;
  }

  // event bands (events that share a column are merged: "رمضان والعيد")
  const bands = [];
  for (const e of events) {
    const idx = series.map((s, i) => [keyOf(s), i]).filter(([k]) =>
      mode === 'month' ? k >= e.start.slice(0, 7) && k <= e.end.slice(0, 7) : k >= e.start && k <= e.end).map(([, i]) => i);
    if (!idx.length) continue;
    const lo = Math.min(...idx), hi = Math.max(...idx);
    const prev = bands.find((b) => lo <= b.hi && hi >= b.lo);
    if (prev) { prev.lo = Math.min(prev.lo, lo); prev.hi = Math.max(prev.hi, hi); prev.names.push(e.name); } else bands.push({ lo, hi, names: [e.name] });
  }
  bands.forEach((bd, bi) => {
    const e = { name: bd.names.length > 1 && bd.names[1].startsWith('عيد') && bd.names[0] === 'رمضان' ? 'رمضان والعيد' : bd.names.join(' و') };
    const a = x(bd.hi) - slot / 2, b = x(bd.lo) + slot / 2;
    out += `<g class="event"><rect x="${a}" y="${pad.t - 6}" width="${b - a}" height="${H + 6}"/>`;
    const ly = tight && bi % 2 ? pad.t - 28 : pad.t - 12;
    out += `<text x="${(a + b) / 2}" y="${ly}" text-anchor="middle">${esc(e.name)}</text></g>`;
  });

  if (mode === 'month') {
    const bw = Math.min(slot * 0.56, 46);
    const top = vals.indexOf(Math.max(...vals));
    series.forEach((s, i) => {
      const h = pad.t + H - y(s.net);
      out += `<g class="bar${i === top ? ' top' : ''}" tabindex="0" data-tip="${esc(monthName(s.month, true))}: ${fmtInt(s.net)} ج.م">`;
      out += `<rect x="${x(i) - bw / 2}" y="${y(s.net)}" width="${bw}" height="${Math.max(h, 0)}"/>`;
      if (i === top || n <= 6) out += `<text class="val" x="${x(i)}" y="${y(s.net) - 6}" text-anchor="middle">${fmtMoneyShort(s.net)}</text>`;
      if (slot >= 52 || i % 2 === 0) out += `<text class="axis" x="${x(i)}" y="${pad.t + H + 20}" text-anchor="middle">${esc(monthName(s.month))}</text>`;
      out += '</g>';
    });
  } else {
    const pts = series.map((s, i) => `${x(i).toFixed(1)},${y(s.net).toFixed(1)}`).join(' ');
    out += `<polyline class="line" points="${pts}"/>`;
    series.forEach((s, i) => {
      const d = s.day;
      if (d.endsWith('-01') || i === 0) {
        out += `<text class="axis" x="${x(i)}" y="${pad.t + H + 20}" text-anchor="middle">${esc(monthName(d.slice(0, 7)))}</text>`;
        out += `<line class="tick" x1="${x(i)}" x2="${x(i)}" y1="${pad.t + H}" y2="${pad.t + H + 6}"/>`;
      }
      out += `<rect class="hit" x="${x(i) - slot / 2}" y="${pad.t}" width="${slot}" height="${H}" data-tip="${esc(d)}: ${fmtInt(s.net)} ج.م"/>`;
    });
    const top = vals.indexOf(Math.max(...vals));
    out += `<circle class="dot" cx="${x(top)}" cy="${y(vals[top])}" r="3.5"/>`;
    out += `<text class="val" x="${x(top)}" y="${y(vals[top]) - 9}" text-anchor="middle">${fmtMoneyShort(vals[top])}</text>`;
  }
  out += `<line class="base" x1="${pad.l}" x2="${pad.l + W}" y1="${pad.t + H}" y2="${pad.t + H}"/></svg>`;
  return out;
}

/** Horizontal bars with share, the selected category drawn in ink, others in pencil. */
export function categoryBars(rows, selected, { width = 420 } = {}) {
  const rowH = 34, labelW = 132, valW = 56;
  const height = rows.length * rowH + 6;
  const max = Math.max(...rows.map((r) => r.net), 1);
  const barW = width - labelW - valW - 8;
  let out = `<svg viewBox="0 0 ${width} ${height}" class="chart cats" role="img" aria-label="المبيعات حسب القسم">`;
  rows.forEach((r, k) => {
    const yy = k * rowH + 4;
    const w = Math.max((r.net / max) * barW, 1);
    const cls = selected === null ? '' : selected === r.i ? ' on' : ' off';
    out += `<g class="cat${cls}" data-cat="${r.i}" tabindex="0" role="button" aria-pressed="${selected === r.i}">`;
    out += `<rect class="hit" x="0" y="${yy - 2}" width="${width}" height="${rowH}"/>`;
    out += `<text class="label" x="${width}" y="${yy + 19}" text-anchor="start">${esc(r.name)}</text>`;
    out += `<rect class="fill" x="${width - labelW - w}" y="${yy + 7}" width="${w}" height="14"/>`;
    out += `<text class="num" x="${width - labelW - w - 8}" y="${yy + 19}" text-anchor="start">${fmtPct(r.share)}</text>`;
    out += `</g>`;
  });
  return out + '</svg>';
}

/** 100% stacked columns: channel split per month (RTL). */
export function channelColumns(rows, channels, active, { width = 420, height = 210 } = {}) {
  const pad = { t: 8, b: 26, l: 4, r: 40 };
  const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
  const slot = W / rows.length, bw = Math.min(slot * 0.62, 26);
  const x = (i) => pad.l + W - (i + 0.5) * slot;
  let out = `<svg viewBox="0 0 ${width} ${height}" class="chart chans" role="img" aria-label="نصيب كل قناة شهر بشهر">`;
  for (const v of [0, 0.5, 1]) {
    const yy = pad.t + H - v * H;
    out += `<line class="rule" x1="${pad.l}" x2="${pad.l + W}" y1="${yy}" y2="${yy}"/><text class="axis" x="${pad.l + W + 6}" y="${yy + 4}" text-anchor="end">${v * 100}%</text>`;
  }
  rows.forEach((r, i) => {
    let acc = 0;
    const tip = channels.map((c, j) => `${c} ${fmtPct(r.share[j])}`).join('، ');
    out += `<g class="col" tabindex="0" data-tip="${esc(monthName(r.month, true))}: ${esc(tip)}">`;
    r.share.forEach((s, j) => {
      const h = s * H;
      out += `<rect class="ch${j}${active.includes(j) ? '' : ' muted'}" x="${x(i) - bw / 2}" y="${pad.t + H - acc - h}" width="${bw}" height="${h}"/>`;
      acc += h;
    });
    if (rows.length <= 6 || i % 3 === 0) out += `<text class="axis" x="${x(i)}" y="${height - 8}" text-anchor="middle">${esc(monthName(r.month))}</text>`;
    out += '</g>';
  });
  return out + '</svg>';
}

/** 7 small columns: average sales per open day. */
export function weekdayColumns(rows, { width = 420, height = 150 } = {}) {
  const pad = { t: 22, b: 24 };
  const H = height - pad.t - pad.b;
  const max = Math.max(...rows.map((r) => r.perDay), 1);
  const slot = width / 7, bw = slot * 0.5;
  // Arabic week starts Saturday; draw right-to-left: السبت … الجمعة
  const order = [5, 6, 0, 1, 2, 3, 4];
  const top = rows.reduce((a, b) => (b.perDay > a.perDay ? b : a)).i;
  let out = `<svg viewBox="0 0 ${width} ${height}" class="chart week" role="img" aria-label="متوسط البيع في كل يوم من الأسبوع">`;
  order.forEach((wd, k) => {
    const r = rows[wd];
    const cx = width - (k + 0.5) * slot;
    const h = (r.perDay / max) * H;
    out += `<g class="day${wd === top ? ' top' : ''}" tabindex="0" data-tip="${esc(r.name)}: ${fmtInt(r.perDay)} ج.م في اليوم">`;
    out += `<rect x="${cx - bw / 2}" y="${pad.t + H - h}" width="${bw}" height="${h}"/>`;
    if (wd === top) out += `<text class="val" x="${cx}" y="${pad.t + H - h - 6}" text-anchor="middle">${fmtMoneyShort(r.perDay)}</text>`;
    out += `<text class="axis" x="${cx}" y="${height - 6}" text-anchor="middle">${esc(r.name)}</text></g>`;
  });
  return out + `<line class="base" x1="0" x2="${width}" y1="${pad.t + H}" y2="${pad.t + H}"/></svg>`;
}

/** 12-month pencil sparkline with the selected months inked. */
export function sparkline(values, from, to, { width = 96, height = 24 } = {}) {
  const max = Math.max(...values, 1);
  const n = values.length;
  const x = (i) => width - (i / (n - 1)) * width; // RTL: November on the right
  const y = (v) => height - 2 - (v / max) * (height - 4);
  const all = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const sel = values.slice(from, to + 1).map((v, k) => `${x(from + k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${width} ${height}" class="spark" aria-hidden="true"><polyline class="all" points="${all}"/>` +
    (to > from ? `<polyline class="sel" points="${sel}"/>` : `<circle class="sel" cx="${x(from)}" cy="${y(values[from])}" r="2"/>`) + '</svg>';
}
