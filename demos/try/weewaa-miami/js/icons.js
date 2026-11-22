// Small inline SVG icon set (24×24, stroke-based) so the page has no icon-font or image dependency.
const s = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICONS = {
  cup: s('<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c0 1 1 1.5 1 2.5S8 7 8 7M12 3c0 1 1 1.5 1 2.5S12 7 12 7"/>'),
  latte: s('<path d="M5 8h12l-1.4 10.2A2 2 0 0 1 13.6 20H8.4a2 2 0 0 1-2-1.8z"/><path d="M4 8h14"/><path d="M8.5 12.5c1-.9 2-.9 2.5 0s1.5.9 2.5 0"/><path d="M11 4v4"/>'),
  iced: s('<path d="M6 7h12l-1.5 12.2a2 2 0 0 1-2 1.8h-5a2 2 0 0 1-2-1.8z"/><path d="M13 7l2-4h3"/><rect x="9" y="11" width="3" height="3" rx=".6"/><rect x="12.5" y="14" width="2.6" height="2.6" rx=".6"/>'),
  frappe: s('<path d="M7 10h10l-1.4 9.2a2 2 0 0 1-2 1.8h-3.2a2 2 0 0 1-2-1.8z"/><path d="M6 10c0-3 2.5-5 6-5s6 2 6 5"/><path d="M12 5V2"/>'),
  citrus: s('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 7.5v9M7.5 12h9M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4"/>'),
  cake: s('<path d="M4 20h16"/><path d="M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M5 16c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0"/><path d="M12 12V8"/><path d="M12 5.5c.8 0 1.2-.7 1.2-1.3S12 2.5 12 2.5s-1.2 1.1-1.2 1.7.4 1.3 1.2 1.3z"/>'),
  croissant: s('<path d="M4.5 15.5C3 13 4 8 8 6.5c2.5-1 5.5-1 8 0 4 1.5 5 6.5 3.5 9"/><path d="M4.5 15.5c2 1.5 4 1.5 5-1M19.5 15.5c-2 1.5-4 1.5-5-1"/><path d="M9.5 14.5C9 11 10 8.5 12 7c2 1.5 3 4 2.5 7.5"/>'),
  sandwich: s('<path d="M3 11l9-6 9 6"/><path d="M4 11h16v2H4z"/><path d="M4 15.5c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1"/><path d="M4 18h16"/>'),
  search: s('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  bag: s('<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  chair: s('<path d="M7 3v11h10V3"/><path d="M7 9h10"/><path d="M6 14h12l-1 7M7 21l-1-7"/>'),
  scooter: s('<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.5 17h7M15 6h2l2.5 8.5"/><path d="M6 14.5V11h6l2.5 6"/>'),
  clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  qr: s('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.7-1.7-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>',
};
