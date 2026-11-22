// HTML string builders shared by the browser and the build script (prerendered pages for SEO).
import { areaName, typeName, FINISHING, VIEWS } from "./units.js";
import { formatPrice, formatNumber, pricePerMeter } from "./filters.js";
import { elevation } from "./drawings.js";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function unitTitle(u) {
  const rooms = u.rooms === 1 ? "" : ` ${formatNumber(u.rooms)} غرف`;
  return `${typeName(u.type)}${rooms} ${u.purpose === "rent" ? "للإيجار" : "للبيع"} في ${areaName(u.area)}`;
}

export function floorText(u) {
  if (u.type === "duplex") return `${formatNumber(u.floor)} و${formatNumber(u.floor + 1)} من ${formatNumber(u.floors)}`;
  if (u.floor === u.floors) return `الأخير (${formatNumber(u.floor)})`;
  return `${formatNumber(u.floor)} من ${formatNumber(u.floors)}`;
}

export function bannerText(u) {
  return u.purpose === "rent" ? "للإيجار" : "للبيع";
}

/** Where the banner hangs on the card drawing, from the same layout the SVG uses. */
export function bannerStyle(u) {
  const { bannerX, bannerY } = elevation(u);
  return `--bx:${bannerX}%;--by:${bannerY}%`;
}

export function unitUrl(u, base = "") {
  return `${base}units/${u.id}/`;
}

/** Short card title: the banner already says sale / rent. */
export function cardTitle(u) {
  const rooms = u.rooms === 1 ? "" : ` ${formatNumber(u.rooms)} غرف`;
  return `${typeName(u.type)}${rooms}`;
}

/** Elevation drawing as a lazy image with the banner hung on the unit's balcony. */
export function drawingFigure(u, base = "", { lazy = true } = {}) {
  const ev = elevation(u);
  const tall = ev.height > 250;
  return `<div class="dwg${tall ? " dwg-tall" : ""}" style="--bx:${ev.bannerX}%;--by:${ev.bannerY}%;aspect-ratio:${ev.width} / ${ev.height}">
      <img src="${base}drawings/${esc(u.id)}.svg" width="${ev.width}" height="${ev.height}"${lazy ? ' loading="lazy"' : ""} decoding="async" alt="رسم واجهة العمارة، الوحدة في الدور ${esc(floorText(u))}">
      <span class="banner banner-${u.purpose}" aria-hidden="true">${bannerText(u)}</span>
    </div>`;
}

export function renderCard(u, base = "") {
  const ppm = pricePerMeter(u);
  const extra = u.purpose === "rent" ? (u.furnished ? "مفروشة" : "فاضية") : ppm ? `${formatNumber(ppm)} ج.م للمتر` : "";
  return `<article class="sheet" data-id="${esc(u.id)}">
  <a class="sheet-link" href="${unitUrl(u, base)}">
    <div class="sheet-drawing">
      ${drawingFigure(u, base)}
    </div>
    <div class="titleblock">
      <div class="tb-head">
        <h3 class="tb-title">${esc(cardTitle(u))}</h3>
        <span class="tb-code code">${esc(u.id)}</span>
        <p class="tb-street"><strong>${esc(areaName(u.area))}</strong>، ${esc(u.street)}</p>
      </div>
      <p class="tb-price"><strong>${esc(formatPrice(u))}</strong>${extra ? `<small>${esc(extra)}</small>` : ""}</p>
      <dl class="tb-cells">
        <div><dt>المساحة</dt><dd>${formatNumber(u.size)} م²</dd></div>
        <div><dt>الدور</dt><dd>${esc(floorText(u))}</dd></div>
        <div><dt>الاتجاه</dt><dd>${esc(u.facing)}</dd></div>
      </dl>
    </div>
  </a>
</article>`;
}

export function specsRows(u) {
  const rows = [
    ["المساحة", `${formatNumber(u.size)} م²`],
    ["الغرف", formatNumber(u.rooms)],
    ["الحمامات", formatNumber(u.baths)],
    ["الدور", floorText(u)],
    ["الاتجاه", u.facing],
    ["الفيو", VIEWS[u.view] ?? u.view],
    ["التشطيب", FINISHING[u.finishing] ?? u.finishing],
    ["أسانسير", u.elevator ? "أيوه" : "لأ"],
    ["جراج", u.garage ? "أيوه" : "لأ"],
    ["سنة البناء", formatNumber(u.year).replace(/٬/g, "")],
  ];
  if (u.purpose === "rent") rows.splice(1, 0, ["الفرش", u.furnished ? "مفروشة" : "فاضية"]);
  return rows;
}

/** schema.org data for a unit page (Google reads JSON-LD; prices in EGP). */
export function unitJsonLd(u, siteUrl, office) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: unitTitle(u),
    url: siteUrl + unitUrl(u),
    datePosted: u.listed,
    description: u.note,
    image: `${siteUrl}drawings/${u.id}.svg`,
    offers: {
      "@type": "Offer",
      price: u.price,
      priceCurrency: "EGP",
      businessFunction: u.purpose === "rent" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
      ...(u.purpose === "rent" ? { priceSpecification: { "@type": "UnitPriceSpecification", price: u.price, priceCurrency: "EGP", unitCode: "MON" } } : {}),
      seller: { "@type": "RealEstateAgent", name: office.officeName },
    },
    about: {
      "@type": u.type === "chalet" ? "House" : "Apartment",
      numberOfRooms: u.rooms,
      numberOfBathroomsTotal: u.baths,
      floorLevel: String(u.floor),
      floorSize: { "@type": "QuantitativeValue", value: u.size, unitCode: "MTK" },
      address: { "@type": "PostalAddress", streetAddress: u.street, addressLocality: areaName(u.area), addressRegion: "الإسكندرية", addressCountry: "EG" },
    },
  };
}
