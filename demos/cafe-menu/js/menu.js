// Local menu data. Used directly, or as the fallback when the Google Sheet can't be loaded.
// icon: one of the keys in ICONS (js/icons.js). sizes: [{label, price}] or omit and set price.

export const CATEGORIES = [
  { id: "hot", name: "مشروبات سخنة", icon: "cup" },
  { id: "cold", name: "مشروبات ساقعة", icon: "iced" },
  { id: "sweet", name: "حلويات", icon: "cake" },
  { id: "food", name: "فطار وسندوتشات", icon: "croissant" },
];

export const MENU = [
  { id: "esp", category: "hot", name: "إسبريسو", description: "شوت مزدوج من بن مختص محمص طازة", icon: "cup", tone: "espresso", sizes: [{ label: "سنجل", price: 45 }, { label: "دبل", price: 60 }] },
  { id: "lat", category: "hot", name: "لاتيه", description: "إسبريسو مع لبن مبخر ورغوة ناعمة", icon: "latte", tone: "milk", sizes: [{ label: "وسط", price: 70 }, { label: "كبير", price: 85 }], badge: "الأكثر طلبا" },
  { id: "spn", category: "hot", name: "سبانش لاتيه", description: "لاتيه بالحليب المكثف المحلى", icon: "latte", tone: "caramel", sizes: [{ label: "وسط", price: 80 }, { label: "كبير", price: 95 }] },
  { id: "tur", category: "hot", name: "قهوة تركي", description: "محوجة أو سادة، في الكنكة", icon: "cup", tone: "espresso", price: 40 },
  { id: "ice", category: "cold", name: "آيس لاتيه", description: "لاتيه ساقع على تلج", icon: "iced", tone: "ice", sizes: [{ label: "وسط", price: 75 }, { label: "كبير", price: 90 }] },
  { id: "frp", category: "cold", name: "فرابيه كراميل", description: "قهوة مخفوقة بالكراميل والكريمة", icon: "frappe", tone: "caramel", price: 95, badge: "جديد" },
  { id: "lem", category: "cold", name: "ليمون نعناع", description: "ليمون فريش بالنعناع ومتلج", icon: "citrus", tone: "mint", price: 55 },
  { id: "mng", category: "cold", name: "مانجا فريش", description: "مانجا طبيعي بدون سكر مضاف", icon: "citrus", tone: "mango", price: 70, soldOut: true },
  { id: "chs", category: "sweet", name: "تشيز كيك لوتس", description: "قاعدة بسكويت لوتس وكريمة جبن", icon: "cake", tone: "caramel", price: 85 },
  { id: "brw", category: "sweet", name: "براونيز", description: "شوكولاتة داكنة، تتقدم سخنة", icon: "cake", tone: "espresso", price: 60 },
  { id: "crs", category: "food", name: "كرواسون زبدة", description: "مخبوز يوميا", icon: "croissant", tone: "milk", price: 45 },
  { id: "sdw", category: "food", name: "سندوتش حلومي", description: "حلومي مشوي، طماطم، جرجير، عيش ساور دو", icon: "sandwich", tone: "mint", price: 95 },
];
