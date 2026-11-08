// Works out which appointment times are free, using the clinic's opening
// hours, the service length, and the busy times from the calendar.

import { addDays, dayKey, toMinutes, fromMinutes, nowLocal, addMinutesLocal } from './time.js';

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// busy: [{ start: "YYYY-MM-DDTHH:MM", end: "YYYY-MM-DDTHH:MM" }] (local time)
export function freeSlotsForDay(business, date, duration, busy, now = new Date()) {
  const ranges = business.hours[dayKey(date)] || [];
  const step = business.slotStepMinutes || 30;
  const local = nowLocal(business.timezone, now);
  const earliest = date === local.date ? local.minutes + (business.minNoticeMinutes || 0) : -1;
  if (date < local.date) return [];
  const out = [];
  for (const [open, close] of ranges) {
    for (let t = toMinutes(open); t + duration <= toMinutes(close); t += step) {
      if (t < earliest) continue;
      const start = `${date}T${fromMinutes(t)}`;
      const end = addMinutesLocal(start, duration);
      if (!busy.some((b) => overlaps(start, end, b.start, b.end))) out.push(start);
    }
  }
  return out;
}

// Returns up to `limit` slots, starting at `fromDate`, preferring times
// close to `preferredTime` if given.
export async function findSlots({ business, calendar, duration, fromDate, preferredTime, limit = 5, days = 7, now = new Date() }) {
  const results = [];
  let date = fromDate;
  const maxDate = addDays(nowLocal(business.timezone, now).date, business.bookingWindowDays || 21);
  for (let i = 0; i < days && date <= maxDate; i++, date = addDays(date, 1)) {
    const busy = await calendar.listBusy(date + 'T00:00', addDays(date, 1) + 'T00:00');
    let free = freeSlotsForDay(business, date, duration, busy, now);
    if (preferredTime && i === 0) {
      const p = toMinutes(preferredTime);
      free = free.sort((a, b) => Math.abs(toMinutes(a.slice(11)) - p) - Math.abs(toMinutes(b.slice(11)) - p));
    }
    // Spread the suggestions out a little instead of 12:00, 12:30, 13:00...
    const picked = preferredTime && i === 0 ? free.slice(0, limit) : spread(free, Math.min(limit, 4));
    results.push(...picked.sort());
    if (results.length >= limit) break;
    if (results.length && !preferredTime) break; // first day with availability is enough
  }
  return results.slice(0, limit);
}

function spread(list, n) {
  if (list.length <= n) return list;
  const out = [];
  for (let i = 0; i < n; i++) out.push(list[Math.round((i * (list.length - 1)) / (n - 1))]);
  return [...new Set(out)];
}

export async function isSlotFree(calendar, start, duration, ignoreEventId) {
  const end = addMinutesLocal(start, duration);
  const busy = await calendar.listBusy(start.slice(0, 10) + 'T00:00', addDays(start.slice(0, 10), 1) + 'T00:00');
  return !busy.some((b) => b.id !== ignoreEventId && overlaps(start, end, b.start, b.end));
}
