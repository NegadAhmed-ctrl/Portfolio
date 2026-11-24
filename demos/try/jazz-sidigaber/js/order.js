// Pure order logic: validation and the WhatsApp message. No DOM.

const EG_MOBILE = /^01[0125]\d{8}$/;

export const ORDER_TYPES = {
  table: "في الكافيه",
  pickup: "استلام",
  delivery: "توصيل",
};

/** Normalises Arabic-Indic digits and strips spaces/dashes so "٠١٠ ١٢٣" validates. */
export function normalizeDigits(value = "") {
  return value
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\s-]/g, "");
}

export function validateOrder(form, { orderType, subtotal, minDeliveryOrder, formatMoney }) {
  const errors = {};
  const table = normalizeDigits(form.table);
  const phone = normalizeDigits(form.phone);

  if (subtotal <= 0) errors.cart = "السلة فاضية";
  if (orderType === "table" && !/^\d{1,3}$/.test(table)) errors.table = "اكتب رقم الترابيزة";
  if (orderType !== "table") {
    if ((form.name || "").trim().length < 2) errors.name = "اكتب اسمك";
    if (!EG_MOBILE.test(phone)) errors.phone = "رقم موبايل مصري صحيح (11 رقم يبدأ بـ 01)";
  }
  if (orderType === "delivery") {
    if ((form.address || "").trim().length < 8) errors.address = "اكتب العنوان بالتفصيل";
    else if (subtotal < minDeliveryOrder) errors.address = `أقل طلب للتوصيل ${formatMoney(minDeliveryOrder)}`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function buildMessage({ shopName, orderType, form, lines, totals, formatMoney }) {
  const out = [`طلب جديد من ${shopName}`, `نوع الطلب: ${ORDER_TYPES[orderType]}`];
  if (orderType === "table") out.push(`ترابيزة رقم: ${normalizeDigits(form.table)}`);
  else out.push(`الاسم: ${form.name.trim()}`, `الموبايل: ${normalizeDigits(form.phone)}`);
  if (orderType === "delivery") out.push(`العنوان: ${form.address.trim()}`);

  out.push("", ...lines.map((l) => `• ${l.qty} × ${l.label} = ${formatMoney(l.total)}`), "");
  out.push(`المجموع: ${formatMoney(totals.subtotal)}`);
  if (totals.delivery) out.push(`التوصيل: ${formatMoney(totals.delivery)}`);
  out.push(`الإجمالي: ${formatMoney(totals.grand)}`);
  if ((form.notes || "").trim()) out.push("", `ملاحظات: ${form.notes.trim()}`);
  return out.join("\n");
}

export const whatsappUrl = (number, message) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
