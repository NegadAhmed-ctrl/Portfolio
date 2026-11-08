// In-memory store. Used by the browser demo and the tests.
// Every store adapter (memory / json-file / google-sheets / supabase)
// exposes these same methods, so the engine never knows which one it uses.

export function createMemoryStore(initial = {}) {
  const db = {
    sessions: {}, bookings: [], leads: [], handoffs: [], outbox: [], logs: [],
    ...structuredClone(initial),
  };
  const api = {
    db,
    async getSession(id) { return db.sessions[id] ? structuredClone(db.sessions[id]) : null; },
    async saveSession(s) { db.sessions[s.id] = structuredClone(s); },

    async saveBooking(b) { db.bookings.push(structuredClone(b)); },
    async updateBooking(code, patch) {
      const b = db.bookings.find((x) => x.code === code);
      if (b) Object.assign(b, patch);
      return b ? structuredClone(b) : null;
    },
    async findBookings(q = {}) {
      return db.bookings.filter((b) =>
        (!q.code || b.code === q.code) && (!q.phone || b.phone === q.phone) &&
        (!q.status || b.status === q.status) && (!q.date || b.start.startsWith(q.date))
      ).map((b) => structuredClone(b));
    },

    async upsertLead(lead) {
      const i = db.leads.findIndex((l) => l.key === lead.key);
      if (i >= 0) db.leads[i] = { ...db.leads[i], ...Object.fromEntries(Object.entries(lead).filter(([, v]) => v !== null)) };
      else db.leads.push({ ...lead, createdAt: lead.updatedAt });
    },

    async listLeads() { return db.leads.map((l) => structuredClone(l)); },

    async saveHandoff(h) { db.handoffs.push({ ...structuredClone(h), thread: [] }); },
    async updateHandoff(id, patch) { const h = db.handoffs.find((x) => x.id === id); if (h) Object.assign(h, patch); },
    async appendHandoffMessage(id, m) { const h = db.handoffs.find((x) => x.id === id); if (h) h.thread.push(m); },
    async listHandoffs(status) { return db.handoffs.filter((h) => !status || h.status === status).map((h) => structuredClone(h)); },

    // Outgoing customer messages wait here until a human approves them.
    async queueMessage(m) {
      const key = `${m.kind}:${m.bookingCode}:${m.to}:${m.sendAt}`;
      if (db.outbox.some((x) => x.key === key)) return null; // duplicate prevention
      const item = { id: 'M' + (db.outbox.length + 1), key, status: 'pending_approval', ...m };
      db.outbox.push(item);
      return item;
    },
    async listOutbox(status) { return db.outbox.filter((m) => !status || m.status === status).map((m) => structuredClone(m)); },
    async updateOutbox(id, patch) { const m = db.outbox.find((x) => x.id === id); if (m) Object.assign(m, patch); return m && structuredClone(m); },

    async log(entry) { db.logs.push(entry); if (db.logs.length > 2000) db.logs.shift(); },
  };
  return api;
}
