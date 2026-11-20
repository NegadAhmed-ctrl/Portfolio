/**
 * In-memory fakes of the Google Apps Script services this project uses
 * (SpreadsheetApp, MailApp, LockService, Utilities, ScriptApp, FormApp).
 *
 * Used twice:
 *  - by the Node tests, which run the real .gs files against these fakes;
 *  - by the live demo page, which runs the same .gs files in the browser.
 * Only the behaviour the scripts rely on is implemented, but it follows the
 * real API (1-based rows/columns, getValues() padding, quota errors).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GasFakes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var GS_FILES = ['Config.gs', 'Validation.gs', 'Email.gs', 'Sheets.gs', 'Report.gs', 'Registration.gs', 'Setup.gs'];

  function isEmpty(v) { return v === '' || v === null || v === undefined; }

  function Sheet(name, rows) {
    this._name = name;
    this.data = (rows || []).map(function (r) { return r.slice(); });
  }
  Sheet.prototype.getName = function () { return this._name; };
  Sheet.prototype.getLastRow = function () {
    for (var r = this.data.length - 1; r >= 0; r--) {
      if (this.data[r].some(function (v) { return !isEmpty(v); })) return r + 1;
    }
    return 0;
  };
  Sheet.prototype.getLastColumn = function () {
    var max = 0;
    this.data.forEach(function (row) {
      for (var c = row.length - 1; c >= 0; c--) { if (!isEmpty(row[c])) { max = Math.max(max, c + 1); break; } }
    });
    return max;
  };
  Sheet.prototype.getRange = function (row, col, numRows, numCols) {
    if (!(row >= 1 && col >= 1)) throw new Error('Range: rows and columns start at 1 (got ' + row + ',' + col + ')');
    return new Range(this, row, col, numRows || 1, numCols || 1);
  };
  Sheet.prototype.getDataRange = function () {
    return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  };
  Sheet.prototype.appendRow = function (values) {
    this.getRange(this.getLastRow() + 1, 1, 1, values.length).setValues([values]);
    return this;
  };
  Sheet.prototype.setFrozenRows = function () { return this; };
  Sheet.prototype._set = function (r, c, v) {
    while (this.data.length < r) this.data.push([]);
    var row = this.data[r - 1];
    while (row.length < c) row.push('');
    row[c - 1] = v;
  };
  Sheet.prototype._get = function (r, c) {
    var row = this.data[r - 1];
    return row && !isEmpty(row[c - 1]) ? row[c - 1] : '';
  };

  function Range(sheet, row, col, nr, nc) { this.s = sheet; this.r = row; this.c = col; this.nr = nr; this.nc = nc; }
  Range.prototype.getRow = function () { return this.r; };
  Range.prototype.getColumn = function () { return this.c; };
  Range.prototype.getValues = function () {
    var out = [];
    for (var i = 0; i < this.nr; i++) {
      var line = [];
      for (var j = 0; j < this.nc; j++) line.push(this.s._get(this.r + i, this.c + j));
      out.push(line);
    }
    return out;
  };
  Range.prototype.getValue = function () { return this.s._get(this.r, this.c); };
  Range.prototype.setValues = function (values) {
    if (values.length !== this.nr || values.some(function (l) { return l.length !== this.nc; }, this)) {
      throw new Error('The number of rows or columns in the data does not match the range');
    }
    for (var i = 0; i < this.nr; i++) for (var j = 0; j < this.nc; j++) this.s._set(this.r + i, this.c + j, values[i][j]);
    return this;
  };
  Range.prototype.setValue = function (v) { this.s._set(this.r, this.c, v); return this; };
  Range.prototype.setFontWeight = function () { return this; };
  Range.prototype.setBackground = function () { return this; };

  function Spreadsheet(formUrl) { this.sheets = []; this.formUrl = formUrl || ''; }
  Spreadsheet.prototype.getSheetByName = function (n) {
    for (var i = 0; i < this.sheets.length; i++) if (this.sheets[i].getName() === n) return this.sheets[i];
    return null;
  };
  Spreadsheet.prototype.insertSheet = function (n, rows) {
    if (this.getSheetByName(n)) throw new Error('A sheet with the name "' + n + '" already exists.');
    var sh = new Sheet(n, rows); this.sheets.push(sh); return sh;
  };
  Spreadsheet.prototype.getSheets = function () { return this.sheets.slice(); };
  Spreadsheet.prototype.getFormUrl = function () { return this.formUrl || null; };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function formatDate(date, tz, pattern) {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
    return pattern.replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day)
      .replace('HH', pad(Number(parts.hour) % 24)).replace('mm', parts.minute);
  }

  function create(opts) {
    opts = opts || {};
    var ss = new Spreadsheet(opts.formUrl);
    var outbox = [];
    var state = { quota: opts.quota == null ? 100 : opts.quota, lockHeld: false, menus: [], triggers: [] };
    var form = { items: [] };

    var MailApp = {
      getRemainingDailyQuota: function () { return state.quota; },
      sendEmail: function (msg) {
        if (state.quota < 1) throw new Error('Service invoked too many times for one day: email.');
        if (!msg || !msg.to || !msg.subject) throw new Error('Invalid argument: recipient');
        state.quota--;
        outbox.push(Object.assign({ sentAt: new Date() }, msg));
      }
    };

    var LockService = {
      getScriptLock: function () {
        return {
          waitLock: function () { if (state.lockHeld) throw new Error('Lock timeout'); state.lockHeld = true; },
          tryLock: function () { if (state.lockHeld) return false; state.lockHeld = true; return true; },
          releaseLock: function () { state.lockHeld = false; }
        };
      }
    };

    function triggerBuilder(handler) {
      var t = { handler: handler, kind: null, spec: {} };
      var b = {
        forSpreadsheet: function () { t.kind = 'spreadsheet'; return b; },
        onFormSubmit: function () { t.spec.event = 'formSubmit'; return b; },
        timeBased: function () { t.kind = 'clock'; return b; },
        onWeekDay: function (d) { t.spec.weekDay = d; return b; },
        atHour: function (h) { t.spec.hour = h; return b; },
        inTimezone: function (z) { t.spec.tz = z; return b; },
        everyHours: function (n) { t.spec.everyHours = n; return b; },
        create: function () {
          var trig = { getHandlerFunction: function () { return handler; }, kind: t.kind, spec: t.spec };
          state.triggers.push(trig); return trig;
        }
      };
      return b;
    }

    var ScriptApp = {
      WeekDay: { SUNDAY: 'SUNDAY', MONDAY: 'MONDAY', TUESDAY: 'TUESDAY', WEDNESDAY: 'WEDNESDAY', THURSDAY: 'THURSDAY', FRIDAY: 'FRIDAY', SATURDAY: 'SATURDAY' },
      getProjectTriggers: function () { return state.triggers.slice(); },
      deleteTrigger: function (t) { state.triggers = state.triggers.filter(function (x) { return x !== t; }); },
      newTrigger: triggerBuilder
    };

    function formItem(it) {
      var setter = { setChoiceValues: function (v) { it.choices = v.slice(); return setter; } };
      return {
        getTitle: function () { return it.title; },
        getType: function () { return it.type; },
        asListItem: function () { return setter; },
        asMultipleChoiceItem: function () { return setter; }
      };
    }
    var FormApp = {
      ItemType: { LIST: 'LIST', MULTIPLE_CHOICE: 'MULTIPLE_CHOICE', TEXT: 'TEXT' },
      openByUrl: function (url) {
        if (url !== ss.formUrl) throw new Error('No form at ' + url);
        return { getItems: function () { return form.items.map(formItem); } };
      }
    };

    var SpreadsheetApp = {
      getActiveSpreadsheet: function () { return ss; },
      getUi: function () {
        return {
          createMenu: function (title) {
            var m = { title: title, items: [] };
            var api = {
              addItem: function (label, fn) { m.items.push([label, fn]); return api; },
              addSeparator: function () { return api; },
              addToUi: function () { state.menus.push(m); }
            };
            return api;
          }
        };
      }
    };

    var Utilities = { formatDate: formatDate };
    var Session = { getScriptTimeZone: function () { return 'Africa/Cairo'; } };

    return {
      services: {
        SpreadsheetApp: SpreadsheetApp, MailApp: MailApp, LockService: LockService,
        ScriptApp: ScriptApp, FormApp: FormApp, Utilities: Utilities, Session: Session
      },
      spreadsheet: ss,
      outbox: outbox,
      state: state,
      form: form,
      setQuota: function (n) { state.quota = n; }
    };
  }

  return { create: create, formatDate: formatDate, GS_FILES: GS_FILES };
});
