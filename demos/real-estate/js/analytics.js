// ANALYTICS HOOK (placeholder). Every meaningful action calls track(name, props).
// The demo only records events in memory (window.__loranEvents) so tests can check them.
// To go live: create the client's GA4 or Meta Pixel, add its snippet to the <head> of
// index.html + units/*, and set CONFIG.analytics to "gtag" or "meta". Nothing else changes.
import { CONFIG } from "./config.js";

const EVENTS = ["search", "filter_change", "view_unit", "whatsapp_click", "call_click", "lead_submit", "share_list"];

export function track(name, props = {}) {
  if (!EVENTS.includes(name)) return;
  const event = { name, ...props, at: Date.now() };
  (globalThis.__loranEvents ||= []).push(event);
  if (CONFIG.analytics === "gtag" && typeof globalThis.gtag === "function") globalThis.gtag("event", name, props);
  if (CONFIG.analytics === "meta" && typeof globalThis.fbq === "function") {
    const metaName = { lead_submit: "Lead", whatsapp_click: "Contact", call_click: "Contact", view_unit: "ViewContent", search: "Search" }[name];
    if (metaName) globalThis.fbq("track", metaName, props);
  }
}
