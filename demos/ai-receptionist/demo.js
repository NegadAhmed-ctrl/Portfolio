// Demo page. In "sandbox" mode the real engine runs inside the browser
// with an in-memory calendar and store. When this page is served by the
// receptionist server (npm start) it switches to "live" mode and talks to
// the real API instead.

import { createReceptionist } from './src/core/engine.js';
import { applyEventsToOutbox } from './src/core/outbox.js';
import { createMemoryStore } from './src/adapters/store/memory.js';
import { createMemoryCalendar } from './src/adapters/calendar/memory.js';
import { formatDate, formatTime, addDays, nowLocal, dayKey } from './src/core/time.js';

const WA = 'https://wa.me/201148333903?text=';
const API = new URL('./api/', import.meta.url).href; // same server in live mode
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

// ---------- page text (EN / AR) ----------
const AR = {
  brandSub: 'موظف استقبال ذكي', navDemo: 'جرّب بنفسك', navDash: 'لوحة العيادة', navReal: 'إيه الحقيقي', navHow: 'بيشتغل إزاي',
  ctaTop: 'عايزه لعيادتك', eyebrow: 'لعيادات الأسنان والعيادات الطبية ومراكز التجميل والعلاج الطبيعي',
  h1: 'كل رسالة من مريض بيترد عليها وبتتحجز، <em>حتى الساعة ٢ بالليل.</em>',
  lead: 'نور بترد على موقعك أو تليجرام أو واتساب بالعربي والإنجليزي. بترد من قائمة أسعارك وسياساتك إنت، وبتحجز المواعيد الفاضية على Google Calendar، وأي حاجة حساسة بتحوّلها لفريق الريسبشن.',
  h1t: 'بترد من معلوماتك', h1d: 'الأسعار، المواعيد، العنوان، التأمين. لو المعلومة مش عندك، بتقول كده.',
  h2t: 'بتحجز مواعيد فاضية فعلًا', h2d: 'بتشيك على الكالندر، وتتأكد تاني قبل التأكيد، ومفيش حجز مكرر.',
  h3t: 'تغيير وإلغاء بالكود', h3d: 'المريض يغيّر ميعاده بنفسه. التغيير المتأخر بيروح للفريق.',
  h4t: 'بتحوّل لموظف', h4d: 'الأسئلة الطبية والطوارئ والشكاوى بتروح لفريقك.',
  tryTitle: 'جرّب تقول', online: 'متاحة · بترد فورًا', sandbox: 'نسخة تجريبية', live: 'متصل بالسيرفر',
  ph: 'اكتب رسالة… مثلًا: عايز احجز تنظيف بكرة', disc: 'العيادة والبيانات وهمية. مفيش رسايل بتتبعت فعلًا.', reset: 'ابدأ من جديد',
  dashK: 'ناحية العيادة', dashH: 'اللي فريق الريسبشن بيشوفه', dashP: 'كل حاجة المساعد بيعملها بتظهر هنا: الكالندر، كل الحجوزات، الرسايل المستنية موافقة، والمحادثات اللي محتاجة حد. احجز حاجة في الشات وشوفها بتظهر.',
  tCal: 'الكالندر', tBook: 'الحجوزات', tOut: 'مستني موافقة', tHand: 'محتاج موظف', tLeads: 'العملاء المحتملين', tLog: 'السجل',
  honK: 'من غير تجميل', honH: 'إيه اللي شغال فعلًا في الديمو ده، وإيه المحاكاة',
  realH: 'شغال فعلًا', simH: 'محاكاة هنا', needH: 'بيتفعّل لكل عميل',
  realL: ['فهم العربي (المصري) والإنجليزي', 'منطق الحجز والتغيير والإلغاء', 'البحث عن مواعيد فاضية من مواعيد العمل والمواعيد المشغولة', 'منع الحجز المكرر والتداخل', 'الرد من معلومات العيادة بس', 'حماية من النصايح الطبية وتحويل الطوارئ', 'طابور موافقة لكل رسالة خارجة'],
  simL: ['الكالندر نسخة جوه المتصفح، مش Google Calendar', 'رسايل التأكيد والتذكير مش بتتبعت فعلًا', 'المواعيد المشغولة أمثلة', 'كل حاجة بتتمسح لما تعمل ريفرش', 'صياغة الذكاء الاصطناعي مقفولة؛ الردود من معلومات العيادة مباشرة'],
  needL: ['Google Calendar (service account) – متبرمج ومتجرب بمحاكاة', 'بوت تليجرام – متبرمج ومتجرب بمحاكاة', 'WhatsApp Cloud API – جاهز، محتاج حساب Meta بتاع العيادة', 'CRM على Google Sheets عن طريق n8n – الـ workflows اتشغلت في sandbox', 'Claude / Gemini / OpenAI – اختياري وقابل للتبديل'],
  howK: 'من جوه', howH: 'بيشتغل إزاي',
  s1t: 'المريض يبعت رسالة', s1d: 'شات الموقع أو تليجرام أو واتساب. نفس المساعد في كل مكان.',
  s2t: 'المساعد يفهم ويشيك', s2d: 'يحدد الخدمة واليوم والوقت، ويسأل الكالندر إيه الفاضي فعلًا.',
  s3t: 'الحجز يتسجل', s3d: 'ميعاد على Google Calendar، وسطر في شيت العملاء، ورسالة تأكيد مستنية موافقة.',
  s4t: 'n8n يخلّص الشغل الإداري', s4d: 'يبعت التذكيرات بعد الموافقة، ينبّه الفريق، ويبعت ملخص يومي.',
  finalH: 'عايز ده يرد على رسايل عيادتك؟', finalP: 'بظبطه بخدماتك وأسعارك والكالندر بتاعك، نجربه مع فريقك، وبعدين أسلمهولك.',
  ctaBottom: 'كلم Negad على واتساب', foot: 'من Negad Builds · إسكندرية، مصر · عيادة "سمايل هب" في الديمو وهمية.',
};
const EN = {};
let pageLang = 'en';

