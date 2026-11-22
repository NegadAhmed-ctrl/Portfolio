// Pure lead validation + WhatsApp message builder (no DOM, unit-tested).
import { toAsciiDigits, formatPrice } from "./filters.js";

export const VIEWING_TIMES = {
  today: "النهارده",
  tomorrow: "بكرة",
  weekend: "الجمعة أو السبت",
  any: "أي وقت يناسبكم",
};
export const CONTACT_WAYS = { whatsapp: "واتساب", call: "مكالمة" };

/**
 * Egyptian mobile in any common form -> "01XXXXXXXXX", or null.
 * Accepts Arabic digits, spaces/dashes, +20 / 0020 / 20 prefixes.
 */
export function normalizeEgyptianMobile(input) {
  let d = toAsciiDigits(input).replace(/[\s\-().]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("20") && d.length === 12) d = "0" + d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01[0125]\d{8}$/.test(d) ? d : null;
}

/** Returns { ok, errors: {field: message}, value } with cleaned values. */
export function validateLead(input) {
  const errors = {};
  const name = String(input.name ?? "").replace(/\s+/g, " ").trim();
  const phone = normalizeEgyptianMobile(input.phone ?? "");
  const contact = input.contact in CONTACT_WAYS ? input.contact : "whatsapp";
  const when = input.when in VIEWING_TIMES ? input.when : null;
  const message = String(input.message ?? "").trim().slice(0, 500);

  if (name.length < 2) errors.name = "اكتب اسمك عشان نعرف نكلّم مين.";
  else if (name.length > 60) errors.name = "الاسم طويل، اكتبه في أقل من ٦٠ حرف.";
  else if (/\d/.test(toAsciiDigits(name))) errors.name = "الاسم من غير أرقام.";

  if (!String(input.phone ?? "").trim()) errors.phone = "اكتب رقم موبايلك.";
  else if (!phone) errors.phone = "الرقم ده مش رقم موبايل مصري. مثال: 01001234567";

  if (input.needsWhen && !when) errors.when = "اختار إمتى يناسبك تعاين.";

  // Honeypot: real people never see this field.
  const spam = Boolean(String(input.website ?? "").trim());

  return {
    ok: Object.keys(errors).length === 0 && !spam,
    spam,
    errors,
    value: { name, phone, contact, when, message, unitId: input.unitId ?? null },
  };
}

/** The message the customer sends from the WhatsApp button (unit code first, so the office finds it fast). */
export function buildWhatsAppText(unit, { url, areaName, typeName, lead } = {}) {
  const lines = [
    `السلام عليكم، بسأل على ${typeName ? typeName(unit.type) : "وحدة"} ${unit.purpose === "rent" ? "للإيجار" : "للبيع"} كود ${unit.id}`,
    `${areaName ? areaName(unit.area) : unit.area} · ${unit.size} متر · دور ${unit.floor} · ${formatPrice(unit)}`,
  ];
  if (lead?.when) lines.push(`عايز أعاين: ${VIEWING_TIMES[lead.when]}`);
  if (lead?.name) lines.push(`الاسم: ${lead.name}`);
  if (lead?.message) lines.push(lead.message);
  if (url) lines.push(url);
  return lines.join("\n");
}

export function whatsappUrl(number, text) {
  return `https://wa.me/${String(number).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** Short reference the customer can quote on the phone, e.g. "LR0412-7Q3" (unit code + 3 characters). */
export function leadReference(unitId, now = Date.now()) {
  const tail = (now % 46656).toString(36).toUpperCase().padStart(3, "0");
  return `${String(unitId ?? "GEN").replace(/[^A-Z0-9]/gi, "")}-${tail}`;
}
