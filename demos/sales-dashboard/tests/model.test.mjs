// node --test tests/  — the dashboard's numbers, checked against the real exported data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../js/model.js';

const payload = JSON.parse(readFileSync(new URL('../data/web/sales.json', import.meta.url)));
const data = M.prepare(payload);
const meta = data.meta;
const all = M.defaultState(meta);
const months = (a, b) => ({ from: meta.months.indexOf(a), to: meta.months.indexOf(b) });

test('weekday of the first day matches Python (1 Nov 2025 = Saturday = 5)', () => {
  assert.equal(data.dayIso[0], '2025-11-01');
  assert.equal(data.dayWeekday[0], 5);
});

test('year totals agree between the three tables', () => {
  const t = M.totals(data, all);
  const daily = M.monthlySeries(data, all).reduce((s, m) => s + m.net, 0);
  const prod = M.productRows(data, all).reduce((s, r) => s + r.net, 0);
  // the tables are rounded independently, so allow a few pounds of rounding
  assert.ok(Math.abs(t.net - daily) < 2000, `${t.net} vs ${daily}`);
  assert.ok(Math.abs(t.net - prod) < 2000, `${t.net} vs ${prod}`);
  assert.ok(t.invoices > 30000 && t.returnRate > 0 && t.returnRate < 0.02);
});

test('branch filter: the three branches add up to all', () => {
  const sum = [0, 1, 2].reduce((s, b) => s + M.totals(data, { ...all, branch: b }).net, 0);
  assert.equal(sum, M.totals(data, all).net);
});

test('channel filter: no channels means nothing', () => {
  const t = M.totals(data, { ...all, channels: [] });
  assert.equal(t.net, 0);
  assert.equal(t.avgTicket, 0);
});

test('previous period is equal length and only when the file reaches back', () => {
  assert.deepEqual(M.previousPeriod(4, 5), { from: 2, to: 3 });
  assert.equal(M.previousPeriod(0, 11), null);
  assert.equal(M.previousPeriod(2, 5), null);
  const k = M.kpiBlock(data, { ...all, ...months('2026-02', '2026-03') });
  assert.ok(k.before && k.change.net > 0.2, 'Ramadan beats Dec–Jan');
  assert.equal(M.kpiBlock(data, all).change.net, null);
});

test('Ramadan month is the peak of the year', () => {
  const s = M.monthlySeries(data, all);
  const top = s.reduce((a, b) => (b.net > a.net ? b : a));
  assert.equal(top.month, '2026-03');
});

test('delivery share grows from the first to the last quarter', () => {
  const s = M.channelShareByMonth(data, all);
  const talabat = meta.channels.indexOf('طلبات');
  const avg = (rows) => rows.reduce((x, r) => x + r.share[talabat], 0) / rows.length;
  assert.ok(avg(s.slice(-3)) > avg(s.slice(0, 3)) + 0.05);
  for (const r of s) assert.ok(Math.abs(r.share.reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test('categories are sorted and shares sum to 1', () => {
  const c = M.byCategory(data, all);
  assert.ok(c.every((x, i) => i === 0 || c[i - 1].net >= x.net));
  assert.ok(Math.abs(c.reduce((s, x) => s + x.share, 0) - 1) < 1e-9);
});

test('weekday: Thursday and Friday are the strongest days per day open', () => {
  const w = M.byWeekday(data, all).sort((a, b) => b.perDay - a.perDay);
  assert.deepEqual(w.slice(0, 2).map((x) => x.name).sort(), ['الجمعة', 'الخميس'].sort());
});

test('products: category filter + Black Forest drops after the price rise', () => {
  const cakes = meta.categories.indexOf('تورت وجاتوه');
  const rows = M.productRows(data, { ...all, category: cakes });
  assert.ok(rows.length === 5 && rows.every((r) => r.category === cakes));
  const bf = M.productRows(data, { ...all, ...months('2026-07', '2026-10') }).find((r) => r.code === 'CK1');
  assert.ok(bf.change < 0, `Black Forest change ${bf.change}`);
  assert.equal(bf.spark.length, 12);
});

test('events overlapping a range', () => {
  const names = M.eventsInRange(meta, { ...all, ...months('2026-02', '2026-03') }).map((e) => e.name);
  assert.deepEqual(names, ['رمضان', 'عيد الفطر']);
});

test('state survives the URL hash, junk is ignored', () => {
  const st = { branch: 1, from: 3, to: 5, channels: [0, 2], category: 4 };
  const back = M.decodeState('#' + M.encodeState(st, meta), meta);
  assert.deepEqual(back, st);
  assert.deepEqual(M.decodeState('#b=9&p=zz_yy&c=7.8&k=-1', meta), { ...all, channels: [] });
  assert.equal(M.encodeState(all, meta), '');
});

test('formatting', () => {
  assert.equal(M.fmtInt(13539620.4), '13,539,620');
  assert.equal(M.fmtMoneyShort(13539620), '13.5 مليون');
  assert.equal(M.fmtMoneyShort(1883465), '1.88 مليون');
  assert.equal(M.fmtMoneyShort(59420), '59 ألف');
  assert.equal(M.fmtChange(0.234), '+23%');
  assert.equal(M.fmtChange(-0.19), '−19%');
  assert.equal(M.fmtChange(null), '');
  assert.equal(M.monthName('2026-03', true), 'مارس 2026');
});
