"""aiogram 3 adapter: Telegram updates in, engine replies out.

All Telegram specifics live here (keyboards, callback answers, contact
sharing, blocked users). The engine is synchronous and may call Google
Sheets, so each update runs in a worker thread behind one lock: two
customers can't grab the last pickup place or the same order number.
"""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher, F, Router
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)

from .engine import LaundryBot, Reply

log = logging.getLogger(__name__)


def keyboard(reply: Reply) -> InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove:
    if reply.ask_contact:
        rows = [[KeyboardButton(text="ابعت رقمي", request_contact=True)]]
        return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True, one_time_keyboard=True)
    if reply.buttons:
        return InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text=b.label, callback_data=b.data) for b in row] for row in reply.buttons
        ])
    return ReplyKeyboardRemove()


class TelegramGateway:
    def __init__(self, engine: LaundryBot) -> None:
        self.engine = engine
        self.lock = asyncio.Lock()
        self.router = Router(name="laundry")
        self.router.message.register(self.on_contact, F.contact)
        self.router.message.register(self.on_text, F.text)
        self.router.message.register(self.on_other, ~F.text)
        self.router.callback_query.register(self.on_button)

    async def _run(self, fn, *args) -> list[Reply]:
        async with self.lock:
            return await asyncio.to_thread(fn, *args)

    async def send_all(self, bot: Bot, replies: list[Reply]) -> None:
        for r in replies:
            try:
                await bot.send_message(r.chat_id, r.text, reply_markup=keyboard(r))
            except TelegramForbiddenError:
                # The customer blocked the bot; the order is saved, admins still see it.
                log.warning("chat %s blocked the bot, message dropped", r.chat_id)
            except TelegramBadRequest as exc:
                log.error("could not send to %s: %s", r.chat_id, exc)

    async def on_text(self, message: Message, bot: Bot) -> None:
        user = message.from_user
        replies = await self._run(self.engine.handle_text, user.id, user.full_name, message.text)
        await self.send_all(bot, replies)

    async def on_contact(self, message: Message, bot: Bot) -> None:
        user = message.from_user
        if message.contact.user_id not in (None, user.id):
            await message.answer("ابعت رقمك إنت من الزرار، مش رقم حد تاني.")
            return
        replies = await self._run(self.engine.handle_contact, user.id, user.full_name,
                                  message.contact.phone_number)
        await self.send_all(bot, replies)

    async def on_other(self, message: Message) -> None:
        await message.answer("البوت بيفهم الكتابة والزراير بس. اكتب /start للقايمة.")

    async def on_button(self, query: CallbackQuery, bot: Bot) -> None:
        user = query.from_user
        await query.answer()  # stop the loading spinner on the button right away
        replies = await self._run(self.engine.handle_button, user.id, user.full_name, query.data or "")
        await self.send_all(bot, replies)


def build_dispatcher(engine: LaundryBot) -> Dispatcher:
    dp = Dispatcher()
    dp.include_router(TelegramGateway(engine).router)

    @dp.errors()
    async def on_error(event) -> bool:  # last line of defence: log, never crash polling
        log.exception("unhandled error: %s", event.exception)
        return True

    return dp
