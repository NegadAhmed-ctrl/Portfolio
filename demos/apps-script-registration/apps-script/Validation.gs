/**
 * Validation.gs: pure functions (no Google services), unit-tested in Node.
 */

/** "٠١٠١٢٣" and "۰۱۰" (Persian) → "010123". */
function toLatinDigits(s) {
  return String(s == null ? '' : s)
    .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
    .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
}

/** Egyptian mobile in any common form → "01XXXXXXXXX", or null. */
function normalizePhone(raw) {
  var s = toLatinDigits(raw).replace(/[\s\-().‏‎]/g, '');
  if (s.indexOf('+20') === 0) s = '0' + s.slice(3);
  else if (s.indexOf('0020') === 0) s = '0' + s.slice(4);
  else if (/^20 ?1\d{9}$/.test(s)) s = '0' + s.slice(2);
  else if (/^1[0125]\d{8}$/.test(s)) s = '0' + s;
  return /^01[0125]\d{8}$/.test(s) ? s : null;
}

function normalizeEmail(raw) {
  return String(raw == null ? '' : raw).trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email);
}

/** Collapse spaces; keeps the name as typed for display. */
function cleanName(raw) {
  return String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
}

/**
 * Comparison key for names, so "محمد  أحمد" and "محمد احمد" match:
 * removes diacritics/tatweel, unifies alef/ya/ta marbuta forms.
 */
function nameKey(raw) {
  return cleanName(raw)
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase();
}

/**
 * Validates one form answer set.
 * @param {Object} raw  {name, phone, email, grade, group, notes} as typed
 * @param {Object} opts {grades: string[], groups: Group[]}
 * @return {{ok: boolean, errors: string[], value: Object, group: Group|null}}
 */
function validateRegistration(raw, opts) {
  var errors = [];
  var name = cleanName(raw.name);
  var phone = normalizePhone(raw.phone);
  var email = normalizeEmail(raw.email);
  var grade = cleanName(raw.grade);
  var groupName = cleanName(raw.group);

  if (name.split(' ').length < 2 || name.length > 60) errors.push('الاسم لازم يكون ثنائي على الأقل');
  if (!phone) errors.push('رقم الموبايل مش رقم مصري صحيح');
  if (!isValidEmail(email)) errors.push('الإيميل مش صحيح');
  if ((opts.grades || []).indexOf(grade) === -1) errors.push('الصف الدراسي مش في القائمة');

  var group = findGroup(opts.groups || [], groupName);
  if (!group) errors.push('المجموعة مش موجودة أو متقفلة');
  else if (group.grade && grade && group.grade !== grade) errors.push('المجموعة دي لـ ' + group.grade + ' مش ' + grade);

  return {
    ok: errors.length === 0,
    errors: errors,
    value: { name: name, phone: phone || toLatinDigits(raw.phone).trim(), email: email, grade: grade, group: groupName, notes: cleanName(raw.notes) },
    group: group
  };
}

function findGroup(groups, name) {
  for (var i = 0; i < groups.length; i++) {
    if (groups[i].name === name && groups[i].active !== false) return groups[i];
  }
  return null;
}

/** Statuses that hold (or wait for) a seat. */
function isActiveStatus(s) {
  return s === STATUS.CONFIRMED || s === STATUS.WAITLIST;
}

/**
 * Same student registering twice for the same group: same name key AND
 * (same phone OR same email). Siblings sharing a parent's phone are NOT duplicates.
 * @return {Object|null} the earlier record
 */
function findDuplicate(records, value) {
  var key = nameKey(value.name);
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    if (!isActiveStatus(r.status) || r.group !== value.group) continue;
    if (nameKey(r.name) !== key) continue;
    if ((value.phone && normalizePhone(r.phone) === value.phone) ||
        (value.email && normalizeEmail(r.email) === value.email)) return r;
  }
  return null;
}

function countConfirmed(records, groupName) {
  var n = 0;
  for (var i = 0; i < records.length; i++) {
    if (records[i].group === groupName && records[i].status === STATUS.CONFIRMED) n++;
  }
  return n;
}

/** "MN" + row 7 → "MN-0007". The response row is unique and never reused. */
function makeRef(prefix, row) {
  var n = String(row);
  while (n.length < 4) n = '0' + n;
  return prefix + '-' + n;
}
