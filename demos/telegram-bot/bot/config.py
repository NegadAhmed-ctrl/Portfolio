"""Settings come from environment variables only. The token is never in the code."""
from __future__ import annotations

import os
from dataclasses import dataclass


class ConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class Settings:
    bot_token: str
    admin_ids: frozenset[int]
    sheet_id: str
    google_credentials: str
    timezone: str
    log_file: str

    @property
    def uses_sheets(self) -> bool:
        return bool(self.sheet_id)


def load(env: dict[str, str] | None = None) -> Settings:
    env = dict(os.environ if env is None else env)
    token = env.get("BOT_TOKEN", "").strip()
    if not token or ":" not in token:
        raise ConfigError("BOT_TOKEN is missing. Create a bot with @BotFather and put its token in .env")
    try:
        admins = frozenset(int(x) for x in env.get("ADMIN_IDS", "").replace(" ", "").split(",") if x)
    except ValueError as exc:
        raise ConfigError("ADMIN_IDS must be numeric Telegram user IDs separated by commas") from exc
    if not admins:
        raise ConfigError("ADMIN_IDS is empty: at least one admin must receive the orders")
    sheet_id = env.get("SHEET_ID", "").strip()
    creds = env.get("GOOGLE_CREDENTIALS", "service-account.json").strip()
    if sheet_id and not os.path.exists(creds):
        raise ConfigError(f"SHEET_ID is set but the service-account key '{creds}' was not found")
    return Settings(
        bot_token=token,
        admin_ids=admins,
        sheet_id=sheet_id,
        google_credentials=creds,
        timezone=env.get("TZ_NAME", "Africa/Cairo"),
        log_file=env.get("LOG_FILE", "bot.log"),
    )
