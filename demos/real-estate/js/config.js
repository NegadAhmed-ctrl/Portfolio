// Everything an office changes when the site is set up for a real client.
// The office, phone numbers and listings in this demo are fictional.
export const CONFIG = {
  officeName: "مكتب لوران العقاري",
  officeNameEn: "Loran Real Estate",
  city: "الإسكندرية",
  // WhatsApp number in international format, digits only (demo number).
  whatsapp: "201001234567",
  phoneDisplay: "0100 123 4567",
  address: "١٢ شارع عبد السلام عارف، لوران، الإسكندرية",
  hours: "يوميًا من ١١ الصبح لـ ١٠ بالليل، الجمعة بعد الصلاة",
  siteUrl: "https://negadahmed-ctrl.github.io/Portfolio/demos/real-estate/",
  // Where lead forms go. "demo" keeps them in this browser only.
  // For a client: "webhook" + webhookUrl (Google Apps Script web app, Make, n8n, Formspree...).
  leadSink: "demo",
  webhookUrl: "",
  // Analytics placeholder: set to "gtag" or "meta" after the client creates the account.
  analytics: "none",
};
