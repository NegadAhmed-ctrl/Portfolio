"""Clean the merged raw export into one tidy table (one row per invoice line).

Every rule is a small pure function and every change is counted in a CleaningReport,
so the client sees exactly what was fixed and nothing disappears silently.

    python -m pipeline.clean  ->  data/clean/sales_clean.csv + data/clean/cleaning_report.json
"""
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path

import pandas as pd

from .catalog import (BRANCH_ALIASES, BRANCHES, CHANNEL_ALIASES, PRODUCT_ALIASES, PRODUCT_BY_NAME,
                      PRODUCTS, TEST_PRODUCT_NAMES)

DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
PREFIX_TO_BRANCH = {v: k for k, v in BRANCHES.items()}
CLEAN_COLUMNS = ["invoice", "date", "month", "weekday", "branch", "channel", "category", "product_code",
                 "product", "unit", "qty", "unit_price", "line_total", "is_return", "source"]


def normalize_ar(text: object) -> str:
    """Key used to compare names: trims, unifies alef/ya/ta-marbuta, drops tatweel and case."""
    if text is None or (isinstance(text, float) and pd.isna(text)):
        return ""
    s = str(text).strip().lower()
    s = re.sub("[ً-ْـ]", "", s)  # diacritics + tatweel
    s = re.sub("[أإآ]", "ا", s).replace("ى", "ي").replace("ة", "ه")
    return re.sub(r"\s+", " ", s)


_BRANCH = {normalize_ar(k): v for k, v in BRANCH_ALIASES.items()}
_CHANNEL = {normalize_ar(k): v for k, v in CHANNEL_ALIASES.items()}
_PRODUCT = {normalize_ar(k): v for k, v in PRODUCT_ALIASES.items()} | {normalize_ar(p.name): p.name for p in PRODUCTS}
_TEST = {normalize_ar(x) for x in TEST_PRODUCT_NAMES}


def parse_number(text: object) -> float | None:
    """'١٬٢٥٠٫٥ ج.م' / '1,250.50' / ' 380 ' -> float; blank -> None. Raises on garbage."""
    if text is None or (isinstance(text, float) and pd.isna(text)):
        return None
    s = str(text).translate(DIGITS).replace("ج.م", "").replace("جنيه", "").replace("EGP", "")
    s = s.replace("٬", "").replace(",", "").replace("٫", ".").strip()
    if s == "":
        return None
    return float(s)


_DATE_FORMATS = (("%Y-%m-%d %H:%M", "POS"), ("%Y-%m-%d", "ISO"), ("%d/%m/%Y", "يوم/شهر/سنة"),
                 ("%d-%b-%Y", "14-Mar-2026"))


def parse_date(text: object) -> tuple[datetime | None, str]:
    """Returns (datetime, which format matched). Arabic digits are converted first."""
    s = str(text or "").translate(DIGITS).strip()
    for fmt, label in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt), label
        except ValueError:
            continue
    return None, "غير مفهوم"


def canonical_branch(text: object, invoice: str) -> tuple[str | None, str]:
    """(branch, how): 'ok' | 'alias' | 'from_invoice' | 'unknown'."""
    raw = "" if text is None or (isinstance(text, float) and pd.isna(text)) else str(text)
    key = normalize_ar(raw)
    if key in _BRANCH:
        return _BRANCH[key], ("ok" if raw in BRANCHES else "alias")
    prefix = str(invoice).split("-")[0]
    if prefix in PREFIX_TO_BRANCH:
        return PREFIX_TO_BRANCH[prefix], "from_invoice"
    return None, "unknown"


def canonical_channel(text: object) -> str | None:
    return _CHANNEL.get(normalize_ar(text))


def canonical_product(text: object) -> tuple[str | None, str]:
    """(product name, how): 'ok' | 'alias' | 'test' | 'unknown'."""
    raw = "" if text is None else str(text)
    key = normalize_ar(raw)
    if key in _TEST:
        return None, "test"
    if key in _PRODUCT:
        name = _PRODUCT[key]
        return name, ("ok" if raw == name else "alias")
    return None, "unknown"


@dataclass
class Step:
    key: str
    title: str  # Arabic, shown to the client
    rows: int = 0
    examples: list[tuple[str, str]] = field(default_factory=list)

    def hit(self, before: object, after: object, limit: int = 4) -> None:
        self.rows += 1
        pair = (str(before), str(after))
        if len(self.examples) < limit and pair not in self.examples:
            self.examples.append(pair)


@dataclass
class CleaningReport:
    raw_rows: int = 0
    clean_rows: int = 0
    steps: list[Step] = field(default_factory=list)

    def step(self, key: str) -> Step:
        return next(s for s in self.steps if s.key == key)

    def to_dict(self) -> dict:
        return {"raw_rows": self.raw_rows, "clean_rows": self.clean_rows,
                "steps": [asdict(s) for s in self.steps]}


