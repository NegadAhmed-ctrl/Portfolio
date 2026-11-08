// The receptionist "brain". It is plain JavaScript with no Node-only APIs,
// so the exact same file runs in the server AND in the browser demo.
//
// handle(msg) -> { replies: [{ text, options? }], events: [...] }
//
// Booking, cancelling and rescheduling are a step-by-step state machine.
// Facts (prices, hours, policies) come only from the business config.
// The optional LLM is used only to phrase answers from that config.

import * as nlu from './nlu.js';
import { buildEntries, search } from './kb.js';
import { findSlots, isSlotFree } from './slots.js';
import { t } from './i18n.js';
import { nowLocal, formatSlot, formatDate, addMinutesLocal, localToDate, dayKey, addDays } from './time.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createReceptionist({ business, calendar, store, llm = null, now = () => new Date(), random = Math.random, codePrefix }) {
  const entries = buildEntries(business);
  const prefix = codePrefix || business.name.en.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase().padEnd(2, 'X');
  const lateChangeHours = business.lateChangeHours ?? 3;

  const newCode = () => prefix + '-' + Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]).join('');
  const today = () => nowLocal(business.timezone, now()).date;
  const vars = (lang, extra = {}) => ({
    clinic: business.name[lang], assistant: business.assistantName[lang],
    staff: business.handoff.staffName[lang], within: business.handoff.replyWithin[lang],
    address: business.address[lang], ...extra,
  });
  const svcById = (id) => business.services.find((s) => s.id === id);
  const reply = (text, options) => (options ? { text, options } : { text });

  async function getSession(id, channel) {
    let s = await store.getSession(id);
    if (!s) {
      s = { id, channel, lang: null, flow: null, step: null, data: {}, history: [], seen: [], misses: 0, createdAt: now().toISOString() };
    }
    return s;
  }

  // ---------------- public API ----------------

  async function handle({ sessionId, text, channel = 'web', msgId, phone }) {
    const session = await getSession(sessionId, channel);
    // Duplicate prevention: the same message id is answered only once.
    if (msgId && session.seen.includes(msgId)) return { replies: session.lastReplies || [], events: [], duplicate: true };

    const lang = nlu.detectLang(text, session.lang || business.defaultLang || 'ar');
    session.lang = lang;
    if (phone && !session.data.phone) session.data.knownPhone = phone;
    session.history.push({ role: 'user', text, at: now().toISOString() });

    const ctx = { session, lang, text, events: [], replies: [] };
    try {
      await route(ctx);
    } catch (err) {
      ctx.replies = [reply(t('error', lang))];
      ctx.events.push({ type: 'error', sessionId, message: String(err && err.message || err) });
      await openHandoff(ctx, 'system_error', 'normal');
    }

    for (const r of ctx.replies) session.history.push({ role: 'assistant', text: r.text, at: now().toISOString() });
    session.history = session.history.slice(-40);
    if (msgId) session.seen = [...session.seen, msgId].slice(-50);
    session.lastReplies = ctx.replies;
    session.updatedAt = now().toISOString();
    await store.saveSession(session);
    for (const e of ctx.events) await store.log({ ...e, sessionId, at: now().toISOString() });
    return { replies: ctx.replies, events: ctx.events };
  }

  // Staff actions (used by the dashboard / Telegram / n8n).
  async function staffReply(sessionId, text) {
    const s = await store.getSession(sessionId);
    if (!s) throw new Error('session not found');
    s.history.push({ role: 'staff', text, at: now().toISOString() });
    await store.saveSession(s);
    return { text, role: 'staff' };
  }

  async function resumeBot(sessionId) {
    const s = await store.getSession(sessionId);
    if (!s) throw new Error('session not found');
    if (s.handoffId) await store.updateHandoff(s.handoffId, { status: 'resolved', resolvedAt: now().toISOString() });
    s.flow = null; s.step = null; s.handoffId = null;
    const msg = t('staffReturned', s.lang || 'en');
    s.history.push({ role: 'assistant', text: msg, at: now().toISOString() });
    await store.saveSession(s);
    return { text: msg };
  }

  function greeting(lang) {
    return reply(t('welcome', lang, vars(lang)), t('menu', lang));
  }

  // ---------------- routing ----------------

  async function route(ctx) {
    const { session, text, lang } = ctx;
    const i = nlu.detectIntents(text);
    const n = nlu.normalize(text);

    if (i.emergency) {
      ctx.replies.push(reply(business.emergency[lang]));
      await openHandoff(ctx, 'possible_emergency', 'urgent');
      return;
    }

    if (session.flow === 'human') {
      ctx.replies.push(reply(t('inHandoff', lang)));
      if (session.handoffId) await store.appendHandoffMessage(session.handoffId, { role: 'user', text, at: now().toISOString() });
      ctx.events.push({ type: 'handoff.message', handoffId: session.handoffId, text });
      return;
    }

    if (/^(menu|start over|reset|restart|القائمه|ابدا من الاول|من الاول)$/.test(n)) {
      session.flow = null; session.step = null; session.data = {};
      ctx.replies.push(greeting(lang));
      return;
    }

    if (i.human && !(session.flow && /^(time|service|الميعاد|الخدمه)$/.test(n))) {
      await openHandoff(ctx, 'customer_request', 'normal');
      return;
    }

    if (session.flow === 'book') {
      if (i.cancel && !['confirm', 'change'].includes(session.step)) {
        session.flow = null; session.step = null;
        ctx.replies.push(reply(t('flowCancelled', lang)));
        return;
      }
    } else {
      if (i.cancel && session.flow !== 'cancel') return startCancel(ctx);
      if (i.reschedule && session.flow !== 'reschedule') return startReschedule(ctx);
    }

    if (session.flow === 'book') return bookStep(ctx, i);
    if (session.flow === 'cancel' || session.flow === 'reschedule') return changeStep(ctx, i);

    if (session.flow === 'offerBook') {
      session.flow = null;
      if (i.yes || i.book) return startBooking(ctx, { defaultService: session.data.offerService });
      if (i.no) { ctx.replies.push(reply(t('bye', lang))); return; }
    }

    const service = nlu.matchService(text, business.services);
    if (i.medical) {
      ctx.replies.push(reply(t('medical', lang), t('medicalOpts', lang)));
      session.flow = 'offerBook'; session.data = { offerService: 'checkup' };
      ctx.events.push({ type: 'guardrail.medical', text });
      return;
    }

    if (i.book || (service && (nlu.extractDate(text, today()) || nlu.extractTime(text)))) {
      return startBooking(ctx, { service });
    }

    const hits = search(entries, text);
    if (hits.length) {
      session.misses = 0;
      ctx.replies.push(reply(await phrase(ctx, hits)));
      ctx.replies.push(reply(t('anythingElse', lang), t('bookOpts', lang)));
      session.flow = 'offerBook';
      session.data = { offerService: hits[0].entry.serviceId };
      return;
    }

    if (i.greeting) { ctx.replies.push(greeting(lang)); return; }
    if (i.thanks) { ctx.replies.push(reply(t('thanks', lang))); return; }
    if (i.no) { ctx.replies.push(reply(t('bye', lang))); return; }

    // Unknown: try the LLM against the full knowledge base, never free-form.
    const llmText = await phrase(ctx, entries.map((e) => ({ entry: e })), true);
    if (llmText) { ctx.replies.push(reply(llmText)); session.misses = 0; return; }

    session.misses = (session.misses || 0) + 1;
    ctx.events.push({ type: 'kb.miss', text });
    ctx.replies.push(reply(t('dontKnow', lang), t('dontKnowOpts', lang)));
  }

  // Use the LLM only to rephrase the matched passages. If it is not
  // configured (demo/sandbox) the best passage is returned as-is.
  async function phrase(ctx, hits, onlyLlm = false) {
    const { lang, text, session } = ctx;
    if (llm && llm.enabled) {
      try {
        const answer = await llm.answer({
          question: text, lang, businessName: business.name[lang],
          passages: hits.map((h) => h.entry[lang]),
          history: session.history.slice(-6),
        });
        if (answer && !/^\s*UNKNOWN\s*$/i.test(answer)) return answer.trim();
      } catch (e) {
        ctx.events.push({ type: 'llm.error', message: String(e.message || e) });
      }
      if (onlyLlm) return null;
    }
    if (onlyLlm) return null;
    return hits[0].entry[lang];
  }

  async function openHandoff(ctx, reason, priority) {
    const { session, lang } = ctx;
    const ticket = 'T-' + Math.floor(1000 + random() * 9000);
    const handoff = {
      id: ticket, sessionId: session.id, channel: session.channel, reason, priority, status: 'open',
      lang, customer: { name: session.data.name || null, phone: session.data.phone || session.data.knownPhone || null },
      lastMessages: session.history.slice(-8), createdAt: now().toISOString(),
    };
    await store.saveHandoff(handoff);
    session.flow = 'human'; session.step = null; session.handoffId = ticket;
    ctx.replies.push(reply(t('handoff', lang, vars(lang, { ticket }))));
    ctx.events.push({ type: 'handoff.requested', handoff });
  }

  // ---------------- booking ----------------

  async function startBooking(ctx, { service, defaultService } = {}) {
    const { session, text } = ctx;
    session.flow = 'book';
    session.data = { phone: session.data.phone, knownPhone: session.data.knownPhone, name: session.data.name };
    session.misses = 0;
    const s = service || nlu.matchService(text, business.services) || (defaultService && svcById(defaultService));
    if (s) session.data.serviceId = s.id;
    const date = nlu.extractDate(text, today());
    const time = nlu.extractTime(text);
    if (/(earliest|soonest|asap|اقرب|اسرع)/.test(nlu.normalize(text))) session.data.date = today();
    if (date) session.data.date = date;
    if (time) session.data.time = time;
    return advanceBooking(ctx);
  }

  async function advanceBooking(ctx) {
    const { session, lang } = ctx;
    const d = session.data;
    if (!d.serviceId) {
      session.step = 'service';
      ctx.replies.push(reply(t('askService', lang), business.services.map((s) => s.name[lang])));
      return;
    }
    if (!d.start) {
      if (!d.date) {
        session.step = 'date';
        ctx.replies.push(reply(t('askDate', lang, { service: svcById(d.serviceId).name[lang] }), t('daysQuick', lang)));
        return;
      }
      return offerSlots(ctx);
    }
    if (!d.name) {
      session.step = 'name';
      ctx.replies.push(reply(t('askName', lang, { slot: formatSlot(d.start, lang) })));
      return;
    }
    if (!d.phone) {
      if (d.knownPhone) d.phone = d.knownPhone;
      else {
        session.step = 'phone';
        ctx.replies.push(reply(t('askPhone', lang, { name: d.name })));
        await upsertLead(ctx, 'interested');
        return;
      }
    }
    session.step = 'confirm';
    ctx.replies.push(reply(t('confirmBooking', lang, {
      service: svcById(d.serviceId).name[lang], slot: formatSlot(d.start, lang), name: d.name, phone: d.phone,
    }), t('yesNo', lang)));
  }

  async function offerSlots(ctx) {
    const { session, lang } = ctx;
    const d = session.data;
    const svc = svcById(d.serviceId);
    // Exact time asked for and free? Take it directly.
    if (d.time) {
      const start = `${d.date}T${d.time}`;
      if (withinHours(start, svc.duration) && start > `${today()}T00:00` && localToDate(start, business.timezone) > new Date(now().getTime() + (business.minNoticeMinutes || 0) * 60000) && await isSlotFree(calendar, start, svc.duration)) {
        d.start = start; delete d.time;
        return advanceBooking(ctx);
      }
    }
    let note = '';
    if (!(business.hours[dayKey(d.date)] || []).length) note = t('closedDay', lang, { date: formatDate(d.date, lang) }) + ' ';
    else if (d.time) note = t('slotTaken', lang) + ' ';
    let slots = await findSlots({ business, calendar, duration: svc.duration, fromDate: d.date, preferredTime: d.time, now: now(), days: 1 });
    let forDate = slots.length ? t('forDate', lang, { date: formatDate(d.date, lang) }) : '';
    if (!slots.length) {
      if (!note) note = t('noSlotsDay', lang, { date: formatDate(d.date, lang) }) + ' ';
      slots = await findSlots({ business, calendar, duration: svc.duration, fromDate: addDays(d.date, 1), now: now(), days: 14 });
      forDate = '';
    }
    delete d.time;
    if (!slots.length) {
      ctx.replies.push(reply(t('noSlotsAtAll', lang)));
      await openHandoff(ctx, 'no_availability', 'normal');
      return;
    }
    d.offered = slots;
    session.step = 'slot';
    const list = slots.map((s, k) => `${k + 1}) ${formatSlot(s, lang)}`).join('\n');
    ctx.replies.push(reply(note + t('offerSlots', lang, { forDate }) + '\n' + list,
      slots.map((s, k) => ({ label: `${k + 1}) ${formatSlot(s, lang)}`, value: String(k + 1) }))));
  }

  function withinHours(start, duration) {
    const [date, time] = start.split('T');
    const end = addMinutesLocal(start, duration).split('T')[1];
    return (business.hours[dayKey(date)] || []).some(([o, c]) => time >= o && end <= c);
  }

  async function bookStep(ctx, i) {
    const { session, text, lang } = ctx;
    const d = session.data;
    const step = session.step;

    if (step === 'service') {
      const choice = nlu.extractChoice(text, business.services.length);
      const s = nlu.matchService(text, business.services) || (choice && business.services[choice - 1]);
      if (!s) return answerOrReprompt(ctx);
      d.serviceId = s.id;
      const date = nlu.extractDate(text, today()); if (date) d.date = date;
      const time = nlu.extractTime(text); if (time) d.time = time;
      return advanceBooking(ctx);
    }

    if (step === 'date' || step === 'slot') {
      if (step === 'slot') {
        const choice = nlu.extractChoice(text, d.offered.length);
        if (choice) { d.start = d.offered[choice - 1]; return advanceBooking(ctx); }
      }
      const date = nlu.extractDate(text, today());
      const time = nlu.extractTime(text);
      const earliest = /(earliest|soonest|asap|any|اقرب|اسرع|اي ميعاد|اي يوم)/.test(nlu.normalize(text));
      if (!date && !time && !earliest) return answerOrReprompt(ctx);
      if (date) d.date = date; else if (earliest) d.date = today(); else if (!d.date) d.date = today();
      if (time) d.time = time;
      if (step === 'slot' && time && !date && d.offered) {
        const match = d.offered.find((s) => s.endsWith('T' + time));
        if (match) { d.start = match; return advanceBooking(ctx); }
        d.date = d.offered[0].slice(0, 10);
      }
      return offerSlots(ctx);
    }

    if (step === 'name') {
      const name = nlu.extractName(text);
      if (!name || i.book || nlu.extractDate(text, today())) { ctx.replies.push(reply(t('badName', lang))); return; }
      d.name = name;
      const phone = nlu.extractPhone(text); if (phone) d.phone = phone;
      return advanceBooking(ctx);
    }

    if (step === 'phone') {
      const phone = nlu.extractPhone(text);
      if (!phone) { ctx.replies.push(reply(t('badPhone', lang))); return; }
      d.phone = phone;
      return advanceBooking(ctx);
    }

    if (step === 'confirm' || step === 'change') {
      const n = nlu.normalize(text);
      if (step === 'change' || !i.yes) {
        if (/^(time|date|الميعاد|الوقت|اليوم)/.test(n) || nlu.extractDate(text, today()) || nlu.extractTime(text)) {
          delete d.start; d.date = nlu.extractDate(text, today()) || null; d.time = nlu.extractTime(text);
          if (!d.date) { session.step = 'date'; ctx.replies.push(reply(t('askDate', lang, { service: svcById(d.serviceId).name[lang] }), t('daysQuick', lang))); return; }
          return offerSlots(ctx);
        }
        if (/^(service|الخدمه)/.test(n) || nlu.matchService(text, business.services)) {
          const s = nlu.matchService(text, business.services);
          delete d.start; d.serviceId = s ? s.id : null;
          return advanceBooking(ctx);
        }
        if (/(cancel|الغاء|الغي)/.test(n)) {
          session.flow = null; session.step = null;
          ctx.replies.push(reply(t('flowCancelled', lang)));
          return;
        }
        if (step === 'confirm' && (i.no || /(change|غير|اغير)/.test(n))) {
          session.step = 'change';
          ctx.replies.push(reply(t('whatChange', lang), t('changeOpts', lang)));
          return;
        }
        if (step === 'change') { ctx.replies.push(reply(t('whatChange', lang), t('changeOpts', lang))); return; }
        return answerOrReprompt(ctx);
      }
      return commitBooking(ctx);
    }

    return advanceBooking(ctx);
  }

  async function commitBooking(ctx) {
    const { session, lang } = ctx;
    const d = session.data;
    const svc = svcById(d.serviceId);

    // Duplicate prevention: same phone already has this service on that day.
    const existing = (await store.findBookings({ phone: d.phone, status: 'confirmed' }))
      .find((b) => b.serviceId === d.serviceId && b.start.slice(0, 10) === d.start.slice(0, 10));
    if (existing) {
      session.step = 'change';
      ctx.replies.push(reply(t('duplicate', lang, { service: svc.name[lang], slot: formatSlot(existing.start, lang), code: existing.code }), t('changeOpts', lang)));
      ctx.events.push({ type: 'booking.duplicate_blocked', code: existing.code });
      return;
    }
    // Re-check the slot right before booking (someone may have taken it).
    if (!(await isSlotFree(calendar, d.start, svc.duration))) {
      ctx.replies.push(reply(t('slotTaken', lang)));
      d.date = d.start.slice(0, 10); d.time = d.start.slice(11); delete d.start;
      return offerSlots(ctx);
    }

    const code = newCode();
    const end = addMinutesLocal(d.start, svc.duration);
    const event = await calendar.createEvent({
      start: d.start, end, timezone: business.timezone,
      summary: `${svc.name.en} – ${d.name}`,
      description: `Booked by AI receptionist\nCode: ${code}\nPhone: ${d.phone}\nService: ${svc.name.en}\nChannel: ${session.channel}`,
      code,
    });
    const booking = {
      code, sessionId: session.id, channel: session.channel, lang, status: 'confirmed',
      serviceId: svc.id, serviceName: svc.name.en, start: d.start, end, timezone: business.timezone,
      name: d.name, phone: d.phone, calendarEventId: event.id, createdAt: now().toISOString(),
    };
    await store.saveBooking(booking);
    await upsertLead(ctx, 'booked', code);

    const slotText = formatSlot(d.start, lang);
    ctx.replies.push(reply(t('booked', lang, { service: svc.name[lang], slot: slotText, code })));
    ctx.events.push({
      type: 'booking.created', booking,
      messages: buildCustomerMessages(booking, lang),
    });
    session.flow = null; session.step = null;
    session.data = { name: d.name, phone: d.phone };
  }

  function buildCustomerMessages(booking, lang) {
    const svc = svcById(booking.serviceId);
    const v = vars(lang, { name: booking.name, service: svc.name[lang], code: booking.code, slot: formatSlot(booking.start, lang) });
    const startUtc = localToDate(booking.start, business.timezone);
    const reminderAt = new Date(startUtc.getTime() - 24 * 3600 * 1000);
    return [
      { kind: 'confirmation', to: booking.phone, channel: booking.channel, lang, text: t('confirmMsg', lang, v), sendAt: now().toISOString() },
      { kind: 'reminder', to: booking.phone, channel: booking.channel, lang, text: t('reminderMsg', lang, { ...v, slot: formatSlot(booking.start, lang).split(' – ')[1] }), sendAt: reminderAt.toISOString() },
    ];
  }

  async function upsertLead(ctx, status, code) {
    const { session } = ctx;
    const d = session.data;
    if (!d.phone && !d.name) return;
    const lead = {
      key: session.id, sessionId: session.id, name: d.name || null, phone: d.phone || null, channel: session.channel,
      interest: d.serviceId || null, status, bookingCode: code || null, lang: ctx.lang, updatedAt: now().toISOString(),
    };
    await store.upsertLead(lead);
    ctx.events.push({ type: 'lead.upserted', lead });
  }

  // ---------------- cancel / reschedule ----------------

  async function startCancel(ctx) { return startChange(ctx, 'cancel'); }
  async function startReschedule(ctx) { return startChange(ctx, 'reschedule'); }

  async function startChange(ctx, flow) {
    const { session, text } = ctx;
    session.flow = flow;
    session.data = { phone: session.data.phone, name: session.data.name, knownPhone: session.data.knownPhone };
    session.step = 'identify';
    const code = nlu.extractCode(text);
    const phone = nlu.extractPhone(text) || session.data.phone || session.data.knownPhone;
    if (code || phone) return identify(ctx, { code, phone });
    ctx.replies.push(reply(t('askIdentify', ctx.lang)));
  }

  async function identify(ctx, { code, phone }) {
    const { session, lang } = ctx;
    const nowLocalStr = `${today()}T00:00`;
    let list = await store.findBookings(code ? { code } : { phone });
    list = list.filter((b) => b.status === 'confirmed' && b.start >= nowLocalStr).sort((a, b) => a.start.localeCompare(b.start));
    if (!list.length) {
      ctx.replies.push(reply(t('notFound', lang), t('dontKnowOpts', lang)));
      session.flow = null; session.step = null;
      return;
    }
    if (list.length === 1) return chooseBooking(ctx, list[0]);
    session.step = 'choose';
    session.data.candidates = list.map((b) => b.code);
    ctx.replies.push(reply(t('chooseBooking', lang), list.map((b, k) => ({
      label: `${k + 1}) ${svcById(b.serviceId).name[lang]} – ${formatSlot(b.start, lang)}`, value: String(k + 1),
    }))));
  }

  async function chooseBooking(ctx, booking) {
    const { session, lang } = ctx;
    const svc = svcById(booking.serviceId);
    session.data.code = booking.code;
    const hoursLeft = (localToDate(booking.start, business.timezone) - now()) / 3600000;
    if (hoursLeft < lateChangeHours) {
      ctx.replies.push(reply(t('lateChange', lang, { hours: lang === 'ar' ? String(lateChangeHours).replace(/\d/g, (x) => '٠١٢٣٤٥٦٧٨٩'[x]) : lateChangeHours })));
      await openHandoff(ctx, `late_${session.flow}:${booking.code}`, 'high');
      return;
    }
    if (session.flow === 'cancel') {
      session.step = 'confirm';
      ctx.replies.push(reply(t('confirmCancel', lang, { service: svc.name[lang], slot: formatSlot(booking.start, lang), code: booking.code }), t('cancelOpts', lang)));
      return;
    }
    session.step = 'date';
    session.data.serviceId = svc.id;
    ctx.replies.push(reply(t('rescheduleWhen', lang, { service: svc.name[lang], slot: formatSlot(booking.start, lang) }), t('daysQuick', lang)));
  }

  async function changeStep(ctx, i) {
    const { session, text, lang } = ctx;
    const d = session.data;

    if (session.step === 'identify') {
      const code = nlu.extractCode(text);
      const phone = nlu.extractPhone(text);
      if (!code && !phone) return answerOrReprompt(ctx);
      return identify(ctx, { code, phone });
    }
    if (session.step === 'choose') {
      const k = nlu.extractChoice(text, d.candidates.length);
      const code = nlu.extractCode(text);
      const picked = code || (k && d.candidates[k - 1]);
      if (!picked) return answerOrReprompt(ctx);
      const [b] = await store.findBookings({ code: picked });
      return chooseBooking(ctx, b);
    }

    const [booking] = await store.findBookings({ code: d.code });
    const svc = svcById(booking.serviceId);

    if (session.flow === 'cancel' && session.step === 'confirm') {
      if (i.yes || /(cancel|الغيه|الغي)/.test(nlu.normalize(text))) {
        await calendar.deleteEvent(booking.calendarEventId);
        await store.updateBooking(booking.code, { status: 'cancelled', cancelledAt: now().toISOString() });
        ctx.events.push({ type: 'booking.cancelled', booking: { ...booking, status: 'cancelled' } });
        ctx.replies.push(reply(t('cancelled', lang, { code: booking.code }), t('bookOpts', lang)));
        session.flow = 'offerBook'; session.data = { name: booking.name, phone: booking.phone };
        return;
      }
      if (!i.no) { ctx.replies.push(reply(t('confirmCancel', lang, { service: svc.name[lang], slot: formatSlot(booking.start, lang), code: booking.code }), t('cancelOpts', lang))); return; }
      ctx.replies.push(reply(t('kept', lang)));
      session.flow = null; session.step = null;
      return;
    }

    // reschedule: date -> slot -> confirm
    if (session.step === 'date' || session.step === 'slot') {
      if (session.step === 'slot') {
        const k = nlu.extractChoice(text, d.offered.length);
        if (k) {
          d.start = d.offered[k - 1];
          session.step = 'confirm';
          ctx.replies.push(reply(t('confirmReschedule', lang, { service: svc.name[lang], old: formatSlot(booking.start, lang), slot: formatSlot(d.start, lang) }), t('yesNo', lang)));
          return;
        }
      }
      const date = nlu.extractDate(text, today());
      const time = nlu.extractTime(text);
      const earliest = /(earliest|soonest|asap|اقرب|اسرع)/.test(nlu.normalize(text));
      if (!date && !time && !earliest) return answerOrReprompt(ctx);
      d.date = date || (session.step === 'slot' && d.offered ? d.offered[0].slice(0, 10) : today());
      d.time = time;
      const slots = (await findSlots({ business, calendar, duration: svc.duration, fromDate: d.date, preferredTime: d.time, now: now(), days: 7 }));
      if (d.time && slots.includes(`${d.date}T${d.time}`)) {
        d.start = `${d.date}T${d.time}`;
        session.step = 'confirm';
        ctx.replies.push(reply(t('confirmReschedule', lang, { service: svc.name[lang], old: formatSlot(booking.start, lang), slot: formatSlot(d.start, lang) }), t('yesNo', lang)));
        return;
      }
      if (!slots.length) { ctx.replies.push(reply(t('noSlotsAtAll', lang))); await openHandoff(ctx, 'no_availability', 'normal'); return; }
      d.offered = slots; session.step = 'slot';
      ctx.replies.push(reply(t('offerSlots', lang, { forDate: '' }) + '\n' + slots.map((s, k) => `${k + 1}) ${formatSlot(s, lang)}`).join('\n'),
        slots.map((s, k) => ({ label: `${k + 1}) ${formatSlot(s, lang)}`, value: String(k + 1) }))));
      return;
    }

    if (session.flow === 'reschedule' && session.step === 'confirm') {
      if (!i.yes && !i.no) { ctx.replies.push(reply(t('confirmReschedule', lang, { service: svc.name[lang], old: formatSlot(booking.start, lang), slot: formatSlot(d.start, lang) }), t('yesNo', lang))); return; }
      if (!i.yes) { ctx.replies.push(reply(t('kept', lang))); session.flow = null; session.step = null; return; }
      if (!(await isSlotFree(calendar, d.start, svc.duration, booking.calendarEventId))) {
        ctx.replies.push(reply(t('slotTaken', lang)));
        session.step = 'date';
        return;
      }
      const end = addMinutesLocal(d.start, svc.duration);
      await calendar.updateEvent(booking.calendarEventId, { start: d.start, end, timezone: business.timezone });
      const updated = { ...booking, start: d.start, end, rescheduledFrom: booking.start, updatedAt: now().toISOString() };
      await store.updateBooking(booking.code, { start: d.start, end, rescheduledFrom: booking.start, updatedAt: updated.updatedAt });
      ctx.events.push({ type: 'booking.rescheduled', booking: updated, messages: buildCustomerMessages(updated, lang) });
      ctx.replies.push(reply(t('rescheduled', lang, { service: svc.name[lang], slot: formatSlot(d.start, lang), code: booking.code })));
      session.flow = null; session.step = null; session.data = { name: booking.name, phone: booking.phone };
    }
  }

  // The customer said something that doesn't fit the current step:
  // answer it from the knowledge base if we can, then repeat the question.
  async function answerOrReprompt(ctx) {
    const { session, text, lang } = ctx;
    const hits = search(entries, text);
    if (hits.length) ctx.replies.push(reply(await phrase(ctx, hits)));
    session.misses = (session.misses || 0) + 1;
    if (session.misses >= 3) {
      session.misses = 0;
      await openHandoff(ctx, 'bot_confused', 'normal');
      return;
    }
    const saved = ctx.replies.length;
    if (session.flow === 'book') await advanceBooking(ctx);
    else if (session.step === 'identify') ctx.replies.push(reply(t('askIdentify', lang)));
    else if (session.step === 'date' || session.step === 'slot') ctx.replies.push(reply(t('askNewDate', lang), t('daysQuick', lang)));
    else ctx.replies.push(reply(t('chooseBooking', lang)));
    if (hits.length && ctx.replies[saved]) ctx.replies[saved].text = t('backToStep', lang) + ' ' + ctx.replies[saved].text;
  }

  return { handle, staffReply, resumeBot, greeting: (lang = business.defaultLang || 'ar') => greeting(lang), business };
}
