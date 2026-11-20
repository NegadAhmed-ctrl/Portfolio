# Student Registration Automation (Google Forms + Sheets + Apps Script)

Parents fill a Google Form; the center's Google Sheet does the rest: it checks the data, blocks duplicate sign-ups, counts seats per group (with a waitlist), writes a status and a registration code on every row, emails the parent, logs every error, and sends the manager a weekly report.

**Live demo:** https://negadahmed-ctrl.github.io/Portfolio/demos/apps-script-registration/
The demo runs the **same `.gs` files** in the browser against a simulated spreadsheet and outbox (labelled "ديمو"). The center ("سنتر المنارة التعليمي"), students, phones and emails are fictional.

## The problem it solves
Teachers and education centers already take registrations with Google Forms, then spend the evening in the sheet: the same student registered twice, a wrong phone number nobody can call, a group with 25 students for 20 chairs, parents asking "did you get my registration?". This turns the sheet into a small system without paying for software and without leaving Google.

## What happens on each submission
```
Google Form ─▶ row in "التسجيلات"
             ─▶ validate (name, Egyptian mobile, email, grade, group matches grade, group open)
             ─▶ duplicate check (same student + same group)
             ─▶ seat check (confirmed vs. capacity → confirmed or waitlist #N)
             ─▶ status, code (MN-0007) and a note written on the row
             ─▶ confirmation / waitlist email to the parent
             ─▶ full group removed from the form's choices
weekly       ─▶ report email to the manager (new this week, seats, waitlist, alerts)
hourly       ─▶ emails that waited for the daily quota are sent
any error    ─▶ "سجل الأخطاء" sheet (time, where, message, row)
```

## Features
- **Validation that fits Egypt:** mobiles typed as `٠١٠…`, `+20 10…`, `0020…` or with spaces/dashes all normalize to `01XXXXXXXXX`; landlines are rejected. All problems are listed in one note, not one at a time.
- **Duplicate detection that doesn't block siblings:** a duplicate is the same student (name compared without diacritics/spaces/أ-ا-ى differences) in the same group with the same phone or email. Two brothers sharing their father's phone are both accepted.
- **Seats and waitlist:** capacity per group from the "المجموعات" sheet; extra students get "قائمة انتظار" with their position, in the sheet and in the email.
- **Groups sheet the teacher edits from the phone:** name, grade, time, capacity, open yes/no. A closed or full group disappears from the form automatically.
- **Status columns** added to the right of the form answers: الحالة · كود التسجيل · ملاحظة النظام · وقت إرسال الإيميل.
- **Emails:** RTL HTML + plain-text version, every parent-typed value HTML-escaped, optional reply-to.
- **Gmail quota safe:** consumer Gmail sends ~100 emails/day from scripts. When the quota is out, the registration is still confirmed, the email is queued and sent by the hourly trigger; nothing is sent twice.
- **Weekly report** to the manager: new registrations this week, totals by status, seats left and waitlist per group, and alerts (full groups with a waitlist, groups under 30%, pending emails, errors).
- **Error log sheet** instead of silent failures; the row gets status "خطأ" so nobody is forgotten.
- **Concurrency:** a script lock around each submission, so two parents submitting in the same second can't both take the last seat.
- **One-click setup** from the sheet menu "المنظومة"; running it twice never creates duplicate triggers.

## Project structure
```
apps-script-registration/
├── apps-script/              # what gets pasted into the Apps Script editor
│   ├── appsscript.json       # V8 runtime, time zone, minimal OAuth scopes
│   ├── Config.gs             # everything a center changes (name, admin email, question titles, grades)
│   ├── Validation.gs         # pure: phone/email/name rules, duplicate + seat logic
│   ├── Email.gs              # pure: confirmation/waitlist/report emails (HTML + text)
│   ├── Report.gs             # pure weekly numbers + sendWeeklyReport() trigger
│   ├── Registration.gs       # decideRegistration() (pure) + onFormSubmit / retryPendingEmails
│   ├── Sheets.gs             # read/write by header name, error log
│   └── Setup.gs              # menu, setup(), triggers, form choices sync
├── sim/gas-fakes.js          # in-memory SpreadsheetApp, MailApp, LockService, ScriptApp, FormApp, Utilities
├── tests/
│   ├── load-gas.mjs          # loads the real .gs files into a sandbox with the fakes
│   ├── registration.test.mjs # 15 tests (node:test, no dependencies)
│   └── e2e_smoke.py          # Playwright run of the demo page
├── index.html, css/, js/app.js   # demo page (runs the same .gs files in the browser)
└── assets/                   # screenshots and showcase images
```

