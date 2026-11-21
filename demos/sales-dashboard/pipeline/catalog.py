"""The business the sample data describes, and the vocabulary the cleaner maps to.

"حلواني الفيروز" is a fictional 3-branch pastry shop in Alexandria. Everything here is
what a real client would hand over in the first call: branches, channels, the price
list, and the names their cashiers actually type.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

SHOP_NAME = "حلواني الفيروز"
PERIOD_START = date(2025, 11, 1)
PERIOD_END = date(2026, 10, 31)

# canonical branch -> invoice prefix
BRANCHES = {"سموحة": "SM", "ميامي": "MI", "رشدي": "RO"}
CHANNELS = ("في الفرع", "طلبات", "تليفون وواتساب")

CATEGORIES = ("شرقي", "تورت وجاتوه", "مخبوزات وبيتي فور", "كحك ومواسم", "مشروبات", "آيس كريم")


@dataclass(frozen=True)
class Product:
    code: str
    name: str
    category: str
    unit: str  # "كيلو" | "قطعة" | "علبة" | "كوب" | "تورتة"
    price: float  # EGP per unit (may change, see PRICE_CHANGES)


PRODUCTS = (
    Product("KN1", "كنافة بالقشطة", "شرقي", "كيلو", 380),
    Product("BS1", "بسبوسة بالقشطة", "شرقي", "كيلو", 260),
    Product("QT1", "قطايف", "شرقي", "كيلو", 140),
    Product("BQ1", "بقلاوة مشكلة", "شرقي", "كيلو", 520),
    Product("OA1", "أم علي", "شرقي", "طبق", 75),
    Product("CK1", "تورتة بلاك فورست", "تورت وجاتوه", "تورتة", 650),
    Product("CK2", "تورتة شوكولاتة", "تورت وجاتوه", "تورتة", 720),
    Product("CK3", "تورتة فواكه", "تورت وجاتوه", "تورتة", 680),
    Product("GT1", "قطعة جاتوه", "تورت وجاتوه", "قطعة", 55),
    Product("CH1", "تشيز كيك", "تورت وجاتوه", "قطعة", 85),
    Product("PF1", "بيتي فور", "مخبوزات وبيتي فور", "كيلو", 420),
    Product("GR1", "غريبة", "مخبوزات وبيتي فور", "كيلو", 320),
    Product("CR1", "كرواسون", "مخبوزات وبيتي فور", "قطعة", 35),
    Product("KK1", "كحك سادة", "كحك ومواسم", "كيلو", 300),
    Product("KK2", "كحك بالعجوة", "كحك ومواسم", "كيلو", 330),
    Product("HM1", "علبة حلاوة المولد", "كحك ومواسم", "علبة", 280),
    Product("TC1", "قهوة تركي", "مشروبات", "كوب", 45),
    Product("SH1", "سحلب", "مشروبات", "كوب", 50),
    Product("MJ1", "عصير مانجا", "مشروبات", "كوب", 60),
    Product("IC1", "آيس كريم (بولة)", "آيس كريم", "قطعة", 30),
)
PRODUCT_BY_CODE = {p.code: p for p in PRODUCTS}
PRODUCT_BY_NAME = {p.name: p for p in PRODUCTS}

# (code, from date, new price): the Black Forest price rise is part of the story the
# insights have to find on their own.
PRICE_CHANGES = (("CK1", date(2026, 7, 1), 780),)


def price_on(code: str, day: date) -> float:
    price = PRODUCT_BY_CODE[code].price
    for c, since, new in PRICE_CHANGES:
        if c == code and day >= since:
            price = new
    return price


# Calendar of the year (Egypt, 2025/26). Dates are the public expected dates.
RAMADAN = (date(2026, 2, 18), date(2026, 3, 19))
EID_FITR = (date(2026, 3, 20), date(2026, 3, 22))
EID_ADHA = (date(2026, 5, 26), date(2026, 5, 29))
MAWLID = date(2026, 8, 25)
EVENTS = (
    ("رمضان", RAMADAN[0], RAMADAN[1]),
    ("عيد الفطر", EID_FITR[0], EID_FITR[1]),
    ("عيد الأضحى", EID_ADHA[0], EID_ADHA[1]),
    ("المولد", date(2026, 8, 10), MAWLID),
)

# --- what the cleaner maps from (names as typed in the POS, the Talabat export and the
# phone-orders notebook). Keys are compared after normalize_ar().
BRANCH_ALIASES = {
    "سموحة": "سموحة", "سموحه": "سموحة", "فرع سموحة": "سموحة", "smouha": "سموحة", "smoha": "سموحة",
    "ميامي": "ميامي", "ميامى": "ميامي", "فرع ميامي": "ميامي", "miami": "ميامي",
    "رشدي": "رشدي", "رشدى": "رشدي", "فرع رشدي": "رشدي", "roshdy": "رشدي", "rushdy": "رشدي",
}
CHANNEL_ALIASES = {
    "في الفرع": "في الفرع", "فرع": "في الفرع", "كاشير": "في الفرع", "in-store": "في الفرع", "pos": "في الفرع",
    "طلبات": "طلبات", "talabat": "طلبات", "talabat app": "طلبات",
    "تليفون": "تليفون وواتساب", "واتساب": "تليفون وواتساب", "تليفون وواتساب": "تليفون وواتساب",
    "phone": "تليفون وواتساب", "whatsapp": "تليفون وواتساب",
}
PRODUCT_ALIASES = {
    # common spellings / English names / typos seen in the exports
    "كنافه بالقشطه": "كنافة بالقشطة", "كنافة قشطة": "كنافة بالقشطة", "konafa cream": "كنافة بالقشطة",
    "بسبوسه بالقشطه": "بسبوسة بالقشطة", "بسبوسة قشطة": "بسبوسة بالقشطة", "basbousa": "بسبوسة بالقشطة",
    "قطايف": "قطايف", "qatayef": "قطايف",
    "بقلاوه مشكله": "بقلاوة مشكلة", "بقلاوة": "بقلاوة مشكلة", "baklava mix": "بقلاوة مشكلة",
    "ام علي": "أم علي", "om ali": "أم علي",
    "تورته بلاك فورست": "تورتة بلاك فورست", "بلاك فورست": "تورتة بلاك فورست", "black forest cake": "تورتة بلاك فورست",
    "تورته شوكولاته": "تورتة شوكولاتة", "تورتة شيكولاتة": "تورتة شوكولاتة", "chocolate cake": "تورتة شوكولاتة",
    "تورته فواكه": "تورتة فواكه", "fruit cake": "تورتة فواكه",
    "جاتوه": "قطعة جاتوه", "قطعه جاتوه": "قطعة جاتوه", "gateau": "قطعة جاتوه",
    "تشيز كيك": "تشيز كيك", "cheesecake": "تشيز كيك",
    "بيتي فور": "بيتي فور", "بيتيفور": "بيتي فور", "petit four": "بيتي فور",
    "غريبه": "غريبة", "ghorayeba": "غريبة",
    "كرواسون": "كرواسون", "كرواسان": "كرواسون", "croissant": "كرواسون",
    "كحك": "كحك سادة", "كحك ساده": "كحك سادة", "kahk": "كحك سادة",
    "كحك عجوه": "كحك بالعجوة", "كحك بالعجوه": "كحك بالعجوة", "kahk dates": "كحك بالعجوة",
    "حلاوه المولد": "علبة حلاوة المولد", "علبه حلاوه المولد": "علبة حلاوة المولد", "mawlid box": "علبة حلاوة المولد",
    "قهوه تركي": "قهوة تركي", "turkish coffee": "قهوة تركي",
    "سحلب": "سحلب", "sahlab": "سحلب",
    "عصير مانجا": "عصير مانجا", "مانجا": "عصير مانجا", "mango juice": "عصير مانجا",
    "ايس كريم": "آيس كريم (بولة)", "ايس كريم بوله": "آيس كريم (بولة)", "ice cream": "آيس كريم (بولة)",
}
TEST_PRODUCT_NAMES = {"تجربة", "تجربه", "test", "صنف تجربة"}
