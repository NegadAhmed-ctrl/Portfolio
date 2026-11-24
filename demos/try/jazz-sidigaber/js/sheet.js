// Optional Google Sheet source for the menu.
// Expected columns (first row): id, category, name, description, price, sizes, icon, tone, badge, sold_out
// sizes example: "وسط:70|كبير:85"  (leave price empty when sizes is used)
// sold_out: TRUE / FALSE

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function rowsToMenu(rows) {
  const [header, ...data] = rows;
  const col = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
  const get = (r, name) => (col[name] === undefined ? "" : (r[col[name]] || "").trim());

  return data
    .map((r) => {
      const sizes = get(r, "sizes")
        ? get(r, "sizes").split("|").map((s) => {
            const [label, price] = s.split(":");
            return { label: label.trim(), price: Number(price) };
          }).filter((s) => s.label && Number.isFinite(s.price))
        : null;
      const item = {
        id: get(r, "id"),
        category: get(r, "category"),
        name: get(r, "name"),
        description: get(r, "description"),
        icon: get(r, "icon") || "cup",
        tone: get(r, "tone") || "milk",
        badge: get(r, "badge") || undefined,
        soldOut: /^(true|yes|1|نعم)$/i.test(get(r, "sold_out")),
      };
      if (sizes && sizes.length) item.sizes = sizes;
      else item.price = Number(get(r, "price"));
      return item;
    })
    .filter((i) => i.id && i.name && i.category && (i.sizes || Number.isFinite(i.price)));
}

export async function loadSheetMenu(url, { timeoutMs = 5000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const menu = rowsToMenu(parseCsv(await res.text()));
    if (!menu.length) throw new Error("empty sheet");
    return menu;
  } finally {
    clearTimeout(timer);
  }
}
