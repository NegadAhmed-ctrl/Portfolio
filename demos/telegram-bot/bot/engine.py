"""The conversation engine: Telegram-agnostic, pure Python, no network.

The aiogram adapter (telegram_adapter.py) turns Telegram updates into
`handle_*` calls and sends back the `Reply` objects. The browser demo runs
this exact file with Pyodide, and the tests drive it directly.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Callable

from .catalog import DEFAULT_CATALOG, Catalog
from .domain import (
    NEXT_STATUS,
    OPEN_STATUSES,
    Order,
    PickupOption,
    Status,
    clean_address,
    day_label,
    money,
    normalize_phone,
    order_code,
    parse_pieces,
    pickup_options,
    quote,
)
from .storage import OrderStore, StorageError, booked_slots, next_sequence

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Button:
    label: str
    data: str


@dataclass
class Reply:
    chat_id: int
    text: str
    buttons: list[list[Button]] = field(default_factory=list)
    ask_contact: bool = False  # show Telegram's "share my number" keyboard
    order: Order | None = None  # set on order cards (the demo draws them as a ticket)


@dataclass
class Draft:
    step: str = "service"
    service_id: str = ""
    pieces: int = 0
    pickup_key: str = ""
    address: str = ""
    phone: str = ""
    notes: str = ""


CUSTOMER_STATUS_TEXT = {
    Status.PICKED_UP: "استلمنا هدومك ({pieces} قطعة). هنبلغك أول ما تبقى جاهزة.",
    Status.IN_WASH: "طلبك {code} دخل الغسيل.",
    Status.READY: "طلبك {code} جاهز. المندوب هيكلمك قبل ما يوصل. الحساب {total}.",
    Status.DELIVERED: "اتسلّم طلبك {code}. شكراً إنك اخترت {business}.",
    Status.CANCELLED: "اتلغى طلبك {code}.",
}

NEXT_LABEL = {
    Status.PICKED_UP: "استلمنا الهدوم",
    Status.IN_WASH: "دخل الغسيل",
    Status.READY: "جاهز للتوصيل",
    Status.DELIVERED: "اتسلّم للعميل",
}


class LaundryBot:
    def __init__(
        self,
        store: OrderStore,
        catalog: Catalog = DEFAULT_CATALOG,
        admins: frozenset[int] = frozenset(),
        clock: Callable[[], datetime] = datetime.now,
    ) -> None:
        self.store = store
        self.catalog = catalog
        self.admins = admins
        self.clock = clock
        self.drafts: dict[int, Draft] = {}

    # ---------------------------------------------------------------- entry points

    def handle_text(self, user_id: int, name: str, text: str) -> list[Reply]:
        text = (text or "").strip()
        try:
            if text.startswith("/"):
                return self._command(user_id, name, text)
            draft = self.drafts.get(user_id)
            if draft:
                return self._draft_text(user_id, name, draft, text)
            return [self._menu(user_id, "مش فاهم الرسالة دي. اختار من القايمة:")]
        except StorageError:
            log.exception("storage failed while handling text from %s", user_id)
            return self._storage_down(user_id)

    def handle_button(self, user_id: int, name: str, data: str) -> list[Reply]:
        try:
            return self._button(user_id, name, data)
        except StorageError:
            log.exception("storage failed while handling button %s from %s", data, user_id)
            return self._storage_down(user_id)

    def handle_contact(self, user_id: int, name: str, phone: str) -> list[Reply]:
        draft = self.drafts.get(user_id)
        if draft and draft.step == "phone":
            return self._draft_text(user_id, name, draft, phone)
        return [self._menu(user_id, "تمام، وصلني رقمك.")]

    # ---------------------------------------------------------------- commands

    def _command(self, user_id: int, name: str, text: str) -> list[Reply]:
        cmd, _, arg = text.partition(" ")
        cmd = cmd.lower().split("@")[0]
        if cmd in ("/start", "/menu"):
            self.drafts.pop(user_id, None)
            first = name.split()[0] if name.strip() else ""
            return [self._menu(user_id, (
                f"أهلاً {first}، معاك بوت {self.catalog.business_name} ({self.catalog.area}).\n"
                "بنستلم الهدوم من بيتك ونرجعهالك نضيفة ومكوية."
            ))]
        if cmd == "/new":
            return self._start_order(user_id)
        if cmd == "/myorders":
            return self._my_orders(user_id)
        if cmd == "/prices":
            return [self._prices(user_id)]
        if cmd == "/cancel":
            had = self.drafts.pop(user_id, None)
            return [self._menu(user_id, "لغيت الطلب اللي كنت بتكتبه." if had else "مفيش طلب مفتوح دلوقتي.")]
        if cmd == "/help":
            return [self._help(user_id)]
        if cmd in ("/today", "/order", "/stats", "/admin"):
            if user_id not in self.admins:
                return [Reply(user_id, "الأمر ده لإدارة المغسلة بس.")]
            return self._admin_command(user_id, cmd, arg.strip())
        return [self._help(user_id)]

    # ---------------------------------------------------------------- buttons

    def _button(self, user_id: int, name: str, data: str) -> list[Reply]:
        kind, _, value = data.partition(":")
        if kind == "menu":
            return {
                "new": lambda: self._start_order(user_id),
                "mine": lambda: self._my_orders(user_id),
                "prices": lambda: [self._prices(user_id)],
                "help": lambda: [self._help(user_id)],
            }.get(value, lambda: [self._menu(user_id, "اختار من القايمة:")])()
        if kind == "adm":
            if user_id not in self.admins:
                return [Reply(user_id, "الزرار ده لإدارة المغسلة بس.")]
            action, _, code = value.partition(":")
            return self._admin_move(user_id, code, action)
        if kind == "mycancel":
            return self._customer_cancel(user_id, value)

        draft = self.drafts.get(user_id)
        if draft is None:
            return [self._menu(user_id, "الطلب ده خلص أو اتلغى. تبدأ طلب جديد؟")]
        if kind == "svc" and draft.step == "service":
            if not self.catalog.service(value):
                return [self._ask_service(user_id)]
            draft.service_id, draft.step = value, "pieces"
            return [self._ask_pieces(user_id, draft)]
        if kind == "qty" and draft.step == "pieces":
            return self._draft_text(user_id, name, draft, value)
        if kind == "slot" and draft.step == "slot":
            options = {o.key: o for o in self._options()}
            if value not in options:
                return [self._ask_slot(user_id, "الميعاد ده لسه اتحجز. اختار ميعاد تاني:")]
            draft.pickup_key, draft.step = value, "address"
            return [self._ask_address(user_id)]
        if kind == "addr" and value == "last" and draft.step == "address":
            last = self._last_order(user_id)
            if last:
                draft.address, draft.step = last.address, "phone"
                return [self._ask_phone(user_id)]
        if kind == "phone" and value == "last" and draft.step == "phone":
            last = self._last_order(user_id)
            if last:
                draft.phone, draft.step = last.phone, "notes"
                return [self._ask_notes(user_id)]
        if kind == "notes" and value == "skip" and draft.step == "notes":
            draft.notes, draft.step = "", "confirm"
            return [self._summary(user_id, draft)]
        if kind == "confirm" and draft.step == "confirm":
            if value == "yes":
                return self._place(user_id, name, draft)
            if value == "edit":
                self.drafts[user_id] = Draft()
                return [self._ask_service(user_id, "نبدأ من الأول. نوع الخدمة؟")]
            self.drafts.pop(user_id, None)
            return [self._menu(user_id, "تمام، لغيت الطلب.")]
        # A button from an older message: re-ask the current question.
        return [self._reask(user_id, draft)]

    # ---------------------------------------------------------------- order flow

    def _start_order(self, user_id: int) -> list[Reply]:
        if not self._options():
            return [Reply(user_id, "كل مواعيد الاستلام في الأيام الجاية محجوزة. جرّب بكرة الصبح أو كلمنا على رقم المغسلة.")]
        self.drafts[user_id] = Draft()
        return [self._ask_service(user_id)]

    def _draft_text(self, user_id: int, name: str, draft: Draft, text: str) -> list[Reply]:
        if draft.step == "pieces":
            n = parse_pieces(text, self.catalog)
            if n is None:
                return [Reply(user_id, f"اكتب عدد القطع رقم من {self.catalog.min_pieces} لـ {self.catalog.max_pieces}، مثلاً 8.")]
            draft.pieces, draft.step = n, "slot"
            return [self._ask_slot(user_id)]
        if draft.step == "address":
            address = clean_address(text)
            if address is None:
                return [Reply(user_id, "العنوان قصير. اكتب الشارع ورقم العمارة والدور، مثلاً: 14 شارع فوزي معاذ، سموحة، الدور 3.")]
            draft.address, draft.step = address, "phone"
            return [self._ask_phone(user_id)]
        if draft.step == "phone":
            phone = normalize_phone(text)
            if phone is None:
                return [Reply(user_id, "الرقم ده مش رقم موبايل مصري. اكتبه كده: 01012345678", ask_contact=True)]
            draft.phone, draft.step = phone, "notes"
            return [self._ask_notes(user_id)]
        if draft.step == "notes":
            draft.notes, draft.step = text[:200], "confirm"
            return [self._summary(user_id, draft)]
        return [self._reask(user_id, draft)]

    def _place(self, user_id: int, name: str, draft: Draft) -> list[Reply]:
        options = {o.key: o for o in self._options()}
        option = options.get(draft.pickup_key)
        if option is None:  # someone took the last place while this customer was typing
            draft.step = "slot"
            return [self._ask_slot(user_id, "للأسف الميعاد اللي اخترته اتحجز قبلك بثواني. اختار ميعاد تاني:")]
        service = self.catalog.service(draft.service_id)
        assert service is not None
        now = self.clock()
        q = quote(service, draft.pieces, self.catalog)
        orders = self.store.all()
        order = Order(
            code=order_code(now.date(), next_sequence(orders, now.date())),
            created_at=now,
            customer_id=user_id,
            customer_name=name.strip() or "عميل",
            phone=draft.phone,
            service_id=service.id,
            service_name=service.name,
            pieces=draft.pieces,
            subtotal=q.subtotal,
            delivery=q.delivery,
            pickup_day=option.day,
            slot_id=option.slot.id,
            slot_label=option.slot.label,
            address=draft.address,
            notes=draft.notes,
            history=[(now, Status.NEW)],
        )
        self.store.add(order)  # StorageError → handled by the caller, draft kept
        self.drafts.pop(user_id, None)
        log.info("order %s placed by %s", order.code, user_id)
        replies = [Reply(
            user_id,
            f"اتسجل طلبك. رقمه {order.code}\n"
            f"المندوب هييجي {self._pickup_text(order)}.\n"
            f"الحساب {money(order.total)} بيتدفع كاش عند الاستلام.",
            buttons=[[Button("طلباتي", "menu:mine"), Button("طلب تاني", "menu:new")]],
            order=order,
        )]
        replies += [self._admin_card(a, order, "طلب جديد") for a in sorted(self.admins)]
        return replies

    # ---------------------------------------------------------------- questions

    def _ask_service(self, user_id: int, text: str = "عايز إيه؟") -> Reply:
        rows = [[Button(f"{s.name} · {s.price} ج للقطعة", f"svc:{s.id}")] for s in self.catalog.services]
        return Reply(user_id, text, rows)

    def _ask_pieces(self, user_id: int, draft: Draft) -> Reply:
        service = self.catalog.service(draft.service_id)
        nums = [3, 5, 8, 10, 15, 20]
        return Reply(
            user_id,
            f"{service.name}. كام قطعة تقريباً؟ اختار أو اكتب الرقم (العدد النهائي بيتأكد عند الاستلام).",
            [[Button(str(n), f"qty:{n}") for n in nums[:3]], [Button(str(n), f"qty:{n}") for n in nums[3:]]],
        )

    def _ask_slot(self, user_id: int, text: str = "إمتى المندوب يعدّي ياخد الهدوم؟") -> Reply:
        today = self.clock().date()
        rows = [[Button(f"{day_label(o.day, today)} · {o.slot.label}", f"slot:{o.key}")] for o in self._options()[:8]]
        if not rows:
            self.drafts.pop(user_id, None)
            return self._menu(user_id, "كل المواعيد اتحجزت. جرّب تاني بكرة.")
        return Reply(user_id, text, rows)

    def _ask_address(self, user_id: int) -> Reply:
        last = self._last_order(user_id)
        buttons = [[Button(f"نفس العنوان: {last.address[:28]}", "addr:last")]] if last else []
        return Reply(user_id, "اكتب العنوان بالتفصيل (الشارع، رقم العمارة، الدور، علامة مميزة).", buttons)

    def _ask_phone(self, user_id: int) -> Reply:
        last = self._last_order(user_id)
        buttons = [[Button(f"نفس الرقم: {last.phone}", "phone:last")]] if last else []
        return Reply(user_id, "رقم موبايل المندوب يكلمك عليه؟ اكتبه أو ابعت رقمك بالزرار.", buttons, ask_contact=True)

    def _ask_notes(self, user_id: int) -> Reply:
        return Reply(user_id, "فيه ملاحظات؟ (مثلاً: قميص أبيض لوحده، بقعة على البنطلون). لو مفيش دوس الزرار.",
                     [[Button("مفيش ملاحظات", "notes:skip")]])

    def _summary(self, user_id: int, draft: Draft) -> Reply:
        service = self.catalog.service(draft.service_id)
        q = quote(service, draft.pieces, self.catalog)
        option = next((o for o in self._options() if o.key == draft.pickup_key), None)
        when = f"{day_label(option.day, self.clock().date())} · {option.slot.label}" if option else "—"
        delivery = "مجاني" if q.delivery == 0 else money(q.delivery)
        lines = [
            "راجع طلبك:",
            f"{service.name} · {draft.pieces} قطعة · {money(q.subtotal)}",
            f"التوصيل: {delivery}",
            f"الإجمالي: {money(q.total)}",
            f"الاستلام: {when}",
            f"العنوان: {draft.address}",
            f"الموبايل: {draft.phone}",
        ]
        if draft.notes:
            lines.append(f"ملاحظات: {draft.notes}")
        if q.delivery:
            lines.append(f"(التوصيل مجاني لو الحساب {money(self.catalog.free_delivery_from)} أو أكتر)")
        return Reply(user_id, "\n".join(lines), [
            [Button("تأكيد الطلب", "confirm:yes")],
            [Button("تعديل", "confirm:edit"), Button("إلغاء", "confirm:cancel")],
        ])

    def _reask(self, user_id: int, draft: Draft) -> Reply:
        if draft.step == "service":
            return self._ask_service(user_id)
        if draft.step == "pieces":
            return self._ask_pieces(user_id, draft)
        if draft.step == "slot":
            return self._ask_slot(user_id)
        if draft.step == "address":
            return self._ask_address(user_id)
        if draft.step == "phone":
            return self._ask_phone(user_id)
        if draft.step == "notes":
            return self._ask_notes(user_id)
        return self._summary(user_id, draft)

    # ---------------------------------------------------------------- customer views

    def _menu(self, user_id: int, text: str) -> Reply:
        return Reply(user_id, text, [
            [Button("طلب استلام جديد", "menu:new")],
            [Button("طلباتي", "menu:mine"), Button("الأسعار", "menu:prices")],
        ])

    def _prices(self, user_id: int) -> Reply:
        lines = [f"{s.name}: {s.price} ج للقطعة (بتخلص في {s.days} يوم)" for s in self.catalog.services]
        lines.append(f"التوصيل {self.catalog.delivery_fee} ج، ومجاني من {self.catalog.free_delivery_from} ج.")
        return Reply(user_id, "\n".join(lines), [[Button("طلب استلام جديد", "menu:new")]])

    def _help(self, user_id: int) -> Reply:
        text = ("الأوامر:\n/new طلب استلام جديد\n/myorders طلباتي\n/prices الأسعار\n/cancel إلغاء الطلب اللي بتكتبه")
        if user_id in self.admins:
            text += "\n\nللإدارة:\n/today استلامات النهارده\n/order ND-2111-01 تفاصيل طلب\n/stats أرقام الأسبوع"
        return Reply(user_id, text)

    def _my_orders(self, user_id: int) -> list[Reply]:
        mine = sorted((o for o in self.store.all() if o.customer_id == user_id),
                      key=lambda o: o.created_at, reverse=True)[:5]
        if not mine:
            return [self._menu(user_id, "لسه معملتش طلبات. تحب نبدأ أول طلب؟")]
        lines = [f"{o.code} · {o.service_name} · {o.pieces} قطعة · {o.status.value}" for o in mine]
        cancellable = [o for o in mine if o.status == Status.NEW]
        buttons = [[Button(f"إلغاء {o.code}", f"mycancel:{o.code}")] for o in cancellable]
        return [Reply(user_id, "آخر طلباتك:\n" + "\n".join(lines), buttons)]

    def _customer_cancel(self, user_id: int, code: str) -> list[Reply]:
        order = self.store.get(code)
        if order is None or order.customer_id != user_id:
            return [Reply(user_id, "مش لاقي الطلب ده.")]
        if order.status != Status.NEW:
            return [Reply(user_id, f"الطلب {code} اتستلم خلاص ومينفعش يتلغي من البوت. كلم المغسلة.")]
        cancelled = order.advance(Status.CANCELLED, self.clock())
        self.store.update(cancelled)
        replies = [Reply(user_id, f"اتلغى الطلب {code}.")]
        replies += [Reply(a, f"العميل لغى الطلب {code} ({order.customer_name}).") for a in sorted(self.admins)]
        return replies

    # ---------------------------------------------------------------- admin

    def _admin_card(self, admin_id: int, order: Order, title: str) -> Reply:
        lines = [
            f"{title}: {order.code}",
            f"{order.customer_name} · {order.phone}",
            f"{order.service_name} · {order.pieces} قطعة · {money(order.total)}",
            f"الاستلام: {self._pickup_text(order)}",
            f"العنوان: {order.address}",
        ]
        if order.notes:
            lines.append(f"ملاحظات: {order.notes}")
        lines.append(f"الحالة: {order.status.value}")
        buttons: list[list[Button]] = []
        nxt = NEXT_STATUS.get(order.status)
        if nxt:
            row = [Button(NEXT_LABEL[nxt], f"adm:next:{order.code}")]
            if order.status == Status.NEW:
                row.append(Button("إلغاء", f"adm:cancel:{order.code}"))
            buttons.append(row)
        return Reply(admin_id, "\n".join(lines), buttons, order=order)

    def _admin_move(self, admin_id: int, code: str, action: str) -> list[Reply]:
        order = self.store.get(code)
        if order is None:
            return [Reply(admin_id, f"مفيش طلب بالكود {code}.")]
        target = Status.CANCELLED if action == "cancel" else NEXT_STATUS.get(order.status)
        if target is None:
            return [Reply(admin_id, f"الطلب {code} حالته {order.status.value}، مفيش خطوة بعدها.")]
        try:
            moved = order.advance(target, self.clock())
        except ValueError:
            return [Reply(admin_id, f"الطلب {code} اتغيرت حالته لـ {order.status.value} من شوية.")]
        self.store.update(moved)
        log.info("order %s: %s -> %s by %s", code, order.status.value, target.value, admin_id)
        note = CUSTOMER_STATUS_TEXT[target].format(
            code=code, pieces=moved.pieces, total=money(moved.total), business=self.catalog.business_name)
        return [
            self._admin_card(admin_id, moved, "اتحدث"),
            Reply(moved.customer_id, note, order=moved),
        ]

    def _admin_command(self, admin_id: int, cmd: str, arg: str) -> list[Reply]:
        if cmd == "/admin":
            return [self._help(admin_id)]
        if cmd == "/order":
            order = self.store.get(arg) if arg else None
            if order is None:
                return [Reply(admin_id, "اكتب الكود كده: /order ND-2111-01")]
            return [self._admin_card(admin_id, order, "طلب")]
        orders = self.store.all()
        today = self.clock().date()
        if cmd == "/today":
            todays = [o for o in orders if o.pickup_day == today and o.status != Status.CANCELLED]
            if not todays:
                return [Reply(admin_id, "مفيش استلامات النهارده.")]
            lines = [f"استلامات النهارده ({len(todays)}):"]
            for slot in self.catalog.slots:
                group = [o for o in todays if o.slot_id == slot.id]
                if group:
                    lines.append(f"\n{slot.label}")
                    lines += [f"{o.code} · {o.customer_name} · {o.pieces} قطعة · {o.status.value}\n{o.address}"
                              for o in group]
            return [Reply(admin_id, "\n".join(lines))]
        # /stats: last 7 days
        week = [o for o in orders if o.created_at.date() > today - timedelta(days=7)]
        live = [o for o in week if o.status != Status.CANCELLED]
        open_now = [o for o in orders if o.status in OPEN_STATUSES]
        by_service: dict[str, int] = {}
        for o in live:
            by_service[o.service_name] = by_service.get(o.service_name, 0) + o.pieces
        top = max(by_service, key=by_service.get) if by_service else "—"
        return [Reply(admin_id, (
            f"آخر 7 أيام: {len(live)} طلب، {sum(o.pieces for o in live)} قطعة، {money(sum(o.total for o in live))}\n"
            f"ملغي: {len(week) - len(live)}\n"
            f"مفتوح دلوقتي: {len(open_now)}\n"
            f"أكتر خدمة: {top}"
        ))]

    # ---------------------------------------------------------------- helpers

    def _options(self) -> list[PickupOption]:
        return pickup_options(self.clock(), self.catalog, booked_slots(self.store.all()))

    def _last_order(self, user_id: int) -> Order | None:
        mine = [o for o in self.store.all() if o.customer_id == user_id]
        return max(mine, key=lambda o: o.created_at) if mine else None

    def _pickup_text(self, order: Order) -> str:
        return f"{day_label(order.pickup_day, self.clock().date())} من {order.slot_label}"

    def _storage_down(self, user_id: int) -> list[Reply]:
        replies = [Reply(user_id, "حصلت مشكلة في حفظ الطلب ومتسجلش. دوس تأكيد تاني بعد دقيقة، ولو اتكررت كلمنا.",
                         [[Button("تأكيد الطلب", "confirm:yes")]] if self.drafts.get(user_id) else [])]
        replies += [Reply(a, "تنبيه: الشيت مش بيرد، فيه طلب مستني الحفظ. راجع الاتصال أو صلاحيات الشيت.")
                    for a in sorted(self.admins)]
        return replies
