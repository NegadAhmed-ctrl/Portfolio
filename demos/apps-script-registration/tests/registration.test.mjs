// Runs the real Apps Script files against in-memory fakes.  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGas, submit, rowObject, student } from './load-gas.mjs';

// ---------- pure validation ----------
test('phone: Arabic digits, +20, spaces and dashes normalize; landlines rejected', () => {
  const { gas } = loadGas({ withSheets: false });
  assert.equal(gas.normalizePhone('٠١٠١٢٣٤٥٦٧٨'), '01012345678');
  assert.equal(gas.normalizePhone('+20 115 123-4567'), '01151234567');
  assert.equal(gas.normalizePhone('00201234567890'), '01234567890');
  assert.equal(gas.normalizePhone('1012345678'), '01012345678');
  assert.equal(gas.normalizePhone('0312345678'), null);     // Alexandria landline
  assert.equal(gas.normalizePhone('0131234567'), null);     // 013 is not a mobile prefix
  assert.equal(gas.normalizePhone(''), null);
});

test('email and name rules', () => {
  const { gas } = loadGas({ withSheets: false });
  assert.ok(gas.isValidEmail('a.b@school.edu.eg'));
  assert.ok(!gas.isValidEmail('a@b'));
  assert.ok(!gas.isValidEmail('a b@x.com'));
  assert.equal(gas.nameKey('مُحَمَّد  أحمد'), gas.nameKey('محمد احمد'));
  assert.equal(gas.nameKey('فاطمة علي'), gas.nameKey('فاطمه على'));
  assert.equal(gas.makeRef('MN', 7), 'MN-0007');
});

test('validateRegistration collects every problem in one pass', () => {
  const { gas } = loadGas({ withSheets: false });
  const groups = [{ name: 'G1', grade: 'الثالث الثانوي', capacity: 5, active: true }];
  const r = gas.validateRegistration({ name: 'ملك', phone: '0123', email: 'x', grade: 'KG', group: 'G9' },
    { grades: gas.CONFIG.grades, groups });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 5);
  const wrongGrade = gas.validateRegistration({ name: 'ملك محمد', phone: '01012345678', email: 'a@b.co', grade: 'الأول الثانوي', group: 'G1' },
    { grades: gas.CONFIG.grades, groups });
  assert.deepEqual([...wrongGrade.errors], ['المجموعة دي لـ الثالث الثانوي مش الأول الثانوي']);
});

