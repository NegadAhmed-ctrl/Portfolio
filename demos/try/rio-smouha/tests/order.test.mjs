// Run: node --test demos/cafe-menu/tests
import { test } from "node:test";
import assert from "node:assert/strict";
import { lineKey, changeQty, resolveLines, totals } from "../js/cart.js";
import { validateOrder, buildMessage, normalizeDigits, whatsappUrl } from "../js/order.js";
import { parseCsv, rowsToMenu } from "../js/sheet.js";

const menu = [
  { id: "lat", category: "hot", name: "لاتيه", sizes: [{ label: "وسط", price: 70 }, { label: "كبير", price: 85 }] },
  { id: "crs", category: "food", name: "كرواسون", price: 45 },
];
const money = (n) => `${n} ج.م`;

test("sizes are separate cart lines with their own price", () => {
  let cart = {};
  cart = changeQty(cart, lineKey(menu[0], 0), 1);
  cart = changeQty(cart, lineKey(menu[0], 1), 2);
  const lines = resolveLines(cart, menu);
  assert.equal(lines.length, 2);
  assert.equal(lines.find((l) => l.key === "lat:1").total, 170);
});

test("quantity never goes below zero and empty lines are removed", () => {
  const cart = changeQty({ crs: 1 }, "crs", -5);
  assert.deepEqual(cart, {});
});

test("items removed from the menu are ignored, not crashed on", () => {
  assert.equal(resolveLines({ gone: 3, crs: 1 }, menu).length, 1);
});

test("delivery fee only applies to delivery orders with items", () => {
  const lines = resolveLines({ crs: 2 }, menu);
  assert.equal(totals(lines, { orderType: "pickup", deliveryFee: 25 }).grand, 90);
  assert.equal(totals(lines, { orderType: "delivery", deliveryFee: 25 }).grand, 115);
  assert.equal(totals([], { orderType: "delivery", deliveryFee: 25 }).grand, 0);
});

test("Egyptian mobile numbers, including Arabic-Indic digits", () => {
  assert.equal(normalizeDigits("٠١٠ ١٢٣٤ ٥٦٧٨"), "01012345678");
  const base = { orderType: "pickup", subtotal: 50, minDeliveryOrder: 100, formatMoney: money };
  assert.equal(validateOrder({ name: "نجاد", phone: "٠١٠١٢٣٤٥٦٧٨" }, base).valid, true);
  assert.equal(validateOrder({ name: "نجاد", phone: "0123" }, base).errors.phone !== undefined, true);
});

test("delivery requires an address and the minimum order", () => {
  const opts = { orderType: "delivery", subtotal: 60, minDeliveryOrder: 100, formatMoney: money };
  const { errors } = validateOrder({ name: "نجاد", phone: "01012345678", address: "سموحة، شارع النصر 12" }, opts);
  assert.match(errors.address, /أقل طلب/);
});

test("WhatsApp message contains table, items and total", () => {
  const lines = resolveLines({ "lat:1": 1, crs: 1 }, menu);
  const t = totals(lines, { orderType: "table", deliveryFee: 25 });
  const msg = buildMessage({ shopName: "قهوة", orderType: "table", form: { table: "7", notes: "" }, lines, totals: t, formatMoney: money });
  assert.match(msg, /ترابيزة رقم: 7/);
  assert.match(msg, /لاتيه \(كبير\)/);
  assert.match(msg, /الإجمالي: 130 ج.م/);
  assert.ok(whatsappUrl("201000000000", msg).startsWith("https://wa.me/201000000000?text="));
});

test("Google Sheet CSV becomes menu items (quoted commas, sizes, sold out)", () => {
  const csv = 'id,category,name,description,price,sizes,sold_out\n' +
    'lat,hot,لاتيه,"لبن، ورغوة",,وسط:70|كبير:85,FALSE\n' +
    'crs,food,كرواسون,زبدة,45,,TRUE\n' +
    'bad,food,,,,,\n';
  const items = rowsToMenu(parseCsv(csv));
  assert.equal(items.length, 2);
  assert.equal(items[0].description, "لبن، ورغوة");
  assert.equal(items[0].sizes[1].price, 85);
  assert.equal(items[1].soldOut, true);
});