def _new_report(n: int) -> CleaningReport:
    return CleaningReport(raw_rows=n, steps=[
        Step("dates", "تواريخ بأشكال مختلفة اتوحّدت (أرقام عربي، يوم/شهر، 14-Mar)"),
        Step("numbers", "أرقام فيها \"ج.م\" أو فواصل أو أرقام عربي اتحوّلت لأرقام"),
        Step("branch_alias", "أسماء فروع مكتوبة بأكتر من شكل (Smouha، سموحه، فرع سموحة)"),
        Step("branch_missing", "فرع فاضي واتعرف من رقم الفاتورة"),
        Step("channel", "القناة اتوحّدت (كاشير ← في الفرع، Talabat ← طلبات، واتساب ← تليفون وواتساب)"),
        Step("product_alias", "أسماء أصناف بالإنجليزي أو بغلطة إملائية اتربطت بالصنف الصح"),
        Step("test_rows", "صفوف تجربة من يوم الافتتاح اتشالت"),
        Step("duplicates", "صفوف مكررة (تصدير طلبات من 5 لـ 11 أبريل اتلزق مرتين) اتشالت"),
        Step("qty_missing", "كمية فاضية واتحسبت من الإجمالي ÷ سعر الوحدة"),
        Step("total_typo", "إجمالي فيه صفر زيادة اتصلّح لـ الكمية × السعر"),
        Step("returns", "مرتجعات اتعلّمت بقيمة سالبة (مش اتمسحت)"),
        Step("unknown", "صفوف مش مفهومة واتحطت على جنب للمراجعة"),
    ])


def clean(raw: pd.DataFrame) -> tuple[pd.DataFrame, CleaningReport, pd.DataFrame]:
    """raw (columns as exported) -> (clean table, report, rows set aside for review)."""
    rep = _new_report(len(raw))
    out, rejected = [], []
    seen: set[tuple] = set()
    for rec in raw.to_dict("records"):
        inv = str(rec["رقم الفاتورة"]).strip()
        product, how_p = canonical_product(rec["الصنف"])
        if how_p == "test":
            rep.step("test_rows").hit(rec["الصنف"], "اتشال")
            continue
        dup_key = (inv, normalize_ar(rec["الصنف"]), rec["الكمية"], rec["الإجمالي"], rec["ملاحظات"], rec["المصدر"])
        if dup_key in seen:
            rep.step("duplicates").hit(f"{inv} · {str(rec['الصنف']).strip()}", "اتشال")
            continue
        seen.add(dup_key)

        dt, fmt = parse_date(rec["التاريخ"])
        branch, how_b = canonical_branch(rec["الفرع"], inv)
        channel = canonical_channel(rec["القناة"])
        try:
            qty = parse_number(rec["الكمية"])
            price = parse_number(rec["سعر الوحدة"])
            total = parse_number(rec["الإجمالي"])
        except ValueError:
            qty = price = total = None
        if dt is None or branch is None or channel is None or product is None or price is None or total is None:
            rep.step("unknown").hit(inv, "للمراجعة")
            rejected.append(rec)
            continue

        if fmt != "POS":
            rep.step("dates").hit(rec["التاريخ"], dt.strftime("%Y-%m-%d"))
        for col in ("الكمية", "سعر الوحدة", "الإجمالي"):
            txt = str(rec[col] if rec[col] is not None else "")
            if txt and not re.fullmatch(r"-?\d+(\.\d+)?", txt):
                rep.step("numbers").hit(txt, f"{parse_number(txt):g}")
                break
        if how_b == "alias":
            rep.step("branch_alias").hit(rec["الفرع"], branch)
        elif how_b == "from_invoice":
            rep.step("branch_missing").hit(f"(فاضي) {inv}", branch)
        if str(rec["القناة"]).strip() != channel:
            rep.step("channel").hit(rec["القناة"], channel)
        if how_p == "alias":
            rep.step("product_alias").hit(str(rec["الصنف"]).strip(), product)

        if qty is None:
            qty = round(total / price, 2)
            rep.step("qty_missing").hit(f"(فاضي) {total:g} ÷ {price:g}", f"{qty:g}")
        expected = round(qty * price, 2)
        if abs(total - expected) > 1:
            rep.step("total_typo").hit(f"{total:,.0f}", f"{expected:,.0f}")
            total = expected
        is_return = qty < 0 or str(rec["ملاحظات"]).strip() == "مرتجع"
        if is_return:
            qty, total = -abs(qty), -abs(total)
            rep.step("returns").hit(f"{inv} · {product}", f"{total:,.0f}")

        p = PRODUCT_BY_NAME[product]
        out.append({"invoice": inv, "date": dt.date().isoformat(), "month": dt.strftime("%Y-%m"),
                    "weekday": dt.weekday(), "branch": branch, "channel": channel, "category": p.category,
                    "product_code": p.code, "product": product, "unit": p.unit, "qty": qty,
                    "unit_price": price, "line_total": round(total, 2), "is_return": is_return,
                    "source": rec["المصدر"]})
    df = pd.DataFrame(out, columns=CLEAN_COLUMNS).sort_values(["date", "invoice", "product_code"],
                                                              kind="stable").reset_index(drop=True)
    rep.clean_rows = len(df)
    return df, rep, pd.DataFrame(rejected)


def read_raw(path: Path) -> pd.DataFrame:
    # everything as text: the cleaner decides what a value means, not pandas
    return pd.read_csv(path, dtype=str, keep_default_na=False, encoding="utf-8-sig")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent / "data"
    df, rep, rejected = clean(read_raw(root / "raw" / "sales_export_raw.csv"))
    (root / "clean").mkdir(exist_ok=True)
    df.to_csv(root / "clean" / "sales_clean.csv", index=False, encoding="utf-8-sig")
    (root / "clean" / "cleaning_report.json").write_text(json.dumps(rep.to_dict(), ensure_ascii=False, indent=1),
                                                         encoding="utf-8")
    print(f"{rep.raw_rows} raw -> {rep.clean_rows} clean, {len(rejected)} set aside")
    for s in rep.steps:
        print(f"  {s.rows:>6}  {s.key}")
