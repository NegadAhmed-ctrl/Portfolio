/**
 * Email.gs: pure email builders (subject + plain text + HTML).
 * Every value typed by a parent is escaped before it goes into HTML.
 */

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function emailShell_(title, bodyHtml, center) {
  return '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f3f1ea;padding:24px">' +
    '<div style="max-width:520px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3ded2">' +
    '<div style="background:#0f4c3a;color:#fff;padding:18px 22px;font-size:18px;font-weight:bold">' + escapeHtml(center) + '</div>' +
    '<div style="padding:22px;color:#1f2a24;font-size:15px;line-height:1.8">' +
    '<h2 style="margin:0 0 10px;font-size:19px">' + escapeHtml(title) + '</h2>' + bodyHtml +
    '</div><div style="padding:12px 22px;background:#f7f6f1;color:#6b746e;font-size:12px">رسالة آلية من نظام التسجيل. للاستفسار رد على الإيميل ده.</div></div></div>';
}

function detailsTable_(rows) {
  var html = '<table style="width:100%;border-collapse:collapse;margin:12px 0">';
  for (var i = 0; i < rows.length; i++) {
    html += '<tr><td style="padding:7px 0;color:#6b746e;width:38%">' + escapeHtml(rows[i][0]) +
      '</td><td style="padding:7px 0;font-weight:bold">' + escapeHtml(rows[i][1]) + '</td></tr>';
  }
  return html + '</table>';
}

/**
 * @param {Object} reg   {name, grade, group, ref}
 * @param {Object} group {name, time}
 * @param {string} status STATUS.CONFIRMED | STATUS.WAITLIST
 * @param {Object} opts  {center, position}  position = place in the waitlist
 */
function buildRegistrationEmail(reg, group, status, opts) {
  var center = opts.center;
  var rows = [['الطالب', reg.name], ['الصف', reg.grade], ['المجموعة', group.name], ['الميعاد', group.time || '-'], ['كود التسجيل', reg.ref]];
  var title, lead, textLead;
  if (status === STATUS.WAITLIST) {
    title = 'اتسجلت في قائمة الانتظار';
    lead = 'المجموعة اكتملت، و' + escapeHtml(reg.name) + ' دلوقتي رقم ' + opts.position + ' في قائمة الانتظار. أول ما يفضى مكان هنكلمكم.';
    textLead = 'المجموعة اكتملت، و' + reg.name + ' رقم ' + opts.position + ' في قائمة الانتظار. أول ما يفضى مكان هنكلمكم.';
  } else {
    title = 'تم تأكيد التسجيل';
    lead = 'أهلا بيكم! تم تسجيل ' + escapeHtml(reg.name) + ' في المجموعة، ومستنيينكم في أول حصة.';
    textLead = 'أهلا بيكم! تم تسجيل ' + reg.name + ' في المجموعة، ومستنيينكم في أول حصة.';
  }
  var text = title + '\n\n' + textLead + '\n\n' +
    rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
    '\n\nاحتفظوا بكود التسجيل للمتابعة.\n' + center;
  return {
    subject: title + ' · ' + reg.ref + ' · ' + center,
    body: text,
    htmlBody: emailShell_(title, '<p style="margin:0">' + lead + '</p>' + detailsTable_(rows) +
      '<p style="margin:0;color:#6b746e">احتفظوا بكود التسجيل للمتابعة.</p>', center)
  };
}

/** Weekly report email for the admin. `report` comes from buildWeeklyReport(). */
function buildReportEmail(report, opts) {
  var center = opts.center;
  var cell = 'padding:8px 10px;border-bottom:1px solid #eee;text-align:right';
  var html = '<p style="margin:0 0 6px">من ' + escapeHtml(report.from) + ' لـ ' + escapeHtml(report.to) + '</p>' +
    detailsTable_([
      ['تسجيلات جديدة الأسبوع ده', report.newThisWeek],
      ['إجمالي المؤكدين', report.totals.confirmed],
      ['قائمة الانتظار', report.totals.waitlist],
      ['مكرر / بيانات غلط (اتمنعوا)', report.totals.duplicate + ' / ' + report.totals.invalid],
      ['أخطاء في السجل الأسبوع ده', report.errorsThisWeek]
    ]) +
    '<table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="background:#eef5f1">' +
    '<th style="' + cell + '">المجموعة</th><th style="' + cell + '">مؤكد</th><th style="' + cell + '">متاح</th><th style="' + cell + '">انتظار</th></tr>';
  report.groups.forEach(function (g) {
    html += '<tr><td style="' + cell + '">' + escapeHtml(g.name) + '</td><td style="' + cell + '">' + g.confirmed + ' / ' + g.capacity +
      '</td><td style="' + cell + '">' + g.seatsLeft + '</td><td style="' + cell + '">' + g.waitlist + '</td></tr>';
  });
  html += '</table>';
  if (report.alerts.length) {
    html += '<h3 style="font-size:16px;margin:18px 0 6px">محتاج انتباهك</h3><ul style="margin:0;padding-inline-start:18px">' +
      report.alerts.map(function (a) { return '<li>' + escapeHtml(a) + '</li>'; }).join('') + '</ul>';
  }
  var text = 'تقرير التسجيل الأسبوعي (' + report.from + ' - ' + report.to + ')\n' +
    'جديد: ' + report.newThisWeek + ' · مؤكد: ' + report.totals.confirmed + ' · انتظار: ' + report.totals.waitlist + '\n\n' +
    report.groups.map(function (g) { return g.name + ': ' + g.confirmed + '/' + g.capacity + ' (انتظار ' + g.waitlist + ')'; }).join('\n') +
    (report.alerts.length ? '\n\n' + report.alerts.join('\n') : '');
  return {
    subject: 'تقرير التسجيل الأسبوعي · ' + report.newThisWeek + ' تسجيل جديد · ' + center,
    body: text,
    htmlBody: emailShell_('تقرير التسجيل الأسبوعي', html, center)
  };
}
