// Rule-based understanding for Arabic (Egyptian + MSA) and English.
// It is deliberately simple and predictable: booking, cancelling and
// rescheduling never depend on an LLM guessing. An LLM (if configured)
// is only used to phrase answers from the knowledge base.

import { addDays, dayKey } from './time.js';

const AR_RE = /[\u0600-\u06FF]/g;

export function detectLang(text, fallback = 'en') {
  const letters = (text.match(/[A-Za-z\u0600-\u06FF]/g) || []).length;
  if (!letters) return fallback;
  const ar = (text.match(AR_RE) || []).length;
  return ar / letters > 0.3 ? 'ar' : 'en';
}

export function westernDigits(s) {
  return s
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

// Normalise so "إلغاء", "الغاء", "الغى" all compare equal.
export function normalize(text) {
  return westernDigits(String(text))
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // diacritics + tatweel
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/(?<!\d):|:(?!\d)/g, ' ')
    .replace(/[؟?!.,،؛;()"'«»\-_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(text) {
  return normalize(text).split(' ').filter(Boolean).map((t) =>
    t.length > 4 && t.startsWith('ال') ? t.slice(2) : t
  );
}

const has = (norm, words) => words.some((w) => {
  const nw = normalize(w);
  if (/^[a-z ]+$/.test(nw)) return new RegExp(`(^|\\s)${nw}(\\s|$)`).test(norm);
  return norm.includes(nw);
});

const INTENT_WORDS = {
  human: ['human', 'agent', 'real person', 'staff', 'receptionist', 'talk to someone', 'speak to someone', 'call me',
    'موظف', 'حد من العياده', 'حد يكلمني', 'بني ادم', 'بنى ادم', 'انسان', 'الريسبشن', 'خدمه العملاء', 'اكلم حد', 'عايز اكلم', 'كلموني', 'اتصلوا بيا'],
  cancel: ['cancel', 'cancellation', 'الغي', 'الغاء', 'لغي', 'الغى', 'كنسل', 'مش هقدر اجي', 'مش هاجي'],
  reschedule: ['reschedule', 'change my appointment', 'move my appointment', 'another time', 'different time', 'postpone',
    'اغير', 'تغيير', 'غير الميعاد', 'اغير الميعاد', 'اأجل', 'اجل', 'تاجيل', 'ميعاد تاني', 'انقل'],
  book: ['book', 'booking', 'appointment', 'reserve', 'schedule', 'slot', 'available', 'visit',
    'احجز', 'حجز', 'ميعاد', 'موعد', 'مواعيد فاضيه', 'فاضي', 'اجي', 'كشف'],
  greeting: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'السلام', 'اهلا', 'مرحبا', 'هاي', 'صباح', 'مساء الخير', 'ازيك'],
  thanks: ['thanks', 'thank you', 'thx', 'شكرا', 'متشكر', 'تسلم', 'ميرسي', 'تمام شكرا'],
  yes: ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'confirm', 'correct', 'right',
    'ايوه', 'ايوا', 'اه', 'نعم', 'تمام', 'اكيد', 'ماشي', 'اكد', 'مظبوط', 'صح', 'موافق'],
  no: ['no', 'nope', 'not', 'wrong', 'لا', 'لأ', 'مش', 'غلط', 'لاء'],
};

// Phrases that ask the assistant for medical judgement it must not give.
const MEDICAL = ['diagnos', 'what do i have', 'is it serious', 'should i take', 'medicine', 'antibiotic', 'painkiller', 'dose', 'prescri', 'infection',
  'pain', 'hurts', 'swollen', 'swelling', 'bleeding', 'abscess',
  'تشخيص', 'عندي ايه', 'خطير', 'اخد ايه', 'دوا', 'علاج ايه', 'مضاد حيوي', 'مسكن', 'جرعه', 'التهاب', 'خراج',
  'وجع', 'بيوجعني', 'الم', 'ورم', 'وارم', 'نزيف', 'بينزف', 'صديد'];
const EMERGENCY = ["can't breathe", 'cannot breathe', 'hard to breathe', 'trouble breathing', 'won\'t stop bleeding', 'heavy bleeding', 'accident', 'unconscious', 'face is swelling',
  'مش قادر اتنفس', 'صعوبه في التنفس', 'نزيف مش بيقف', 'نزيف جامد', 'نزيف شديد', 'حادثه', 'اغمي', 'وشي كله وارم', 'مش قادر ابلع'];

export function detectIntents(text) {
  const n = normalize(text);
  const out = {};
  const WHOLE = new Set(['yes', 'no', 'greeting', 'thanks']);
  const padded = ' ' + n + ' ';
  for (const [k, words] of Object.entries(INTENT_WORDS)) {
    out[k] = WHOLE.has(k)
      ? words.some((w) => padded.includes(' ' + normalize(w) + ' ') || (k !== 'yes' && k !== 'no' && padded.startsWith(' ' + normalize(w))))
      : has(n, words);
  }
  // "no" is noisy in Arabic ("مش" appears everywhere); only count short replies.
  if (out.no && n.split(' ').length > 3) out.no = false;
  if (out.yes && n.split(' ').length > 4) out.yes = false;
  out.medical = has(n, MEDICAL);
  out.emergency = has(n, EMERGENCY);
  return out;
}

// ---------- entities ----------

const WEEKDAYS = {
  sun: ['sunday', 'sun', 'الحد', 'الاحد', 'حد'],
  mon: ['monday', 'mon', 'الاتنين', 'الاثنين', 'اتنين'],
  tue: ['tuesday', 'tue', 'الثلاثاء', 'التلات', 'التلاتاء', 'تلات'],
  wed: ['wednesday', 'wed', 'الاربع', 'الاربعاء', 'اربع'],
  thu: ['thursday', 'thu', 'الخميس', 'خميس'],
  fri: ['friday', 'fri', 'الجمعه', 'جمعه'],
  sat: ['saturday', 'sat', 'السبت', 'سبت'],
};

