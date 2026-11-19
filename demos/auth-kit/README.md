# Flutter Auth Kit

A complete, production-style authentication flow for Flutter apps: login, sign-up, email verification by 6-digit code (OTP), forgot password → code → new password, and a session that survives restarts. Arabic + English, light + dark, phone to desktop.

**Live demo (Flutter web):** https://negadahmed-ctrl.github.io/Portfolio/demos/auth-kit/
Demo account: `demo@negadbuilds.dev` / `Demo@1234` (or press "Fill the demo account").
The demo runs on an offline **demo backend**: accounts are saved in your browser only, and the codes that would be emailed are shown in an on-screen **"Demo inbox"** card. Nothing is sent anywhere.

## The problem it solves
Almost every app needs the same auth screens, and they are where users quit: unclear errors, a code that never arrives, a reset link that opens the wrong app, a session that logs out on every launch. Clients keep posting "login screen", "forgot password + OTP + reset screens" as separate small jobs. This kit is that whole flow, built once properly and tested, so it can be dropped into a client app and connected to their backend (Firebase, Supabase or a custom API) in hours instead of days.

## Features
- **Login** with live validation, clear error messages, loading state, password show/hide, autofill hints.
- **Registration** with name, email, password + confirmation and a password-strength meter.
- **Email verification by OTP**: 6 boxes over one real text field (paste, SMS/email autofill and screen readers work), Arabic-Indic digits accepted, auto-submit at 6 digits, resend with a 30 s countdown.
- **Forgot password → code → new password → success**, with a one-time reset token.
- **Security behaviour of a real backend** (in the demo backend too): salted SHA-256 password hashes, the same error for "no account" and "wrong password", codes expire after 10 minutes, 5 wrong tries burn the code, resend cooldown, reset requests never reveal whether an email is registered.
- **Session persistence**: refresh the page or restart the app, you stay signed in.
- **Route guards**: signed-out users can't reach the home screen, unverified users always land on verification.
- **Arabic (RTL) + English**, switchable live, remembered. **Light / dark / system** theme, remembered.
- **Responsive**: phone layout with a gradient header; on wide screens a brand panel + form side by side.
- **Accessible**: semantic headings, labelled fields and buttons, errors announced as live regions.

## Stack
Flutter 3.50 · Dart 3.14 · flutter_bloc (Cubit) · go_router · shared_preferences · equatable · crypto · flutter gen-l10n (ARB) · material_ui · firebase_auth (adapter) · bloc_test + mocktail for tests.

## Project structure (`source/`)
```
lib/
├── main.dart                         # composition: picks the backend (demo or Firebase)
├── app.dart                          # MaterialApp.router, themes, locales, providers
├── core/
│   ├── config/app_services.dart      # composition root (repository, storage, demo outbox)
│   ├── l10n/                         # ARB → generated AppLocalizations + error-code → message mapping
│   ├── routing/app_router.dart       # go_router + pure `authRedirect` guard (unit-tested)
│   ├── storage/key_value_store.dart  # storage port: SharedPreferences / in-memory
│   ├── theme/app_theme.dart          # design tokens, light + dark ColorSchemes
│   ├── validation/validators.dart    # pure validators + password strength
│   └── widgets/                      # AuthScaffold (responsive), fields, OTP field, buttons, banners
└── features/
    ├── auth/
    │   ├── domain/                   # AuthUser, AuthFailure (codes), AuthRepository (interface)
    │   ├── data/
    │   │   ├── demo_auth_repository.dart     # offline backend used by the demo + tests
    │   │   ├── demo_outbox.dart              # DEMO ONLY: "emails" shown on screen
    │   │   └── firebase_auth_repository.dart # firebase_auth adapter (not wired in the demo)
    │   └── presentation/             # one folder per screen: Cubit + page
    │       ├── session/  login/  register/  verify/  forgot/  reset/  home/  shared/
    └── settings/settings_cubit.dart  # theme + language, persisted
l10n/app_ar.arb, app_en.arb           # all texts (Egyptian Arabic + English)
test/                                 # 45 tests (see below)
tool/build_demo.sh                    # builds the web demo into demos/auth-kit/
```

