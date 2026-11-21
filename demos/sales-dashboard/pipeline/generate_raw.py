"""Generate the SAMPLE raw export: one year of invoice lines for the 3 branches,
merged from three sources the way a real client sends them (POS export, Talabat
export, the phone-orders notebook), with the mess those sources really have.

Deterministic (seeded) so tests, the workbook and the dashboard always agree.
The numbers are invented; the patterns (Ramadan, Eid kahk, Mawlid, summer) are the
ones an Alexandrian pastry shop lives by.

    python -m pipeline.generate_raw  ->  data/raw/sales_export_raw.csv
"""
from __future__ import annotations

import csv
import math
import random
from datetime import date, datetime, timedelta
from pathlib import Path

from .catalog import (BRANCHES, EID_ADHA, EID_FITR, MAWLID, PERIOD_END, PERIOD_START, PRODUCTS,
                      RAMADAN, price_on)

RAW_COLUMNS = ["رقم الفاتورة", "التاريخ", "الفرع", "القناة", "الصنف", "الكمية", "سعر الوحدة", "الإجمالي", "ملاحظات", "المصدر"]
BASE_INVOICES = {"سموحة": 30, "ميامي": 26, "رشدي": 22}
WEEKDAY = {0: 0.92, 1: 0.88, 2: 0.9, 3: 1.3, 4: 1.35, 5: 1.12, 6: 0.93}  # Mon..Sun
AR_DIGITS = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")
MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# how each source spells things (picked at random per row)
SPELL = {
    "POS": {"branch": {"سموحة": ["سموحة", "فرع سموحة"], "ميامي": ["ميامي", "فرع ميامي"], "رشدي": ["رشدي", "فرع رشدي"]},
            "channel": ["فرع", "كاشير"]},
    "TALABAT": {"branch": {"سموحة": ["Smouha", "smouha ", "SMOUHA"], "ميامي": ["Miami", "miami"], "رشدي": ["Roshdy", "Rushdy"]},
                "channel": ["Talabat", "talabat app"]},
    "PHONE": {"branch": {"سموحة": ["سموحه", "سموحة"], "ميامي": ["ميامى", "ميامي"], "رشدي": ["رشدى", "رشدي"]},
              "channel": ["تليفون", "واتساب"]},
}
EN_NAMES = {"KN1": "Konafa cream", "BS1": "Basbousa", "BQ1": "Baklava mix", "CK1": "Black Forest cake",
            "CK2": "Chocolate cake", "CK3": "Fruit cake", "GT1": "Gateau", "CH1": "Cheesecake",
            "PF1": "Petit four", "CR1": "Croissant", "IC1": "Ice cream", "KK1": "Kahk", "KK2": "Kahk dates",
            "OA1": "Om Ali", "QT1": "Qatayef", "GR1": "Ghorayeba", "HM1": "Mawlid box", "MJ1": "Mango juice"}
TYPOS = {"KN1": ["كنافه بالقشطه", "كنافة قشطة"], "BS1": ["بسبوسه بالقشطه"], "CK1": ["تورته بلاك فورست", "بلاك فورست"],
         "CK2": ["تورتة شيكولاتة"], "PF1": ["بيتيفور"], "GR1": ["غريبه"], "KK2": ["كحك بالعجوه"], "OA1": ["ام علي"],
         "BQ1": ["بقلاوة"], "GT1": ["جاتوه"], "HM1": ["حلاوه المولد"], "IC1": ["ايس كريم"]}


def _in(d: date, span: tuple[date, date]) -> bool:
    return span[0] <= d <= span[1]


def day_factor(d: date, branch: str) -> float:
    f = WEEKDAY[d.weekday()]
    if _in(d, RAMADAN):
        f *= 1.3
        if d >= RAMADAN[1] - timedelta(days=9):
            f *= 1.45  # kahk & Eid shopping
    if _in(d, EID_FITR):
        f *= 1.5
    if _in(d, EID_ADHA):
        f *= 1.2
    if d.month in (7, 8) and branch == "ميامي":
        f *= 1.3  # summer visitors near the corniche
    if (d.month, d.day) in ((12, 31), (2, 14), (3, 21)):
        f *= 1.9  # New Year, Valentine's, Mother's Day: cakes
    if d.month in (6, 9, 10):
        f *= 0.95
    return f


