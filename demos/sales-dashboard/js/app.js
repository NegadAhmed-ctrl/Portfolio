// The page: reads data/web/sales.json, keeps the filter state in the URL hash, renders.
import * as M from './model.js';
import { categoryBars, channelColumns, sparkline, trendChart, weekdayColumns } from './charts.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// numbers/dates/English names keep their own order inside Arabic text
const bd = (v) => (/[\u0600-\u06FF]/.test(String(v)) ? `<bdi>${esc(v)}</bdi>` : `<bdi dir="ltr">${esc(v)}</bdi>`);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let data, st;

async function load() {
  try {
    const res = await fetch('data/web/sales.json');
    if (!res.ok) throw new Error(res.status);
    data = M.prepare(await res.json());
  } catch {
    $('state').innerHTML = 'ملف الداتا ماتحملش. اتأكد من النت وجرّب تاني. <button type="button" class="link" id="retry">حمّل تاني</button>';
    $('retry').onclick = () => { $('state').textContent = 'بنحمّل دفتر السنة…'; load(); };
    return;
  }
  st = M.decodeState(location.hash, data.meta);
  $('state').hidden = true;
  $('report').hidden = false;
  buildControls();
  renderAll();
  renderCleaning();
  window.addEventListener('hashchange', () => { st = M.decodeState(location.hash, data.meta); syncControls(); render(); });
}

// ---------- controls
function buildControls() {
  const { meta } = data;
  $('shopName').textContent = meta.shop;
  const tabs = [['الكل', null], ...meta.branches.map((b, i) => [b, i])];
  $('branchTabs').innerHTML = tabs.map(([name, i]) =>
    `<button type="button" data-b="${i ?? ''}" aria-pressed="false"><span>${esc(name)}</span></button>`).join('');
  $('branchTabs').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    update({ branch: b.dataset.b === '' ? null : Number(b.dataset.b) });
  };

  const opts = meta.months.map((m, i) => `<option value="${i}">${esc(M.monthName(m, true))}</option>`).join('');
  $('from').innerHTML = opts;
  $('to').innerHTML = opts;
  $('from').onchange = () => { const f = Number($('from').value); update({ from: f, to: Math.max(f, st.to) }); };
  $('to').onchange = () => { const t = Number($('to').value); update({ to: t, from: Math.min(t, st.from) }); };

  $('presets').innerHTML = Object.entries(M.PRESETS).map(([k, p]) =>
    `<button type="button" data-p="${k}">${esc(p.label)}</button>`).join('');
  $('presets').onclick = (e) => {
    const p = M.PRESETS[e.target.closest('button')?.dataset.p];
    if (p) update({ from: meta.months.indexOf(p.from), to: meta.months.indexOf(p.to) });
  };

  $('channels').insertAdjacentHTML('beforeend', meta.channels.map((c, i) =>
    `<label class="check"><input type="checkbox" value="${i}"><span class="box ch${i}" aria-hidden="true"></span>${esc(c)}</label>`).join(''));
  $('channels').onchange = () => {
    const on = [...$('channels').querySelectorAll('input:checked')].map((x) => Number(x.value));
    update({ channels: on });
  };
  $('chanLegend').innerHTML = meta.channels.map((c, i) => `<span class="key"><i class="ch${i}"></i>${esc(c)}</span>`).join('');

  $('clearCat').onclick = () => update({ category: null });
  setupSheetTabs();
  setupTooltip();
  syncControls();
}

function syncControls() {
  const { meta } = data;
  for (const b of $('branchTabs').children) {
    const v = b.dataset.b === '' ? null : Number(b.dataset.b);
    b.setAttribute('aria-pressed', String(v === st.branch));
  }
  $('from').value = st.from;
  $('to').value = st.to;
  for (const b of $('presets').children) {
    const p = M.PRESETS[b.dataset.p];
    b.setAttribute('aria-pressed', String(meta.months.indexOf(p.from) === st.from && meta.months.indexOf(p.to) === st.to));
  }
  for (const x of $('channels').querySelectorAll('input')) x.checked = st.channels.includes(Number(x.value));
}

