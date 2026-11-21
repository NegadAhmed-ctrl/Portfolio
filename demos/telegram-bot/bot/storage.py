"""Order storage behind one small interface.

`MemoryStore` runs the demo and the tests. `SheetsStore` (sheets.py) writes the
same rows to the owner's Google Sheet. The bot never knows which one it has.
"""
from __future__ import annotations

from datetime import date
from typing import Iterable, Protocol

from .domain import OPEN_STATUSES, Order


class StorageError(RuntimeError):
    """Raised when the backing store can't save or read (network, quota, permissions)."""


class OrderStore(Protocol):
    def add(self, order: Order) -> None: ...
    def update(self, order: Order) -> None: ...
    def get(self, code: str) -> Order | None: ...
    def all(self) -> list[Order]: ...


def next_sequence(orders: Iterable[Order], day: date) -> int:
    return 1 + sum(1 for o in orders if o.created_at.date() == day)


def booked_slots(orders: Iterable[Order]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for o in orders:
        if o.status in OPEN_STATUSES:
            counts[o.pickup_key] = counts.get(o.pickup_key, 0) + 1
    return counts


class MemoryStore:
    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}
        self.fail_next = False  # tests / demo: simulate an outage

    def _check(self) -> None:
        if self.fail_next:
            self.fail_next = False
            raise StorageError("simulated outage")

    def add(self, order: Order) -> None:
        self._check()
        if order.code in self._orders:
            raise StorageError(f"duplicate code {order.code}")
        self._orders[order.code] = order

    def update(self, order: Order) -> None:
        self._check()
        if order.code not in self._orders:
            raise StorageError(f"unknown order {order.code}")
        self._orders[order.code] = order

    def get(self, code: str) -> Order | None:
        return self._orders.get(code.strip().upper())

    def all(self) -> list[Order]:
        return list(self._orders.values())