def product_weights(d: date, channel: str) -> list[float]:
    ramadan = _in(d, RAMADAN)
    last10 = ramadan and d >= RAMADAN[1] - timedelta(days=9)
    summer = d.month in (6, 7, 8, 9)
    winter = d.month in (12, 1, 2)
    cake_day = (d.month, d.day) in ((12, 31), (2, 14), (3, 21))
    mawlid = date(2026, 8, 10) <= d <= MAWLID
    w = []
    for p in PRODUCTS:
        x = {"KN1": 10, "BS1": 9, "QT1": 0.3, "BQ1": 4, "OA1": 5, "CK1": 4.5, "CK2": 4, "CK3": 3, "GT1": 10,
             "CH1": 6, "PF1": 7, "GR1": 4, "CR1": 9, "KK1": 0.12, "KK2": 0.1, "HM1": 0, "TC1": 6, "SH1": 2,
             "MJ1": 3, "IC1": 3}[p.code]
        if ramadan and p.category == "شرقي":
            x *= 2.6
        if ramadan and p.code == "QT1":
            x = 16
        if last10 and p.code in ("GR1", "PF1"):
            x *= 3
        if last10 and p.code in ("KK1", "KK2"):
            x = 11
        if _in(d, EID_FITR) and p.code in ("KK1", "KK2"):
            x = 14
        if mawlid and p.code == "HM1":
            x = 14
        if summer and p.code in ("IC1", "MJ1"):
            x *= 3.2
        if summer and p.code == "SH1":
            x *= 0.15
        if winter and p.code == "SH1":
            x *= 2.5
        if cake_day and p.category == "تورت وجاتوه":
            x *= 4
        if p.code == "CK1" and d >= date(2026, 7, 1):
            x *= 0.6  # people stopped buying it after the price rise
        if channel == "طلبات" and p.category in ("مشروبات", "آيس كريم"):
            x *= 0.25
        if channel == "تليفون وواتساب" and p.category in ("مشروبات", "آيس كريم"):
            x *= 0.1
        w.append(x)
    return w


def pick_qty(rng: random.Random, unit: str, code: str, d: date) -> float:
    if unit == "كيلو":
        if code in ("KK1", "KK2", "GR1", "PF1") and _in(d, (RAMADAN[1] - timedelta(days=9), EID_FITR[1])):
            return rng.choice([1, 1, 2, 2, 3, 1.5])
        return rng.choices([0.5, 1, 1.5, 2], [35, 45, 8, 12])[0]
    if unit == "تورتة":
        return 1
    if unit == "طبق":
        return rng.choice([1, 1, 2])
    if unit == "علبة":
        return rng.choice([1, 1, 2, 3])
    return rng.choices([1, 2, 3, 4, 6], [40, 30, 12, 10, 8])[0]


def talabat_share(d: date) -> float:
    t = (d - PERIOD_START).days / (PERIOD_END - PERIOD_START).days
    return 0.17 + 0.13 * t  # delivery grew through the year


def _poisson(rng: random.Random, lam: float) -> int:
    # Knuth for small lambdas, normal approx above
    if lam > 30:
        return max(0, int(round(rng.gauss(lam, math.sqrt(lam)))))
    L, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= L:
            return k
        k += 1


def _fmt_num(rng: random.Random, x: float, source: str) -> str:
    s = f"{x:,.2f}" if x >= 1000 and rng.random() < 0.4 else (f"{x:.2f}" if rng.random() < 0.5 else f"{x:g}")
    if source == "PHONE":
        if rng.random() < 0.5:
            s = s.translate(AR_DIGITS).replace(",", "٬")
        if rng.random() < 0.6:
            s += " ج.م"
    return s


def _fmt_date(rng: random.Random, dt: datetime, source: str) -> str:
    if source == "POS":
        return dt.strftime("%Y-%m-%d %H:%M")
    if source == "TALABAT":
        return dt.strftime("%d/%m/%Y") if rng.random() < 0.8 else f"{dt.day:02d}-{MONTHS_EN[dt.month - 1]}-{dt.year}"
    s = f"{dt.day}/{dt.month}/{dt.year}"
    return s.translate(AR_DIGITS) if rng.random() < 0.7 else s


