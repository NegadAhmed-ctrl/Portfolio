# Real-estate listings + lead capture (Alexandria)

A listings site for a small real-estate office: search and filters, a page per unit, a viewing-request form, and a WhatsApp button that sends the unit code. Static, fast, indexable by Google, free to host.

**Live demo:** https://negadahmed-ctrl.github.io/Portfolio/demos/real-estate/
The office ("مكتب لوران العقاري"), units, prices and phone numbers are fictional sample data.

## The problem it solves
Most Egyptian offices list on Facebook groups and portals and answer the same questions all day: "كام؟ دور كام؟ بحري؟ فيه أسانسير؟". Leads arrive as "price?" comments with no name or number, and the office can't tell which post they mean. This site puts every unit on its own page with the answers already written, and every contact carries the unit code, a name and a valid mobile number.

## Features
- Search from the hero: buy / rent, area, budget typed the way people type it (`6.5 مليون`, `٦٫٥ مليون`, `850 ألف`, `17.5k`) with a live "يعني ٦٬٥٠٠٬٠٠٠ ج.م" read-back.
- Filters: purpose, areas (multi), type (multi), minimum rooms, price range, "بحري بس", free text (street, code, notes; Arabic spelling-insensitive), 5 sorts incl. price per m².
- Filter state lives in the URL: reload-safe, and "انسخ لينك النتيجة دي" lets the customer or the agent send a filtered list.
- Empty state that says exactly which single filter to drop ("شيل الحد الأقصى للسعر (وحدة واحدة)"), plus a request form prefilled with what they searched for.
- A page per unit (`units/<code>/`), prerendered at build time: specs, payment terms, an indicative floor plan, the building elevation with the unit's floor marked, similar units.
- WhatsApp inquiry with the unit prefilled: code first, area, size, floor, price, link.
- Viewing request: when (today / tomorrow / weekend / any), name, Egyptian mobile in any format (Arabic digits, +20, spaces), call or WhatsApp. Errors per field, honeypot against bots, double-submit detection, a reference number the customer can quote.
- Demo inbox ("اللي بيوصل للمكتب") so a client sees exactly what the office receives.
- SEO: unique title/description/canonical/OG per page, JSON-LD (`RealEstateAgent`, `ItemList`, `RealEstateListing` with price/currency/rent unit), `sitemap.xml`, prerendered HTML (works without JavaScript).
- Performance: no framework (~30 KB of JS), self-hosted subset fonts with `font-display: swap`, lazy drawings with fixed dimensions (no layout shift). Lighthouse (mobile, local): Performance 95, Accessibility 100, Best practices 100, SEO 100.
- Analytics hook: every meaningful action calls `track()` (search, filter_change, view_unit, whatsapp_click, call_click, lead_submit, share_list). It is a **placeholder** until the client creates GA4 or a Meta Pixel.

## Stack
HTML, CSS, vanilla JavaScript (ES modules), Node build script (no dependencies), `node:test`, Playwright (Python) for the browser run.

## Structure
```
real-estate/
├── index.html              # list page (cards + JSON-LD are injected by the build)
├── unit.template.html      # template for units/<code>/index.html
├── css/site.css            # tokens + components
├── fonts/                  # Alexandria, Tajawal, Rakkas (woff2 subsets, self-hosted)
├── js/
│   ├── config.js           # what the office changes: name, WhatsApp, lead destination, analytics
│   ├── units.js            # sample listings (same fields as the Google Sheet / Supabase table)
│   ├── filters.js          # pure: price parsing, Arabic normalising, filter/sort, URL <-> filters
│   ├── lead.js             # pure: lead validation, Egyptian mobiles, WhatsApp text
│   ├── leads-store.js      # LeadSink interface: DemoLeadSink (browser) + WebhookLeadSink (real)
│   ├── analytics.js        # track() hook, GA4 / Meta Pixel ready
│   ├── drawings.js         # pure: elevation + floor plan SVG from a unit's data
│   ├── render.js           # HTML builders shared by browser and build (cards, JSON-LD)
│   ├── unit-body.js        # unit page body (build time)
│   ├── lead-ui.js          # form behaviour, confirmation slip, demo inbox
│   ├── list-page.js        # list page wiring
│   └── unit-page.js        # unit page wiring
├── scripts/build.mjs       # drawings, unit pages, cards in index, sitemap, robots
├── drawings/ units/ sitemap.xml robots.txt   # generated
└── tests/                  # 28 node tests + e2e_smoke.py
```

## Design decisions
- **Static + prerendered.** Listings change a few times a week, so pages are generated, not fetched. Google indexes every unit, the site can't go down, and hosting is free. A rebuild is one command (or a GitHub Action when the sheet changes).
- **Pure logic, tested.** Price parsing, filters, URL state, validation and the WhatsApp text have no DOM, so 28 tests cover the rules that cost an office money when wrong (a budget read as 6.5 instead of 6,500,000; a phone number nobody can call).
- **Leads behind an interface.** `DemoLeadSink` for the demo; `WebhookLeadSink` posts JSON to any URL the client owns (Apps Script → Google Sheet, Make, n8n, Formspree). It sends `text/plain` so Apps Script works without CORS preflight, has a timeout, and the form shows the office number when sending fails.
- **Drawings instead of stock photos.** The demo has no real photos, so each unit gets an elevation and an indicative plan generated from its data (rooms, baths, size, floor, facing). For a client, real photos are added next to them; the plan stays useful because portals rarely show one.
- **Design.** An architect's drawing sheet (ink on drafting paper, title blocks with area / floor / facing / code) and the cloth "للبيع" banner hung from a balcony. Red only means "for sale", sea teal only "for rent".

## Run
```bash
node scripts/build.mjs          # regenerate drawings, unit pages, sitemap
python3 -m http.server 8000     # from the repo root, open /demos/real-estate/
```

## Test
```bash
node --test tests/*.test.mjs                 # 28 unit tests
python3 tests/e2e_smoke.py <base url>        # real Chrome: search, filters, unit page, lead, inbox, phone width, console
```

## Set it up for a real office
1. `js/config.js`: office name, WhatsApp number, address, hours, `siteUrl` (the real domain).
2. Listings: replace `js/units.js`, or load them from a Google Sheet / Supabase table with the same columns and run the build on change.
3. Leads: create a Google Apps Script web app (or Make / n8n / Formspree) that appends the JSON to a sheet and notifies the office; set `leadSink: "webhook"` and `webhookUrl`.
4. Analytics: the client creates GA4 and/or Meta Pixel; add the snippet to the `<head>` of `index.html` and `unit.template.html` and set `analytics: "gtag"` or `"meta"`.
5. Photos: add a `photos` array per unit and a gallery on the unit page (lazy `<img>` with width/height).
6. On the client's own domain, `robots.txt` and `sitemap.xml` go to the domain root and the sitemap is submitted in Google Search Console.