function update(patch) {
  st = { ...st, ...patch };
  const h = M.encodeState(st, data.meta);
  history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
  syncControls();
  render();
}

// ---------- the report
function renderAll() { render(); renderNotes(); }

function periodText(from, to) {
  const m = data.meta.months;
  return from === to ? M.monthName(m[from], true) : `${M.monthName(m[from], from !== to && m[from].slice(0, 4) !== m[to].slice(0, 4))} لـ ${M.monthName(m[to], true)}`;
}

function render() {
  const { meta } = data;
  const branch = st.branch === null ? 'الفروع التلاتة' : `فرع ${meta.branches[st.branch]}`;
  const chans = st.channels.length === meta.channels.length ? 'كل القنوات' : st.channels.map((c) => meta.channels[c]).join(' و') || 'من غير قنوات';
  const cmp = M.previousPeriod(st.from, st.to) ? `، مقارنةً بالفترة اللي قبلها بنفس الطول` : '. الملف بيبدأ نوفمبر 2025، فمفيش فترة قبلها للمقارنة';
  $('scope').textContent = `${branch}، ${chans}، ${periodText(st.from, st.to)}${cmp}`;

  if (!st.channels.length) {
    $('totals').innerHTML = `<p class="empty">اختار قناة واحدة على الأقل عشان الأرقام تظهر. <button type="button" class="link" id="allCh">رجّع كل القنوات</button></p>`;
    $('allCh').onclick = () => update({ channels: meta.channels.map((_, i) => i) });
    for (const id of ['trend', 'cats', 'week', 'products']) $(id).innerHTML = '';
    $('chans').innerHTML = channelColumns(M.channelShareByMonth(data, st), meta.channels, []);
    return;
  }

  const k = M.kpiBlock(data, st);
  const prevTxt = k.prev ? `عن ${periodText(k.prev.from, k.prev.to)}` : '';
  const cell = (label, value, unit, ch, invert = false, note = '') => {
    let line = note ? `<span class="vs none">${note}</span>` : '';
    if (ch !== null) {
      const bad = invert ? ch > 0.005 : ch < -0.005;
      line += `<span class="vs${bad ? ' down' : ''}">${M.fmtChange(ch)} ${esc(prevTxt)}</span>`;
    }
    return `<div class="total"><p class="col-head">${label}</p><p class="figure">${value}${unit ? `<small>${unit}</small>` : ''}</p>${line}</div>`;
  };
  $('totals').innerHTML =
    cell('صافي المبيعات', M.fmtInt(k.now.net), 'ج.م', k.change.net) +
    cell('عدد الفواتير', M.fmtInt(k.now.invoices), 'فاتورة', k.change.invoices) +
    cell('متوسط الفاتورة', M.fmtInt(k.now.avgTicket), 'ج.م', k.change.avgTicket) +
    cell('نسبة المرتجعات', M.fmtPct(k.now.returnRate, 1), '', k.change.returnRate, true, `${M.fmtInt(k.now.returns)} ج.م مرتجعات`);

  const months = st.to - st.from + 1;
  const mode = months >= 4 ? 'month' : 'day';
  $('trendTitle').textContent = mode === 'month' ? 'صافي المبيعات شهر بشهر' : 'صافي المبيعات يوم بيوم';
  const series = mode === 'month' ? M.monthlySeries(data, st) : M.dailySeries(data, st);
  const W = (id, min = 300) => Math.max(min, Math.round($(id).clientWidth || min));
  const narrow = W('trend') < 560;
  $('trend').innerHTML = trendChart(series, { mode, events: M.eventsInRange(meta, st), width: W('trend'), height: narrow ? 260 : 320 });

  $('cats').innerHTML = categoryBars(M.byCategory(data, st), st.category, { width: W('cats') });
  $('cats').onclick = (e) => {
    const g = e.target.closest('[data-cat]');
    if (g) update({ category: st.category === Number(g.dataset.cat) ? null : Number(g.dataset.cat) });
  };
  $('cats').onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.cat) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } };
  $('chans').innerHTML = channelColumns(M.channelShareByMonth(data, st), meta.channels, st.channels, { width: W('chans'), height: 214 });
  $('week').innerHTML = weekdayColumns(M.byWeekday(data, st), { width: W('week'), height: 170 });
  renderProducts(k.prev);
}

