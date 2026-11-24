// Pure cart logic: no DOM, so it can be unit-tested with `node --test`.
// A cart is a plain object { lineKey: quantity }. A line key is "itemId" or "itemId:sizeIndex",
// so "Latte medium" and "Latte large" are separate lines with their own prices.

export const lineKey = (item, sizeIndex = 0) => (item.sizes ? `${item.id}:${sizeIndex}` : item.id);

export const unitPrice = (item, sizeIndex = 0) => (item.sizes ? item.sizes[sizeIndex].price : item.price);

export function changeQty(cart, key, delta) {
  const next = { ...cart };
  const qty = Math.max(0, (next[key] || 0) + delta);
  if (qty === 0) delete next[key];
  else next[key] = qty;
  return next;
}

export function resolveLines(cart, menu) {
  const byId = new Map(menu.map((m) => [m.id, m]));
  return Object.entries(cart)
    .map(([key, qty]) => {
      const [id, sizePart] = key.split(":");
      const item = byId.get(id);
      if (!item || qty <= 0) return null; // item removed from the menu since the cart was saved
      const sizeIndex = sizePart === undefined ? 0 : Number(sizePart);
      if (item.sizes && !item.sizes[sizeIndex]) return null;
      const unit = unitPrice(item, sizeIndex);
      const label = item.sizes ? `${item.name} (${item.sizes[sizeIndex].label})` : item.name;
      return { key, item, qty, label, unit, total: unit * qty };
    })
    .filter(Boolean);
}

export function totals(lines, { orderType, deliveryFee }) {
  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const delivery = orderType === "delivery" && subtotal > 0 ? deliveryFee : 0;
  return {
    subtotal,
    delivery,
    grand: subtotal + delivery,
    count: lines.reduce((sum, l) => sum + l.qty, 0),
  };
}
