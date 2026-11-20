// Loads the real .gs files into a sandbox with fake Google services.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const GasFakes = require('../sim/gas-fakes.js');
const dir = new URL('../apps-script/', import.meta.url);

export const Q = ['Timestamp', 'اسم الطالب', 'موبايل ولي الأمر', 'الإيميل', 'الصف الدراسي', 'المجموعة', 'ملاحظات'];
export const GROUPS = [
  ['المجموعة', 'الصف', 'الميعاد', 'السعة', 'مفتوحة'],
  ['رياضيات 3ث · السبت 4م', 'الثالث الثانوي', 'السبت والثلاثاء 4:00 م', 2, 'نعم'],
  ['فيزياء 1ث · الأحد 6م', 'الأول الثانوي', 'الأحد والأربعاء 6:00 م', 15, 'نعم'],
  ['كيمياء 2ث · مقفولة', 'الثاني الثانوي', 'الاثنين 5:00 م', 10, 'لا']
];

/** @return {{gas: object, fakes: object}} gas = the script's globals */
export function loadGas({ quota = 100, withSheets = true, formUrl = 'https://docs.google.com/forms/d/demo/edit' } = {}) {
  const fakes = GasFakes.create({ quota, formUrl });
  const ctx = vm.createContext({ ...fakes.services, console });
  for (const f of GasFakes.GS_FILES) {
    vm.runInContext(readFileSync(new URL(f, dir), 'utf8'), ctx, { filename: f });
  }
  if (withSheets) {
    fakes.spreadsheet.insertSheet('التسجيلات', [Q]);
    fakes.spreadsheet.insertSheet('المجموعات', GROUPS);
  }
  return { gas: ctx, fakes };
}

/** Simulates Google Forms: appends the answers row, then fires onFormSubmit like Apps Script does. */
export function submit(gas, fakes, answers, when = new Date()) {
  const sheet = fakes.spreadsheet.getSheetByName('التسجيلات');
  const row = [when, answers.name, answers.phone, answers.email, answers.grade, answers.group, answers.notes || ''];
  sheet.appendRow(row);
  const r = sheet.getLastRow();
  return gas.onFormSubmit({ range: sheet.getRange(r, 1, 1, row.length), values: row });
}

export function rowObject(fakes, row) {
  const sh = fakes.spreadsheet.getSheetByName('التسجيلات');
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const vals = sh.getRange(row, 1, 1, headers.length).getValues()[0];
  return Object.fromEntries(headers.map((h, i) => [h, vals[i]]));
}

export const student = (over = {}) => ({
  name: 'ملك محمد السيد', phone: '01012345678', email: 'parent1@example.com',
  grade: 'الثالث الثانوي', group: 'رياضيات 3ث · السبت 4م', ...over
});
