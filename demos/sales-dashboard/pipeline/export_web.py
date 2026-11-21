"""Export compact JSON for the web dashboard (it does its own filtering in the browser).

data/web/sales.json:
  meta      shop, period, branches, channels, categories, products, months, events
  daily     [day, branch, channel, category, net]           (net = sales minus returns, EGP)
  tickets   [day, branch, channel, invoices, gross, returns]
  products  [month, branch, channel, product, qty, net]
  report    cleaning report;  insights  written insights
Indexes point into the meta lists, which keeps the file small.
"""
from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path

import pandas as pd

from .analysis import insights_dicts
from .catalog import BRANCHES, CATEGORIES, CHANNELS, EVENTS, PERIOD_END, PERIOD_START, PRODUCTS, SHOP_NAME


FIELDS = ["رقم الفاتورة", "التاريخ", "الفرع", "القناة", "الصنف", "الكمية", "سعر الوحدة", "الإجمالي", "ملاحظات", "المصدر"]


def raw_examples(raw: pd.DataFrame) -> list[dict]:
    """A handful of real raw rows (one per kind of problem) with what the cleaner made of each."""
    from .clean import clean, normalize_ar, parse_number

    checks = [
        ("phone", "كشكول التليفون: أرقام عربي، \"ج.م\"، والفرع فاضي",
         lambda r: r["المصدر"] == "PHONE" and r["الفرع"] == "" and "ج.م" in r["الإجمالي"] and "/" in r["التاريخ"]),
        ("talabat", "تصدير طلبات: اسم الصنف بالإنجليزي وتاريخ 14-Mar",
         lambda r: r["المصدر"] == "TALABAT" and "-" in r["التاريخ"] and r["الصنف"].isascii()),
        ("typo", "اسم صنف بغلطة إملائية", lambda r: r["الصنف"] in ("كنافه بالقشطه", "تورته بلاك فورست")),
        ("qty", "الكمية فاضية", lambda r: r["الكمية"] == "" and r["المصدر"] == "POS"),
        ("typo_total", "صفر زيادة في الإجمالي", lambda r: _extra_zero(r, parse_number)),
        ("return", "مرتجع", lambda r: r["ملاحظات"] == "مرتجع" and r["المصدر"] == "POS"),
        ("test", "صف تجربة من يوم الافتتاح", lambda r: normalize_ar(r["الصنف"]) in ("test", "تجربه")),
    ]
    out, done = [], set()
    records = raw.to_dict("records")
    for rec in records:
        for key, label, ok in checks:
            if key in done:
                continue
            try:
                hit = ok(rec)
            except (ValueError, TypeError, ZeroDivisionError):
                hit = False
            if hit:
                done.add(key)
                cleaned, _, _ = clean(pd.DataFrame([rec], columns=FIELDS))
                c = cleaned.iloc[0].to_dict() if len(cleaned) else None
                out.append({"key": key, "label": label, "raw": {k: rec[k] for k in FIELDS[:8]},
                            "clean": None if c is None else {
                                "date": c["date"], "branch": c["branch"], "channel": c["channel"],
                                "product": c["product"], "qty": c["qty"], "unit_price": c["unit_price"],
                                "line_total": c["line_total"]}})
    # one duplicated Talabat line (the April export pasted twice)
    seen = {}
    for rec in records:
        k = tuple(rec[f] for f in FIELDS)
        if rec["المصدر"] == "TALABAT" and k in seen:
            out.append({"key": "duplicate", "label": "نفس السطر متصدّر مرتين", "raw": {f: rec[f] for f in FIELDS[:8]},
                        "clean": None})
            break
        seen[k] = True
    order = ["phone", "talabat", "typo", "qty", "typo_total", "duplicate", "return", "test"]
    return sorted(out, key=lambda x: order.index(x["key"]))


def _extra_zero(r, parse_number) -> bool:
    q, p, t = parse_number(r["الكمية"]), parse_number(r["سعر الوحدة"]), parse_number(r["الإجمالي"])
    return q is not None and q > 0 and abs(t - 10 * q * p) < 1


def build_payload(df: pd.DataFrame, report: dict, raw: pd.DataFrame | None = None) -> dict:
    days = [(PERIOD_START + timedelta(days=i)).isoformat() for i in range((PERIOD_END - PERIOD_START).days + 1)]
    months = sorted({d[:7] for d in days})
    di = {d: i for i, d in enumerate(days)}
    bi = {b: i for i, b in enumerate(BRANCHES)}
    ci = {c: i for i, c in enumerate(CHANNELS)}
    ki = {c: i for i, c in enumerate(CATEGORIES)}
    pi = {p.code: i for i, p in enumerate(PRODUCTS)}
    mi = {m: i for i, m in enumerate(months)}

    daily = df.groupby(["date", "branch", "channel", "category"], as_index=False)["line_total"].sum()
    sales = df[~df.is_return]
    tick = sales.groupby(["date", "branch", "channel"], as_index=False).agg(
        invoices=("invoice", "nunique"), gross=("line_total", "sum"))
    ret = df[df.is_return].groupby(["date", "branch", "channel"], as_index=False)["line_total"].sum()
    tick = tick.merge(ret, how="left", on=["date", "branch", "channel"]).fillna({"line_total": 0})
    prod = df.groupby(["month", "branch", "channel", "product_code"], as_index=False).agg(
        qty=("qty", "sum"), net=("line_total", "sum"))

    return {
        "meta": {
            "shop": SHOP_NAME, "start": days[0], "end": days[-1], "days": len(days), "months": months,
            "branches": list(BRANCHES), "channels": list(CHANNELS), "categories": list(CATEGORIES),
            "products": [{"code": p.code, "name": p.name, "category": ki[p.category], "unit": p.unit} for p in PRODUCTS],
            "events": [{"name": n, "start": s.isoformat(), "end": e.isoformat()} for n, s, e in EVENTS],
            "sample": True,
        },
        "daily": [[di[r.date], bi[r.branch], ci[r.channel], ki[r.category], round(r.line_total)]
                  for r in daily.itertuples(index=False)],
        "tickets": [[di[r.date], bi[r.branch], ci[r.channel], int(r.invoices), round(r.gross), round(-r.line_total)]
                    for r in tick.itertuples(index=False)],
        "products": [[mi[r.month], bi[r.branch], ci[r.channel], pi[r.product_code], round(r.qty, 1), round(r.net)]
                     for r in prod.itertuples(index=False)],
        "report": report,
        "insights": insights_dicts(df),
        "raw_examples": raw_examples(raw) if raw is not None else [],
    }


def write(payload: dict, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return path
