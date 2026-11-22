import { CONFIG } from "./config.js";
import { CATEGORIES, MENU as LOCAL_MENU } from "./menu.js";
import { ICONS } from "./icons.js";
import { lineKey, unitPrice, changeQty, resolveLines, totals } from "./cart.js";
import { validateOrder, buildMessage, whatsappUrl, normalizeDigits } from "./order.js";
import { loadSheetMenu } from "./sheet.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const nf = new Intl.NumberFormat("ar-EG-u-nu-latn");
const money = (n) => `${nf.format(n)} ${CONFIG.currency}`;
const escape = (str = "") => str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STORAGE_KEY = "cafe-menu:v1";
const tableFromHash = (location.hash.match(/^#table-(\d{1,3})$/) || [])[1] || "";

const state = {
  menu: LOCAL_MENU,
  cart: {},
  sizeChoice: {}, // itemId -> sizeIndex currently selected on the card
  orderType: "table",
  query: "",
  activeCategory: CATEGORIES[0].id,
};

/* ---------- persistence (per-viewer convenience only) ---------- */
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.cart) state.cart = saved.cart;
    if (saved?.orderType && !tableFromHash) state.orderType = saved.orderType;
  } catch { /* storage blocked: start fresh */ }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ cart: state.cart, orderType: state.orderType })); } catch { /* ignore */ }
}

/* ---------- derived ---------- */
const lines = () => resolveLines(state.cart, state.menu);
const currentTotals = () => totals(lines(), { orderType: state.orderType, deliveryFee: CONFIG.deliveryFee });

function isOpenNow(date = new Date()) {
  let h = date.getHours() + date.getMinutes() / 60;
  if (h < CONFIG.openHour) h += 24;
  return h >= CONFIG.openHour && h < CONFIG.closeHour;
}

/* ---------- render ---------- */
function renderHeader() {
  $("#shopName").textContent = CONFIG.shopName;
  $("#shopTag").textContent = CONFIG.tagline;
  const open = isOpenNow();
  $("#openPill").textContent = open ? "مفتوح الآن" : "مقفول دلوقتي، جهّز طلبك";
  $("#openPill").classList.toggle("is-open", open);
  $("#etaPill").innerHTML = `${ICONS.scooter}<span>توصيل خلال ${CONFIG.deliveryEta}</span>`;
}

