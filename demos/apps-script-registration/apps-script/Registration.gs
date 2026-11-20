/**
 * Registration.gs: what happens on every form submission.
 *
 * Form → row in "التسجيلات" → validate → duplicate check → seat check
 *      → status + code written to the row → confirmation / waitlist email.
 */

/**
 * Pure decision for one submission (unit-tested).
 * @param {Object} raw  answers as typed
 * @param {Object} ctx  {records: earlier records, groups, grades, row, prefix}
 * @return {{status: string, ref: string, note: string, value: Object, group: Object|null, position: number}}
 */
function decideRegistration(raw, ctx) {
  var check = validateRegistration(raw, { grades: ctx.grades, groups: ctx.groups });
  var ref = makeRef(ctx.prefix, ctx.row - 1);
  var base = { ref: ref, value: check.value, group: check.group, position: 0 };

  if (!check.ok) return assign_(base, { status: STATUS.INVALID, note: check.errors.join(' · ') });

  var dup = findDuplicate(ctx.records, check.value);
  if (dup) return assign_(base, { status: STATUS.DUPLICATE, note: 'مسجل قبل كده بكود ' + (dup.ref || ('صف ' + dup.row)) });

  var confirmed = countConfirmed(ctx.records, check.group.name);
  if (confirmed >= check.group.capacity) {
    var waiting = ctx.records.filter(function (r) { return r.group === check.group.name && r.status === STATUS.WAITLIST; }).length;
    return assign_(base, { status: STATUS.WAITLIST, note: 'المجموعة كاملة (' + check.group.capacity + ')', position: waiting + 1 });
  }
  return assign_(base, { status: STATUS.CONFIRMED, note: 'مكان ' + (confirmed + 1) + ' من ' + check.group.capacity });
}

function assign_(a, b) {
  var o = {};
  Object.keys(a).forEach(function (k) { o[k] = a[k]; });
  Object.keys(b).forEach(function (k) { o[k] = b[k]; });
  return o;
}

/**
 * Installable trigger: From spreadsheet → On form submit.
 * The lock makes two parents submitting in the same second unable to take the same last seat.
 */
function onFormSubmit(e) {
  var lock = LockService.getScriptLock();
  var row = e && e.range ? e.range.getRow() : 0;
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheet_(ss, CONFIG.sheets.responses);
    var map = ensureColumns_(sheet, statusColumnNames_());
    var records = readRecords_(ss);
    var current = null, earlier = [];
    records.forEach(function (r) {
      if (r.row === row) current = r;
      else if (r.row < row) earlier.push(r);
    });
    if (!current) throw new Error('الصف ' + row + ' مش لاقيه في شيت التسجيلات');

    var result = decideRegistration(current, {
      records: earlier, groups: readGroups_(ss), grades: CONFIG.grades, row: row, prefix: CONFIG.refPrefix
    });
    writeResult_(sheet, map, row, result.status, result.ref, result.note, '');

    if (result.status === STATUS.CONFIRMED || result.status === STATUS.WAITLIST) {
      sendRegistrationEmail_(sheet, map, row, result);
    }
    if (CONFIG.hideFullGroupsInForm && result.status === STATUS.CONFIRMED) syncFormGroups();
    return result;
  } catch (err) {
    logError_('onFormSubmit', err, row ? 'صف ' + row : '');
    if (row) {
      try {
        var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.responses);
        writeResult_(sh, ensureColumns_(sh, statusColumnNames_()), row, STATUS.ERROR, '', String(err.message || err), '');
      } catch (ignored) { /* already logged */ }
    }
    return null;
  } finally {
    lock.releaseLock();
  }
}

function writeResult_(sheet, map, row, status, ref, note, emailedAt) {
  var c = CONFIG.columns;
  sheet.getRange(row, map[c.status]).setValue(status);
  sheet.getRange(row, map[c.ref]).setValue(ref);
  sheet.getRange(row, map[c.note]).setValue(note);
  sheet.getRange(row, map[c.emailedAt]).setValue(emailedAt);
}

/**
 * Sends the email if the daily quota allows. Otherwise leaves "وقت إرسال الإيميل"
 * empty; retryPendingEmails() (hourly trigger) sends it later.
 * @return {boolean} sent
 */
function sendRegistrationEmail_(sheet, map, row, result) {
  var c = CONFIG.columns;
  if (MailApp.getRemainingDailyQuota() < 1) {
    sheet.getRange(row, map[c.note]).setValue(result.note + ' · الإيميل مستني الحد اليومي يتجدد');
    logError_('sendRegistrationEmail_', 'Daily email quota reached', result.ref + ' هيتبعت تلقائي');
    return false;
  }
  var group = result.group || { name: result.value.group, time: '' };
  var mail = buildRegistrationEmail(
    { name: result.value.name, grade: result.value.grade, group: group.name, ref: result.ref },
    group, result.status, { center: CONFIG.centerName, position: result.position });
  var msg = { to: result.value.email, subject: mail.subject, body: mail.body, htmlBody: mail.htmlBody, name: CONFIG.centerName };
  if (CONFIG.replyTo) msg.replyTo = CONFIG.replyTo;
  MailApp.sendEmail(msg);
  sheet.getRange(row, map[c.emailedAt]).setValue(formatNow_());
  return true;
}

/** Hourly trigger: emails that waited for the quota. Safe to run any time. */
function retryPendingEmails() {
  var lock = LockService.getScriptLock();
  var sent = 0;
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheet_(ss, CONFIG.sheets.responses);
    var map = ensureColumns_(sheet, statusColumnNames_());
    var groups = readGroups_(ss);
    var records = readRecords_(ss);
    records.forEach(function (r) {
      if (!isActiveStatus(r.status) || r.emailedAt || !isValidEmail(normalizeEmail(r.email))) return;
      if (MailApp.getRemainingDailyQuota() < 1) return;
      var position = r.status === STATUS.WAITLIST ? records.filter(function (x) {
        return x.group === r.group && x.status === STATUS.WAITLIST && x.row <= r.row;
      }).length : 0;
      var ok = sendRegistrationEmail_(sheet, map, r.row, {
        status: r.status, ref: r.ref, note: String(r.note).split(' · ')[0], position: position,
        value: { name: cleanName(r.name), grade: r.grade, group: r.group, email: normalizeEmail(r.email) },
        group: findGroup(groups, r.group)
      });
      if (ok) {
        sheet.getRange(r.row, map[CONFIG.columns.note]).setValue(String(r.note).split(' · ')[0]);
        sent++;
      }
    });
  } catch (err) {
    logError_('retryPendingEmails', err, '');
  } finally {
    lock.releaseLock();
  }
  return sent;
}
