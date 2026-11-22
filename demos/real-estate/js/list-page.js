import { CONFIG } from "./config.js";
import { UNITS, AREAS, TYPES, areaName, typeName } from "./units.js";
import { applyFilters, sortUnits, filtersToQuery, queryToFilters, parsePrice, suggestRelaxation, formatNumber, countUnits, SORTS, DEFAULT_FILTERS } from "./filters.js";
import { renderCard } from "./render.js";
import { elevation, unitFloors } from "./drawings.js";
import { track } from "./analytics.js";
import { createLeadSink } from "./leads-store.js";
import { wireLeadForm, renderInbox, toast } from "./lead-ui.js";

const $ = (s, el = document) => el.querySelector(s);
const known = { areas: AREAS.map((a) => a.id), types: TYPES.map((t) => t.id) };
const sink = createLeadSink(CONFIG);
let filters = queryToFilters(location.search, known);

// ---------- build controls ----------
function chip(name, value, label, type = "checkbox") {
  return `<label class="chip"><input type="${type}" name="${name}" value="${value}"><span>${label}</span></label>`;
}
$("#f-areas").insertAdjacentHTML("beforeend", AREAS.map((a) => chip("areas", a.id, a.name)).join(""));
$("#f-types").insertAdjacentHTML("beforeend", TYPES.map((t) => chip("types", t.id, t.name)).join(""));
$("#f-rooms").insertAdjacentHTML(
  "beforeend",
  [0, 1, 2, 3, 4].map((n) => chip("minRooms", n, n === 0 ? "أي عدد" : `${formatNumber(n)}+`, "radio")).join(""),
);
$("#f-sort").innerHTML = Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
$("#quick-area").insertAdjacentHTML("beforeend", AREAS.map((a) => `<option value="${a.id}">${a.name}</option>`).join(""));

const form = $("#filters");

function writeControls() {
  form.querySelectorAll('input[name="purpose"]').forEach((i) => (i.checked = i.value === filters.purpose));
  form.querySelectorAll('input[name="areas"]').forEach((i) => (i.checked = filters.areas.includes(i.value)));
  form.querySelectorAll('input[name="types"]').forEach((i) => (i.checked = filters.types.includes(i.value)));
  form.querySelectorAll('input[name="minRooms"]').forEach((i) => (i.checked = Number(i.value) === filters.minRooms));
  form.min.value = filters.minPrice ? formatNumber(filters.minPrice) : "";
  form.max.value = filters.maxPrice ? formatNumber(filters.maxPrice) : "";
  form.bahari.checked = filters.bahari;
  form.q.value = filters.q;
  form.sort.value = filters.sort;
  $("#quick").querySelectorAll('input[name="purpose"]').forEach((i) => (i.checked = i.value === filters.purpose));
}

function readControls() {
  const fd = new FormData(form);
  return {
    purpose: fd.get("purpose") || "sale",
    areas: fd.getAll("areas"),
    types: fd.getAll("types"),
    minRooms: Number(fd.get("minRooms") || 0),
    minPrice: parsePrice(fd.get("min")),
    maxPrice: parsePrice(fd.get("max")),
    bahari: fd.get("bahari") === "on",
    q: String(fd.get("q") || "").trim(),
    sort: fd.get("sort") || "newest",
  };
}

// ---------- results ----------
function describeFilters(f) {
  const what = f.types.length ? f.types.map(typeName).join(" أو ") : "وحدة";
  let text = `${what} ${f.purpose === "rent" ? "للإيجار" : "للشراء"}`;
  if (f.areas.length) text += " في " + f.areas.map(areaName).join(" أو ");
  const parts = [text];
  if (f.minRooms) parts.push(`${formatNumber(f.minRooms)} غرف أو أكتر`);
  if (f.maxPrice) parts.push(`لحد ${formatNumber(f.maxPrice)} ج.م`);
  if (f.bahari) parts.push("بحري");
  return parts.join("، ");
}

function render({ fromUser = false } = {}) {
  const list = sortUnits(applyFilters(UNITS, filters, areaName), filters.sort);
  const grid = $("#grid");
  grid.innerHTML = list.map((u) => renderCard(u)).join("");
  const n = list.length;
  $("#count").textContent = n === 0 ? "" : `${countUnits(n)} ${filters.purpose === "rent" ? "للإيجار" : "للبيع"}`;
  const empty = $("#empty");
  empty.hidden = n > 0;
  if (n === 0) {
    const tip = suggestRelaxation(UNITS, filters, areaName);
    const relax = $("#relax");
    relax.hidden = !tip;
    $("#empty-text").textContent = `بتدوّر على: ${describeFilters(filters)}.`;
    if (tip) {
      relax.textContent = `${tip.label} (${countUnits(tip.count)})`;
      relax.onclick = () => {
        filters = { ...filters, ...tip.patch };
        sync(true);
      };
    }
  }
  // Prefill the request form with what they searched for.
  const msg = $("#request-message");
  if (!msg.dataset.touched) msg.value = `بدوّر على ${describeFilters(filters)}.`;
  if (fromUser) track("filter_change", { results: n, query: filtersToQuery(filters) });
}