## Design decisions
- **Stay inside Google.** The center already lives in Forms and Sheets; no server, no subscription, nothing to host. The trade-off (Apps Script quotas, 6-minute runtime) is fine at a center's scale and is handled explicitly (email quota queue).
- **Pure logic, thin glue.** Validation, duplicate/seat decisions, emails and the report are plain functions with no Google calls, so they are unit-tested in Node. The glue (`onFormSubmit`, `retryPendingEmails`, `sendWeeklyReport`) only reads, calls them, and writes.
- **Tests run the real files.** The test loader evaluates the actual `.gs` files in a `vm` sandbox with fake Google services; nothing is copied or rewritten for testing. The demo page does the same in the browser.
- **Columns by header, not by letter.** The owner can reorder or add columns in the sheet and nothing breaks.
- **Codes from the row number** (`MN-0007`): unique, stable, and no counter that can drift.
- **Never lose a registration.** A failing email or an unexpected error never undoes a confirmed row; it is logged, marked, and retried.

## Visual design of the demo page

The demo is dressed as the center's own paper register, not as a SaaS dashboard:
- **Concept:** the hard-cover student register (ledger navy cover label, ruled rows, a red margin rule next to the row numbers) and a printed booking receipt (إيصال حجز) that slides out after every form and gets a rubber stamp: تم الحجز / قائمة انتظار / مسجّل قبل كده / راجع البيانات.
- **Palette:** ledger navy `#1c2b4a`, ballpoint ink `#2a4ba0`, stamp red `#b8322a`, paper `#fcfcfa` on desk grey `#e6e9ee`; ochre `#a86b12` only for the waitlist.
- **Type (self-hosted in `fonts/`):** Reem Kufi for the cover label, El Messiri for headings, IBM Plex Sans Arabic for text and the sheet, Aref Ruqaa only for handwriting (the margin note and the stamp).
- **Details that carry meaning:** the route checks draw themselves step by step, a duplicate row is struck through like a crossed-out line in a register, statuses look like ink stamps, and the confirmation emails use the same navy + red rule.
- Respects `prefers-reduced-motion`, keyboard focus is visible, no horizontal scroll at 390 px.

## Install on a client's Google account (about 10 minutes)
Deploying needs the client's own Google account (the emails are sent from it). Steps for the client or for Negad on a screen share:
1. Create the Google Form with these questions (titles must match `CONFIG.questions`): اسم الطالب · موبايل ولي الأمر · الإيميل · الصف الدراسي (dropdown) · المجموعة (dropdown) · ملاحظات.
2. Form → Responses → Link to Sheets → create a new spreadsheet. In the sheet, rename the responses tab to **التسجيلات**.
3. In the sheet: Extensions → Apps Script. Create the files from `apps-script/` (same names) and paste their content. Project Settings → "Show appsscript.json" → paste `appsscript.json`.
4. Edit `Config.gs`: `centerName`, `adminEmail`, `replyTo`, grades, `refPrefix`.
5. Reload the sheet → menu **المنظومة → إعداد النظام** → approve the permissions (Google shows "unverified app" for personal scripts: Advanced → Go to project).
6. Fill the **المجموعات** sheet (name, grade, time, capacity, open = نعم/لا). Run **حدّث المجموعات في الفورم** once.
7. Submit one test registration and check the row, the email and **سجل الأخطاء**.

What the client provides: the Google account that owns the form/sheet, the admin email for reports, the group list. Limits to tell the client: about 100 emails/day on a free Gmail account (1,500 on Google Workspace); queued emails go out automatically after the quota resets.

## Run the demo locally
```bash
# from the Portfolio repo root (fonts are shared with the site)
python3 -m http.server 8080
# open http://localhost:8080/demos/apps-script-registration/
```

## Tests
Unit/integration tests on the real `.gs` files (validation, duplicates vs. siblings, seats + waitlist, HTML escaping, quota queue + retry, error logging + lock release, reordered columns, weekly report, idempotent setup, form choices sync):
```bash
node --test demos/apps-script-registration/tests/registration.test.mjs
```
End-to-end run of the demo in a real browser (new student, duplicate, invalid data, full group, quota + retry, weekly report, mobile layout, zero console errors):
```bash
pip install playwright
python demos/apps-script-registration/tests/e2e_smoke.py                     # live demo
python demos/apps-script-registration/tests/e2e_smoke.py http://localhost:8080/demos/apps-script-registration/
```

## Easy extensions (quoted separately)
WhatsApp message instead of / with the email · payment status column and reminders · attendance sheet per group · promote the next waitlisted student when someone cancels · PDF receipt · Looker Studio dashboard.
