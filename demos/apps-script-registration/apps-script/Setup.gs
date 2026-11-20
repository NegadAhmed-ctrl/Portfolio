/**
 * Setup.gs: one-click install from the sheet menu, triggers, form sync.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('المنظومة')
    .addItem('إعداد النظام (مرة واحدة)', 'setup')
    .addItem('ابعت التقرير الأسبوعي دلوقتي', 'sendWeeklyReport')
    .addItem('ابعت الإيميلات المتأخرة', 'retryPendingEmails')
    .addItem('حدّث المجموعات في الفورم', 'syncFormGroups')
    .addToUi();
}

/** Creates missing sheets/columns and (re)installs the triggers. Safe to run twice. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var responses = ss.getSheetByName(CONFIG.sheets.responses);
  if (!responses) {
    throw new Error('اربط الفورم بالشيت الأول، وغيّر اسم شيت الردود لـ "' + CONFIG.sheets.responses + '".');
  }
  ensureColumns_(responses, statusColumnNames_());
  if (!ss.getSheetByName(CONFIG.sheets.groups)) {
    var g = createSheet_(ss, CONFIG.sheets.groups, GROUP_HEADERS);
    g.getRange(2, 1, 2, GROUP_HEADERS.length).setValues([
      ['رياضيات 3 ث · السبت 4م', 'الثالث الثانوي', 'السبت والثلاثاء 4:00 م', 20, 'نعم'],
      ['فيزياء 1 ث · الأحد 6م', 'الأول الثانوي', 'الأحد والأربعاء 6:00 م', 15, 'نعم']
    ]);
  }
  if (!ss.getSheetByName(CONFIG.sheets.errors)) createSheet_(ss, CONFIG.sheets.errors, ERROR_HEADERS);
  installTriggers_(ss);
  return 'ok';
}

/** Deletes this project's old triggers first, so running setup twice never sends double emails. */
function installTriggers_(ss) {
  var handlers = ['onFormSubmit', 'sendWeeklyReport', 'retryPendingEmails'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (handlers.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('sendWeeklyReport').timeBased()
    .onWeekDay(ScriptApp.WeekDay[CONFIG.report.weekDay]).atHour(CONFIG.report.hour)
    .inTimezone(CONFIG.timeZone).create();
  ScriptApp.newTrigger('retryPendingEmails').timeBased().everyHours(1).create();
}

/** Pure: groups that should appear in the form (open and not full). */
function openGroupNames(groups, records) {
  return groups.filter(function (g) {
    return g.active !== false && countConfirmed(records, g.name) < g.capacity;
  }).map(function (g) { return g.name; });
}

/**
 * Updates the form's group question from the groups sheet, so a full or
 * closed group stops appearing. If every group is full the form is left as is
 * (new answers go to the waitlist) instead of showing an empty question.
 */
function syncFormGroups() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var url = ss.getFormUrl();
    if (!url) return [];
    var names = openGroupNames(readGroups_(ss), readRecords_(ss));
    if (!names.length) return [];
    var form = FormApp.openByUrl(url);
    var items = form.getItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].getTitle() !== CONFIG.questions.group) continue;
      var type = items[i].getType();
      if (type === FormApp.ItemType.LIST) items[i].asListItem().setChoiceValues(names);
      else if (type === FormApp.ItemType.MULTIPLE_CHOICE) items[i].asMultipleChoiceItem().setChoiceValues(names);
    }
    return names;
  } catch (err) {
    logError_('syncFormGroups', err, '');
    return [];
  }
}
