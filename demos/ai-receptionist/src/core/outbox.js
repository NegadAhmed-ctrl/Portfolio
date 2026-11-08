// Turns booking events into customer messages waiting for approval.
// Shared by the server and the browser demo so both behave the same.
//   booking.created / rescheduled -> queue confirmation + reminder
//   (older pending messages for that booking are marked "superseded")
//   booking.cancelled -> pending messages for that booking are "cancelled"

export async function applyEventsToOutbox(store, events, { messageMode = 'approve' } = {}) {
  const queued = [];
  for (const ev of events) {
    if (!/^booking\.(created|rescheduled|cancelled)$/.test(ev.type)) continue;
    for (const old of await store.listOutbox()) {
      if (old.bookingCode === ev.booking.code && ['pending_approval', 'approved'].includes(old.status)) {
        await store.updateOutbox(old.id, { status: ev.type === 'booking.cancelled' ? 'cancelled' : 'superseded' });
      }
    }
    if (ev.type === 'booking.cancelled') continue;
    for (const m of ev.messages || []) {
      const item = await store.queueMessage({
        ...m, bookingCode: ev.booking.code, sessionId: ev.booking.sessionId,
        channel: ev.booking.channel === 'telegram' ? 'telegram' : 'whatsapp',
        status: messageMode === 'auto' ? 'approved' : 'pending_approval',
      });
      if (item) queued.push(item);
    }
  }
  return queued;
}