function renderOrderType() {
  $$("[data-order-type]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.orderType === state.orderType)));
}

function renderChips() {
  $("#chips").innerHTML = CATEGORIES.map((c) => `
    <button class="chip" type="button" data-category="${c.id}" aria-pressed="${c.id === state.activeCategory}">
      ${ICONS[c.icon]}<span>${escape(c.name)}</span>
    </button>`).join("");
}

function itemCard(item) {
  const sizeIndex = state.sizeChoice[item.id] ?? 0;
  const key = lineKey(item, sizeIndex);
  const qty = state.cart[key] || 0;

  const sizes = item.sizes
    ? `<div class="sizes" role="group" aria-label="الحجم">${item.sizes.map((s, i) => `
        <button type="button" class="size" data-size="${item.id}" data-index="${i}" aria-pressed="${i === sizeIndex}">${escape(s.label)}</button>`).join("")}</div>`
    : "";

  let action;
  if (item.soldOut) action = `<span class="soldout-label">خلص النهارده</span>`;
  else if (qty) action = `
    <div class="stepper" role="group" aria-label="الكمية">
      <button type="button" data-dec="${key}" aria-label="نقّص ${escape(item.name)}">−</button>
      <output aria-live="polite">${nf.format(qty)}</output>
      <button type="button" data-inc="${key}" aria-label="زوّد ${escape(item.name)}">+</button>
    </div>`;
  else action = `<button type="button" class="add" data-inc="${key}">إضافة</button>`;

  return `
    <article class="item${item.soldOut ? " is-soldout" : ""}">
      <div class="thumb tone-${item.tone || "milk"}">${ICONS[item.icon] || ICONS.cup}</div>
      <div class="item-body">
        <h3>${escape(item.name)}${item.badge ? `<span class="badge">${escape(item.badge)}</span>` : ""}</h3>
        <p>${escape(item.description || "")}</p>
        ${sizes}
        <div class="item-foot">
          <span class="price">${money(unitPrice(item, sizeIndex))}</span>
          ${action}
        </div>
      </div>
    </article>`;
}

function renderMenu() {
  const q = state.query.trim();
  const html = CATEGORIES.map((c) => {
    const items = state.menu.filter((i) => i.category === c.id && (!q || `${i.name} ${i.description}`.includes(q)));
    if (!items.length) return "";
    return `<section class="category" id="cat-${c.id}" aria-labelledby="h-${c.id}">
      <h2 id="h-${c.id}">${ICONS[c.icon]}${escape(c.name)}</h2>
      <div class="items">${items.map(itemCard).join("")}</div>
    </section>`;
  }).join("");
  $("#menu").innerHTML = html || `<p class="empty">مفيش صنف بالاسم ده. جرّب كلمة تانية.</p>`;
  observeSections();
}

function renderCartBar() {
  const t = currentTotals();
  $("#cartBar").hidden = t.count === 0;
  $("#cartCount").textContent = nf.format(t.count);
  $("#cartTotal").textContent = money(t.grand);
}

function renderCartSheet() {
  const ls = lines();
  const t = currentTotals();
  $("#cartLines").innerHTML = ls.length
    ? ls.map((l) => `
      <li class="cart-line">
        <div><b>${escape(l.label)}</b><small>${money(l.unit)} × ${nf.format(l.qty)}</small></div>
        <div class="stepper" role="group" aria-label="الكمية">
          <button type="button" data-dec="${l.key}" aria-label="نقّص">−</button>
          <output>${nf.format(l.qty)}</output>
          <button type="button" data-inc="${l.key}" aria-label="زوّد">+</button>
        </div>
      </li>`).join("")
    : `<li class="empty">السلة فاضية</li>`;

  $("#sum-sub").textContent = money(t.subtotal);
  $("#sum-del").textContent = money(t.delivery);
  $("#sum-grand").textContent = money(t.grand);
  $("#row-del").hidden = state.orderType !== "delivery";

  const show = (id, on) => { $(id).hidden = !on; };
  show("#f-table", state.orderType === "table");
  show("#f-name", state.orderType !== "table");
  show("#f-phone", state.orderType !== "table");
  show("#f-address", state.orderType === "delivery");
  $("#sheetOrderType").textContent = { table: "طلب في الكافيه", pickup: "طلب استلام", delivery: "طلب توصيل" }[state.orderType];
  if (tableFromHash && !$("#table").value) $("#table").value = tableFromHash;
}

function renderAll() { renderOrderType(); renderMenu(); renderCartBar(); renderCartSheet(); }

/* ---------- dialogs ---------- */
let lastFocus = null;
function openSheet(id) {
  lastFocus = document.activeElement;
  const el = $(id);
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("is-open"));
  el.querySelector("[data-autofocus]")?.focus();
  document.body.classList.add("no-scroll");
}
function closeSheets() {
  $$(".sheet-wrap").forEach((el) => { el.classList.remove("is-open"); el.hidden = true; });
  document.body.classList.remove("no-scroll");
  lastFocus?.focus?.();
}

/* ---------- actions ---------- */
function setOrderType(type) { state.orderType = type; persist(); renderAll(); }
function updateQty(key, delta) { state.cart = changeQty(state.cart, key, delta); persist(); renderAll(); }

function readForm() {
  return {
    table: $("#table").value, name: $("#name").value, phone: $("#phone").value,
    address: $("#address").value, notes: $("#notes").value,
  };
}

