"""Google Sheets storage: one row per order in a sheet the owner can open on his phone.

Row mapping is pure (`order_to_row` / `row_to_order`) and tested; the gspread
calls are a thin layer around it. gspread is imported lazily so the demo
(running this package in the browser) doesn't need it.
"""
from __future__ import annotations

import logging
import time
from datetime import date, datetime
from typing import Any, Callable

from .domain import Order, Status
from .storage import StorageError

log = logging.getLogger(__name__)

HEADERS = [
    "كود الطلب",
    "وقت الطلب",
    "العميل",
    "Telegram ID",
    "الموبايل",
    "الخدمة",
    "رقم الخدمة",
    "عدد القطع",
    "الحساب",
    "التوصيل",
    "الإجمالي",
    "يوم الاستلام",
    "رقم الميعاد",
    "ميعاد الاستلام",
    "العنوان",
    "ملاحظات",
    "الحالة",
    "آخر تحديث",
]
TIME_FMT = "%Y-%m-%d %H:%M"


def order_to_row(o: Order) -> list[Any]:
    return [
        o.code,
        o.created_at.strftime(TIME_FMT),
        o.customer_name,
        str(o.customer_id),
        # Leading apostrophe keeps the 0 of Egyptian numbers in Sheets.
        "'" + o.phone,
        o.service_name,
        o.service_id,
        o.pieces,
        o.subtotal,
        o.delivery,
        o.total,
        o.pickup_day.isoformat(),
        o.slot_id,
        o.slot_label,
        o.address,
        o.notes,
        o.status.value,
        (o.updated_at or o.created_at).strftime(TIME_FMT),
    ]


def row_to_order(row: list[Any]) -> Order:
    r = [str(c) for c in row] + [""] * (len(HEADERS) - len(row))
    created = datetime.strptime(r[1], TIME_FMT)
    return Order(
        code=r[0],
        created_at=created,
        customer_name=r[2],
        customer_id=int(r[3] or 0),
        phone=r[4].lstrip("'"),
        service_name=r[5],
        service_id=r[6],
        pieces=int(r[7] or 0),
        subtotal=int(r[8] or 0),
        delivery=int(r[9] or 0),
        pickup_day=date.fromisoformat(r[11]),
        slot_id=r[12],
        slot_label=r[13],
        address=r[14],
        notes=r[15],
        status=Status(r[16]) if r[16] else Status.NEW,
        updated_at=datetime.strptime(r[17], TIME_FMT) if r[17] else None,
    )


def _retry(fn: Callable[[], Any], attempts: int = 3, wait: float = 1.0) -> Any:
    """Sheets API hiccups (429/5xx) are common; retry a few times, then fail loudly."""
    for i in range(attempts):
        try:
            return fn()
        except Exception as exc:  # gspread raises several exception types
            if i == attempts - 1:
                raise StorageError(f"Google Sheets: {exc}") from exc
            log.warning("sheets call failed (%s), retrying", exc)
            time.sleep(wait * (2**i))
    return None


class SheetsStore:
    """Stores orders in the first worksheet of a Google Sheet.

    Needs a Google service account JSON key and the sheet shared with the
    service account's email (see README). `worksheet` can be injected for tests.
    """

    def __init__(self, sheet_id: str = "", credentials_file: str = "", worksheet: Any = None,
                 retry_wait: float = 1.0) -> None:
        self._wait = retry_wait
        if worksheet is None:
            import gspread  # lazy: only the real bot needs it

            client = gspread.service_account(filename=credentials_file)
            worksheet = client.open_by_key(sheet_id).sheet1
        self.ws = worksheet
        first = _retry(lambda: self.ws.row_values(1), wait=self._wait)
        if not first:
            _retry(lambda: self.ws.append_row(HEADERS), wait=self._wait)

    def add(self, order: Order) -> None:
        _retry(lambda: self.ws.append_row(order_to_row(order), value_input_option="USER_ENTERED"),
               wait=self._wait)

    def update(self, order: Order) -> None:
        cell = _retry(lambda: self.ws.find(order.code, in_column=1), wait=self._wait)
        if cell is None:
            raise StorageError(f"order {order.code} not found in the sheet")
        row = order_to_row(order)
        status_col = HEADERS.index("الحالة") + 1
        _retry(lambda: self.ws.update_cell(cell.row, status_col, row[status_col - 1]), wait=self._wait)
        _retry(lambda: self.ws.update_cell(cell.row, status_col + 1, row[status_col]), wait=self._wait)

    def get(self, code: str) -> Order | None:
        code = code.strip().upper()
        return next((o for o in self.all() if o.code == code), None)

    def all(self) -> list[Order]:
        rows = _retry(lambda: self.ws.get_all_values(), wait=self._wait)
        out = []
        for row in rows[1:]:
            if not row or not row[0]:
                continue
            try:
                out.append(row_to_order(row))
            except (ValueError, IndexError):
                log.warning("skipping a malformed row: %s", row[:2])
        return out
