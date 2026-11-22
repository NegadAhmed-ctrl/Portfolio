// Where a lead goes after the form is valid. One interface, two implementations:
//   submit(lead) -> Promise<{ ok, reference, duplicate?, error? }>
//   list()       -> Promise<lead[]>   (demo only, for the "what the office receives" panel)
import { leadReference } from "./lead.js";

const KEY = "loran-demo-leads";
const DUP_WINDOW_MS = 10 * 60 * 1000;

/** DEMO: keeps leads in this browser (localStorage). Nothing leaves the device. */
export class DemoLeadSink {
  constructor(storage = globalThis.localStorage, clock = () => Date.now()) {
    this.storage = storage;
    this.clock = clock;
    this.memory = [];
  }
  read() {
    try {
      return JSON.parse(this.storage?.getItem(KEY) || "[]");
    } catch {
      return this.memory;
    }
  }
  write(list) {
    this.memory = list;
    try {
      this.storage?.setItem(KEY, JSON.stringify(list.slice(-30)));
    } catch {
      /* private mode: keep it in memory */
    }
  }
  async submit(lead) {
    const now = this.clock();
    const list = this.read();
    const dup = list.find((l) => l.phone === lead.phone && l.unitId === lead.unitId && now - l.at < DUP_WINDOW_MS);
    if (dup) return { ok: true, duplicate: true, reference: dup.reference };
    const reference = leadReference(lead.unitId, now);
    this.write([...list, { ...lead, reference, at: now, source: "demo" }]);
    return { ok: true, reference };
  }
  async list() {
    return this.read().slice().reverse();
  }
}

/**
 * For a client: POST the lead as JSON to a webhook they own
 * (Google Apps Script web app -> Google Sheet, Make / n8n, Formspree...).
 * Not used by the demo.
 */
export class WebhookLeadSink {
  constructor(url, fetchImpl = globalThis.fetch, timeoutMs = 8000) {
    this.url = url;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }
  async submit(lead) {
    const reference = leadReference(lead.unitId);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetch(this.url, {
        method: "POST",
        // text/plain avoids a CORS preflight, which Apps Script web apps don't answer.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...lead, reference, at: new Date().toISOString() }),
        signal: ctrl.signal,
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true, reference };
    } catch (e) {
      return { ok: false, error: e.name === "AbortError" ? "timeout" : "network" };
    } finally {
      clearTimeout(timer);
    }
  }
  async list() {
    return [];
  }
}

export function createLeadSink(config) {
  if (config.leadSink === "webhook" && config.webhookUrl) return new WebhookLeadSink(config.webhookUrl);
  return new DemoLeadSink();
}