function submitOrder(e) {
  e.preventDefault();
  const form = readForm();
  const t = currentTotals();
  const { valid, errors } = validateOrder(form, {
    orderType: state.orderType, subtotal: t.subtotal, minDeliveryOrder: CONFIG.minDeliveryOrder, formatMoney: money,
  });
  $$("[data-error]").forEach((el) => { el.textContent = errors[el.dataset.error] || ""; });
  $$("#orderForm input, #orderForm textarea").forEach((el) => el.setAttribute("aria-invalid", String(Boolean(errors[el.id]))));
  if (!valid) { $(`#${Object.keys(errors)[0]}`)?.focus(); return; }

  const message = buildMessage({ shopName: CONFIG.shopName, orderType: state.orderType, form, lines: lines(), totals: t, formatMoney: money });
  $("#waLink").href = whatsappUrl(CONFIG.whatsapp, message);
  $("#waNumber").textContent = `+${CONFIG.whatsapp}`;
  $("#msgPreview").textContent = message;
  $("#copyStatus").textContent = "";
  closeSheets();
  openSheet("#sentSheet");
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText($("#msgPreview").textContent);
    $("#copyStatus").textContent = "اتنسخت";
  } catch {
    $("#copyStatus").textContent = "النسخ مش متاح هنا، علّم على النص وانسخه.";
  }
}

function renderQr() {
  const n = normalizeDigits($("#qrTable").value);
  const url = CONFIG.menuUrl + (/^\d{1,3}$/.test(n) ? `#table-${n}` : "");
  const box = $("#qrBox");
  box.innerHTML = "";
  if (window.QRCode) new window.QRCode(box, { text: url, width: 220, height: 220, colorDark: "#2b1d14", colorLight: "#ffffff" });
  else box.textContent = "مكتبة الـ QR ما اتحمّلتش، جرّب تاني.";
  $("#qrUrl").textContent = url;
  $("#qrCaption").textContent = /^\d{1,3}$/.test(n) ? `ترابيزة ${nf.format(Number(n))}` : "امسح الكود واطلب من مكانك";
}

/* ---------- events (delegated) ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("button, [data-close]");
  if (!el) return;
  if (el.dataset.inc) updateQty(el.dataset.inc, +1);
  else if (el.dataset.dec) updateQty(el.dataset.dec, -1);
  else if (el.dataset.size) { state.sizeChoice[el.dataset.size] = Number(el.dataset.index); renderMenu(); }
  else if (el.dataset.orderType) setOrderType(el.dataset.orderType);
  else if (el.dataset.category) {
    state.activeCategory = el.dataset.category; renderChips();
    document.getElementById(`cat-${el.dataset.category}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (el.hasAttribute("data-close")) closeSheets();
});
$$(".sheet-wrap").forEach((w) => w.addEventListener("click", (e) => { if (e.target === w) closeSheets(); }));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheets(); });
$("#search").addEventListener("input", (e) => { state.query = e.target.value; renderMenu(); });
$("#openCart").addEventListener("click", () => { renderCartSheet(); openSheet("#cartSheet"); });
$("#orderForm").addEventListener("submit", submitOrder);
$("#copyMsg").addEventListener("click", copyMessage);
$("#openQr").addEventListener("click", () => { renderQr(); openSheet("#qrSheet"); });
$("#qrTable").addEventListener("input", renderQr);

// Highlight the category chip of the section in view.
let spy = null;
function observeSections() {
  if (!spy) return;
  spy.disconnect();
  $$(".category").forEach((sec) => spy.observe(sec));
}
spy = new IntersectionObserver((entries) => {
  const visible = entries.filter((en) => en.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
  if (!visible) return;
  const id = visible.target.id.replace("cat-", "");
  if (id !== state.activeCategory) { state.activeCategory = id; renderChips(); }
}, { rootMargin: "-140px 0px -60% 0px" });

/* ---------- boot ---------- */
async function boot() {
  restore();
  renderHeader();
  renderChips();
  renderAll();

  if (CONFIG.sheetCsvUrl) {
    try {
      state.menu = await loadSheetMenu(CONFIG.sheetCsvUrl);
      renderAll();
    } catch (err) {
      console.warn("Google Sheet menu unavailable, using local menu:", err.message);
    }
  }
}
boot();
