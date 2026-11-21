# Laundry pickup bot: Telegram + Google Sheets

A Telegram bot for a neighbourhood laundry: customers book a pickup from home with buttons, every order becomes a row in the owner's Google Sheet, the owner gets each order on his phone and moves it forward with one tap, and the customer is told at every step.

**Live demo:** https://negadahmed-ctrl.github.io/Portfolio/demos/telegram-bot/
The demo runs **the same Python package** (`bot/`) inside the browser with Pyodide. Telegram and Google Sheets are simulated there; the laundry ("مغسلة ومكوجي الندى"), names and numbers are fictional.

## The problem it solves
Small laundries, bakeries, pharmacies and home kitchens take orders by chat: "how much is ironing?", "when can you pass by?", "what's my order status?". The owner retypes everything into a notebook, two customers get the same pickup time, and nobody remembers which order is ready. The bot asks the questions in the right order, checks the answers, books a free slot, and keeps one list the owner already knows how to use: a Google Sheet.

## Features
- **Guided order with buttons**: service → pieces → pickup slot → address → phone → notes → summary with the total → confirm / edit / cancel.
- **Real pickup slots**: next 3 days, a capacity per slot (one driver), slots that already started are hidden, weekly day off (Friday), and a check at confirm time so two customers can't take the last place.
- **Validation in Egyptian reality**: mobile numbers with Arabic-Indic digits, spaces or +20/0020; Telegram "share my number" button; address must be specific; piece count 1–60.
- **Pricing**: per-piece prices per service, delivery fee with a free-delivery threshold, shown before confirming.
- **Returning customers**: "same address" / "same number" buttons from their last order.
- **Order code** people can read on the phone: `ND-2111-07` (day, month, nth order that day).
- **Owner side**: a card for each new order with the next-step button (picked up → in wash → ready → delivered, or cancel while new). Every step updates the sheet and messages the customer.
- **Admin commands**: `/today` (today's pickups by slot), `/order ND-2111-01`, `/stats` (last 7 days: orders, pieces, revenue, top service). Admin-only, by Telegram ID.
- **Customer commands**: `/new`, `/myorders` (last 5 with status, cancel while still new), `/prices`, `/cancel`, `/help`.
- **Failure handling**: if Google Sheets doesn't answer, the order is **not** silently lost: the customer is told it wasn't saved and can confirm again (their answers are kept), and the owner gets an alert. Sheets calls retry with back-off; customers who blocked the bot don't break the owner's notifications; unknown messages and old buttons get a helpful answer.
- **Logging** to console + rotating `bot.log`. **Token only from environment** (`.env`, never committed).

## Stack
Python 3.11+ · aiogram 3 (Telegram) · gspread (Google Sheets, service account) · pytest · Pyodide for the browser demo · Playwright for the end-to-end check.

## Structure
```
telegram-bot/
├── bot/
│   ├── catalog.py           # what the owner edits: services, prices, slots, capacity, fees, day off
│   ├── domain.py            # pure rules: phone/pieces/address checks, quote, slots, Order + status moves
│   ├── engine.py            # the conversation (Telegram-agnostic): handle_text / handle_button / handle_contact → replies
│   ├── storage.py           # OrderStore interface + MemoryStore
│   ├── sheets.py            # SheetsStore: one row per order (pure row mapping + gspread calls with retry)
│   ├── telegram_adapter.py  # aiogram router: keyboards, callbacks, contact sharing, blocked users, one lock
│   ├── config.py            # settings from env (BOT_TOKEN, ADMIN_IDS, SHEET_ID, …) with clear errors
│   └── main.py              # entry point: logging, store choice, polling
├── tests/                   # 35 pytest tests + e2e_demo.py (real browser on the live page)
├── index.html, demo/        # the live demo page (Pyodide runs bot/*.py; glue.py seeds fake orders)
├── .env.example             # every setting, documented
└── requirements*.txt
```

## Design decisions
- **The conversation is a plain Python class, not aiogram handlers.** `LaundryBot` gets "user X typed Y / pressed Z" and returns replies. That makes every flow testable without Telegram, lets the browser demo run the real code, and means moving to WhatsApp later only needs a new adapter.
- **Validate at the step, re-check at confirm.** The slot list is computed live from the sheet; at confirm time it's checked again because another customer may have taken the last place while this one was typing.
- **One lock around each update.** gspread is synchronous, so each update runs in a worker thread, one at a time. A small laundry gets a few orders an hour; correctness (no double booking, no duplicate order codes) matters more than parallelism.
- **Sheet as the database, on purpose.** The owner can read, filter and print it on his phone with no admin panel to learn. Phones are written with a leading `'` so Sheets keeps the 0. If volume grows, `OrderStore` can be backed by SQLite/Postgres without touching the conversation.
- **Strict status machine.** Only the next step (or cancel while new) is allowed, so a double tap on an old button can't skip "picked up" or cancel an order already in the wash.
- **Errors are said, not swallowed.** Every storage failure reaches both the customer and the owner, with the draft kept.

## Run it for a real business
1. **Bot token**: in Telegram open **@BotFather** → `/newbot` → copy the token. (Created by the business owner or by Negad on their behalf; the token is never put in the code.)
2. **Admin IDs**: each person who receives orders sends a message to **@userinfobot** to get their numeric ID.
3. **Google Sheet (optional but recommended)**:
   - Google Cloud Console → new project → enable **Google Sheets API** → create a **service account** → Keys → add JSON key → save as `service-account.json` next to the bot.
   - Create an empty Google Sheet, share it (Editor) with the service account's email, copy the sheet ID from its URL.
4. `cp .env.example .env` and fill `BOT_TOKEN`, `ADMIN_IDS`, `SHEET_ID`.
5. Edit `bot/catalog.py` (name, area, services and prices, slots, capacity, fees, day off) and the texts in `bot/engine.py` if needed.
6. Run:
   ```bash
   python -m venv .venv && . .venv/bin/activate
   pip install -r requirements.txt
   python -m bot.main
   ```
7. Keep it running on a small VPS or a free/cheap host (Railway, Render, a $5 server) with `systemd` or Docker. Polling needs no domain or SSL.

Without `SHEET_ID` the bot keeps orders in memory (fine for trying it, lost on restart).

## Tests
```bash
pip install -r requirements-dev.txt
python -m pytest                 # 35 tests: rules, full conversations, admin, outage, sheet mapping + retries, aiogram adapter with a fake Telegram
python tests/e2e_demo.py --chrome /usr/bin/google-chrome   # the live demo page in a real browser
```

## Possible next steps for a client
WhatsApp Cloud API adapter (same engine) · online payment link · driver's own chat with his route for the slot · reminders the evening before pickup · photos of stains attached to the order · monthly report email.
