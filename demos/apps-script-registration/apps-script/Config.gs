/**
 * Config.gs: everything a center changes, in one place.
 * Groups (name, grade, time, capacity) live in the "المجموعات" sheet so the
 * teacher can edit them from the phone without touching code.
 */
var CONFIG = {
  centerName: 'سنتر المنارة التعليمي',
  adminEmail: 'admin@example.com',     // weekly report + error alerts go here
  replyTo: '',                          // optional: parents' replies go here
  timeZone: 'Africa/Cairo',
  refPrefix: 'MN',                      // registration code: MN-0007

  sheets: {
    responses: 'التسجيلات',             // the sheet linked to the Google Form
    groups: 'المجموعات',
    errors: 'سجل الأخطاء'
  },

  // Google Form question titles, exactly as written in the form.
  questions: {
    name: 'اسم الطالب',
    phone: 'موبايل ولي الأمر',
    email: 'الإيميل',
    grade: 'الصف الدراسي',
    group: 'المجموعة',
    notes: 'ملاحظات'
  },

  // Columns the script adds to the right of the form answers.
  columns: {
    status: 'الحالة',
    ref: 'كود التسجيل',
    note: 'ملاحظة النظام',
    emailedAt: 'وقت إرسال الإيميل'
  },

  grades: [
    'الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي',
    'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'
  ],

  report: { weekDay: 'SUNDAY', hour: 9 },   // weekly report time (center time zone)
  hideFullGroupsInForm: true                // full groups disappear from the form
};

var STATUS = {
  CONFIRMED: 'مؤكد',
  WAITLIST: 'قائمة انتظار',
  DUPLICATE: 'مكرر',
  INVALID: 'بيانات غير صحيحة',
  ERROR: 'خطأ'
};
