"""Browser glue for the live demo (runs in Pyodide next to the real bot package).

DEMO ONLY: the bot engine and storage are the real files from bot/; this file
only seeds fake orders, fixes the clock to Cairo time and converts replies to
JSON for the page. Names, phones and addresses are fictional.
"""
import json
from datetime import datetime, timedelta

from bot.domain import Order, Status
from bot.engine import LaundryBot
from bot.sheets import HEADERS, order_to_row
from bot.storage import MemoryStore

CUSTOMER, ADMIN = 101, 900
_offset = {"minutes": 0}


def _now():
    from js import cairoNowIso  # provided by app.js (Intl, Africa/Cairo)

    return datetime.fromisoformat(cairoNowIso()) + timedelta(minutes=_offset["minutes"])


store = MemoryStore()
bot = LaundryBot(store, admins=frozenset({ADMIN}), clock=_now)


def _seed():
    now = _now()
    y = now - timedelta(days=1)
    seed = [
        # code, created, cust, name, phone, svc, svc name, pieces, sub, deliv, day, slot, label, address, notes, status
        ("ND-{:02d}{:02d}-01".format(y.day, y.month), y.replace(hour=10, minute=12), 211, "خالد سمير", "01229876543",
         "dry_clean", "دراي كلين (بدل وفساتين)", 2, 140, 20, y.date(), "afternoon", "1 لـ 4 العصر",
         "8 شارع ألبرت الأول، سموحة، الدور 5", "بدلة رمادي، متكويش الجاكت بخار", Status.READY),
        ("ND-{:02d}{:02d}-02".format(y.day, y.month), y.replace(hour=13, minute=40), 212, "هبة عبد العزيز", "01093344556",
         "wash_iron", "غسيل وكي", 14, 350, 0, y.date(), "evening", "6 لـ 9 بالليل",
         "عمارات الضباط، برج 3، الدور 9، شقة 92", "", Status.IN_WASH),
        ("ND-{:02d}{:02d}-03".format(y.day, y.month), y.replace(hour=21, minute=5), 213, "يوسف الشاذلي", "01155667788",
         "blanket", "بطاطين ولحف", 3, 270, 0, now.date(), "evening", "6 لـ 9 بالليل",
         "22 شارع فوزي معاذ، سموحة، جنب صيدلية العزبي", "", Status.NEW),
    ]
    for (code, created, cid, name, phone, sid, sname, pieces, sub, deliv, day, slot, label, addr, notes, status) in seed:
        o = Order(code, created, cid, name, phone, sid, sname, pieces, sub, deliv, day, slot, label, addr, notes,
                  status=status, updated_at=created + timedelta(hours=3), history=[(created, Status.NEW)])
        store.add(o)


_seed()


def _reply_json(replies):
    out = []
    for r in replies:
        o = r.order
        out.append({
            "chat": r.chat_id,
            "text": r.text,
            "buttons": [[{"label": b.label, "data": b.data} for b in row] for row in r.buttons],
            "askContact": r.ask_contact,
            "order": None if o is None else {
                "code": o.code, "service": o.service_name, "pieces": o.pieces, "total": o.total,
                "slot": o.slot_label, "day": o.pickup_day.isoformat(), "status": o.status.value,
                "step": list(Status).index(o.status),
            },
        })
    return json.dumps(out, ensure_ascii=False)


def text(chat, name, value):
    return _reply_json(bot.handle_text(chat, name, value))


def button(chat, name, data):
    return _reply_json(bot.handle_button(chat, name, data))


def contact(chat, name, phone):
    return _reply_json(bot.handle_contact(chat, name, phone))


def sheet():
    rows = sorted(store.all(), key=lambda o: o.created_at)
    return json.dumps({"headers": HEADERS, "rows": [[str(c) for c in order_to_row(o)] for o in rows]},
                      ensure_ascii=False)


def break_sheet():
    store.fail_next = True