def generate(seed: int = 2026) -> list[dict[str, str]]:
    rng = random.Random(seed)
    rows: list[dict[str, str]] = []
    counters: dict[tuple[str, date], int] = {}
    d = PERIOD_START
    while d <= PERIOD_END:
        for branch, prefix in BRANCHES.items():
            n = _poisson(rng, BASE_INVOICES[branch] * day_factor(d, branch))
            for _ in range(n):
                r = rng.random()
                ts = talabat_share(d)
                channel = "طلبات" if r < ts else ("تليفون وواتساب" if r < ts + 0.12 else "في الفرع")
                source = {"طلبات": "TALABAT", "تليفون وواتساب": "PHONE", "في الفرع": "POS"}[channel]
                k = counters.get((prefix, d), 0) + 1
                counters[(prefix, d)] = k
                inv = f"{prefix}-{d:%y%m%d}-{k:03d}"
                hour = rng.choices(range(10, 24), [1, 2, 3, 3, 3, 3, 4, 5, 7, 9, 10, 9, 6, 3])[0]
                dt = datetime(d.year, d.month, d.day, hour, rng.randrange(60))
                weights = product_weights(d, channel)
                n_lines = rng.choices([1, 2, 3], [58, 31, 11])[0]
                chosen = set()
                for _ in range(n_lines):
                    p = rng.choices(PRODUCTS, weights)[0]
                    if p.code in chosen:
                        continue
                    chosen.add(p.code)
                    qty = pick_qty(rng, p.unit, p.code, d)
                    price = price_on(p.code, d)
                    rows.append(_messy_row(rng, inv, dt, branch, channel, source, p, qty, price))
                    if rng.random() < 0.008:  # a return later that day
                        ret = _messy_row(rng, inv, dt, branch, channel, source, p, -qty, price)
                        ret["ملاحظات"] = "مرتجع"
                        rows.append(ret)
        d += timedelta(days=1)

    # opening-day test lines the cashier forgot to delete
    for i in range(6):
        rows.insert(i * 3, {"رقم الفاتورة": f"SM-251101-T{i}", "التاريخ": "2025-11-01 09:1" + str(i), "الفرع": "سموحة",
                            "القناة": "كاشير", "الصنف": "تجربة" if i % 2 else "test", "الكمية": "1", "سعر الوحدة": "1",
                            "الإجمالي": "1", "ملاحظات": "", "المصدر": "POS"})
    # the Talabat export for 5–11 Apr 2026 was pasted twice
    dup = [r for r in rows if r["المصدر"] == "TALABAT" and _talabat_day(r) in
           {date(2026, 4, x) for x in range(5, 12)}]
    rows.extend(dict(r) for r in dup)
    return rows


def _talabat_day(r: dict[str, str]) -> date | None:
    s = r["التاريخ"]
    try:
        return datetime.strptime(s, "%d/%m/%Y").date()
    except ValueError:
        try:
            return datetime.strptime(s, "%d-%b-%Y").date()
        except ValueError:
            return None


def _messy_row(rng, inv, dt, branch, channel, source, p, qty, price) -> dict[str, str]:
    sp = SPELL[source]
    branch_txt = rng.choice(sp["branch"][branch])
    if source == "PHONE" and rng.random() < 0.04:
        branch_txt = ""  # the notebook page didn't say which branch
    name = p.name
    roll = rng.random()
    if source == "TALABAT" and p.code in EN_NAMES and roll < 0.7:
        name = EN_NAMES[p.code]
    elif p.code in TYPOS and roll < 0.25:
        name = rng.choice(TYPOS[p.code])
    if rng.random() < 0.05:
        name = " " + name + "  "
    total = round(qty * price, 2)
    total_txt = _fmt_num(rng, abs(total), source)
    if total < 0:
        total_txt = "-" + total_txt
    if rng.random() < 0.0012 and total > 0:
        total_txt = _fmt_num(rng, total * 10, "POS")  # an extra zero typed
    qty_txt = f"{qty:g}"
    if source == "PHONE" and rng.random() < 0.5:
        qty_txt = qty_txt.translate(AR_DIGITS)
    if rng.random() < 0.012:
        qty_txt = ""  # quantity left blank, total is there
    return {"رقم الفاتورة": inv, "التاريخ": _fmt_date(rng, dt, source), "الفرع": branch_txt,
            "القناة": rng.choice(sp["channel"]), "الصنف": name, "الكمية": qty_txt,
            "سعر الوحدة": _fmt_num(rng, price, source), "الإجمالي": total_txt, "ملاحظات": "",
            "المصدر": source}


def write_csv(rows: list[dict[str, str]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=RAW_COLUMNS)
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "data" / "raw" / "sales_export_raw.csv"
    rows = generate()
    write_csv(rows, out)
    print(f"{len(rows)} rows -> {out}")
