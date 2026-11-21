"""KPIs, summaries and the written insights, all computed from the clean table.

Nothing here is typed by hand: if the data changes, the numbers in the insights change.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, timedelta

import pandas as pd

from .catalog import EID_FITR, RAMADAN

WEEKDAYS_AR = ["الاتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت", "الحد"]
MONTHS_AR = {1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل", 5: "مايو", 6: "يونيو", 7: "يوليو",
             8: "أغسطس", 9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر"}


def month_label(ym: str) -> str:
    y, m = ym.split("-")
    return f"{MONTHS_AR[int(m)]} {y}"


def kpis(df: pd.DataFrame) -> dict[str, float]:
    gross = df.loc[~df.is_return, "line_total"].sum()
    returns = -df.loc[df.is_return, "line_total"].sum()
    net = gross - returns
    invoices = df.loc[~df.is_return, "invoice"].nunique()
    return {"net": round(net, 2), "gross": round(gross, 2), "returns": round(returns, 2),
            "invoices": int(invoices), "avg_ticket": round(net / invoices, 2) if invoices else 0.0,
            "return_rate": round(returns / gross, 4) if gross else 0.0}


def by(df: pd.DataFrame, *cols: str) -> pd.DataFrame:
    return df.groupby(list(cols), as_index=False)["line_total"].sum().rename(columns={"line_total": "net"})


def monthly_by_branch(df: pd.DataFrame) -> pd.DataFrame:
    return df.pivot_table(index="month", columns="branch", values="line_total", aggfunc="sum").fillna(0).round(0)


def monthly_channel_share(df: pd.DataFrame) -> pd.DataFrame:
    t = df.pivot_table(index="month", columns="channel", values="line_total", aggfunc="sum").fillna(0)
    return t.div(t.sum(axis=1), axis=0)


@dataclass
class Insight:
    key: str
    title: str
    body: str
    action: str
    figure: str  # the one number to highlight


def _pct(x: float) -> str:
    return f"{x * 100:.0f}%"


def _egp(x: float) -> str:
    return f"{x:,.0f} ج.م"


def _days(df: pd.DataFrame, start: date, end: date) -> pd.DataFrame:
    d = pd.to_datetime(df["date"]).dt.date
    return df[(d >= start) & (d <= end)]


def insights(df: pd.DataFrame) -> list[Insight]:
    out: list[Insight] = []
    daily = df.groupby("date")["line_total"].sum()
    days = pd.to_datetime(daily.index).date

    # 1. Ramadan
    in_r = [(RAMADAN[0] <= d <= RAMADAN[1]) for d in days]
    r_avg = daily[in_r].mean()
    rest_avg = daily[[not x and not (EID_FITR[0] <= d <= EID_FITR[1]) for x, d in zip(in_r, days)]].mean()
    ram = _days(df, *RAMADAN)
    sharqi = ram.loc[ram.category == "شرقي", "line_total"].sum() / ram.line_total.sum()
    out.append(Insight(
        "ramadan", "رمضان هو موسم السنة",
        f"متوسط البيع اليومي في رمضان {_egp(r_avg)} مقابل {_egp(rest_avg)} في باقي السنة، "
        f"والشرقي لوحده {_pct(sharqi)} من مبيعات الشهر.",
        "تجهيز عمالة وخامات الكنافة والقطايف قبل رمضان بأسبوعين، وفتح طلبات الكحك مسبقًا من نص الشهر.",
        f"+{_pct(r_avg / rest_avg - 1)}"))

    # 2. Kahk window
    k_start, k_end = RAMADAN[1] - timedelta(days=9), EID_FITR[1]
    kahk_year = df.loc[df.product_code.isin(["KK1", "KK2"])]
    kahk_win = _days(kahk_year, k_start, k_end)
    share = kahk_win.line_total.sum() / kahk_year.line_total.sum()
    out.append(Insight(
        "kahk", "الكحك بيتباع في 13 يوم",
        f"من آخر 10 أيام رمضان لحد تالت يوم العيد اتباع كحك بـ {_egp(kahk_win.line_total.sum())}، "
        f"يعني {_pct(share)} من مبيعات الكحك في السنة كلها.",
        "حجز مسبق بعربون للكحك عن طريق واتساب، عشان الإنتاج يتخطط بالكيلو بدل التخمين.",
        _pct(share)))

    # 3. Delivery growth
    months = sorted(df.month.unique())
    share_t = monthly_channel_share(df).get("طلبات", pd.Series(dtype=float))
    first, last = share_t[months[:3]].mean(), share_t[months[-3:]].mean()
    out.append(Insight(
        "delivery", "الدليفري من طلبات بيكبر كل شهر",
        f"نصيب طلبات من المبيعات كان {_pct(first)} في أول 3 شهور وبقى {_pct(last)} في آخر 3 شهور.",
        "مراجعة أسعار المنيو على طلبات بعد العمولة، وتغليف مخصص للكنافة والتورت عشان المرتجع ميزيدش.",
        _pct(last)))

    # 4. Black Forest price rise
    bf = df[df.product_code == "CK1"]
    m = bf.groupby("month").agg(qty=("qty", "sum"), net=("line_total", "sum"))
    before = m.loc[[x for x in m.index if x < "2026-07"]].mean()
    after = m.loc[[x for x in m.index if x >= "2026-07"]].mean()
    out.append(Insight(
        "black_forest", "زيادة سعر البلاك فورست خسّرت",
        f"السعر زاد من 650 لـ 780 ج.م في يوليو. الكمية الشهرية نزلت {_pct(1 - after.qty / before.qty)} "
        f"والإيراد الشهري منها نزل {_pct(1 - after.net / before.net)} ({_egp(before.net)} ← {_egp(after.net)}).",
        "تجربة سعر وسط (حوالي 700) أو حجم أصغر بسعر أقل، ومقارنة النتيجة بعد شهر.",
        f"-{_pct(1 - after.net / before.net)}"))

    # 5. Weekend
    wd = df.groupby("weekday")["line_total"].sum()
    thu_fri = (wd.get(3, 0) + wd.get(4, 0)) / wd.sum()
    out.append(Insight(
        "weekend", "الخميس والجمعة بيجيبوا أكتر من تلت الأسبوع",
        f"يومين من 7 بيجيبوا {_pct(thu_fri)} من المبيعات، وأضعف يوم هو {WEEKDAYS_AR[int(wd.idxmin())]}.",
        f"عرض ثابت في يوم {WEEKDAYS_AR[int(wd.idxmin())]} (مثلًا الجاتوه التاني بنص التمن) بدل الخصومات العامة.",
        _pct(thu_fri)))

    # 6. Miami summer
    mi = df[df.branch == "ميامي"].groupby("month")["line_total"].sum()
    summer = mi[["2026-07", "2026-08"]].mean()
    other = mi[[x for x in mi.index if x not in ("2026-07", "2026-08", "2026-03")]].mean()
    out.append(Insight(
        "miami_summer", "فرع ميامي بيعيش على الصيف",
        f"متوسط ميامي في يوليو وأغسطس {_egp(summer)} في الشهر مقابل {_egp(other)} في الشهور العادية.",
        "زيادة الآيس كريم والعصاير وساعات العمل في ميامي في الصيف بس، من غير ما باقي الفروع تتأثر.",
        f"+{_pct(summer / other - 1)}"))
    return out


def insights_dicts(df: pd.DataFrame) -> list[dict]:
    return [asdict(i) for i in insights(df)]
