"""Everything the laundry owner changes: services, prices, pickup slots, fees.

Fictional business for the demo: "مغسلة ومكوجي الندى" (Smouha, Alexandria).
Prices are per piece, in Egyptian pounds.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Service:
    id: str
    name: str
    price: int  # EGP per piece
    days: int  # turnaround in days after pickup


@dataclass(frozen=True)
class Slot:
    id: str
    label: str  # shown to the customer
    start_hour: int  # 24h, used to hide slots that already started today


@dataclass(frozen=True)
class Catalog:
    business_name: str
    area: str
    services: tuple[Service, ...]
    slots: tuple[Slot, ...]
    slot_capacity: int  # max pickups per slot per day (one driver)
    days_ahead: int  # how many days customers can book
    min_pieces: int
    max_pieces: int
    delivery_fee: int
    free_delivery_from: int  # order subtotal that makes delivery free
    closed_weekday: int | None  # 0 = Monday … 6 = Sunday; None = open daily

    def service(self, service_id: str) -> Service | None:
        return next((s for s in self.services if s.id == service_id), None)

    def slot(self, slot_id: str) -> Slot | None:
        return next((s for s in self.slots if s.id == slot_id), None)


DEFAULT_CATALOG = Catalog(
    business_name="مغسلة ومكوجي الندى",
    area="سموحة، إسكندرية",
    services=(
        Service("wash_iron", "غسيل وكي", 25, 2),
        Service("iron", "كي بس", 10, 1),
        Service("dry_clean", "دراي كلين (بدل وفساتين)", 70, 3),
        Service("blanket", "بطاطين ولحف", 90, 3),
    ),
    slots=(
        Slot("morning", "10 الصبح لـ 1 الضهر", 10),
        Slot("afternoon", "1 لـ 4 العصر", 13),
        Slot("evening", "6 لـ 9 بالليل", 18),
    ),
    slot_capacity=4,
    days_ahead=3,
    min_pieces=1,
    max_pieces=60,
    delivery_fee=20,
    free_delivery_from=150,
    closed_weekday=4,  # Friday
)
