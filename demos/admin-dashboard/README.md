# Stock-room admin dashboard (React + TypeScript)

An admin dashboard for a shop that holds stock: what's on the shelves, what was issued and received, what must be re-ordered, and who on the team may do what. Built for a plumbing and sanitary-ware store, but the same shape fits any shop, pharmacy, spare-parts store or small warehouse.

**Live demo:** https://negadahmed-ctrl.github.io/Portfolio/demos/admin-dashboard/
Demo accounts (password `Demo@1234`): `hesham@elsayed.demo` (admin, مدير) and `karim@elsayed.demo` (staff, أمين مخزن).
The store ("السيد للأدوات الصحية، محرم بك"), people, prices and invoices are fictional. Demo data lives in your browser only; "رجّع بيانات الديمو" puts it back.

## The problem it solves
Small stores usually track stock in a notebook or an Excel file that one person updates "later". Nobody knows the real count until a customer asks, items run out without anyone noticing, and when a number is wrong there's no record of who changed it or why. The owner also doesn't want every employee to see costs and margins or to edit prices.

## What it does
- **Overview ("اليوم في المخزن")**: stock value at cost and at selling price, sales this week vs last week, items at or under the re-order point, items out of stock, 14-day bar chart of what left the store (days with deliveries marked), how the stock value splits by category, latest movements.
- **Items ("الأصناف")**: search by name, shelf code or supplier (forgiving Arabic: أ/ا, ة/ه, ى/ي, diacritics, Arabic digits), filter by category and stock state, sort any column, pagination. Filters live in the URL, so a filtered list can be bookmarked or sent.
- **Bin card ("كارت الصنف")**: the paper card every storekeeper knows, as a side sheet: shelf code, stock, re-order point, prices (cost and margin for the admin only), receive / issue / stock-count form, and the ledger with the running balance. Stock never changes without a movement and a reference (invoice or delivery note).
- **Create / edit / delete items** (admin) with live validation: shelf-code format, selling price not below cost, unique codes.
- **Team ("فريق العمل")**: invite people, change roles, deactivate accounts; the store can never be left without an active admin.
- **Roles**: admin sees everything; staff can view items and record receipts and issues, but can't see money figures, edit prices, delete items or open the team page (the route is guarded, not just hidden).
- **States**: skeleton loading, empty results with a way out ("امسح البحث والفلاتر"), clear error messages with retry (`?demo-error` in the URL shows them), toasts that say exactly what happened ("اتسجل صرف ٢، الرصيد بقى ١").
- Arabic RTL, phone-first (the storekeeper uses it in the aisle), keyboard focus, reduced-motion support.

## Stack
React 18, TypeScript (strict), Vite, Tailwind CSS, React Router (hash routing for GitHub Pages). No chart library: the chart is plain SVG/DOM. Fonts self-hosted (Reem Kufi for headings and figures, IBM Plex Sans Arabic for text). Vitest for logic tests, Playwright for the browser run. Supabase adapter + SQL schema with Row Level Security included.

## Structure
```
admin-dashboard/
├── index.html, assets/          # production build served by GitHub Pages
├── showcase/                    # screenshots + marketing images
└── source/
    ├── src/
    │   ├── domain/              # pure logic, no React: types, permissions, inventory query/movements/validation, KPIs, Arabic text helpers, formatting
    │   ├── data/
    │   │   ├── api.ts           # AdminApi interface: the only thing the UI talks to
    │   │   ├── localApi.ts      # demo backend in localStorage (latency, failure mode, permission checks)
    │   │   ├── supabaseApi.ts   # real backend adapter (not wired in the demo)
    │   │   └── seed.ts          # deterministic sample data generated relative to "now"
    │   ├── state/               # session context, useLoad hook, error → text
    │   ├── ui/                  # Shell (sidebar / bottom nav), kit (buttons, fields, sheet), chart, toasts, icons
    │   └── pages/               # Login, Overview, Inventory, BinCard, ProductForm, Users, NotAllowed
    ├── supabase/schema.sql      # tables, view, RLS policies, record_movement() with row lock
    └── tests/                   # domain.test.ts, localApi.test.ts (Vitest), e2e_smoke.py (Playwright)
```

## Design decisions
- **One interface, two backends.** Pages call `AdminApi`; the demo uses `LocalApi`, a client uses `SupabaseApi`. Changing the backend is one line in `main.tsx`; no page changes.
- **Permissions are one table** (`domain/permissions.ts`): buttons, routes and the data layer all ask `can(role, action)`. In Supabase the same rules are enforced again by RLS, so a staff member can't change prices with a hand-made request.
- **Stock only moves through movements.** Editing an item can't change its quantity; receive, issue and count each write a ledger line with who, when and which document. In Postgres `record_movement()` locks the row, so two people issuing the last piece can't both succeed.
- **Issuing more than the shelf holds is refused** with the actual count in the message.
- **Pure logic is tested apart from the UI**: filtering, sorting, pagination, movement rules, validation, KPIs (bucketed by Cairo calendar day), and the demo backend's auth, roles and edge cases.
- **Design**: the visual language comes from the stock room itself: ink-blue ledger lines, printed shelf labels for codes, yellow floor safety tape only where something needs attention, and a rubber stamp ("تم الصرف") when a movement is recorded. One loud color, used only for the main action and warnings.

## Run
```bash
cd source
npm install
npm run dev        # http://localhost:5173/Portfolio/demos/admin-dashboard/
npm test           # 29 Vitest tests
npm run typecheck
npm run build      # writes index.html + assets/ one level up
python3 tests/e2e_smoke.py http://localhost:4173/Portfolio/demos/admin-dashboard/   # after `npm run preview`
```

## Connect a real backend (what the client creates)
1. Create a Supabase project (free tier is enough to start) in the client's own account.
2. Run `source/supabase/schema.sql` in the SQL editor, then insert the categories.
3. Create the first admin in Authentication → Users and add a row for them in `profiles` with role `admin`.
4. Add an Edge Function `invite-user` (uses the service-role key server-side, never in the browser).
5. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `source/.env`, install `@supabase/supabase-js` as a dependency, and in `main.tsx` replace `new LocalApi(...)` with `new SupabaseApi(createClient(url, key))`. Change `base` in `vite.config.ts` to the client's domain path.
6. Edit store name, branch and categories in `src/data/seed.ts` (or load them from the database).

Built by Negad Ahmed (Negad Builds).