function applyLang(lang) {
  pageLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n],[data-i18n-html],[data-i18n-ph],[data-i18n-list]').forEach((el) => {
    for (const attr of ['i18n', 'i18nHtml', 'i18nPh', 'i18nList']) {
      const key = el.dataset[attr];
      if (!key) continue;
      const store = attr === 'i18n' ? 'textContent' : attr === 'i18nHtml' ? 'innerHTML' : attr === 'i18nPh' ? 'placeholder' : 'list';
      if (!(key in EN)) EN[key] = store === 'list' ? [...el.children].map((li) => li.textContent) : store === 'placeholder' ? el.placeholder : el[store];
      const v = lang === 'ar' ? (AR[key] ?? EN[key]) : EN[key];
      if (store === 'list') el.innerHTML = v.map((x) => `<li>${esc(x)}</li>`).join('');
      else el[store] = v;
    }
  });
  $('#langBtn').textContent = lang === 'ar' ? 'English' : 'العربية';
  $('#clinicName').textContent = business.name[lang];
  const ctaText = lang === 'ar' ? 'أهلًا Negad، شفت ديمو موظف الاستقبال الذكي وعايز أعرف أكتر لعيادتي.' : 'Hi Negad, I saw the AI receptionist demo and want to know more for my clinic.';
  $('#ctaTop').href = $('#ctaBottom').href = WA + encodeURIComponent(ctaText);
  renderChips();
  renderDash();
  try { localStorage.setItem('nour-lang', lang); } catch {}
}

const TRY = {
  en: ['Book a cleaning tomorrow at 5pm', 'How much is whitening?', 'Do you accept insurance?', 'My tooth hurts, what should I take?', 'I want to reschedule', 'Talk to a human'],
  ar: ['عايز احجز كشف يوم السبت', 'بكام التبييض؟', 'العنوان فين؟', 'سناني بتوجعني آخد إيه؟', 'عايز ألغي الحجز', 'عايز اكلم حد'],
};
function renderChips() {
  $('#tryChips').innerHTML = [...TRY[pageLang], ...TRY[pageLang === 'ar' ? 'en' : 'ar'].slice(0, 2)].map((t) => `<button class="chip" type="button">${esc(t)}</button>`).join('');
  $('#tryChips').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { send(b.textContent); if (innerWidth < 980) $('.chat').scrollIntoView({ behavior: 'smooth' }); }));
}

