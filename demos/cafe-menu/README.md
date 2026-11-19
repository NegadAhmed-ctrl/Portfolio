# Café Menu & WhatsApp Ordering

A mobile-first online menu for cafés and restaurants. Customers browse, pick sizes, build a cart and send a ready-made order to the café's WhatsApp: dine-in (with the table number from a QR code), pickup, or delivery.

**Live demo:** https://negadahmed-ctrl.github.io/Portfolio/demos/cafe-menu/
The brand ("قهوة المرسى"), prices and WhatsApp number are fictional.

## The problem it solves
Most small cafés take orders by chat: "what's available?", "how much is the large?", "send me the address". Orders get lost and staff spend time typing. This menu turns that into one structured message the staff can act on, without the café paying for an ordering platform or a backend.

## Features
- Arabic RTL, mobile-first, works on slow café Wi-Fi (no framework, ~25 KB of JS).
- Categories with sticky chips that follow the scroll, plus instant search.
- Per-item sizes with their own prices; sold-out items; badges ("الأكثر طلبا", "جديد").
- Cart that survives a page refresh (per device), quantity steppers, live totals.
- Three order types: in the café (table number), pickup, delivery (address, fee, minimum order).
- Validation before sending: Egyptian mobile numbers (also typed with Arabic-Indic digits), address, minimum order.
- WhatsApp order via `wa.me` link with a clean message (items, sizes, quantities, totals, notes) + copy fallback.
- Table QR generator: each QR opens the menu with `#table-7`, so the table number fills itself.
- Open/closed badge from opening hours (handles closing after midnight).
- Optional Google Sheet as the menu source, so the owner edits items and prices from his phone.
- Accessible: real buttons, `aria-pressed` states, labelled dialogs with Escape/backdrop close, focus return, visible focus, reduced-motion support.

## Project structure
```
cafe-menu/
├── index.html          # markup only: hero, toolbar, menu container, 3 dialogs
├── css/styles.css      # design tokens + components, no framework
├── js/
│   ├── config.js       # everything the owner changes (WhatsApp, fees, hours, sheet URL)
│   ├── menu.js         # local menu data (fallback when no sheet)
│   ├── cart.js         # pure cart logic (line keys, quantities, totals)
│   ├── order.js        # pure validation + WhatsApp message builder
│   ├── sheet.js        # CSV parser + Google Sheet loader (with timeout and fallback)
│   ├── icons.js        # inline SVG icon set
│   └── app.js          # UI: state, rendering, events, dialogs
├── data/menu.sample.csv  # template for the Google Sheet
└── tests/order.test.mjs  # unit tests (node:test, no dependencies)
```

## Design decisions
- **No backend.** A café menu doesn't need a database; WhatsApp is where the café already works. Hosting is free (GitHub Pages / Netlify) and nothing can go down at 9 PM on a Friday.
- **Pure logic separated from the DOM.** `cart.js` and `order.js` don't touch the page, so the money math and validation are unit-tested.
- **Line keys `itemId:sizeIndex`.** "Latte medium" and "Latte large" are different lines with different prices; changing the size on a card never changes what's already in the cart.
- **Resilient data.** If an item is removed from the menu while a customer has it in a saved cart, it is dropped silently instead of breaking totals. If the Google Sheet is slow or unpublished, the local menu is used after 5 s.
- **Validate before WhatsApp.** A wrong phone number or a missing address is the most common reason delivery orders fail, so the form blocks those before the message is built.

## Configure for a real café
Edit `js/config.js`:
```js
whatsapp: "2010XXXXXXXX",   // café number, international format, digits only
deliveryFee: 25,
minDeliveryOrder: 100,
openHour: 8, closeHour: 25, // 25 = 1 AM
menuUrl: "https://your-domain/menu/",
sheetCsvUrl: "",            // optional, see below
```
Then edit `js/menu.js`, or use a Google Sheet:
1. Copy `data/menu.sample.csv` into a Google Sheet.
2. File → Share → Publish to web → choose the sheet → CSV → copy the link.
3. Paste it in `sheetCsvUrl`. Prices and "sold out" now update from the sheet.

## Run locally
```bash
# from the Portfolio repo root (fonts are shared with the site)
python3 -m http.server 8080
# open http://localhost:8080/demos/cafe-menu/
```

## Tests
Unit tests (cart math, sizes, validation, WhatsApp message, Google Sheet CSV parsing), no dependencies:
```bash
node --test demos/cafe-menu/tests/order.test.mjs
```
End-to-end smoke test in a real browser (dine-in from a table QR, delivery validation and minimum order, Arabic-Indic phone digits, cart restored after refresh, zero console errors):
```bash
pip install playwright && python -m playwright install chromium
python demos/cafe-menu/tests/e2e_smoke.py            # live demo
python demos/cafe-menu/tests/e2e_smoke.py http://localhost:8080/demos/cafe-menu/
```

## Possible next steps for a client
Arabic/English toggle · real product photos · order log in Google Sheets (Apps Script) · custom domain · printed QR stickers per table.

---
Built by **Negad Ahmed** · [Negad Builds](https://negadahmed-ctrl.github.io/Portfolio/)
