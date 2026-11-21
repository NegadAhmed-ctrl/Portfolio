"""Tests for the cleaning rules, the analysis and the outputs (python -m pytest)."""
from __future__ import annotations

import shutil
import subprocess
import zipfile
from pathlib import Path

import pandas as pd
import pytest
from openpyxl import load_workbook

from pipeline import build_excel, export_web, generate_raw
from pipeline.analysis import insights, kpis
from pipeline.clean import (canonical_branch, canonical_channel, canonical_product, clean, normalize_ar,
                            parse_date, parse_number)

COLS = generate_raw.RAW_COLUMNS


def row(**kw) -> dict:
    base = {"رقم الفاتورة": "SM-260314-001", "التاريخ": "2026-03-14 20:05", "الفرع": "سموحة", "القناة": "كاشير",
            "الصنف": "كنافة بالقشطة", "الكمية": "1", "سعر الوحدة": "380", "الإجمالي": "380", "ملاحظات": "",
            "المصدر": "POS"}
    base.update(kw)
    return base


def run(*rows: dict):
    return clean(pd.DataFrame(list(rows), columns=COLS))


# ---------- single rules
@pytest.mark.parametrize("text,expected", [
    ("380", 380.0), ("1,250.50", 1250.5), ("١٬٢٥٠", 1250.0), ("٦٨٠.٠٠ ج.م", 680.0), (" 45 ", 45.0),
    ("-760", -760.0), ("", None), ("٢٫٥", 2.5),
])
def test_parse_number(text, expected):
    assert parse_number(text) == expected


def test_parse_number_rejects_garbage():
    with pytest.raises(ValueError):
        parse_number("كتير")


@pytest.mark.parametrize("text,label,iso", [
    ("2026-03-14 20:05", "POS", "2026-03-14"), ("14/03/2026", "يوم/شهر/سنة", "2026-03-14"),
    ("١٤/٣/٢٠٢٦", "يوم/شهر/سنة", "2026-03-14"), ("14-Mar-2026", "14-Mar-2026", "2026-03-14"),
])
def test_parse_date_formats(text, label, iso):
    dt, how = parse_date(text)
    assert how == label and dt.date().isoformat() == iso


def test_parse_date_unknown():
    assert parse_date("بكرة") == (None, "غير مفهوم")


def test_normalize_ar_unifies_spellings():
    assert normalize_ar(" كنافه  بالقشطه ") == normalize_ar("كنافة بالقشطة")
    assert normalize_ar("ميامى") == normalize_ar("ميامي")
    assert normalize_ar("أم علي") == normalize_ar("ام علي")


def test_branch_aliases_and_invoice_prefix():
    assert canonical_branch("Smouha ", "X") == ("سموحة", "alias")
    assert canonical_branch("رشدى", "X") == ("رشدي", "alias")
    assert canonical_branch("ميامي", "X") == ("ميامي", "ok")
    assert canonical_branch("", "MI-260101-004") == ("ميامي", "from_invoice")
    assert canonical_branch("", "ZZ-1") == (None, "unknown")


def test_channel_and_product_mapping():
    assert canonical_channel("talabat app") == "طلبات"
    assert canonical_channel("واتساب") == "تليفون وواتساب"
    assert canonical_channel("كاشير") == "في الفرع"
    assert canonical_product("Black Forest cake") == ("تورتة بلاك فورست", "alias")
    assert canonical_product("بيتيفور") == ("بيتي فور", "alias")
    assert canonical_product("تجربة") == (None, "test")
    assert canonical_product("بيتزا") == (None, "unknown")


# ---------- the cleaner on rows
def test_clean_row_is_typed_and_categorised():
    df, rep, rejected = run(row())
    r = df.iloc[0]
    assert (r.date, r.month, r.branch, r.channel, r.category, r.qty, r.line_total) == (
        "2026-03-14", "2026-03", "سموحة", "في الفرع", "شرقي", 1.0, 380.0)
    assert rep.clean_rows == 1 and rejected.empty


def test_duplicates_removed_but_two_different_lines_kept():
    a = row()
    b = row(**{"الصنف": "بسبوسة بالقشطة", "سعر الوحدة": "260", "الإجمالي": "260"})
    df, rep, _ = run(a, dict(a), b)
    assert len(df) == 2 and rep.step("duplicates").rows == 1


def test_test_rows_dropped():
    df, rep, _ = run(row(**{"الصنف": "test", "سعر الوحدة": "1", "الإجمالي": "1"}), row())
    assert len(df) == 1 and rep.step("test_rows").rows == 1


def test_missing_qty_is_derived_from_total():
    df, rep, _ = run(row(**{"الكمية": "", "الإجمالي": "570"}))
    assert df.iloc[0].qty == 1.5 and rep.step("qty_missing").rows == 1


def test_extra_zero_in_total_is_fixed():
    df, rep, _ = run(row(**{"الإجمالي": "3,800.00"}))
    assert df.iloc[0].line_total == 380 and rep.step("total_typo").rows == 1