// ---------- backends ----------
const business = await (await fetch(new URL('./config/business.example.json', import.meta.url))).json();
const sessionId = 'demo-' + Math.random().toString(36).slice(2, 10);

function sandboxBackend() {
  let store, calendar, r, logs;
  const init = () => {
    store = createMemoryStore();
    calendar = createMemoryCalendar({ business });
    r = createReceptionist({ business, calendar, store });
    logs = [];
  };
  init();
  return {
    mode: 'sandbox',
    reset: init,
    async send(text) {
      const out = await r.handle({ sessionId, text, channel: 'web', msgId: 'm' + Date.now() });
      await applyEventsToOutbox(store, out.events, { messageMode: 'approve' });
      for (const e of out.events) logs.unshift({ at: new Date(), type: e.type, detail: e.booking?.code || e.handoff?.id || e.lead?.status || e.text || '' });
      return out.replies;
    },
    async overview() {
      return { bookings: await store.findBookings({}), outbox: await store.listOutbox(), handoffs: await store.listHandoffs(), leads: await store.listLeads(), events: calendar.events, logs };
    },
    async approve(id) { await store.updateOutbox(id, { status: 'simulated_sent', sentAt: new Date().toISOString() }); logs.unshift({ at: new Date(), type: 'message.approved', detail: id + ' → simulated send' }); },
    async reject(id) { await store.updateOutbox(id, { status: 'rejected' }); },
    async staffReply(h, text) { await r.staffReply(h.sessionId, text); await store.appendHandoffMessage(h.id, { role: 'staff', text, at: new Date().toISOString() }); return text; },
    async resolve(h) { const x = await r.resumeBot(h.sessionId); return x.text; },
  };
}