function sync(fromUser = false) {
  const qs = filtersToQuery(filters);
  history.replaceState(null, "", qs ? `?${qs}#units` : location.pathname + (fromUser ? "#units" : location.hash));
  writeControls();
  render({ fromUser });
}

let typing;
form.addEventListener("input", (e) => {
  const isText = e.target.matches('input[name="q"], input[name="min"], input[name="max"]');
  clearTimeout(typing);
  typing = setTimeout(() => {
    filters = readControls();
    const qs = filtersToQuery(filters);
    history.replaceState(null, "", qs ? `?${qs}#units` : location.pathname);
    render({ fromUser: true });
    if (isText && filters.q) track("search", { q: filters.q });
  }, isText ? 250 : 0);
});
form.addEventListener("change", (e) => {
  if (e.target.matches('input[name="min"], input[name="max"]')) writeControls(); // show "٦٬٥٠٠٬٠٠٠" after typing "6.5 مليون"
});
form.addEventListener("submit", (e) => e.preventDefault());
form.addEventListener("reset", (e) => {
  e.preventDefault();
  filters = { ...DEFAULT_FILTERS, purpose: filters.purpose };
  sync(true);
});

$("#share-list").addEventListener("click", async () => {
  const url = location.href.split("#")[0];
  try {
    await navigator.clipboard.writeText(url);
    toast("اتنسخ اللينك. ابعته لأي حد يشوف نفس النتيجة.");
  } catch {
    toast("انسخ اللينك من شريط العنوان فوق.");
  }
  track("share_list", { query: filtersToQuery(filters) });
});

// ---------- quick search in the hero ----------
const quick = $("#quick");
const budget = $("#quick-budget");
const budgetRead = $("#quick-budget-read");
budget.addEventListener("input", () => {
  const v = parsePrice(budget.value);
  budgetRead.textContent = budget.value.trim() ? (v ? `يعني ${formatNumber(v)} ج.م` : "اكتب رقم، مثلًا ٦٫٥ مليون أو ٢٠ ألف") : "";
  budgetRead.classList.toggle("bad", Boolean(budget.value.trim() && !v));
});
quick.addEventListener("change", (e) => {
  if (e.target.name === "purpose") budget.placeholder = e.target.value === "rent" ? "مثلًا ٢٠ ألف في الشهر" : "مثلًا ٦٫٥ مليون";
});
quick.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(quick);
  const area = fd.get("area");
  filters = { ...DEFAULT_FILTERS, purpose: fd.get("purpose"), areas: area ? [area] : [], maxPrice: parsePrice(fd.get("budget")) };
  sync(true);
  track("search", { from: "hero", query: filtersToQuery(filters) });
  $("#units").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});

// ---------- hero drawing (draws itself once) ----------
const featured = UNITS.find((u) => u.id === "SP-1102");
const hero = $("#hero-drawing");
const ev = elevation(featured, { animate: true });
hero.querySelector(".hero-fallback").remove();
hero.insertAdjacentHTML(
  "afterbegin",
  `<div class="hero-sheet"><div class="dwg" style="--bx:${ev.bannerX}%;--by:${ev.bannerY}%">${ev.svg}
    <span class="banner banner-sale banner-big" aria-hidden="true">للبيع<small>${CONFIG.phoneDisplay}</small></span>
    <span class="floor-tag" aria-hidden="true">الدور ${formatNumber(unitFloors(featured)[0])}</span>
  </div></div>`,
);
const drawn = hero.querySelector("svg.draw");
if (drawn && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  drawn.querySelectorAll("path, rect, circle, ellipse").forEach((el, i) => {
    const len = el.getTotalLength ? Math.ceil(el.getTotalLength()) : 300;
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    el.style.animationDelay = `${Math.min(i * 4, 1100)}ms`;
  });
  drawn.classList.add("go");
} else drawn?.classList.remove("draw");

// ---------- tracking for links ----------
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-track]");
  if (a) track(a.dataset.track, { from: "list" });
  const card = e.target.closest(".sheet[data-id]");
  if (card) track("view_unit", { id: card.dataset.id, from: "list" });
});

// ---------- request form + demo inbox ----------
$("#request-message").addEventListener("input", (e) => (e.target.dataset.touched = "1"));
wireLeadForm($("#request-form"), { sink, unit: null, onSaved: () => renderInbox(sink) });
renderInbox(sink);

writeControls();
render();
if (location.hash === "#units" && location.search) $("#units").scrollIntoView();
