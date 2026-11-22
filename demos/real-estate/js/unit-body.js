// The unit page body, rendered at build time (so search engines and no-JS visitors get everything).
import { CONFIG } from "./config.js";
import { UNITS, areaName, typeName } from "./units.js";
import { formatPrice, formatNumber, pricePerMeter } from "./filters.js";
import { buildWhatsAppText, whatsappUrl, VIEWING_TIMES } from "./lead.js";
import { elevation, floorPlan, unitFloors } from "./drawings.js";
import { esc, unitTitle, floorText, specsRows, renderCard, unitUrl, drawingFigure } from "./render.js";

const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export function arabicDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${formatNumber(d)} ${months[m - 1]}`;
}

/** Same purpose, then same area or a price within 25%, closest price first. */
export function similarUnits(unit, all = UNITS, n = 3) {
  return all
    .filter((u) => u.id !== unit.id && u.purpose === unit.purpose)
    .map((u) => ({ u, score: (u.area === unit.area ? 0 : 1) + Math.abs(u.price - unit.price) / unit.price }))
    .filter(({ u, score }) => u.area === unit.area || score <= 1.25)
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map(({ u }) => u);
}

export function unitBody(u) {
  const base = "../../";
  const ev = elevation(u);
  const ppm = pricePerMeter(u);
  const url = CONFIG.siteUrl + unitUrl(u);
  const wa = whatsappUrl(CONFIG.whatsapp, buildWhatsAppText(u, { areaName, typeName, url }));
  const similar = similarUnits(u);
  const whenChips = Object.entries(VIEWING_TIMES)
    .map(([k, v]) => `<label class="chip"><input type="radio" name="when" value="${k}"><span>${v}</span></label>`)
    .join("");

  return `<nav class="crumbs" aria-label="أنت هنا"><a href="${base}">الوحدات</a><span aria-hidden="true">/</span><a href="${base}?a=${u.area}${u.purpose === "rent" ? "&p=rent" : ""}#units">${esc(areaName(u.area))}</a><span aria-hidden="true">/</span><span class="code" aria-current="page">${esc(u.id)}</span></nav>

<div class="unit-top">
  <div>
    <p class="unit-meta"><span class="banner-mini banner-${u.purpose}">${u.purpose === "rent" ? "للإيجار" : "للبيع"}</span> نزلت عندنا ${arabicDate(u.listed)} · مع أ. ${esc(u.agent)}</p>
    <h1>${esc(unitTitle(u))}</h1>
    <p class="unit-street">${esc(u.street)}، ${esc(areaName(u.area))}</p>
  </div>
  <p class="unit-price"><strong>${esc(formatPrice(u))}</strong>${ppm ? `<small>${formatNumber(ppm)} ج.م للمتر</small>` : ""}<small>${esc(u.payment)}</small></p>
</div>

<div class="unit-body">
  <section class="drawing-sheet plan-sheet" aria-labelledby="plan-title">
    <h2 id="plan-title" class="sr">تقسيم الشقة</h2>
    ${floorPlan(u)}
    <dl class="tb-strip">
      <div><dt>اللوحة</dt><dd>تقسيم الشقة</dd></div>
      <div><dt>المساحة</dt><dd>${formatNumber(u.size)} م² إجمالي</dd></div>
      <div><dt>الاتجاه</dt><dd>${esc(u.facing)}</dd></div>
      <div><dt>الكود</dt><dd class="code">${esc(u.id)}</dd></div>
    </dl>
  </section>

  <aside class="unit-side" aria-label="التفاصيل والتواصل">
    <dl class="specs">${specsRows(u).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    <p class="unit-note">${esc(u.note)}</p>
    <div class="contact-btns">
      <a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener" data-track="whatsapp_click">اسأل على واتساب بالكود</a>
      <a class="btn btn-line" href="tel:+${CONFIG.whatsapp}" data-track="call_click">كلّم المكتب</a>
    </div>

    <form class="lead lead-viewing" id="viewing-form" novalidate data-kind="viewing">
      <h2 class="lead-title">احجز معاينة</h2>
      <fieldset class="chips"><legend>إمتى يناسبك</legend>${whenChips}</fieldset>
      <label class="field"><span>اسمك</span><input name="name" autocomplete="name" required></label>
      <label class="field"><span>موبايلك</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="010 1234 5678" required></label>
      <fieldset class="chips"><legend>نكلمك إزاي</legend><label class="chip"><input type="radio" name="contact" value="whatsapp" checked><span>واتساب</span></label><label class="chip"><input type="radio" name="contact" value="call"><span>مكالمة</span></label></fieldset>
      <label class="field"><span>سؤال أو ملاحظة <em>(اختياري)</em></span><textarea name="message" rows="2"></textarea></label>
      <label class="hp" aria-hidden="true">سيب الخانة دي فاضية<input name="website" tabindex="-1" autocomplete="off"></label>
      <button class="btn btn-red" type="submit">احجز المعاينة</button>
      <p class="form-note">في الديمو الطلب بيتحفظ في المتصفح ده بس.</p>
    </form>
  </aside>

  <section class="drawing-sheet elev-sheet" aria-labelledby="elev-title">
    <h2 id="elev-title" class="sr">واجهة العمارة</h2>
    <div class="elev-wrap">${drawingFigure(u, base, { lazy: false })}</div>
    <dl class="tb-strip">
      <div><dt>اللوحة</dt><dd>الواجهة</dd></div>
      <div><dt>الدور</dt><dd>${esc(floorText(u))}</dd></div>
      <div><dt>أسانسير</dt><dd>${u.elevator ? "أيوه" : "لأ"}</dd></div>
    </dl>
  </section>
</div>

${similar.length ? `<section class="similar" aria-labelledby="sim-title"><h2 id="sim-title">وحدات قريبة منها</h2><div class="grid grid-3">${similar.map((s) => renderCard(s, base)).join("")}</div></section>` : ""}`;
}

export function unitDescription(u) {
  return `${unitTitle(u)}، ${u.street}. ${formatNumber(u.size)} م²، الدور ${floorText(u)}، ${u.facing}. ${formatPrice(u)}. ${u.note}`.slice(0, 300);
}
export { unitFloors };