function renderProducts(prev) {
  const { meta } = data;
  const rows = M.productRows(data, st);
  $('prodTitle').textContent = st.category === null ? 'الأصناف' : `الأصناف: ${meta.categories[st.category]}`;
  $('clearCat').hidden = st.category === null;
  const head = `<thead><tr><th scope="col" class="n">#</th><th scope="col">الصنف</th><th scope="col" class="num">الكمية</th>
    <th scope="col" class="num">صافي المبيعات</th><th scope="col" class="num">النصيب</th>
    ${prev ? '<th scope="col" class="num">عن الفترة اللي قبلها</th>' : ''}<th scope="col" class="spark-col">السنة</th></tr></thead>`;
  const body = rows.map((r, i) => {
    const ch = r.change === null ? '<span class="muted">—</span>'
      : r.before === 0 ? '<span class="new">جديد في الفترة</span>'
        : `<span class="${r.change < -0.005 ? 'down' : ''}">${M.fmtChange(r.change)}</span>`;
    const qty = r.unit === 'كيلو' ? `${M.fmtInt(r.qty)} كيلو` : `${M.fmtInt(r.qty)} ${unitPlural(r.unit)}`;
    const zero = r.net === 0 ? ' class="zero"' : '';
    return `<tr${zero}><td class="n">${i + 1}</td><th scope="row">${esc(r.name)}</th><td class="num">${qty}</td>
      <td class="num strong">${M.fmtInt(r.net)}</td><td class="num">${M.fmtPct(r.share, 1)}</td>${prev ? `<td class="num">${ch}</td>` : ''}
      <td class="spark-col">${sparkline(r.spark, st.from, st.to)}</td></tr>`;
  }).join('');
  $('products').innerHTML = head + `<tbody>${body}</tbody>`;
}

function unitPlural(u) {
  return { 'قطعة': 'قطعة', 'تورتة': 'تورتة', 'طبق': 'طبق', 'علبة': 'علبة', 'كوب': 'كوباية' }[u] || u;
}

function renderNotes() {
  $('noteList').innerHTML = data.insights.map((n) => `
    <li class="note">
      <p class="note-fig"><mark dir="ltr" class="${n.figure.startsWith('-') ? 'neg' : ''}">${esc(n.figure.replace(/^-/, '−'))}</mark></p>
      <div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><p class="action"><b>المقترح:</b> ${esc(n.action)}</p></div>
    </li>`).join('');
  const list = $('noteList');
  if (reduceMotion || !('IntersectionObserver' in window)) { list.classList.add('drawn'); return; }
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { list.classList.add('drawn'); io.disconnect(); }
  }, { threshold: 0.25 });
  io.observe(list);
}

