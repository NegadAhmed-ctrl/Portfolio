from datetime import datetime

import pytest

from bot.catalog import DEFAULT_CATALOG
from bot.domain import Status
from bot.engine import LaundryBot
from bot.storage import MemoryStore

ADMIN = 900
MARIAM = 101
NOW = datetime(2026, 11, 21, 9, 0)  # Saturday 9 AM


def labels(reply):
    return [b.label for row in reply.buttons for b in row]


def data(reply):
    return [b.data for row in reply.buttons for b in row]


@pytest.fixture
def bot():
    clock = {"now": NOW}
    b = LaundryBot(MemoryStore(), admins=frozenset({ADMIN}), clock=lambda: clock["now"])
    b._clock_box = clock  # let tests move time
    return b


def place_order(bot, user=MARIAM, name="مريم حسن", pieces="8", address="14 شارع فوزي معاذ، سموحة، الدور 3",
                phone="01012345678", slot_index=0):
    bot.handle_text(user, name, "/new")
    bot.handle_button(user, name, "svc:wash_iron")
    slot_reply = bot.handle_text(user, name, pieces)[0]
    bot.handle_button(user, name, data(slot_reply)[slot_index])
    bot.handle_text(user, name, address)
    bot.handle_text(user, name, phone)
    bot.handle_button(user, name, "notes:skip")
    return bot.handle_button(user, name, "confirm:yes")


def test_start_shows_the_menu(bot):
    r = bot.handle_text(MARIAM, "مريم حسن", "/start")[0]
    assert "مريم" in r.text and "مغسلة ومكوجي الندى" in r.text
    assert "menu:new" in data(r)


def test_full_order_saves_row_and_notifies_admin(bot):
    replies = place_order(bot)
    customer, admin = replies
    order = bot.store.all()[0]
    assert order.code == "ND-2111-01"
    assert order.pieces == 8 and order.subtotal == 200 and order.delivery == 0  # 200 ≥ 150 → free
    assert order.phone == "01012345678" and order.status == Status.NEW
    assert "ND-2111-01" in customer.text and customer.chat_id == MARIAM
    assert admin.chat_id == ADMIN and "طلب جديد" in admin.text
    assert "adm:next:ND-2111-01" in data(admin)
    assert MARIAM not in bot.drafts


def test_small_order_pays_delivery(bot):
    place_order(bot, pieces="3")
    o = bot.store.all()[0]
    assert (o.subtotal, o.delivery, o.total) == (75, 20, 95)


def test_validation_messages_keep_the_step(bot):
    bot.handle_text(MARIAM, "م", "/new")
    bot.handle_button(MARIAM, "م", "svc:iron")
    assert "رقم من 1 لـ 60" in bot.handle_text(MARIAM, "م", "ميت قطعة")[0].text
    assert "رقم من 1 لـ 60" in bot.handle_text(MARIAM, "م", "500")[0].text
    slot = bot.handle_text(MARIAM, "م", "١٢")[0]  # Arabic-Indic digits work
    assert bot.drafts[MARIAM].pieces == 12
    bot.handle_button(MARIAM, "م", data(slot)[0])
    assert "العنوان قصير" in bot.handle_text(MARIAM, "م", "سموحة")[0].text
    bot.handle_text(MARIAM, "م", "شارع النصر، عمارة 5، الدور الأول")
    bad = bot.handle_text(MARIAM, "م", "12345")[0]
    assert "مش رقم موبايل" in bad.text and bad.ask_contact
    bot.handle_text(MARIAM, "م", "+20 112 345 6789")
    assert bot.drafts[MARIAM].phone == "01123456789"


def test_contact_share_fills_the_phone(bot):
    bot.handle_text(MARIAM, "م", "/new")
    bot.handle_button(MARIAM, "م", "svc:iron")
    slot = bot.handle_text(MARIAM, "م", "5")[0]
    bot.handle_button(MARIAM, "م", data(slot)[0])
    bot.handle_text(MARIAM, "م", "شارع النصر، عمارة 5، الدور الأول")
    r = bot.handle_contact(MARIAM, "م", "201001234567")[0]
    assert bot.drafts[MARIAM].phone == "01001234567" and "ملاحظات" in r.text


def test_slots_hide_started_and_closed_days_and_full_ones(bot):
    bot._clock_box["now"] = datetime(2026, 11, 21, 12, 30)  # morning + afternoon (starts 13 → margin) gone
    bot.handle_text(MARIAM, "م", "/new")
    bot.handle_button(MARIAM, "م", "svc:iron")
    slots = data(bot.handle_text(MARIAM, "م", "5")[0])
    assert slots[0] == "slot:2026-11-21|evening"
    # Friday 27 Nov is outside the 3-day window anyway; check Thursday→Friday window
    bot._clock_box["now"] = datetime(2026, 11, 26, 20, 0)  # Thursday night
    bot.drafts.clear()
    bot.handle_text(MARIAM, "م", "/new")
    bot.handle_button(MARIAM, "م", "svc:iron")
    slots = data(bot.handle_text(MARIAM, "م", "5")[0])
    assert not any("2026-11-27" in s for s in slots), "Friday is the weekly day off"
    assert slots[0].startswith("slot:2026-11-28")


def test_full_slot_disappears_after_capacity(bot):
    for i in range(DEFAULT_CATALOG.slot_capacity):
        place_order(bot, user=200 + i, name=f"عميل {i}")
    bot.handle_text(MARIAM, "م", "/new")
    bot.handle_button(MARIAM, "م", "svc:iron")
    slots = data(bot.handle_text(MARIAM, "م", "5")[0])
    assert "slot:2026-11-21|afternoon" not in slots