## Design decisions
- **Clean architecture, kept honest.** `domain` knows nothing about Flutter or Firebase; screens only talk to `AuthRepository`. Switching the backend is one line in `main.dart`. Use-case classes are left out on purpose: here they would only forward calls; add them when real business rules appear.
- **Errors are codes, not strings.** Backends throw their own errors; adapters map them to `AuthFailureCode`, and one function turns codes into Arabic/English text. The UI never shows a raw exception, and unexpected errors become a friendly "try again".
- **The router decides navigation from the session.** After login, sign-up, verification or sign-out, screens don't push anything: the session Cubit changes and `authRedirect` moves the user. This removes a whole class of "back button returns to login" bugs, and the rule is a pure function with tests.
- **Errors appear after the first submit, then update live.** Nobody likes red text while still typing the first letter.
- **One OTP Cubit for two flows** (verify email and reset password), so the code entry, resend timer and error handling behave the same everywhere.
- **Demo backend that behaves like a real one** (expiry, attempts, cooldown, hashing, persistence), so the demo shows real edge cases, and the same class makes the tests fast and deterministic (injectable clock, zero latency).
- **Web build**: semantics enabled so the canvas app is usable with a screen reader and testable with Playwright; CanvasKit is loaded from Google's CDN to keep the repo light.

## Run locally
```bash
cd demos/auth-kit/source
flutter pub get
flutter run -d chrome          # or an Android/iOS device
```

## Tests
45 automated tests: validators, every Cubit (bloc_test + mocktail), the demo backend (expiry, attempts, cooldown, reset token, persistence, corrupted storage), the route guard, Firebase error mapping, and widget tests of the full login and sign-up → verification flows plus Arabic RTL switching.
```bash
cd demos/auth-kit/source
flutter analyze && flutter test
```
End-to-end in a real browser against the built web app (login errors, demo login, reload keeps the session, sign-up + wrong/right OTP, forgot → code → new password → login, Arabic + dark theme, zero console errors):
```bash
pip install playwright && python -m playwright install chromium
python demos/auth-kit/tests/e2e_smoke.py                     # live demo
python demos/auth-kit/tests/e2e_smoke.py http://localhost:8080/Portfolio/demos/auth-kit/
```
Rebuild the web demo: `demos/auth-kit/source/tool/build_demo.sh`.

## Configure for a client
**Branding:** colors in `core/theme/app_theme.dart`, font in `pubspec.yaml` (`assets/fonts`), texts in `l10n/*.arb`, logo in `AuthScaffold`.

**Connect Firebase** (needs the client's Firebase project, so it is not wired in the demo):
1. Client creates a Firebase project and enables *Authentication → Email/Password*.
2. `dart pub global activate flutterfire_cli && flutterfire configure` (creates `firebase_options.dart`).
3. In `main.dart`: `await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);` and use `FirebaseAuthRepository()` with `outbox: null` (the demo inbox disappears automatically).
4. Firebase sends verification and reset **links**; the adapter treats the link's `oobCode` as the code. For true 6-digit email codes on Firebase, add a small Cloud Function; Supabase supports email OTP natively (a `SupabaseAuthRepository` is ~100 lines against the same interface).

**Custom REST API:** implement `AuthRepository` with your HTTP client and map status codes to `AuthFailureCode`; nothing in the UI changes.

## Possible next steps for a client
Google / Apple sign-in · phone OTP (SMS) · biometric unlock · "remember this device" · account deletion screen (store requirement) · Supabase adapter · analytics events on each auth step.

## Fonts & license notes
Cairo font (SIL Open Font License), static weights generated from the Google Fonts variable file.

---
Built by **Negad Ahmed** · [Negad Builds](https://negadahmed-ctrl.github.io/Portfolio/)