// ---------- the form-submit flow ----------
test('valid registration: confirmed, code written, confirmation email sent', () => {
  const { gas, fakes } = loadGas();
  const res = submit(gas, fakes, student({ phone: '٠١٠ ١٢٣٤ ٥٦٧٨', email: ' Parent1@Example.com ' }));
  assert.equal(res.status, 'مؤكد');
  const row = rowObject(fakes, 2);
  assert.equal(row['الحالة'], 'مؤكد');
  assert.equal(row['كود التسجيل'], 'MN-0001');
  assert.equal(row['ملاحظة النظام'], 'مكان 1 من 2');
  assert.match(row['وقت إرسال الإيميل'], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(fakes.outbox.length, 1);
  const mail = fakes.outbox[0];
  assert.equal(mail.to, 'parent1@example.com');
  assert.match(mail.subject, /تم تأكيد التسجيل · MN-0001/);
  assert.match(mail.htmlBody, /السبت والثلاثاء 4:00 م/);
  assert.equal(fakes.state.lockHeld, false, 'lock released');
});

test('same student twice (typed differently) is marked duplicate and gets no second email', () => {
  const { gas, fakes } = loadGas();
  submit(gas, fakes, student());
  const res = submit(gas, fakes, student({ name: 'ملك  محمد  السيد', phone: '+201012345678', email: 'other@example.com' }));
  assert.equal(res.status, 'مكرر');
  assert.equal(rowObject(fakes, 3)['ملاحظة النظام'], 'مسجل قبل كده بكود MN-0001');
  assert.equal(fakes.outbox.length, 1);
});

test('siblings with the same parent phone are NOT duplicates', () => {
  const { gas, fakes } = loadGas();
  submit(gas, fakes, student());
  const res = submit(gas, fakes, student({ name: 'يوسف محمد السيد' }));
  assert.equal(res.status, 'مؤكد');
});

test('full group goes to the waitlist with its position', () => {
  const { gas, fakes } = loadGas(); // capacity 2
  submit(gas, fakes, student({ name: 'طالب أول', phone: '01000000001' }));
  submit(gas, fakes, student({ name: 'طالب ثاني', phone: '01000000002' }));
  const third = submit(gas, fakes, student({ name: 'طالب ثالث', phone: '01000000003', email: 'p3@example.com' }));
  const fourth = submit(gas, fakes, student({ name: 'طالب رابع', phone: '01000000004', email: 'p4@example.com' }));
  assert.equal(third.status, 'قائمة انتظار');
  assert.equal(third.position, 1);
  assert.equal(fourth.position, 2);
  assert.match(fakes.outbox[3].subject, /قائمة الانتظار/);
  assert.match(fakes.outbox[3].body, /رقم 2 في قائمة الانتظار/);
});

test('invalid data: status explains why, no email, closed group rejected', () => {
  const { gas, fakes } = loadGas();
  const res = submit(gas, fakes, student({ phone: '0312345678', group: 'كيمياء 2ث · مقفولة', grade: 'الثاني الثانوي' }));
  assert.equal(res.status, 'بيانات غير صحيحة');
  const note = rowObject(fakes, 2)['ملاحظة النظام'];
  assert.match(note, /رقم الموبايل/);
  assert.match(note, /المجموعة مش موجودة أو متقفلة/);
  assert.equal(fakes.outbox.length, 0);
});

test('parent input is escaped in the HTML email', () => {
  const { gas, fakes } = loadGas();
  submit(gas, fakes, student({ name: 'ملك <img src=x onerror=alert(1)>' }));
  assert.ok(!fakes.outbox[0].htmlBody.includes('<img'));
  assert.ok(fakes.outbox[0].htmlBody.includes('&lt;img'));
});

test('email quota reached: registration still confirmed, email queued, logged, retried later', () => {
  const { gas, fakes } = loadGas({ quota: 0 });
  const res = submit(gas, fakes, student());
  assert.equal(res.status, 'مؤكد');
  assert.equal(rowObject(fakes, 2)['وقت إرسال الإيميل'], '');
  assert.match(rowObject(fakes, 2)['ملاحظة النظام'], /الحد اليومي/);
  const log = fakes.spreadsheet.getSheetByName('سجل الأخطاء');
  assert.equal(log.getLastRow(), 2);
  assert.equal(log.getRange(2, 2).getValue(), 'sendRegistrationEmail_');

  fakes.setQuota(5);
  assert.equal(gas.retryPendingEmails(), 1);
  assert.equal(fakes.outbox.length, 1);
  assert.equal(rowObject(fakes, 2)['ملاحظة النظام'], 'مكان 1 من 2');
  assert.notEqual(rowObject(fakes, 2)['وقت إرسال الإيميل'], '');
  assert.equal(gas.retryPendingEmails(), 0, 'nothing sent twice');
});

test('unexpected failure is logged, row marked خطأ, lock released, no crash', () => {
  const { gas, fakes } = loadGas();
  fakes.spreadsheet.sheets = fakes.spreadsheet.sheets.filter(s => s.getName() !== 'المجموعات');
  const res = submit(gas, fakes, student());
  assert.equal(res, null);
  assert.equal(rowObject(fakes, 2)['الحالة'], 'خطأ');
  const log = fakes.spreadsheet.getSheetByName('سجل الأخطاء');
  assert.equal(log.getRange(2, 2).getValue(), 'onFormSubmit');
  assert.match(log.getRange(2, 3).getValue(), /المجموعات/);
  assert.equal(fakes.state.lockHeld, false);
});

test('columns are found by header, so a reordered sheet still works', () => {
  const { gas, fakes } = loadGas({ withSheets: false });
  fakes.spreadsheet.insertSheet('المجموعات', [['المجموعة', 'الصف', 'الميعاد', 'السعة', 'مفتوحة'], ['G', 'الأول الثانوي', 'x', 3, 'نعم']]);
  const sh = fakes.spreadsheet.insertSheet('التسجيلات', [['Timestamp', 'الإيميل', 'المجموعة', 'اسم الطالب', 'الصف الدراسي', 'موبايل ولي الأمر']]);
  sh.appendRow([new Date(), 'a@b.co', 'G', 'سارة علي', 'الأول الثانوي', '01112223334']);
  const res = gas.onFormSubmit({ range: sh.getRange(2, 1, 1, 6) });
  assert.equal(res.status, 'مؤكد');
});

// ---------- report, setup, form sync ----------
test('weekly report: counts, seats, waitlist and alerts', () => {
  const { gas, fakes } = loadGas();
  const old = new Date(Date.now() - 10 * 864e5);
  submit(gas, fakes, student({ name: 'طالب أول', phone: '01000000001' }), old);
  submit(gas, fakes, student({ name: 'طالب ثاني', phone: '01000000002' }));
  submit(gas, fakes, student({ name: 'طالب ثالث', phone: '01000000003' }));
  submit(gas, fakes, student({ name: 'طالب ثاني', phone: '01000000002' }));  // duplicate
  submit(gas, fakes, student({ phone: '123' }));                            // invalid
  const report = gas.sendWeeklyReport();
  assert.equal(report.newThisWeek, 2);
  assert.deepEqual({ ...report.totals }, { confirmed: 2, waitlist: 1, duplicate: 1, invalid: 1, error: 0 });
  const math = report.groups.find(g => g.name.startsWith('رياضيات'));
  assert.deepEqual([math.confirmed, math.seatsLeft, math.waitlist], [2, 0, 1]);
  assert.equal(report.groups.length, 2, 'closed group not reported');
  assert.ok(report.alerts.some(a => a.includes('كاملة وفيها 1')));
  assert.ok(report.alerts.some(a => a.includes('فيزياء') && a.includes('0 بس من 15')));
  const mail = fakes.outbox.at(-1);
  assert.equal(mail.to, gas.CONFIG.adminEmail);
  assert.match(mail.subject, /2 تسجيل جديد/);
});

test('setup is idempotent: sheets, columns, menu and exactly 3 triggers', () => {
  const { gas, fakes } = loadGas({ withSheets: false });
  fakes.spreadsheet.insertSheet('التسجيلات', [['Timestamp', 'اسم الطالب']]);
  gas.setup();
  gas.setup();
  assert.ok(fakes.spreadsheet.getSheetByName('المجموعات'));
  assert.ok(fakes.spreadsheet.getSheetByName('سجل الأخطاء'));
  const handlers = fakes.state.triggers.map(t => t.getHandlerFunction()).sort();
  assert.deepEqual(handlers, ['onFormSubmit', 'retryPendingEmails', 'sendWeeklyReport']);
  const weekly = fakes.state.triggers.find(t => t.getHandlerFunction() === 'sendWeeklyReport');
  assert.deepEqual({ ...weekly.spec }, { weekDay: 'SUNDAY', hour: 9, tz: 'Africa/Cairo' });
  const headers = fakes.spreadsheet.getSheetByName('التسجيلات').getRange(1, 1, 1, 6).getValues()[0];
  assert.deepEqual(headers.slice(2), ['الحالة', 'كود التسجيل', 'ملاحظة النظام', 'وقت إرسال الإيميل']);
  gas.onOpen();
  assert.equal(fakes.state.menus[0].items.length, 4);
});

test('a group that fills up disappears from the form', () => {
  const { gas, fakes } = loadGas();
  fakes.form.items.push({ title: 'المجموعة', type: 'LIST', choices: [] });
  submit(gas, fakes, student({ name: 'طالب أول', phone: '01000000001' }));
  assert.deepEqual(fakes.form.items[0].choices, ['رياضيات 3ث · السبت 4م', 'فيزياء 1ث · الأحد 6م']);
  submit(gas, fakes, student({ name: 'طالب ثاني', phone: '01000000002' }));
  assert.deepEqual(fakes.form.items[0].choices, ['فيزياء 1ث · الأحد 6م']);
});