def test_last_place_taken_while_typing(bot):
    # Mariam picks the morning slot first …
    bot.handle_text(MARIAM, "م", "/new")
    bot.handle_button(MARIAM, "م", "svc:iron")
    bot.handle_text(MARIAM, "م", "5")
    bot.handle_button(MARIAM, "م", "slot:2026-11-21|afternoon")
    # … then 4 other customers fill it before she confirms.
    for i in range(DEFAULT_CATALOG.slot_capacity):
        place_order(bot, user=300 + i, name=f"عميل {i}")
    bot.handle_text(MARIAM, "م", "شارع النصر، عمارة 5، الدور الأول")
    bot.handle_text(MARIAM, "م", "01012345678")
    bot.handle_button(MARIAM, "م", "notes:skip")
    r = bot.handle_button(MARIAM, "م", "confirm:yes")[0]
    assert "اتحجز قبلك" in r.text
    assert bot.drafts[MARIAM].step == "slot"
    assert len([o for o in bot.store.all() if o.customer_id == MARIAM]) == 0


def test_order_codes_count_per_day(bot):
    place_order(bot, user=1)
    place_order(bot, user=2)
    assert sorted(o.code for o in bot.store.all()) == ["ND-2111-01", "ND-2111-02"]


def test_admin_moves_status_and_customer_is_told(bot):
    place_order(bot)
    card, note = bot.handle_button(ADMIN, "أدمن", "adm:next:ND-2111-01")
    assert bot.store.get("ND-2111-01").status == Status.PICKED_UP
    assert note.chat_id == MARIAM and "استلمنا هدومك" in note.text
    assert "adm:next:ND-2111-01" in data(card) and "adm:cancel:ND-2111-01" not in data(card)
    bot.handle_button(ADMIN, "أدمن", "adm:next:ND-2111-01")
    _, ready = bot.handle_button(ADMIN, "أدمن", "adm:next:ND-2111-01")
    assert "جاهز" in ready.text and "200" in ready.text
    bot.handle_button(ADMIN, "أدمن", "adm:next:ND-2111-01")
    assert bot.store.get("ND-2111-01").status == Status.DELIVERED
    end = bot.handle_button(ADMIN, "أدمن", "adm:next:ND-2111-01")[0]
    assert "مفيش خطوة بعدها" in end.text


def test_non_admin_cannot_use_admin_commands_or_buttons(bot):
    place_order(bot)
    assert "لإدارة المغسلة بس" in bot.handle_text(MARIAM, "م", "/today")[0].text
    assert "لإدارة المغسلة بس" in bot.handle_button(MARIAM, "م", "adm:next:ND-2111-01")[0].text
    assert bot.store.get("ND-2111-01").status == Status.NEW


def test_customer_can_cancel_only_new_orders(bot):
    place_order(bot)
    mine = bot.handle_text(MARIAM, "م", "/myorders")[0]
    assert "mycancel:ND-2111-01" in data(mine)
    replies = bot.handle_button(MARIAM, "م", "mycancel:ND-2111-01")
    assert bot.store.get("ND-2111-01").status == Status.CANCELLED
    assert any(r.chat_id == ADMIN and "لغى" in r.text for r in replies)
    place_order(bot)
    bot.handle_button(ADMIN, "أدمن", "adm:next:ND-2111-02")
    r = bot.handle_button(MARIAM, "م", "mycancel:ND-2111-02")[0]
    assert "مينفعش يتلغي" in r.text


def test_returning_customer_gets_same_address_and_phone_buttons(bot):
    place_order(bot)
    bot.handle_text(MARIAM, "م", "/new")
    bot.handle_button(MARIAM, "م", "svc:dry_clean")
    slot = bot.handle_text(MARIAM, "م", "2")[0]
    addr = bot.handle_button(MARIAM, "م", data(slot)[0])[0]
    assert "addr:last" in data(addr)
    phone = bot.handle_button(MARIAM, "م", "addr:last")[0]
    assert "phone:last" in data(phone)
    bot.handle_button(MARIAM, "م", "phone:last")
    summary = bot.handle_button(MARIAM, "م", "notes:skip")[0]
    assert "فوزي معاذ" in summary.text and "01012345678" in summary.text


def test_storage_outage_keeps_the_draft_and_alerts_admin(bot):
    bot.store.fail_next = True
    replies = place_order(bot)
    assert "متسجلش" in replies[0].text
    assert any(r.chat_id == ADMIN and "الشيت مش بيرد" in r.text for r in replies)
    assert bot.drafts[MARIAM].step == "confirm"
    retry = bot.handle_button(MARIAM, "م", "confirm:yes")
    assert "ND-2111-01" in retry[0].text and len(bot.store.all()) == 1


def test_admin_today_and_stats(bot):
    place_order(bot, user=1, name="مريم حسن")
    place_order(bot, user=2, name="خالد سمير", pieces="3", slot_index=1)
    today = bot.handle_text(ADMIN, "أدمن", "/today")[0].text
    assert "استلامات النهارده (2)" in today and "خالد سمير" in today
    stats = bot.handle_text(ADMIN, "أدمن", "/stats")[0].text
    assert "2 طلب" in stats and "11 قطعة" in stats


def test_old_buttons_and_unknown_text_are_handled(bot):
    r = bot.handle_button(MARIAM, "م", "svc:iron")[0]
    assert "خلص أو اتلغى" in r.text
    r = bot.handle_text(MARIAM, "م", "ازيك")[0]
    assert "مش فاهم" in r.text and "menu:new" in data(r)
    bot.handle_text(MARIAM, "م", "/new")
    r = bot.handle_button(MARIAM, "م", "confirm:yes")[0]  # stale button mid-flow
    assert "svc:wash_iron" in data(r)
