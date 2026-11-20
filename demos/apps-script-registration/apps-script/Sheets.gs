/**
 * Sheets.gs: reading/writing the spreadsheet. Columns are found by their
 * header text, so the owner can reorder or add columns without breaking it.
 */

var GROUP_HEADERS = ['المجموعة', 'الصف', 'الميعاد', 'السعة', 'مفتوحة'];
var ERROR_HEADERS = ['الوقت', 'المكان', 'الخطأ', 'التفاصيل'];

function getSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('الشيت "' + name + '" مش موجود. شغّل "إعداد النظام" من قائمة المنظومة.');
  return sh;
}

/** {headerText: columnNumber (1-based)} */
function headerMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var map = {};
  headers.forEach(function (h, i) { if (h !== '' && map[h] == null) map[String(h).trim()] = i + 1; });
  return map;
}

/** Adds the status columns if missing; returns the header map. */
function ensureColumns_(sheet, names) {
  var map = headerMap_(sheet);
  var next = sheet.getLastColumn() + 1;
  names.forEach(function (n) {
    if (map[n] == null) { sheet.getRange(1, next).setValue(n); map[n] = next++; }
  });
  return map;
}

function statusColumnNames_() {
  var c = CONFIG.columns;
  return [c.status, c.ref, c.note, c.emailedAt];
}

function rowToRecord_(row, values, map) {
  var q = CONFIG.questions, c = CONFIG.columns;
  function v(title) { return map[title] ? values[map[title] - 1] : ''; }
  var ts = map['Timestamp'] ? v('Timestamp') : (map['الطابع الزمني'] ? v('الطابع الزمني') : values[0]);
  return {
    row: row,
    timestamp: isDate_(ts) ? ts : (ts ? new Date(ts) : null),
    name: v(q.name), phone: v(q.phone), email: v(q.email), grade: v(q.grade), group: v(q.group), notes: v(q.notes),
    status: v(c.status), ref: v(c.ref), note: v(c.note), emailedAt: v(c.emailedAt)
  };
}

function readRecords_(ss) {
  var sh = getSheet_(ss, CONFIG.sheets.responses);
  var map = headerMap_(sh);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  return values.map(function (vals, i) { return rowToRecord_(i + 2, vals, map); });
}

function readGroups_(ss) {
  var sh = getSheet_(ss, CONFIG.sheets.groups);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, GROUP_HEADERS.length).getValues()
    .filter(function (r) { return String(r[0]).trim() !== ''; })
    .map(function (r) {
      return {
        name: String(r[0]).trim(), grade: String(r[1]).trim(), time: String(r[2]).trim(),
        capacity: Number(toLatinDigits(r[3])) || 0,
        active: !/^(لا|no|false)$/i.test(String(r[4]).trim())
      };
    });
}

function readErrors_(ss) {
  var sh = ss.getSheetByName(CONFIG.sheets.errors);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().map(function (r) {
    return { at: isDate_(r[0]) ? r[0] : new Date(r[0]), where: r[1], message: r[2], details: r[3] };
  });
}

/** Never throws: a failing logger must not hide the original problem. */
function logError_(where, err, details) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(CONFIG.sheets.errors) || createSheet_(ss, CONFIG.sheets.errors, ERROR_HEADERS);
    sh.appendRow([new Date(), where, String(err && err.message ? err.message : err), details || '']);
  } catch (e) {
    console.error('logError_ failed', e, err);
  }
}

function createSheet_(ss, name, headers) {
  var sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

/** Works for Dates coming from another JS realm too (tests, demo). */
function isDate_(x) {
  return Object.prototype.toString.call(x) === '[object Date]' && !isNaN(x.getTime());
}

function formatNow_() {
  return Utilities.formatDate(new Date(), CONFIG.timeZone, 'yyyy-MM-dd HH:mm');
}
