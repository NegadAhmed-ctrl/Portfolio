// Sandbox calendar. Behaves like Google Calendar for availability checks,
// but keeps events in memory. Pre-filled with some "busy" blocks so the
// demo looks like a real clinic day instead of an empty diary.

import { addDays, nowLocal, addMinutesLocal, dayKey } from '../../core/time.js';

export function createMemoryCalendar({ business, seedBusy = true, now = () => new Date(), events = [] } = {}) {
  const list = events.map((e) => ({ ...e }));
  let n = list.length;

  if (seedBusy && business) {
    // Deterministic pattern: different busy times per weekday.
    const start = nowLocal(business.timezone, now()).date;
    const pattern = { sat: ['13:00', '17:30', '19:00'], sun: ['12:30', '16:00', '18:00'], mon: ['14:00', '17:00'], tue: ['12:00', '15:30', '19:30'], wed: ['13:30', '18:30'], thu: ['12:00', '14:30'] };
    for (let i = 0; i < 21; i++) {
      const d = addDays(start, i);
      for (const t of pattern[dayKey(d)] || []) {
        list.push({ id: 'seed-' + (++n), start: `${d}T${t}`, end: addMinutesLocal(`${d}T${t}`, 60), summary: 'Busy (existing patient)', seed: true });
      }
    }
  }

  return {
    kind: 'memory',
    events: list,
    async listBusy(from, to) {
      return list.filter((e) => e.start < to && e.end > from).map(({ id, start, end }) => ({ id, start, end }));
    },
    async createEvent({ start, end, summary, description, code }) {
      const ev = { id: 'evt-' + (++n), start, end, summary, description, code };
      list.push(ev);
      return { id: ev.id };
    },
    async updateEvent(id, { start, end }) {
      const ev = list.find((e) => e.id === id);
      if (!ev) throw new Error('event not found: ' + id);
      ev.start = start; ev.end = end;
      return { id };
    },
    async deleteEvent(id) {
      const i = list.findIndex((e) => e.id === id);
      if (i >= 0) list.splice(i, 1);
    },
  };
}
