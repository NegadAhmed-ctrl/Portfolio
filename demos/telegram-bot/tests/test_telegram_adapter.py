"""The aiogram layer, with Telegram replaced by fakes (no network, no token)."""
import asyncio
from datetime import datetime
from types import SimpleNamespace

from aiogram.exceptions import TelegramForbiddenError
from aiogram.types import InlineKeyboardMarkup, ReplyKeyboardMarkup

from bot.engine import Button, LaundryBot, Reply
from bot.storage import MemoryStore
from bot.telegram_adapter import TelegramGateway, keyboard


class FakeBot:
    def __init__(self, blocked=()):
        self.sent = []
        self.blocked = set(blocked)

    async def send_message(self, chat_id, text, reply_markup=None):
        if chat_id in self.blocked:
            raise TelegramForbiddenError(method=None, message="bot was blocked by the user")
        self.sent.append((chat_id, text, reply_markup))


def user(uid=101, name="مريم حسن"):
    return SimpleNamespace(id=uid, full_name=name)


def gateway():
    engine = LaundryBot(MemoryStore(), admins=frozenset({900}), clock=lambda: datetime(2026, 11, 21, 9))
    return TelegramGateway(engine)


def test_keyboards():
    assert isinstance(keyboard(Reply(1, "x", [[Button("a", "b")]])), InlineKeyboardMarkup)
    contact = keyboard(Reply(1, "x", ask_contact=True))
    assert isinstance(contact, ReplyKeyboardMarkup) and contact.keyboard[0][0].request_contact


def test_text_and_button_round_trip():
    gw, bot = gateway(), FakeBot()

    async def flow():
        await gw.on_text(SimpleNamespace(from_user=user(), text="/new"), bot)
        answered = []

        async def answer(*a, **k):
            answered.append(True)

        await gw.on_button(SimpleNamespace(from_user=user(), data="svc:iron", answer=answer), bot)
        return answered

    answered = asyncio.run(flow())
    assert answered == [True], "callback spinner is stopped"
    assert "عايز إيه" in bot.sent[0][1]
    assert "كام قطعة" in bot.sent[1][1]


def test_blocked_customer_does_not_break_admin_notification():
    gw, bot = gateway(), FakeBot(blocked={101})
    replies = [Reply(101, "to customer"), Reply(900, "to admin")]
    asyncio.run(gw.send_all(bot, replies))
    assert [c for c, *_ in bot.sent] == [900]
