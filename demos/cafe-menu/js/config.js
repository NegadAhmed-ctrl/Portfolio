// Everything a café owner may change without touching the app logic.
export const CONFIG = Object.freeze({
  shopName: "قهوة المرسى",
  tagline: "قهوة مختصة وحلويات بيتي، كورنيش إسكندرية",
  // WhatsApp number in international format, digits only (no +, no spaces).
  whatsapp: "201000000000",
  currency: "ج.م",
  deliveryFee: 25,
  minDeliveryOrder: 100,
  // Opening hours in 24h. closeHour > 24 means "after midnight" (25 = 1 AM).
  openHour: 8,
  closeHour: 25,
  deliveryEta: "30 دقيقة",
  // Public link of the menu, encoded in the table QR codes.
  menuUrl: "https://negadahmed-ctrl.github.io/Portfolio/demos/cafe-menu/",
  // Optional: a Google Sheet published as CSV (File > Share > Publish to web > CSV).
  // When set, the menu is loaded from the sheet and the local data is the fallback.
  sheetCsvUrl: "",
});
