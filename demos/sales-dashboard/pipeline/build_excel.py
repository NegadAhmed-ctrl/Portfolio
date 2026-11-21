"""Build the client's Excel workbook from the clean table (openpyxl).

Sheets (right-to-left): اقرأني · المؤشرات (live formulas + branch dropdown) · شهري × فرع ·
الأقسام والقنوات · أعلى الأصناف · ملاحظات · سجل التنضيف · البيانات النظيفة (an Excel Table).
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

from .analysis import insights, kpis, month_label, monthly_by_branch, monthly_channel_share
from .catalog import BRANCHES, CATEGORIES, CHANNELS, PERIOD_END, PERIOD_START, SHOP_NAME

INK = "1F2B24"
RULE = "B9CDB0"
PAPER = "EEF3E4"
RED = "B3261E"
HIGHLIGHT = "F5E663"
FONT = "Arial"

DATA_SHEET = "البيانات النظيفة"
DATA_HEADERS = ["رقم الفاتورة", "التاريخ", "الشهر", "اليوم", "الفرع", "القناة", "القسم", "كود الصنف", "الصنف",
                "الوحدة", "الكمية", "سعر الوحدة", "صافي السطر", "مرتجع", "أول سطر في الفاتورة", "المصدر"]
WEEKDAYS = ["الاتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت", "الحد"]

thin = Side(style="thin", color=RULE)
BOX = Border(top=thin, bottom=thin, left=thin, right=thin)


def _head(ws, row: int, values: list[str], col: int = 1) -> None:
    for i, v in enumerate(values):
        c = ws.cell(row=row, column=col + i, value=v)
        c.font = Font(name=FONT, bold=True, color=INK)
        c.fill = PatternFill("solid", fgColor=PAPER)
        c.border = Border(bottom=Side(style="medium", color=INK))
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def _title(ws, text: str, sub: str | None = None) -> None:
    ws.sheet_view.rightToLeft = True
    ws["A1"] = text
    ws["A1"].font = Font(name=FONT, bold=True, size=16, color=INK)
    if sub:
        ws["A2"] = sub
        ws["A2"].font = Font(name=FONT, size=10, color="5B6B60")


def _widths(ws, widths: dict[str, float]) -> None:
    for col, w in widths.items():
        ws.column_dimensions[col].width = w


SERIES_COLORS = [INK, "6E9274", "C3D4B8"]


def _style_chart(chart, line: bool = False) -> None:
    """Ink colours, visible axes (openpyxl hides them by default), months read right-to-left."""
    chart.x_axis.delete = False
    chart.y_axis.delete = False
    chart.y_axis.majorGridlines.spPr = None
    chart.y_axis.number_format = "#,##0"
    if getattr(chart, "type", None) != "bar":
        chart.x_axis.scaling.orientation = "maxMin"  # first month on the right, like the sheet
    for i, s in enumerate(chart.series):
        color = SERIES_COLORS[i % len(SERIES_COLORS)]
        if line:
            s.smooth = False
            s.graphicalProperties.line.solidFill = color
            s.graphicalProperties.line.width = 28000
        else:
            s.graphicalProperties.solidFill = color
            s.graphicalProperties.line.solidFill = color


def build(df: pd.DataFrame, report: dict, path: Path) -> Path:
    wb = Workbook()
    n = len(df)
    last = n + 1
    period = f"{PERIOD_START:%d/%m/%Y} – {PERIOD_END:%d/%m/%Y}"

    # ---------- اقرأني
    ws = wb.active
    ws.title = "اقرأني"
    _title(ws, f"{SHOP_NAME}: تحليل المبيعات", f"الفترة {period} · بيانات تجريبية (Sample data) لأسماء وأرقام وهمية")
    lines = [
        ("المصدر", "3 ملفات اتدمجوا: تصدير الكاشير، تصدير طلبات، وكشكول طلبات التليفون والواتساب."),
        ("التنضيف", f"{report['raw_rows']:,} صف خام ← {report['clean_rows']:,} صف نظيف. التفاصيل في شيت \"سجل التنضيف\"."),
        ("المؤشرات", "اختار الفرع من الخلية B4 والأرقام والرسم بيتحدثوا لوحدهم (معادلات SUMIFS على البيانات النظيفة)."),
        ("شهري × فرع", "صافي المبيعات لكل شهر ولكل فرع + رسم الاتجاه."),
        ("الأقسام والقنوات", "مبيعات كل قسم في كل قناة، ونصيب كل قناة شهر بشهر."),
        ("أعلى الأصناف", "ترتيب الأصناف بالإيراد والكمية."),
        ("ملاحظات", "أهم 6 ملاحظات من الداتا ومعاها المقترح."),
        ("البيانات النظيفة", "كل سطر فاتورة بعد التنضيف، جدول Excel بفلاتر. المرتجعات بقيمة سالبة."),
    ]
    for i, (k, v) in enumerate(lines, start=4):
        ws.cell(row=i, column=1, value=k).font = Font(name=FONT, bold=True, color=INK)
        ws.cell(row=i, column=2, value=v).font = Font(name=FONT, color=INK)
    ws.cell(row=13, column=1, value="Power BI").font = Font(name=FONT, bold=True, color=INK)
    ws.cell(row=13, column=2, value="نفس الجدول النظيف جاهز يتفتح في Power BI أو Google Looker Studio لو مطلوب.").font = Font(name=FONT)
    _widths(ws, {"A": 20, "B": 110})

    # ---------- البيانات النظيفة (built first: formulas point to it)
    wd = wb.create_sheet(DATA_SHEET)
    wd.sheet_view.rightToLeft = True
    wd.append(DATA_HEADERS)
    first_line = ~df.is_return & ~df.duplicated("invoice")
    for r, fl in zip(df.itertuples(index=False), first_line):
        wd.append([r.invoice, pd.Timestamp(r.date).to_pydatetime(), r.month, WEEKDAYS[r.weekday], r.branch, r.channel,
                   r.category, r.product_code, r.product, r.unit, r.qty, r.unit_price, r.line_total,
                   "نعم" if r.is_return else "لا", 1 if fl else 0, r.source])
    for row in wd.iter_rows(min_row=2, min_col=2, max_col=2):
        row[0].number_format = "yyyy-mm-dd"
    for col in ("L", "M"):
        for row in wd[f"{col}2:{col}{last}"]:
            row[0].number_format = "#,##0.00"
    tab = Table(displayName="tbl_sales", ref=f"A1:{get_column_letter(len(DATA_HEADERS))}{last}")
    tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight15", showRowStripes=True)
    wd.add_table(tab)
    wd.freeze_panes = "A2"
    _widths(wd, {"A": 16, "B": 12, "C": 9, "D": 9, "E": 9, "F": 15, "G": 17, "H": 9, "I": 20, "J": 8,
                 "K": 8, "L": 11, "M": 12, "N": 7, "O": 9, "P": 9})

    rng = lambda col: f"'{DATA_SHEET}'!${col}$2:${col}${last}"  # noqa: E731

    # ---------- المؤشرات (live)
    wk = wb.create_sheet("المؤشرات", 1)
    _title(wk, "المؤشرات", "اختار الفرع من القايمة، و\"الكل\" للفروع التلاتة. الأرقام معادلات على شيت البيانات النظيفة.")
    wk["A4"] = "الفرع"
    wk["A4"].font = Font(name=FONT, bold=True)
    wk["B4"] = "الكل"
    wk["B4"].fill = PatternFill("solid", fgColor=HIGHLIGHT)
    wk["B4"].font = Font(name=FONT, bold=True, size=12)
    dv = DataValidation(type="list", formula1='"الكل,' + ",".join(BRANCHES) + '"', allow_blank=False)
    wk.add_data_validation(dv)
    dv.add("B4")
    wk["C4"] = '=IF(B4="الكل","*",B4)'
    wk["C4"].font = Font(name=FONT, color="FFFFFF")  # helper: the SUMIFS criterion
    sel = "$C$4"
    rows = [
        ("صافي المبيعات", f"=SUMIFS({rng('M')},{rng('E')},{sel})", "#,##0 \"ج.م\""),
        ("المرتجعات", f"=-SUMIFS({rng('M')},{rng('E')},{sel},{rng('N')},\"نعم\")", "#,##0 \"ج.م\""),
        ("عدد الفواتير", f"=SUMIFS({rng('O')},{rng('E')},{sel})", "#,##0"),
        ("متوسط الفاتورة", "=IFERROR(B6/B8,0)", "#,##0 \"ج.م\""),
        ("نسبة المرتجعات", "=IFERROR(B7/(B6+B7),0)", "0.0%"),
    ]
    for i, (label, formula, fmt) in enumerate(rows, start=6):
        wk.cell(row=i, column=1, value=label).font = Font(name=FONT, bold=True, color=INK)
        c = wk.cell(row=i, column=2, value=formula)
        c.number_format = fmt
        c.font = Font(name=FONT, size=13, bold=True, color=INK)
        c.border = Border(bottom=thin)
    _head(wk, 13, ["الشهر", "صافي المبيعات", "عدد الفواتير", "متوسط الفاتورة"])
    months = sorted(df.month.unique())
    for i, m in enumerate(months, start=14):
        wk.cell(row=i, column=1, value=month_label(m))
        wk.cell(row=i, column=2, value=f"=SUMIFS({rng('M')},{rng('E')},{sel},{rng('C')},\"{m}\")").number_format = "#,##0"
        wk.cell(row=i, column=3, value=f"=SUMIFS({rng('O')},{rng('E')},{sel},{rng('C')},\"{m}\")").number_format = "#,##0"
        wk.cell(row=i, column=4, value=f"=IFERROR(B{i}/C{i},0)").number_format = "#,##0"
    end = 13 + len(months)
    ch = LineChart()
    ch.title = "صافي المبيعات شهر بشهر"
    ch.height, ch.width = 8, 18
    ch.add_data(Reference(wk, min_col=2, min_row=13, max_row=end), titles_from_data=True)
    ch.set_categories(Reference(wk, min_col=1, min_row=14, max_row=end))
    ch.legend = None
    _style_chart(ch, line=True)
    wk.add_chart(ch, "F4")
    _widths(wk, {"A": 18, "B": 18, "C": 14, "D": 16})

    # ---------- شهري × فرع (values, like a pivot cache)
    wm = wb.create_sheet("شهري × فرع", 2)
    _title(wm, "صافي المبيعات شهري لكل فرع", "قيم محسوبة من البيانات النظيفة (زي Pivot Table).")
    piv = monthly_by_branch(df)
    branches = list(BRANCHES)
    _head(wm, 4, ["الشهر", *branches, "الإجمالي"])
    for i, (m, r) in enumerate(piv.iterrows(), start=5):
        wm.cell(row=i, column=1, value=month_label(m))
        for j, b in enumerate(branches, start=2):
            wm.cell(row=i, column=j, value=float(r.get(b, 0))).number_format = "#,##0"
        wm.cell(row=i, column=len(branches) + 2, value=f"=SUM(B{i}:{get_column_letter(len(branches) + 1)}{i})").number_format = "#,##0"
    endm = 4 + len(piv)
    lc = LineChart()
    lc.title = "الفروع شهر بشهر"
    lc.height, lc.width = 9, 20
    lc.add_data(Reference(wm, min_col=2, max_col=1 + len(branches), min_row=4, max_row=endm), titles_from_data=True)
    lc.set_categories(Reference(wm, min_col=1, min_row=5, max_row=endm))
    _style_chart(lc, line=True)
    wm.add_chart(lc, "G4")
    _widths(wm, {"A": 16, "B": 13, "C": 13, "D": 13, "E": 14})

    # ---------- الأقسام والقنوات
    wc = wb.create_sheet("الأقسام والقنوات", 3)
    _title(wc, "الأقسام × القنوات", "صافي المبيعات لكل قسم في كل قناة، ونصيب القنوات شهر بشهر.")
    cc = df.pivot_table(index="category", columns="channel", values="line_total", aggfunc="sum").reindex(
        index=list(CATEGORIES), columns=list(CHANNELS)).fillna(0)
    _head(wc, 4, ["القسم", *CHANNELS, "الإجمالي"])
    for i, (cat, r) in enumerate(cc.iterrows(), start=5):
        wc.cell(row=i, column=1, value=cat)
        for j, chn in enumerate(CHANNELS, start=2):
            wc.cell(row=i, column=j, value=float(r[chn])).number_format = "#,##0"
        wc.cell(row=i, column=5, value=f"=SUM(B{i}:D{i})").number_format = "#,##0"
    endc = 4 + len(cc)
    bc = BarChart()
    bc.type, bc.grouping, bc.overlap = "bar", "stacked", 100
    bc.title = "الأقسام حسب القناة"
    bc.height, bc.width = 9, 18
    bc.add_data(Reference(wc, min_col=2, max_col=4, min_row=4, max_row=endc), titles_from_data=True)
    bc.set_categories(Reference(wc, min_col=1, min_row=5, max_row=endc))
    _style_chart(bc)
    wc.add_chart(bc, "G4")
    share = monthly_channel_share(df).reindex(columns=list(CHANNELS)).fillna(0)
    top = endc + 3
    _head(wc, top, ["الشهر", *CHANNELS])
    for i, (m, r) in enumerate(share.iterrows(), start=top + 1):
        wc.cell(row=i, column=1, value=month_label(m))
        for j, chn in enumerate(CHANNELS, start=2):
            wc.cell(row=i, column=j, value=float(r[chn])).number_format = "0%"
    sc = BarChart()
    sc.type, sc.grouping, sc.overlap = "col", "percentStacked", 100
    sc.title = "نصيب كل قناة شهر بشهر"
    sc.height, sc.width = 9, 18
    sc.add_data(Reference(wc, min_col=2, max_col=4, min_row=top, max_row=top + len(share)), titles_from_data=True)
    sc.set_categories(Reference(wc, min_col=1, min_row=top + 1, max_row=top + len(share)))
    _style_chart(sc)
    sc.y_axis.number_format = "0%"
    wc.add_chart(sc, "G24")
    _widths(wc, {"A": 18, "B": 13, "C": 13, "D": 15, "E": 14})

    # ---------- أعلى الأصناف
    wp = wb.create_sheet("أعلى الأصناف", 4)
    _title(wp, "ترتيب الأصناف بالإيراد")
    prod = df.groupby(["product", "category", "unit"], as_index=False).agg(qty=("qty", "sum"), net=("line_total", "sum"))
    prod = prod.sort_values("net", ascending=False)
    total = prod.net.sum()
    _head(wp, 4, ["#", "الصنف", "القسم", "الكمية", "الوحدة", "صافي المبيعات", "النصيب"])
    for i, r in enumerate(prod.itertuples(index=False), start=5):
        vals = [i - 4, r.product, r.category, round(r.qty, 1), r.unit, r.net, r.net / total]
        for j, v in enumerate(vals, start=1):
            c = wp.cell(row=i, column=j, value=v)
            c.number_format = {4: "#,##0.0", 6: "#,##0", 7: "0.0%"}.get(j, "General")
    _widths(wp, {"A": 5, "B": 22, "C": 18, "D": 11, "E": 9, "F": 15, "G": 9})

    # ---------- ملاحظات
    wi = wb.create_sheet("ملاحظات", 5)
    _title(wi, "ملاحظات على السنة", "كل رقم هنا محسوب من البيانات، مش مكتوب باليد.")
    _head(wi, 4, ["الرقم", "الملاحظة", "التفاصيل", "المقترح"])
    for i, ins in enumerate(insights(df), start=5):
        for j, v in enumerate([ins.figure, ins.title, ins.body, ins.action], start=1):
            c = wi.cell(row=i, column=j, value=v)
            c.alignment = Alignment(wrap_text=True, vertical="top")
            c.font = Font(name=FONT, bold=(j <= 2), color=RED if v.startswith("-") and j == 1 else INK)
        wi.cell(row=i, column=1).fill = PatternFill("solid", fgColor=HIGHLIGHT)
        wi.row_dimensions[i].height = 48
    _widths(wi, {"A": 12, "B": 30, "C": 60, "D": 55})

    # ---------- سجل التنضيف
    wl = wb.create_sheet("سجل التنضيف", 6)
    _title(wl, "سجل التنضيف", f"{report['raw_rows']:,} صف خام ← {report['clean_rows']:,} صف نظيف")
    _head(wl, 4, ["المشكلة", "عدد الصفوف", "مثال قبل", "بعد"])
    i = 5
    for s in report["steps"]:
        ex = s["examples"][:1] or [("", "")]
        for j, v in enumerate([s["title"], s["rows"], ex[0][0], ex[0][1]], start=1):
            c = wl.cell(row=i, column=j, value=v)
            c.alignment = Alignment(wrap_text=True, vertical="top")
            c.border = BOX
        i += 1
    _widths(wl, {"A": 62, "B": 12, "C": 26, "D": 22})

    for sh in wb.worksheets[:-1]:  # every summary sheet prints on one landscape page
        sh.page_setup.orientation = "landscape"
        sh.page_setup.paperSize = sh.PAPERSIZE_A4
        sh.sheet_properties.pageSetUpPr.fitToPage = True
        sh.page_setup.fitToWidth = 1
        sh.page_setup.fitToHeight = 1
    wb.calculation.fullCalcOnLoad = True  # Excel computes the live sheet when the file opens
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
    return path


def expected_kpis(df: pd.DataFrame) -> dict:
    """What the live sheet must show for 'الكل' (used by the tests after a LibreOffice recalculation)."""
    return kpis(df)
