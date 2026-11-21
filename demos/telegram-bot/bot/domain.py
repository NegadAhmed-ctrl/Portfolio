"""Pure business rules: no Telegram, no Google, no I/O. Fully unit-tested."""
from __future__ import annotations

import re
from dataclasses import dataclass, field, replace
from datetime import date, datetime, timedelta
from enum import Enum

from .catalog import Catalog, Service, Slot

ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")

WEEKDAYS_AR = ("الاتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت", "الحد")


class Status(str, Enum):
    NEW = "جديد"
    PICKED_UP = "اتستلم من العميل"
    IN_WASH = "في الغسيل"
    READY = "جاهز للتوصيل"
    DELIVERED = "اتسلّم"
    CANCELLED = "ملغي"


# Allowed moves for the admin buttons. Anything else is rejected.
NEXT_STATUS: dict[Status, Status] = {
    Status.NEW: Status.PICKED_UP,
    Status.PICKED_UP: Status.IN_WASH,
    Status.IN_WASH: Status.READY,
    Status.READY: Status.DELIVERED,
}
OPEN_STATUSES = {Status.NEW, Status.PICKED_UP, Status.IN_WASH, Status.READY}


def normalize_digits(text: str) -> str:
    return text.translate(ARABIC_DIGITS)


def normalize_phone(raw: str) -> str | None:
    """Egyptian mobile in any common shape → '01XXXXXXXXX', else None.

    Accepts Arabic-Indic digits, spaces, dashes, +20 / 0020 / 20 prefixes.
    """
    digits = re.sub(r"\D", "", normalize_digits(raw or ""))
    if digits.startswith("0020"):
        digits = "0" + digits[4:]
    elif digits.startswith("20") and len(digits) == 12:
        digits = "0" + digits[2:]
    elif len(digits) == 10 and digits.startswith("1"):
        digits = "0" + digits
    return digits if re.fullmatch(r"01[0125]\d{8}", digits) else None


def parse_pieces(raw: str, catalog: Catalog) -> int | None:
    text = normalize_digits(raw or "").strip()
    if not re.fullmatch(r"\d{1,3}", text):
        return None
    n = int(text)
    return n if catalog.min_pieces <= n <= catalog.max_pieces else None


def clean_address(raw: str) -> str | None:
    text = re.sub(r"\s+", " ", (raw or "").strip())
    # Needs at least a street/building hint, not just "سموحة".
    return text if len(text) >= 10 and len(text) <= 200 else None


@dataclass(frozen=True)
class Quote:
    subtotal: int
    delivery: int

    @property
    def total(self) -> int:
        return self.subtotal + self.delivery


def quote(service: Service, pieces: int, catalog: Catalog) -> Quote:
    subtotal = service.price * pieces
    delivery = 0 if subtotal >= catalog.free_delivery_from else catalog.delivery_fee
    return Quote(subtotal, delivery)


@dataclass(frozen=True)
class PickupOption:
    day: date
    slot: Slot

    @property
    def key(self) -> str:
        return f"{self.day.isoformat()}|{self.slot.id}"


def day_label(day: date, today: date) -> str:
    if day == today:
        prefix = "النهارده"
    elif day == today + timedelta(days=1):
        prefix = "بكرة"
    else:
        prefix = WEEKDAYS_AR[day.weekday()]
    return f"{prefix} {day.day}/{day.month}"


def pickup_options(now: datetime, catalog: Catalog, booked: dict[str, int]) -> list[PickupOption]:
    """Slots customers can still pick: not started yet (1 h margin today),
    not on the weekly closed day, and with free capacity."""
    options: list[PickupOption] = []
    for offset in range(catalog.days_ahead + 1):
        day = (now + timedelta(days=offset)).date()
        if catalog.closed_weekday is not None and day.weekday() == catalog.closed_weekday:
            continue
        for slot in catalog.slots:
            if offset == 0 and now.hour >= slot.start_hour - 1:
                continue
            option = PickupOption(day, slot)
            if booked.get(option.key, 0) < catalog.slot_capacity:
                options.append(option)
    return options


@dataclass
class Order:
    code: str
    created_at: datetime
    customer_id: int
    customer_name: str
    phone: str
    service_id: str
    service_name: str
    pieces: int
    subtotal: int
    delivery: int
    pickup_day: date
    slot_id: str
    slot_label: str
    address: str
    notes: str = ""
    status: Status = Status.NEW
    updated_at: datetime | None = None
    history: list[tuple[datetime, Status]] = field(default_factory=list)

    @property
    def total(self) -> int:
        return self.subtotal + self.delivery

    @property
    def pickup_key(self) -> str:
        return f"{self.pickup_day.isoformat()}|{self.slot_id}"

    def advance(self, to: Status, at: datetime) -> "Order":
        """Returns the order moved to `to`, or raises ValueError for an illegal move."""
        allowed = NEXT_STATUS.get(self.status)
        if to == Status.CANCELLED:
            if self.status != Status.NEW:
                raise ValueError("only new orders can be cancelled")
        elif to != allowed:
            raise ValueError(f"cannot move from {self.status.value} to {to.value}")
        return replace(self, status=to, updated_at=at, history=[*self.history, (at, to)])


def order_code(day: date, sequence: int) -> str:
    """Short code people can read out on the phone: ND-2111-07 (day+month, nth order that day)."""
    return f"ND-{day.day:02d}{day.month:02d}-{sequence:02d}"


def money(n: int) -> str:
    return f"{n:,} ج".replace(",", "٬")
