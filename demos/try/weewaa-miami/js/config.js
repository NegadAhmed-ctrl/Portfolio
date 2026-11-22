// Everything a café owner may change without touching the app logic.
export const CONFIG = Object.freeze({
  shopName: "ويوا لاونج",
  tagline: "ميامي، إسكندرية",
  // WhatsApp number in international format, digits only (no +, no spaces).
  whatsapp: "201000000000",
  currency: "ج.م",
  deliveryFee: 0, // not public: set with the café
  minDeliveryOrder: 0, // not public
  // Opening hours in 24h. closeHour > 24 means "after midnight" (25 = 1 AM).
  openHour: 0, // hours not public: hidden in the header
  closeHour: 24,
  deliveryEta: "", // not public: pill hidden
  // Public link of the menu, encoded in the table QR codes.
  menuUrl: "https://negadahmed-ctrl.github.io/Portfolio/demos/try/weewaa-miami/",
  // Optional: a Google Sheet published as CSV (File > Share > Publish to web > CSV).
  // When set, the menu is loaded from the sheet and the local data is the fallback.
  sheetCsvUrl: "",
});
