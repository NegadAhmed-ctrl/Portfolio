/*
 * Demo page: runs the real Apps Script files (apps-script/*.gs) in the browser
 * against in-memory Google services (sim/gas-fakes.js). Nothing here changes
 * the automation logic; this file only seeds sample data and draws the UI.
 */
(function () {
  'use strict';

  var TZ = 'Africa/Cairo';
  var fakes = null;
  var currentSheet = 'التسجيلات';
  var highlightRow = 0;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- sample data (fictional) ----------
  var GROUPS = [
    ['المجموعة', 'الصف', 'الميعاد', 'السعة', 'مفتوحة'],
    ['رياضيات 3ث · السبت 4م', 'الثالث الثانوي', 'السبت والثلاثاء 4:00 م', 12, 'نعم'],
    ['فيزياء 1ث · الأحد 6م', 'الأول الثانوي', 'الأحد والأربعاء 6:00 م', 15, 'نعم'],
    ['كيمياء 2ث · الاثنين 5م', 'الثاني الثانوي', 'الاثنين والخميس 5:00 م', 6, 'نعم'],
    ['إنجليزي 3ع · الثلاثاء 3م', 'الثالث الإعدادي', 'الثلاثاء 3:00 م', 10, 'نعم'],
    ['أحياء 3ث · الجمعة 11ص', 'الثالث الثانوي', 'الجمعة 11:00 ص', 10, 'لا']
  ];
  var MATH = GROUPS[1][0], PHYS = GROUPS[2][0], CHEM = GROUPS[3][0], ENG = GROUPS[4][0];
  // [name, phone, email, group, daysAgo, notes]
  var SEED = [
    ['ملك محمد السيد', '01012345678', 'malak.parent@example.com', MATH, 9, ''],
    ['عمر خالد عبد الرحمن', '01123456789', 'khaled.omar@example.com', MATH, 9, ''],
    ['جنى أحمد فؤاد', '01234567890', 'fouad.family@example.com', CHEM, 8, ''],
    ['يوسف طارق حسن', '٠١٥٥٦٦٧٧٨٨٩', 'tarek.h@example.com', MATH, 8, 'محتاج مراجعة على الجبر'],
    ['سلمى عادل منصور', '+20 100 222 3344', 'adel.mansour@example.com', ENG, 7, ''],
    ['آدم وليد شاكر', '01099887766', 'walid.shaker@example.com', CHEM, 6, ''],
    ['حبيبة مصطفى نور', '01144455566', 'nour.habiba@example.com', PHYS, 6, ''],
    ['مريم هشام صبري', '01277788899', 'hesham.sabry@example.com', MATH, 5, ''],
    ['مازن شريف لطفي', '01066554433', 'sherif.lotfy@example.com', CHEM, 5, ''],
    ['ملك محمد السيد', '01012345678', 'malak.parent@example.com', MATH, 4, ''],
    ['فريدة ياسر عزت', '01511122233', 'yasser.ezzat@example.com', ENG, 4, ''],
    ['زياد أيمن رشدي', '01233322211', 'ayman.roshdy@example.com', CHEM, 3, ''],
    ['نور', '0123', 'nour@', MATH, 3, ''],
    ['كريم سامح بدوي', '01188877766', 'sameh.badawy@example.com', MATH, 2, 'أخوه في نفس المجموعة'],
    ['لينا سامح بدوي', '01188877766', 'sameh.badawy@example.com', MATH, 2, ''],
    ['تيا رامي الشناوي', '01022233344', 'rami.elshenawy@example.com', CHEM, 2, ''],
    ['علي حمدي عبد الله', '01144433322', 'hamdy.ali@example.com', PHYS, 1, ''],
    ['هنا إسلام زكي', '01255566677', 'islam.zaki@example.com', CHEM, 1, ''],
    ['سيف معتز الجمال', '01011199988', 'moataz.elgamal@example.com', ENG, 1, ''],
    ['رقية حازم فتحي', '01577788811', 'hazem.fathy@example.com', CHEM, 0, '']
  ];
  var NEW_NAMES = ['ياسين عمرو الشريف', 'جودي محمود سالم', 'تميم أحمد ربيع', 'ليلى حسام الدين', 'مالك عصام نجيب', 'رودينا وائل كمال', 'حمزة إيهاب سعد', 'ريتال باسم عوض'];

  function gradeOf(group) {
    for (var i = 1; i < GROUPS.length; i++) if (GROUPS[i][0] === group) return GROUPS[i][1];
    return '';
  }

  // ---------- boot ----------
  function loadScripts() {
    return GasFakes.GS_FILES.reduce(function (p, f) {
      return p.then(function () {
        return fetch('apps-script/' + f, { cache: 'no-cache' }).then(function (r) {
          if (!r.ok) throw new Error(f + ': HTTP ' + r.status);
          return r.text();
        }).then(function (src) {
          (0, eval)(src + '\n//# sourceURL=apps-script/' + f); // global scope, like Apps Script
        });
      });
    }, Promise.resolve());
  }

  function fresh() {
    fakes = GasFakes.create({ quota: 100 });
    Object.assign(window, fakes.services);
    CONFIG.adminEmail = 'manager@almanara.example';
    var ss = fakes.spreadsheet;
    ss.insertSheet('التسجيلات', [['Timestamp', 'اسم الطالب', 'موبايل ولي الأمر', 'الإيميل', 'الصف الدراسي', 'المجموعة', 'ملاحظات']]);
    ss.insertSheet('المجموعات', GROUPS);
    setup();                       // the real one-click setup: columns, error sheet, triggers
    seed();
    $('quotaOff').checked = false;
    highlightRow = 0;
  }

  /** Seeds past registrations through the real onFormSubmit, so their statuses are real. */
  function seed() {
    var realNow = window.formatNow_;
    var sheet = fakes.spreadsheet.getSheetByName('التسجيلات');
    var now = Date.now();
    SEED.forEach(function (s, i) {
      var when = new Date(now - s[4] * 864e5 - (SEED.length - i) * 37 * 6e4);
      window.formatNow_ = function () { return GasFakes.formatDate(new Date(when.getTime() + 6e4), TZ, 'yyyy-MM-dd HH:mm'); };
      var row = [when, s[0], s[1], s[2], gradeOf(s[3]), s[3], s[5]];
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
      onFormSubmit({ range: sheet.getRange(sheet.getLastRow(), 1, 1, row.length) });
    });
    window.formatNow_ = realNow;
    fakes.outbox.length = 0;
  }

  // ---------- rendering ----------
  function colName(i) {
    var s = '';
    i++;
    while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }
  function cellText(v) {
    if (Object.prototype.toString.call(v) === '[object Date]') return GasFakes.formatDate(v, TZ, 'yyyy-MM-dd HH:mm');
    return String(v);
  }
  var STATUS_CLASS = { 'مؤكد': 'st-ok', 'قائمة انتظار': 'st-wait', 'مكرر': 'st-dup', 'بيانات غير صحيحة': 'st-bad', 'خطأ': 'st-err' };

  function renderSheet() {
    var sh = fakes.spreadsheet.getSheetByName(currentSheet);
    var table = $('sheet');
    table.textContent = '';
    var values = sh.getDataRange().getValues();
    var width = Math.max(values[0].length, 4);
    var statusCol = values[0].indexOf('الحالة');

    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    var corner = document.createElement('th'); corner.className = 'rn'; hr.appendChild(corner);
    for (var c = 0; c < width; c++) { var th = document.createElement('th'); th.textContent = colName(c); hr.appendChild(th); }
    thead.appendChild(hr); table.appendChild(thead);

    var tbody = document.createElement('tbody');
    values.forEach(function (row, r) {
      var tr = document.createElement('tr');
      if (r === 0) tr.className = 'hdr';
      if (currentSheet === 'التسجيلات' && r + 1 === highlightRow) tr.className = 'added';
      var rn = document.createElement('td'); rn.className = 'rn'; rn.textContent = r + 1; tr.appendChild(rn);
      for (var c = 0; c < width; c++) {
        var td = document.createElement('td');
        td.dir = 'auto';
        var v = row[c] == null ? '' : row[c];
        if (r > 0 && c === statusCol && v) {
          var pill = document.createElement('span');
          pill.className = 'pill ' + (STATUS_CLASS[v] || '');
          pill.textContent = v;
          td.appendChild(pill);
        } else {
          td.textContent = cellText(v);
          if (String(v).length > 28) td.title = cellText(v);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    document.querySelectorAll('.sheet-tabs [role=tab]').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.sheet === currentSheet));
    });
    var errs = Math.max(0, fakes.spreadsheet.getSheetByName('سجل الأخطاء').getLastRow() - 1);
    $('errCount').textContent = errs;
    $('errCount').classList.toggle('zero', errs === 0);
  }

  function renderOutbox() {
    var list = $('outbox');
    list.textContent = '';
    $('mailCount').textContent = fakes.outbox.length;
    if (!fakes.outbox.length) {
      var e = document.createElement('li'); e.className = 'empty'; e.textContent = 'لسه مفيش. ابعت الفورم.'; list.appendChild(e);
      return;
    }
    fakes.outbox.slice().reverse().forEach(function (m) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      var isReport = m.to === CONFIG.adminEmail;
      b.className = 'mail' + (isReport ? ' report' : '');
      var av = document.createElement('span'); av.className = 'av'; av.textContent = isReport ? 'ت' : 'م';
      var t = document.createElement('b'); t.textContent = m.subject;
      var s = document.createElement('small'); s.textContent = 'إلى ' + m.to + ' · ' + GasFakes.formatDate(m.sentAt, TZ, 'HH:mm');
      b.append(av, t, s);
      b.addEventListener('click', function () { openMail(m); });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  function renderSelects() {
    var grade = $('f-grade'), group = $('f-group');
    var keepGrade = grade.value, keepGroup = group.value;
    grade.textContent = ''; group.textContent = '';
    grade.appendChild(new Option('اختار', ''));
    CONFIG.grades.forEach(function (g) { grade.appendChild(new Option(g, g)); });
    group.appendChild(new Option('اختار', ''));
    readGroups_(fakes.spreadsheet).filter(function (g) { return g.active; })
      .forEach(function (g) { group.appendChild(new Option(g.name + ' (' + g.time + ')', g.name)); });
    grade.value = keepGrade; group.value = keepGroup;
  }

  function renderAll() { renderSheet(); renderOutbox(); renderSelects(); }

  function scrollToRow(row) {
    var tr = $('sheet').querySelectorAll('tbody tr')[row - 1];
    if (tr) {
      var box = $('sheetScroll');
      box.scrollTop = tr.offsetTop - box.clientHeight / 2;
      box.scrollLeft = -box.scrollWidth; // RTL: show the status columns the script adds
    }
  }

  // ---------- interactions ----------
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3800);
  }

  function setFlow(states) {
    var steps = document.querySelectorAll('#flow li');
    steps.forEach(function (li) { li.className = ''; });
    steps.forEach(function (li, i) {
      setTimeout(function () { li.className = states[li.dataset.step] || ''; }, i * 160);
    });
  }

  function openMail(m) {
    $('mailSubject').textContent = m.subject;
    $('mailMeta').textContent = 'إلى: ' + m.to + ' · من: ' + (m.name || CONFIG.centerName);
    $('mailFrame').srcdoc = '<!doctype html><meta charset="utf-8"><body style="margin:0">' + m.htmlBody;
    $('mailDialog').showModal();
  }

  function fill(v) {
    $('f-name').value = v.name; $('f-phone').value = v.phone; $('f-email').value = v.email;
    $('f-grade').value = v.grade; $('f-group').value = v.group; $('f-notes').value = v.notes || '';
  }

  var newIndex = 0;
  function scenario(kind) {
    var used = fakes.spreadsheet.getSheetByName('التسجيلات').getLastRow();
    if (kind === 'new') {
      var name = NEW_NAMES[newIndex++ % NEW_NAMES.length];
      var group = newIndex % 2 ? PHYS : ENG;
      fill({ name: name, phone: '010' + String(40000000 + used * 7919).slice(-8), email: 'parent' + used + '@example.com', grade: gradeOf(group), group: group });
    } else if (kind === 'dup') {
      fill({ name: 'ملك  محمد السيد', phone: '+20 10 1234 5678', email: 'Malak.Parent@example.com', grade: 'الثالث الثانوي', group: MATH, notes: 'نسيت إني سجلت' });
    } else if (kind === 'bad') {
      fill({ name: 'منة', phone: '03 4567890', email: 'menna@gmail', grade: 'الأول الثانوي', group: MATH });
    } else if (kind === 'full') {
      fill({ name: NEW_NAMES[(newIndex++) % NEW_NAMES.length], phone: '012' + String(50000000 + used * 104729).slice(-8), email: 'family' + used + '@example.com', grade: 'الثاني الثانوي', group: CHEM });
    }
    $('submitBtn').focus();
  }

  var FLOW = {
    'مؤكد': { form: 'ok', validate: 'ok', dup: 'ok', seat: 'ok', sheet: 'ok', email: 'ok' },
    'قائمة انتظار': { form: 'ok', validate: 'ok', dup: 'ok', seat: 'warn', sheet: 'ok', email: 'ok' },
    'مكرر': { form: 'ok', validate: 'ok', dup: 'fail', seat: 'skip', sheet: 'ok', email: 'skip' },
    'بيانات غير صحيحة': { form: 'ok', validate: 'fail', dup: 'skip', seat: 'skip', sheet: 'ok', email: 'skip' }
  };

  function submitForm(ev) {
    ev.preventDefault();
    var btn = $('submitBtn');
    btn.disabled = true;
    // What Google Forms does: append a row with a timestamp and the raw answers…
    var sheet = fakes.spreadsheet.getSheetByName('التسجيلات');
    var row = [new Date(), $('f-name').value, $('f-phone').value, $('f-email').value, $('f-grade').value, $('f-group').value, $('f-notes').value];
    var r = sheet.getLastRow() + 1;
    sheet.getRange(r, 1, 1, row.length).setValues([row]);
    var before = fakes.outbox.length;
    // …then fire the installable "on form submit" trigger with the new range.
    var res = onFormSubmit({ range: sheet.getRange(r, 1, 1, row.length), values: row });

    highlightRow = r;
    currentSheet = 'التسجيلات';
    renderAll();
    scrollToRow(r);
    var mailed = fakes.outbox.length > before;
    if (!res) {
      setFlow({ form: 'ok', validate: 'fail', dup: 'skip', seat: 'skip', sheet: 'warn', email: 'skip' });
      toast('حصل خطأ واتسجل في "سجل الأخطاء"');
    } else {
      var states = Object.assign({}, FLOW[res.status]);
      if (states.email === 'ok' && !mailed) states.email = 'warn';
      setFlow(states);
      var msg = res.ref + ' · ' + res.status;
      if (res.status === 'مؤكد' || res.status === 'قائمة انتظار') msg += mailed ? ' · اتبعت إيميل لولي الأمر' : ' · الإيميل مستني الحد اليومي';
      else msg += ' · ' + res.note;
      toast(msg);
      $('lastResult').textContent = 'آخر تسجيل: ' + res.ref + ' (' + res.status + ')';
      if (res.status !== 'بيانات غير صحيحة' && res.status !== 'مكرر') $('form').reset();
    }
    btn.disabled = false;
  }

  function bind() {
    $('form').addEventListener('submit', submitForm);
    document.querySelectorAll('[data-scenario]').forEach(function (b) {
      b.addEventListener('click', function () { scenario(b.dataset.scenario); });
    });
    document.querySelectorAll('.sheet-tabs [role=tab]').forEach(function (b) {
      b.addEventListener('click', function () { currentSheet = b.dataset.sheet; renderSheet(); });
    });
    $('runReport').addEventListener('click', function () {
      try {
        var rep = sendWeeklyReport();
        renderAll();
        openMail(fakes.outbox[fakes.outbox.length - 1]);
        toast('التقرير اتبعت للإدارة: ' + rep.newThisWeek + ' تسجيل جديد الأسبوع ده');
      } catch (e) {
        renderAll();
        toast('التقرير مبعتش (الحد اليومي خلص)، واتسجل في سجل الأخطاء');
      }
    });
    $('quotaOff').addEventListener('change', function (e) {
      fakes.setQuota(e.target.checked ? 0 : 100);
      toast(e.target.checked ? 'دلوقتي أي إيميل هيستنى: جرّب تسجّل طالب' : 'الحد اليومي اتجدد');
    });
    $('retry').addEventListener('click', function () {
      var n = retryPendingEmails();
      renderAll();
      toast(n ? 'اتبعت ' + n + ' إيميل متأخر' : 'مفيش إيميلات متأخرة (أو الحد اليومي لسه خلصان)');
    });
    $('reset').addEventListener('click', function () {
      fresh(); renderAll(); setFlow({}); $('lastResult').textContent = ''; $('form').reset();
      toast('الديمو رجع لأوله');
    });
    $('mailClose').addEventListener('click', function () { $('mailDialog').close(); });
    $('mailDialog').addEventListener('click', function (e) { if (e.target === $('mailDialog')) $('mailDialog').close(); });
  }

  function boot() {
    loadScripts().then(function () {
      fresh();
      renderAll();
      bind();
      scrollToRow(fakes.spreadsheet.getSheetByName('التسجيلات').getLastRow());
      document.body.dataset.ready = '1';
    }).catch(function (err) {
      $('lastResult').textContent = 'الديمو مقدرش يحمّل الكود: ' + err.message;
      console.error(err);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
