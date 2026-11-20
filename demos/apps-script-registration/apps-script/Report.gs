/**
 * Report.gs: weekly numbers (pure) + the trigger that emails them.
 */

var DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {Object[]} records   registrations (see readRecords_)
 * @param {Object[]} groups    from the groups sheet
 * @param {Object[]} errors    rows of the error log ({at: Date})
 * @param {Date} now
 * @param {function(Date): string} fmt  date formatter (Utilities.formatDate in Apps Script)
 */
function buildWeeklyReport(records, groups, errors, now, fmt) {
  var since = new Date(now.getTime() - 7 * DAY_MS);
  var totals = { confirmed: 0, waitlist: 0, duplicate: 0, invalid: 0, error: 0 };
  var newThisWeek = 0, pendingEmails = 0;

  records.forEach(function (r) {
    if (r.status === STATUS.CONFIRMED) totals.confirmed++;
    else if (r.status === STATUS.WAITLIST) totals.waitlist++;
    else if (r.status === STATUS.DUPLICATE) totals.duplicate++;
    else if (r.status === STATUS.INVALID) totals.invalid++;
    else if (r.status === STATUS.ERROR) totals.error++;
    if (isDate_(r.timestamp) && r.timestamp >= since && isActiveStatus(r.status)) newThisWeek++;
    if (isActiveStatus(r.status) && !r.emailedAt) pendingEmails++;
  });

  var alerts = [];
  var rows = groups.filter(function (g) { return g.active !== false; }).map(function (g) {
    var confirmed = 0, waitlist = 0;
    records.forEach(function (r) {
      if (r.group !== g.name) return;
      if (r.status === STATUS.CONFIRMED) confirmed++;
      if (r.status === STATUS.WAITLIST) waitlist++;
    });
    var seatsLeft = Math.max(0, g.capacity - confirmed);
    if (waitlist > 0) alerts.push('مجموعة ' + g.name + ' كاملة وفيها ' + waitlist + ' في الانتظار: ممكن تفتح مجموعة جديدة.');
    else if (g.capacity > 0 && confirmed / g.capacity < 0.3) alerts.push('مجموعة ' + g.name + ' فيها ' + confirmed + ' بس من ' + g.capacity + '.');
    return { name: g.name, time: g.time, capacity: g.capacity, confirmed: confirmed, seatsLeft: seatsLeft, waitlist: waitlist };
  });

  var errorsThisWeek = errors.filter(function (e) { return isDate_(e.at) && e.at >= since; }).length;
  if (pendingEmails > 0) alerts.push(pendingEmails + ' إيميل لسه مبعتش (الحد اليومي للإيميلات). هيتبعتوا تلقائي.');
  if (errorsThisWeek > 0) alerts.push('فيه ' + errorsThisWeek + ' خطأ في شيت "' + CONFIG.sheets.errors + '" الأسبوع ده.');

  return {
    from: fmt(since), to: fmt(now),
    newThisWeek: newThisWeek, totals: totals, groups: rows,
    pendingEmails: pendingEmails, errorsThisWeek: errorsThisWeek, alerts: alerts
  };
}

/** Time-driven trigger (weekly). Also in the sheet menu: "ابعت التقرير دلوقتي". */
function sendWeeklyReport() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var report = buildWeeklyReport(readRecords_(ss), readGroups_(ss), readErrors_(ss), new Date(), function (d) {
      return Utilities.formatDate(d, CONFIG.timeZone, 'yyyy-MM-dd');
    });
    var mail = buildReportEmail(report, { center: CONFIG.centerName });
    MailApp.sendEmail({ to: CONFIG.adminEmail, subject: mail.subject, body: mail.body, htmlBody: mail.htmlBody, name: CONFIG.centerName });
    return report;
  } catch (err) {
    logError_('sendWeeklyReport', err, '');
    throw err;
  }
}