def test_returns_are_negative_not_deleted():
    sale = row()
    ret = row(**{"الكمية": "1", "الإجمالي": "380", "ملاحظات": "مرتجع"})
    df, rep, _ = run(sale, ret)
    assert list(df.line_total) == [380, -380] and df.is_return.tolist() == [False, True]
    assert kpis(df)["net"] == 0 and kpis(df)["invoices"] == 1


def test_unreadable_rows_are_set_aside_not_guessed():
    df, rep, rejected = run(row(**{"التاريخ": "امبارح"}), row(**{"الصنف": "بيتزا"}), row(**{"الإجمالي": "كتير"}))
    assert df.empty and len(rejected) == 3 and rep.step("unknown").rows == 3


def test_phone_notebook_row_with_arabic_digits():
    df, rep, _ = run(row(**{"التاريخ": "١٤/٣/٢٠٢٦", "الفرع": "", "القناة": "واتساب", "الكمية": "٢",
                            "سعر الوحدة": "320 ج.م", "الإجمالي": "٦٤٠ ج.م", "الصنف": "غريبه",
                            "رقم الفاتورة": "RO-260314-010", "المصدر": "PHONE"}))
    r = df.iloc[0]
    assert (r.branch, r.channel, r["product"], r.qty, r.line_total) == ("رشدي", "تليفون وواتساب", "غريبة", 2, 640)
    assert rep.step("branch_missing").rows == 1 and rep.step("numbers").rows == 1


# ---------- the whole sample
@pytest.fixture(scope="module")
def sample():
    raw = pd.DataFrame(generate_raw.generate(), columns=COLS)
    df, rep, rejected = clean(raw)
    return raw, df, rep, rejected


def test_generator_is_deterministic():
    assert generate_raw.generate()[:50] == generate_raw.generate()[:50]


def test_sample_cleans_completely(sample):
    raw, df, rep, rejected = sample
    assert rejected.empty
    assert rep.raw_rows == len(raw)
    removed = rep.step("test_rows").rows + rep.step("duplicates").rows
    assert rep.clean_rows == len(raw) - removed
    assert rep.step("duplicates").rows > 100 and rep.step("test_rows").rows == 6
    assert set(df.branch) == {"سموحة", "ميامي", "رشدي"}
    assert set(df.channel) == {"في الفرع", "طلبات", "تليفون وواتساب"}
    assert (df.line_total.round(2) == (df.qty * df.unit_price).round(2)).all()


def test_insights_find_the_planted_patterns(sample):
    _, df, _, _ = sample
    ins = {i.key: i for i in insights(df)}
    assert set(ins) == {"ramadan", "kahk", "delivery", "black_forest", "weekend", "miami_summer"}
    assert ins["ramadan"].figure.startswith("+")
    assert ins["black_forest"].figure.startswith("-")
    assert ins["delivery"].figure.endswith("%")
    first = int(ins["delivery"].body.split("كان ")[1].split("%")[0])
    assert int(ins["delivery"].figure.strip("%")) > first


def test_web_payload_matches_clean_totals(sample):
    _, df, rep, _ = sample
    p = export_web.build_payload(df, rep.to_dict())
    assert abs(sum(r[4] for r in p["daily"]) - df.line_total.sum()) < len(p["daily"])  # rounding only
    assert sum(r[3] for r in p["tickets"]) == kpis(df)["invoices"]
    assert abs(sum(r[5] for r in p["products"]) - df.line_total.sum()) < len(p["products"])
    assert p["meta"]["sample"] is True and len(p["meta"]["months"]) == 12


def test_excel_workbook_structure(sample, tmp_path):
    _, df, rep, _ = sample
    path = build_excel.build(df, rep.to_dict(), tmp_path / "out.xlsx")
    wb = load_workbook(path)
    assert wb.sheetnames == ["اقرأني", "المؤشرات", "شهري × فرع", "الأقسام والقنوات", "أعلى الأصناف",
                             "ملاحظات", "سجل التنضيف", "البيانات النظيفة"]
    data = wb["البيانات النظيفة"]
    assert data.max_row == len(df) + 1 and "tbl_sales" in data.tables
    assert all(ws.sheet_view.rightToLeft for ws in wb)
    assert wb["المؤشرات"]["B6"].value.startswith("=SUMIFS(")
    with zipfile.ZipFile(path) as z:
        assert sum(n.startswith("xl/charts/chart") for n in z.namelist()) == 4


@pytest.mark.skipif(shutil.which("soffice") is None, reason="LibreOffice not installed")
def test_excel_formulas_compute_the_same_kpis(sample, tmp_path):
    """Recalculate the live sheet with LibreOffice and compare with pandas."""
    _, df, rep, _ = sample
    path = build_excel.build(df, rep.to_dict(), tmp_path / "live.xlsx")
    subprocess.run(["soffice", "--headless", "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir",
                    str(tmp_path / "calc"), str(path)], check=True, capture_output=True, timeout=180)
    ws = load_workbook(tmp_path / "calc" / "live.xlsx", data_only=True)["المؤشرات"]
    k = kpis(df)
    assert ws["B6"].value == pytest.approx(k["net"], abs=1)
    assert ws["B7"].value == pytest.approx(k["returns"], abs=1)
    assert ws["B8"].value == k["invoices"]
    assert ws["B10"].value == pytest.approx(k["return_rate"], abs=1e-4)