// ---------- cleaning page
function renderCleaning() {
  const rep = data.report;
  const removed = rep.raw_rows - rep.clean_rows;
  $('cleanLede').textContent = `العميل بعت 3 ملفات: تصدير الكاشير، تصدير طلبات، وكشكول التليفون والواتساب اللي اتكتب على الكمبيوتر. ` +
    `بعد الدمج كان فيه ${M.fmtInt(rep.raw_rows)} صف. السكريبت راجع كل صف، صلّح اللي ينفع يتصلّح، وشال ${M.fmtInt(removed)} صف مكرر أو تجربة، ` +
    `والنتيجة ${M.fmtInt(rep.clean_rows)} سطر فاتورة نظيف.`;
  const src = [['POS', 'تصدير الكاشير', 'تاريخ ووقت، أسماء فروع بأكتر من شكل'], ['TALABAT', 'تصدير طلبات', 'أسماء أصناف بالإنجليزي، تاريخ يوم/شهر'], ['PHONE', 'كشكول التليفون', 'أرقام عربي، "ج.م"، فرع ناقص']];
  $('sources').innerHTML = src.map(([, name, what]) => `<div class="source"><h3>${name}</h3><p>${what}</p></div>`).join('');

  const show = (v) => (v === '' ? '<span class="blank">فاضي</span>' : bd(v));
  const cols = [['التاريخ', 'date'], ['الفرع', 'branch'], ['القناة', 'channel'], ['الصنف', 'product'], ['الكمية', 'qty'], ['الإجمالي', 'line_total']];
  const head = `<thead><tr><th scope="col">المشكلة</th>${cols.map(([c]) => `<th scope="col">${c}</th>`).join('')}</tr></thead>`;
  const body = data.raw_examples.map((ex) => {
    const cells = cols.map(([rawKey, k]) => {
      const raw = ex.raw[rawKey];
      if (!ex.clean) return `<td><span class="was">${show(raw)}</span></td>`;
      const fixed = fmtClean(k, ex.clean[k]);
      const same = String(raw).trim() === fixed;
      return `<td>${same ? bd(raw) : `<span class="was">${show(raw)}</span><span class="now">${bd(fixed)}</span>`}</td>`;
    }).join('');
    return `<tr class="${ex.clean ? 'fix' : 'drop'}"><th scope="row">${esc(ex.label)}${ex.clean ? '' : '<span class="now gone">اتشال</span>'}</th>${cells}</tr>`;
  }).join('');
  $('rawRows').innerHTML = head + `<tbody>${body}</tbody>`;
  $('runClean').onclick = runCleaning;

  $('cleanLog').innerHTML = `<thead><tr><th scope="col">اللي اتعمل</th><th scope="col" class="num">صفوف</th><th scope="col">مثال</th></tr></thead><tbody>` +
    rep.steps.map((s) => `<tr class="${s.rows ? '' : 'zero'}"><td>${esc(s.title)}</td><td class="num strong">${M.fmtInt(s.rows)}</td>
      <td>${s.examples[0] ? `<span class="ex-was">${bd(s.examples[0][0])}</span> ← ${bd(s.examples[0][1])}` : '<span class="muted">ولا صف</span>'}</td></tr>`).join('') + '</tbody>';
}

function fmtClean(k, v) {
  if (k === 'qty') return String(Number(v));
  if (k === 'line_total') return String(Number(v));
  return String(v);
}

function runCleaning() {
  const rows = [...$('rawRows').querySelectorAll('tbody tr')];
  const btn = $('runClean');
  btn.disabled = true;
  const done = () => {
    const fixed = rows.filter((r) => r.classList.contains('fix')).length;
    $('cleanStatus').textContent = `${rows.length} صفوف: ${fixed} اتصلّحوا و${rows.length - fixed} اتشالوا. نفس القواعد اشتغلت على الـ ${M.fmtInt(data.report.raw_rows)} صف.`;
    btn.textContent = 'اتنضّفت';
  };
  if (reduceMotion) { rows.forEach((r) => r.classList.add('cleaned')); done(); return; }
  rows.forEach((r, i) => setTimeout(() => { r.classList.add('cleaned'); if (i === rows.length - 1) setTimeout(done, 450); }, i * 260));
}

// ---------- tabs + tooltip
function setupSheetTabs() {
  const tabs = [...document.querySelectorAll('.sheets [role=tab]')];
  const select = (t) => {
    for (const x of tabs) {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      $(x.getAttribute('aria-controls')).hidden = !on;
    }
    document.body.dataset.page = t.id;
  };
  tabs.forEach((t, i) => {
    t.onclick = () => select(t);
    t.onkeydown = (e) => {
      const d = { ArrowLeft: 1, ArrowRight: -1 }[e.key];
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length];
      n.focus(); select(n);
    };
  });
}

function setupTooltip() {
  const tip = $('tip');
  const show = (el, x, y) => {
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = `${Math.min(Math.max(8, x - r.width / 2), innerWidth - r.width - 8)}px`;
    tip.style.top = `${Math.max(8, y - r.height - 12)}px`;
  };
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el) show(el, e.clientX, e.clientY); else tip.hidden = true;
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    const r = el.getBoundingClientRect();
    show(el, r.left + r.width / 2, r.top);
  });
  document.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
}

let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => data && render(), 150); });
load();