export function extractDate(text, today) {
  const raw = westernDigits(String(text));
  const n = normalize(text);
  if (/(^| )(day after tomorrow|بعد بكره|بعد بكرا)( |$)/.test(n)) return addDays(today, 2);
  if (/(^| )(today|tonight|النهارده|انهارده|النهاردا|اليوم|دلوقتي)( |$)/.test(n)) return today;
  if (/(^| )(tomorrow|بكره|بكرا|غدا)( |$)/.test(n)) return addDays(today, 1);
  if (/(^| )(next week|الاسبوع الجاي)( |$)/.test(n)) return addDays(today, 7);

  let m = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = raw.match(/(?:^|[^\d:])(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?(?![\d:])/);
  if (m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) {
    let y = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : today.slice(0, 4);
    let d = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (!m[3] && d < today) d = `${+y + 1}${d.slice(4)}`;
    return d;
  }
  for (const [key, words] of Object.entries(WEEKDAYS)) {
    if (words.some((w) => new RegExp(`(^| )${normalize(w)}( |$)`).test(n))) {
      for (let i = 0; i < 7; i++) {
        const d = addDays(today, i);
        if (dayKey(d) === key) return d;
      }
    }
  }
  return null;
}

const SUF = '(am|pm|a\\.m|p\\.m|صباحا|الصبح|مساء|مساءا|بالليل|الضهر|بعد الضهر|العصر|المغرب)';

// Returns "HH:MM" or null. Hours 1-8 without am/pm are read as afternoon,
// because clinics are rarely open at 5 am. Plain numbers ("2") are NOT
// treated as times, so menu choices keep working.
export function extractTime(text) {
  const n = normalize(text);
  const half = /(ونص|and a half|و نص)/.test(n);
  let h, min = 0, suf = '';
  let m = n.match(new RegExp(`(\\d{1,2}):(\\d{2})(?: ?${SUF})?`));
  if (m) { h = +m[1]; min = +m[2]; suf = m[3] || ''; }
  if (!m) {
    m = n.match(new RegExp(`(?:الساعه|ساعه|at|around|حوالي)\\s*(\\d{1,2})(?: ?${SUF})?`));
    if (m) { h = +m[1]; suf = m[2] || ''; }
  }
  if (!m) {
    m = n.match(new RegExp(`(?:^| )(\\d{1,2}) ?${SUF}(?: |$)`));
    if (m) { h = +m[1]; suf = m[2] || ''; }
  }
  if (h === undefined || h > 23 || min > 59) return null;
  if (half && !min) min = 30;
  if (/(pm|p\.m|مساء|بالليل|العصر|المغرب|بعد الضهر)/.test(suf) && h < 12) h += 12;
  else if (/الضهر/.test(suf) && h < 6) h += 12;
  else if (/(am|a\.m|صباحا|الصبح)/.test(suf) && h === 12) h = 0;
  else if (!suf && h >= 1 && h <= 8) h += 12;
  return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

export function extractPhone(text) {
  const s = westernDigits(text).replace(/[\s\-().]/g, '');
  const m = s.match(/(\+?\d{10,15})/);
  if (!m) return null;
  let p = m[1];
  if (/^01\d{9}$/.test(p)) p = '+2' + p; // Egypt mobile
  else if (/^05\d{8}$/.test(p)) p = '+966' + p.slice(1); // Saudi mobile
  else if (/^00/.test(p)) p = '+' + p.slice(2);
  else if (!p.startsWith('+')) p = '+' + p;
  return /^\+\d{10,15}$/.test(p) ? p : null;
}

export function extractCode(text) {
  const m = westernDigits(text).toUpperCase().match(/\b([A-Z]{2}-[A-Z0-9]{4})\b/);
  return m ? m[1] : null;
}

export function extractName(text) {
  let t = text.trim()
    .replace(/^(my name is|i am|i'm|this is|name[:\s]*)/i, '')
    .replace(/^(اسمي|انا اسمي|أنا اسمي|انا|أنا|الاسم)\s*[:：]?\s*/, '')
    .trim();
  t = t.replace(/[0-9٠-٩+]/g, '').replace(/\s+/g, ' ').trim();
  if (t.length < 2 || t.length > 60) return null;
  if (t.split(' ').length > 5) return null;
  return t.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

export function matchService(text, services) {
  const n = normalize(text);
  let best = null;
  for (const s of services) {
    for (const k of [...s.keywords, s.name.en, s.name.ar]) {
      const nk = normalize(k);
      if (nk && (/^[a-z ]+$/.test(nk) ? new RegExp(`(^| )${nk}`).test(n) : n.includes(nk))) {
        if (!best || nk.length > best.len) best = { service: s, len: nk.length };
      }
    }
  }
  return best ? best.service : null;
}

// A bare menu choice like "2" or "٢" or "the second".
export function extractChoice(text, max) {
  const n = normalize(text);
  let m = n.match(/^(?:option |رقم |slot )?(\d{1,2})$/);
  if (m && +m[1] >= 1 && +m[1] <= max) return +m[1];
  const ord = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, 'الاول': 1, 'الاولاني': 1, 'التاني': 2, 'الثاني': 2, 'التالت': 3, 'الثالث': 3, 'الرابع': 4, 'الخامس': 5 };
  for (const [w, v] of Object.entries(ord)) if (n.includes(normalize(w)) && v <= max) return v;
  return null;
}