function liveBackend() {
  let token = '';
  try { token = sessionStorage.getItem('nour-admin') || ''; } catch {}
  const admin = async (path, method = 'GET', body) => {
    if (!token) { token = prompt('Staff dashboard: enter ADMIN_TOKEN') || ''; try { sessionStorage.setItem('nour-admin', token); } catch {} }
    const res = await fetch(API + 'admin/' + path, { method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
    if (res.status === 401) { token = ''; throw new Error('unauthorized'); }
    return res.json();
  };
  return {
    mode: 'live',
    reset() {},
    async send(text) {
      const res = await fetch(API + 'chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, text, msgId: 'm' + Date.now() }) });
      const j = await res.json();
      return j.replies || [{ text: j.error || 'Error' }];
    },
    async overview() { const o = await admin('overview'); return { ...o, events: o.bookings.filter((b) => b.status === 'confirmed').map((b) => ({ start: b.start, end: b.end, code: b.code, summary: b.serviceName + ' – ' + b.name })), logs: [] }; },
    approve: (id) => admin(`outbox/${id}/approve`, 'POST'),
    reject: (id) => admin(`outbox/${id}/reject`, 'POST'),
    staffReply: (h, text) => admin(`handoffs/${h.id}/reply`, 'POST', { text }).then(() => null),
    resolve: (h) => admin(`handoffs/${h.id}/resolve`, 'POST').then((j) => null),
  };
}

let backend = sandboxBackend();
if (!/github\.io$|claudeusercontent|claude\.ai/.test(location.hostname)) try {
  const ctl = new AbortController(); setTimeout(() => ctl.abort(), 1200);
  const h = await fetch(API + 'health', { signal: ctl.signal });
  if (h.ok && (await h.json()).ok) backend = liveBackend();
} catch {}
if (backend.mode === 'live') { const b = $('#modeBadge'); b.classList.add('live'); b.dataset.i18n = 'live'; b.textContent = 'Live server'; }

// ---------- chat UI ----------
const msgs = $('#msgs');
const stamp = () => new Date().toLocaleTimeString(pageLang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
function addMsg(text, who = 'bot', whoLabel) {
  const div = document.createElement('div');
  div.className = 'msg ' + who;
  div.dir = 'auto';
  if (whoLabel) div.dataset.who = whoLabel;
  div.innerHTML = linkify(text) + `<time>${stamp()}</time>`;
  msgs.querySelector('.opts')?.remove();
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}
function addOptions(options) {
  const wrap = document.createElement('div');
  wrap.className = 'opts';
  for (const o of options) {
    const b = document.createElement('button');
    b.type = 'button'; b.dir = 'auto';
    b.textContent = typeof o === 'string' ? o : o.label;
    b.addEventListener('click', () => send(typeof o === 'string' ? o : o.value, b.textContent));
    wrap.appendChild(b);
  }
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}
let busy = false;
async function send(text, shown) {
  text = String(text).trim();
  if (!text || busy) return;
  busy = true;
  addMsg(shown || text, 'user');
  const typing = document.createElement('div');
  typing.className = 'typing'; typing.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight;
  try {
    const [replies] = await Promise.all([backend.send(text), new Promise((r) => setTimeout(r, 450))]);
    typing.remove();
    for (const r of replies) { addMsg(r.text); if (r.options) addOptions(r.options); }
  } catch (e) {
    typing.remove(); addMsg('⚠️ ' + e.message);
  }
  busy = false;
  renderDash();
}
$('#compose').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#input').value; $('#input').value = ''; send(v); });
function greet() {
  msgs.innerHTML = '';
  const lang = pageLang;
  const g = createReceptionist({ business, calendar: { listBusy: async () => [] }, store: createMemoryStore() }).greeting(lang);
  addMsg(g.text); addOptions(g.options);
}
$('#resetBtn').addEventListener('click', () => { backend.reset(); greet(); renderDash(); });

// ---------- dashboard ----------
let tab = 'cal';
let calDay = null;
document.querySelectorAll('.dtab').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.dtab').forEach((x) => x.setAttribute('aria-selected', x === b));
  tab = b.dataset.tab; renderDash();
}));
const L = (en, ar) => (pageLang === 'ar' ? ar : en);
const svcName = (id) => business.services.find((s) => s.id === id)?.name[pageLang] || id;
const fmtLocal = (s) => `${formatDate(s.slice(0, 10), pageLang)} · ${formatTime(s.slice(11, 16), pageLang)}`;
const fmtIso = (iso) => new Date(iso).toLocaleString(pageLang === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: business.timezone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const statusLabel = (s) => ({ confirmed: L('confirmed', 'مؤكد'), cancelled: L('cancelled', 'ملغي'), pending_approval: L('waiting approval', 'مستني موافقة'), approved: L('approved', 'اتوافق عليه'), simulated_sent: L('sent (simulated)', 'اتبعت (محاكاة)'), rejected: L('rejected', 'مرفوض'), superseded: L('replaced', 'اتغيّر'), open: L('open', 'مفتوح'), resolved: L('resolved', 'اتحل'), urgent: L('urgent', 'عاجل'), high: L('high', 'مهم'), normal: L('normal', 'عادي'), interested: L('interested', 'مهتم'), booked: L('booked', 'حجز') }[s] || s);

async function renderDash() {
  const o = await backend.overview().catch((e) => ({ error: e.message }));
  const panel = $('#dpanel');
  if (o.error) { panel.innerHTML = `<p class="empty">${esc(o.error)}</p>`; return; }
  const setCount = (id, n) => { const el = $(id); el.textContent = n || ''; el.dataset.n = n; };
  setCount('#cBook', o.bookings.filter((b) => b.status === 'confirmed').length);
  setCount('#cOut', o.outbox.filter((m) => m.status === 'pending_approval').length);
  setCount('#cHand', o.handoffs.filter((h) => h.status === 'open').length);

  if (tab === 'cal') {
    const today = nowLocal(business.timezone).date;
    const days = [];
    for (let i = 0; days.length < 7 && i < 14; i++) { const d = addDays(today, i); if ((business.hours[dayKey(d)] || []).length) days.push(d); }
    const booked = o.events.filter((e) => e.code).map((e) => e.start.slice(0, 10));
    if (!calDay || !days.includes(calDay)) calDay = booked.find((d) => days.includes(d)) || days[0];
    const evs = o.events.filter((e) => e.start.startsWith(calDay)).sort((a, b) => a.start.localeCompare(b.start));
    panel.innerHTML = `<div class="days">${days.map((d) => `<button class="day" type="button" data-d="${d}" aria-pressed="${d === calDay}">${esc(formatDate(d, pageLang).split(/[,،]/)[0])}<small>${esc(formatDate(d, pageLang).split(/[,،]\s*/)[1] || '')}</small></button>`).join('')}</div>
      <div class="timeline">${evs.length ? evs.map((e) => `<div class="slot"><time>${esc(formatTime(e.start.slice(11), pageLang))}</time><div class="ev ${e.code ? 'ai' : ''}">${e.code ? `${esc(e.summary)} <small>· ${esc(e.code)} · ${L('booked by assistant', 'حجزها المساعد')}</small>` : L('Existing appointment (sample)', 'ميعاد موجود (مثال)')}</div></div>`).join('') : `<p class="empty">${L('No appointments yet.', 'مفيش مواعيد لسه.')}</p>`}</div>
      <p class="note">${backend.mode === 'sandbox' ? L('Sandbox calendar. In production this is the clinic\'s Google Calendar: staff can block time there and the assistant respects it.', 'كالندر تجريبي. في الحقيقة ده Google Calendar بتاع العيادة، والفريق يقدر يقفل أي وقت منه والمساعد يحترمه.') : ''}</p>`;
    panel.querySelectorAll('.day').forEach((b) => b.addEventListener('click', () => { calDay = b.dataset.d; renderDash(); }));
  }

  if (tab === 'book') {
    const rows = o.bookings.slice().reverse();
    panel.innerHTML = rows.length ? `<table><thead><tr><th>${L('Code', 'الكود')}</th><th>${L('Patient', 'المريض')}</th><th>${L('Service', 'الخدمة')}</th><th>${L('Time', 'الميعاد')}</th><th>${L('Status', 'الحالة')}</th></tr></thead><tbody>${rows.map((b) => `<tr><td><b>${esc(b.code)}</b></td><td>${esc(b.name)}<br><small class="hide-sm" dir="ltr">${esc(b.phone)}</small></td><td>${esc(svcName(b.serviceId))}</td><td>${esc(fmtLocal(b.start))}${b.rescheduledFrom ? `<br><small>${L('moved from', 'كان')} ${esc(fmtLocal(b.rescheduledFrom))}</small>` : ''}</td><td><span class="tag ${b.status}">${esc(statusLabel(b.status))}</span></td></tr>`).join('')}</tbody></table>` : `<p class="empty">${L('No bookings yet. Try "book a cleaning tomorrow" in the chat.', 'مفيش حجوزات لسه. جرّب "عايز احجز تنظيف بكرة" في الشات.')}</p>`;
  }

  if (tab === 'out') {
    const rows = o.outbox.slice().reverse();
    panel.innerHTML = (rows.length ? rows.map((m) => `<div class="msgcard"><header><span class="tag ${m.status}">${esc(statusLabel(m.status))}</span><b>${m.kind === 'reminder' ? L('Reminder', 'تذكير') : L('Confirmation', 'تأكيد')}</b> · ${esc(m.bookingCode)} · ${L('to', 'إلى')} <span dir="ltr">${esc(m.to)}</span> · ${L('via', 'عن طريق')} ${esc(m.channel)} · ${L('send at', 'يتبعت')} ${esc(fmtIso(m.sendAt))}</header><p dir="auto">${esc(m.text)}</p>${m.status === 'pending_approval' ? `<div class="row"><button class="btn ok" data-a="approve" data-id="${m.id}">${L('Approve', 'موافقة')}</button><button class="btn warn" data-a="reject" data-id="${m.id}">${L('Reject', 'رفض')}</button></div>` : ''}</div>`).join('') : `<p class="empty">${L('Confirmations and reminders wait here until a staff member approves them.', 'رسايل التأكيد والتذكير بتستنى هنا لحد ما حد من الفريق يوافق عليها.')}</p>`)
      + `<p class="note">${L('Nothing is ever sent automatically. After approval, n8n sends it at the scheduled time (in this demo the send is simulated).', 'مفيش حاجة بتتبعت لوحدها. بعد الموافقة، n8n بيبعتها في ميعادها (في الديمو الإرسال محاكاة).')}</p>`;
    panel.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', async () => { await backend[b.dataset.a](b.dataset.id); renderDash(); }));
  }

  if (tab === 'hand') {
    const rows = o.handoffs.slice().reverse();
    panel.innerHTML = rows.length ? rows.map((h) => `<div class="msgcard" data-h="${esc(h.id)}"><header><span class="tag ${h.priority}">${esc(statusLabel(h.priority))}</span><span class="tag ${h.status}">${esc(statusLabel(h.status))}</span><b>${esc(h.id)}</b> · ${esc(h.reason.replace(/_/g, ' '))} · ${esc(fmtIso(h.createdAt))}</header>
      <div class="thread">${[...(h.lastMessages || []), ...(h.thread || [])].slice(-8).map((m) => `<div dir="auto"><b>${m.role === 'user' ? L('Patient', 'المريض') : m.role === 'staff' ? L('Staff', 'الفريق') : 'Nour'}:</b> ${esc(m.text)}</div>`).join('')}</div>
      ${h.status === 'open' ? `<div class="reply"><input placeholder="${L('Reply as reception…', 'رد كفريق الريسبشن…')}" dir="auto"><button class="btn ok" data-r="send">${L('Send', 'ابعت')}</button><button class="btn" data-r="resolve">${L('Return to assistant', 'رجّعها للمساعد')}</button></div>` : ''}</div>`).join('') : `<p class="empty">${L('Chats that need a person show up here: emergencies, medical questions, complaints, or "talk to a human".', 'المحادثات اللي محتاجة حد بتظهر هنا: الطوارئ، الأسئلة الطبية، الشكاوى، أو "عايز اكلم حد".')}</p>`;
    panel.querySelectorAll('.msgcard[data-h]').forEach((card) => {
      const h = o.handoffs.find((x) => x.id === card.dataset.h);
      card.querySelector('[data-r=send]')?.addEventListener('click', async () => {
        const input = card.querySelector('input'); const text = input.value.trim(); if (!text) return;
        await backend.staffReply(h, text); addMsg(text, 'staff', L('Mona · Reception', 'منى · الريسبشن')); renderDash();
      });
      card.querySelector('[data-r=resolve]')?.addEventListener('click', async () => { const t = await backend.resolve(h); if (t) addMsg(t); renderDash(); });
    });
  }

  if (tab === 'leads') {
    const rows = (o.leads || []).slice().reverse();
    panel.innerHTML = rows.length ? `<table><thead><tr><th>${L('Name', 'الاسم')}</th><th>${L('Phone', 'الموبايل')}</th><th>${L('Interested in', 'مهتم بـ')}</th><th>${L('Status', 'الحالة')}</th></tr></thead><tbody>${rows.map((l) => `<tr><td>${esc(l.name || '-')}</td><td dir="ltr">${esc(l.phone || '-')}</td><td>${esc(svcName(l.interest))}</td><td><span class="tag ${l.status === 'booked' ? 'confirmed' : 'open'}">${esc(statusLabel(l.status))}</span></td></tr>`).join('')}</tbody></table><p class="note">${L('People who gave their name but didn\'t finish booking are kept as leads for follow-up. In production they sync to a Google Sheet via n8n.', 'اللي ادّى اسمه ومكمّلش الحجز بيتسجل كعميل محتمل للمتابعة. في الحقيقة بيتنقلوا لشيت Google عن طريق n8n.')}</p>` : `<p class="empty">${L('No leads yet.', 'مفيش عملاء محتملين لسه.')}</p>`;
  }

  if (tab === 'log') {
    panel.innerHTML = o.logs.length ? `<div class="log">${o.logs.slice(0, 40).map((l) => `<div>${esc(l.at.toLocaleTimeString('en-GB'))}  ${esc(l.type)}  ${esc(l.detail)}</div>`).join('')}</div><p class="note">${L('These are the events the server sends to n8n (booking.created, handoff.requested, …).', 'دي الأحداث اللي السيرفر بيبعتها لـ n8n.')}</p>` : `<p class="empty">${L('Events will appear here as you chat.', 'الأحداث هتظهر هنا وإنت بتتكلم.')}</p>`;
  }
}

// ---------- start ----------
$('#langBtn').addEventListener('click', () => { applyLang(pageLang === 'ar' ? 'en' : 'ar'); greet(); });
let startLang = new URLSearchParams(location.search).get('lang');
try { startLang = startLang || localStorage.getItem('nour-lang'); } catch {}
applyLang(startLang === 'ar' ? 'ar' : 'en');
greet();
