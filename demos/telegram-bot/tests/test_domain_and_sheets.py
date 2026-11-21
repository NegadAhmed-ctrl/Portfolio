from datetime import date, datetime

import pytest

from bot import config
from bot.catalog import DEFAULT_CATALOG
from bot.domain import Order, Status, normalize_phone, order_code, parse_pieces, quote
from bot.sheets import HEADERS, SheetsStore, order_to_row, row_to_order
from bot.storage import StorageError


@pytest.mark.parametrize("raw,expected", [
    ("01012345678", "01012345678"),
    ("010 1234 5678", "01012345678"),
    ("٠١٠١٢٣٤٥٦٧٨", "01012345678"),
    ("+201012345678", "01012345678"),
    ("00201512345678", "01512345678"),
    ("1112345678", "01112345678"),
    ("01312345678", None),  # no such Egyptian network
    ("0101234567", None),
    ("", None),
])
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


def test_parse_pieces_and_quote():
    assert parse_pieces("٨", DEFAULT_CATALOG) == 8
    assert parse_pieces("0", DEFAULT_CATALOG) is None
    assert parse_pieces("8 قطع", DEFAULT_CATALOG) is None
    svc = DEFAULT_CATALOG.service("dry_clean")
    assert quote(svc, 2, DEFAULT_CATALOG).total == 160  # 140 < 150 → +20 delivery
    assert quote(svc, 2, DEFAULT_CATALOG).delivery == 20
    assert quote(svc, 3, DEFAULT_CATALOG).delivery == 0


def test_order_code_format():
    assert order_code(date(2026, 3, 5), 7) == "ND-0503-07"


def sample_order():
    t = datetime(2026, 11, 21, 9, 5)
    return Order("ND-2111-01", t, 101, "مريم حسن", "01012345678", "wash_iron", "غسيل وكي", 8, 200, 0,
                 date(2026, 11, 21), "morning", "10 الصبح لـ 1 الضهر", "14 شارع فوزي معاذ، سموحة", "")


def test_status_moves_are_strict():
    o = sample_order()
    with pytest.raises(ValueError):
        o.advance(Status.READY, datetime.now())
    picked = o.advance(Status.PICKED_UP, datetime.now())
    with pytest.raises(ValueError):
        picked.advance(Status.CANCELLED, datetime.now())
    assert o.status == Status.NEW, "advance returns a copy"


def test_row_roundtrip_keeps_leading_zero():
    o = sample_order()
    row = order_to_row(o)
    assert len(row) == len(HEADERS) and row[4] == "'01012345678"
    back = row_to_order(row)
    assert back.phone == "01012345678" and back.total == 200 and back.pickup_day == date(2026, 11, 21)


class FakeCell:
    def __init__(self, row):
        self.row = row


class FakeWorksheet:
    """Mimics the gspread calls SheetsStore uses."""

    def __init__(self, fail_times=0):
        self.rows: list[list] = []
        self.fail_times = fail_times

    def _maybe_fail(self):
        if self.fail_times:
            self.fail_times -= 1
            raise ConnectionError("429 quota")

    def row_values(self, i):
        return self.rows[i - 1] if len(self.rows) >= i else []

    def append_row(self, row, value_input_option=None):
        self._maybe_fail()
        self.rows.append([str(c) if not isinstance(c, str) else c for c in row])

    def get_all_values(self):
        return [list(r) for r in self.rows]

    def find(self, value, in_column=1):
        for i, r in enumerate(self.rows, start=1):
            if r[in_column - 1] == value:
                return FakeCell(i)
        return None

    def update_cell(self, row, col, value):
        self.rows[row - 1][col - 1] = value


def test_sheets_store_writes_headers_rows_and_updates_status():
    ws = FakeWorksheet()
    store = SheetsStore(worksheet=ws, retry_wait=0)
    assert ws.rows[0] == HEADERS
    o = sample_order()
    store.add(o)
    store.update(o.advance(Status.PICKED_UP, datetime(2026, 11, 21, 11, 0)))
    assert ws.rows[1][HEADERS.index("الحالة")] == "اتستلم من العميل"
    assert store.get("nd-2111-01").status == Status.PICKED_UP


def test_sheets_store_retries_then_raises():
    ws = FakeWorksheet()
    store = SheetsStore(worksheet=ws, retry_wait=0)
    ws.fail_times = 2
    store.add(sample_order())  # 2 failures, 3rd try works
    assert len(ws.rows) == 2
    ws.fail_times = 5
    with pytest.raises(StorageError):
        store.add(sample_order())


def test_config_requires_token_and_admins():
    with pytest.raises(config.ConfigError):
        config.load({"ADMIN_IDS": "1"})
    with pytest.raises(config.ConfigError):
        config.load({"BOT_TOKEN": "1:abc", "ADMIN_IDS": ""})
    with pytest.raises(config.ConfigError):
        config.load({"BOT_TOKEN": "1:abc", "ADMIN_IDS": "x"})
    s = config.load({"BOT_TOKEN": "1:abc", "ADMIN_IDS": "5, 6"})
    assert s.admin_ids == {5, 6} and not s.uses_sheets
