import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEgyptianMobile, validateLead, buildWhatsAppText, whatsappUrl, leadReference } from "../js/lead.js";
import { DemoLeadSink, WebhookLeadSink } from "../js/leads-store.js";
import { findUnit, areaName, typeName } from "../js/units.js";

test("Egyptian mobiles in any common form", () => {
  for (const v of ["01001234567", "010 0123 4567", "+201001234567", "00201001234567", "201001234567", "1001234567", "٠١٠٠١٢٣٤٥٦٧", "0100-123-4567"])
    assert.equal(normalizeEgyptianMobile(v), "01001234567", v);
  assert.equal(normalizeEgyptianMobile("01512345678"), "01512345678");
  for (const v of ["0100123456", "01301234567", "0223456789", "abc", "", "+9665012345678"])
    assert.equal(normalizeEgyptianMobile(v), null, v);
});

test("valid lead is cleaned", () => {
  const r = validateLead({ name: "  مها   عبد الرحمن ", phone: "+20 122 345 6789", contact: "call", when: "tomorrow", message: " ٣ غرف ", unitId: "LR-0412", needsWhen: true });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { name: "مها عبد الرحمن", phone: "01223456789", contact: "call", when: "tomorrow", message: "٣ غرف", unitId: "LR-0412" });
});

test("each problem gets its own message", () => {
  const r = validateLead({ name: "م", phone: "0123", needsWhen: true });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ["name", "phone", "when"]);
  assert.match(validateLead({ name: "Ahmed 2", phone: "01001234567" }).errors.name, /أرقام/);
  assert.match(validateLead({ name: "أحمد", phone: "" }).errors.phone, /اكتب/);
  assert.equal(validateLead({ name: "أحمد", phone: "01001234567" }).ok, true, "when only required on unit pages");
  assert.equal(validateLead({ name: "أحمد", phone: "01001234567", contact: "fax" }).value.contact, "whatsapp");
});

test("honeypot marks spam without telling the bot", () => {
  const r = validateLead({ name: "Bot", phone: "01001234567", website: "http://x" });
  assert.equal(r.ok, false);
  assert.equal(r.spam, true);
  assert.deepEqual(r.errors, {});
});

test("WhatsApp message starts with the unit code and carries the link", () => {
  const u = findUnit("LR-0412");
  const text = buildWhatsAppText(u, { areaName, typeName, url: "https://x.test/units/LR-0412/", lead: { name: "مها", when: "weekend" } });
  const lines = text.split("\n");
  assert.match(lines[0], /شقة للبيع كود LR-0412$/);
  assert.match(lines[1], /لوران · 165 متر · دور 4 · ٧٫٢٥ مليون ج.م/);
  assert.ok(lines.includes("عايز أعاين: الجمعة أو السبت"));
  assert.equal(lines.at(-1), "https://x.test/units/LR-0412/");
  const url = whatsappUrl("+20 100 123 4567", text);
  assert.ok(url.startsWith("https://wa.me/201001234567?text="));
  assert.equal(decodeURIComponent(url.split("text=")[1]), text);
});

test("lead reference is short and readable", () => {
  assert.match(leadReference("SM-0402R", 1_700_000_000_000), /^SM0402R-[0-9A-Z]{3}$/);
});

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}

test("demo sink stores leads and catches a double submit", async () => {
  let now = 1_000_000;
  const sink = new DemoLeadSink(memoryStorage(), () => now);
  const lead = { name: "مها", phone: "01001234567", unitId: "LR-0412", contact: "whatsapp" };
  const a = await sink.submit(lead);
  assert.equal(a.ok, true);
  const b = await sink.submit(lead);
  assert.equal(b.duplicate, true);
  assert.equal(b.reference, a.reference);
  now += 11 * 60 * 1000;
  const c = await sink.submit(lead);
  assert.equal(c.duplicate, undefined);
  assert.equal((await sink.list()).length, 2);
});

test("demo sink keeps working when storage throws (private mode)", async () => {
  const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
  const sink = new DemoLeadSink(broken);
  assert.equal((await sink.submit({ name: "a", phone: "01001234567", unitId: null })).ok, true);
});

test("webhook sink posts JSON as text/plain and reports failures", async () => {
  const calls = [];
  const okFetch = async (url, opts) => (calls.push({ url, opts }), { ok: true, status: 200 });
  const r = await new WebhookLeadSink("https://hook.test", okFetch).submit({ name: "a", phone: "01001234567", unitId: "LR-0412" });
  assert.equal(r.ok, true);
  assert.equal(calls[0].opts.headers["Content-Type"], "text/plain;charset=utf-8");
  assert.equal(JSON.parse(calls[0].opts.body).unitId, "LR-0412");
  const bad = await new WebhookLeadSink("https://hook.test", async () => ({ ok: false, status: 500 })).submit({});
  assert.deepEqual(bad, { ok: false, error: "HTTP 500" });
  const down = await new WebhookLeadSink("https://hook.test", async () => { throw new TypeError("fetch failed"); }).submit({});
  assert.deepEqual(down, { ok: false, error: "network" });
});
