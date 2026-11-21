"""Run the bot:  python -m bot.main   (settings from .env / environment)."""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from zoneinfo import ZoneInfo

from . import config
from .engine import LaundryBot
from .storage import MemoryStore


def load_dotenv(path: str = ".env") -> None:
    """Tiny .env reader (KEY=VALUE lines) so the bot has no extra dependency for it."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())


def setup_logging(log_file: str) -> None:
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    for handler in (logging.StreamHandler(), RotatingFileHandler(log_file, maxBytes=1_000_000, backupCount=3,
                                                                  encoding="utf-8")):
        handler.setFormatter(fmt)
        root.addHandler(handler)


async def run() -> None:
    from aiogram import Bot

    from .telegram_adapter import build_dispatcher

    load_dotenv()
    settings = config.load()
    setup_logging(settings.log_file)
    log = logging.getLogger("bot")

    if settings.uses_sheets:
        from .sheets import SheetsStore

        store = SheetsStore(settings.sheet_id, settings.google_credentials)
        log.info("orders are saved to Google Sheet %s", settings.sheet_id)
    else:
        store = MemoryStore()
        log.warning("SHEET_ID is empty: orders are kept in memory and lost on restart")

    tz = ZoneInfo(settings.timezone)
    engine = LaundryBot(store, admins=settings.admin_ids,
                        clock=lambda: datetime.now(tz).replace(tzinfo=None))
    bot = Bot(settings.bot_token)
    dp = build_dispatcher(engine)
    log.info("bot started, %d admin(s)", len(settings.admin_ids))
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except config.ConfigError as exc:
        raise SystemExit(f"Config error: {exc}")
