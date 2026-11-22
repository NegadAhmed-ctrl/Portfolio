// Sample listings (fictional office, realistic Alexandria areas and 2026 prices).
// In a real project this file is replaced by a Google Sheet / Supabase table with the same fields.

export const AREAS = [
  { id: "loran", name: "لوران" },
  { id: "smouha", name: "سموحة" },
  { id: "kafr-abdo", name: "كفر عبده" },
  { id: "rushdy", name: "رشدي" },
  { id: "sporting", name: "سبورتنج" },
  { id: "miami", name: "ميامي" },
  { id: "sidi-bishr", name: "سيدي بشر" },
  { id: "maamoura", name: "المعمورة" },
];

export const TYPES = [
  { id: "apartment", name: "شقة" },
  { id: "duplex", name: "دوبلكس" },
  { id: "roof", name: "روف" },
  { id: "studio", name: "استوديو" },
  { id: "chalet", name: "شاليه" },
];

export const FINISHING = { "super-lux": "سوبر لوكس", lux: "لوكس", semi: "نص تشطيب" };
export const VIEWS = { sea: "على البحر", "side-sea": "جانبي بحر", street: "على شارع رئيسي", garden: "على جنينة", inner: "على منور واسع" };

// purpose: sale -> price is the total in EGP; rent -> price is per month in EGP.
// facing: the side the main rooms open to. In Alexandria "بحري" (north, sea breeze) is the selling point.
export const UNITS = [
  { id: "LR-0412", purpose: "sale", type: "apartment", area: "loran", street: "شارع عبد السلام عارف", size: 165, rooms: 3, baths: 2, floor: 4, floors: 9, facing: "بحري", view: "side-sea", finishing: "super-lux", price: 7250000, payment: "كاش أو مقدم ٥٠٪ والباقي على سنتين", elevator: true, garage: false, year: 2019, listed: "2026-11-18", agent: "شريف منصور",
    note: "ريسبشن ٣ قطع بشباك بحري، مطبخ مقفول، وغرفة نوم ماستر بحمام. العمارة فيها أسانسير وبواب." },
  { id: "SM-0907", purpose: "sale", type: "apartment", area: "smouha", street: "شارع فوزي معاذ", size: 180, rooms: 3, baths: 2, floor: 7, floors: 12, facing: "قبلي", view: "garden", finishing: "lux", price: 6400000, payment: "كاش", elevator: true, garage: true, year: 2014, listed: "2026-11-15", agent: "داليا عزت",
    note: "قريبة من نادي سموحة، جراج خاص في البدروم، وتشطيب لوكس محتاج دهان بس." },
  { id: "KA-0203", purpose: "sale", type: "apartment", area: "kafr-abdo", street: "شارع ٤٥ كفر عبده", size: 230, rooms: 4, baths: 3, floor: 2, floors: 5, facing: "بحري", view: "garden", finishing: "super-lux", price: 13800000, payment: "كاش", elevator: true, garage: true, year: 2008, listed: "2026-11-10", agent: "شريف منصور",
    note: "شقة واسعة في شارع هادي، ريسبشن كبير على جنينة العمارة، وغرفة دادة بحمام." },
  { id: "RS-0601", purpose: "sale", type: "apartment", area: "rushdy", street: "شارع مصطفى كامل", size: 145, rooms: 3, baths: 2, floor: 6, floors: 10, facing: "شرقي", view: "street", finishing: "lux", price: 5150000, payment: "مقدم ٤٠٪ والباقي على ٣ سنين", elevator: true, garage: false, year: 2011, listed: "2026-11-20", agent: "داليا عزت",
    note: "على شارع مصطفى كامل، قريبة من الترام والمدارس. التقسيط من المالك مباشرة." },
  { id: "SP-1102", purpose: "sale", type: "apartment", area: "sporting", street: "طريق الجيش", size: 125, rooms: 2, baths: 1, floor: 11, floors: 13, facing: "بحري", view: "sea", finishing: "super-lux", price: 6900000, payment: "كاش", elevator: true, garage: false, year: 2017, listed: "2026-11-19", agent: "شريف منصور",
    note: "فيو بحر مفتوح من الريسبشن والبلكونة. أسانسيرين ومولد كهربا للعمارة." },
  { id: "MI-0305", purpose: "sale", type: "apartment", area: "miami", street: "شارع خالد بن الوليد", size: 120, rooms: 3, baths: 1, floor: 3, floors: 8, facing: "غربي", view: "street", finishing: "lux", price: 3250000, payment: "كاش أو تمويل عقاري", elevator: true, garage: false, year: 2006, listed: "2026-11-12", agent: "داليا عزت",
    note: "قريبة من خالد بن الوليد والمواصلات. ٣ غرف بمساحات معقولة ومطبخ أمريكاني." },
  { id: "SB-0504", purpose: "sale", type: "apartment", area: "sidi-bishr", street: "شارع جمال عبد الناصر", size: 105, rooms: 2, baths: 1, floor: 5, floors: 9, facing: "قبلي", view: "inner", finishing: "semi", price: 2350000, payment: "مقدم ٣٠٪ والباقي على ٤ سنين", elevator: true, garage: false, year: 2023, listed: "2026-11-08", agent: "شريف منصور",
    note: "نص تشطيب (محارة وكهربا وسباكة)، مناسبة لحد عايز يشطب على ذوقه." },
  { id: "MA-0101", purpose: "sale", type: "chalet", area: "maamoura", street: "المعمورة الشاطئ، الحي الرابع", size: 90, rooms: 2, baths: 1, floor: 1, floors: 3, facing: "بحري", view: "side-sea", finishing: "lux", price: 3600000, payment: "كاش", elevator: false, garage: false, year: 2001, listed: "2026-11-05", agent: "داليا عزت",
    note: "شاليه دور أول، ٥ دقايق مشي من الشط، بلكونة واسعة. مناسب للمصيف أو الإيجار في الصيف." },
  { id: "LR-0909", purpose: "sale", type: "duplex", area: "loran", street: "شارع الشهيد محمد عبد العزيز", size: 260, rooms: 4, baths: 3, floor: 8, floors: 9, facing: "بحري", view: "side-sea", finishing: "super-lux", price: 11400000, payment: "كاش أو مقدم ٦٠٪", elevator: true, garage: true, year: 2016, listed: "2026-11-17", agent: "شريف منصور",
    note: "دوبلكس آخر دورين: تحت ريسبشن ومطبخ وغرفة ضيوف، وفوق ٣ غرف وتراس." },
  { id: "SM-1201", purpose: "sale", type: "roof", area: "smouha", street: "شارع ألبرت الأول", size: 140, rooms: 2, baths: 2, floor: 12, floors: 12, facing: "بحري", view: "street", finishing: "lux", price: 4700000, payment: "كاش", elevator: true, garage: false, year: 2015, listed: "2026-11-14", agent: "داليا عزت",
    note: "روف بتراس ٦٠ متر خاص غير المساحة، مناسب لحد بيحب القعدة برا." },
  { id: "SM-0402R", purpose: "rent", type: "apartment", area: "smouha", street: "شارع فوزي معاذ", size: 170, rooms: 3, baths: 2, floor: 4, floors: 11, facing: "بحري", view: "garden", finishing: "super-lux", price: 32000, payment: "تأمين شهرين، عقد سنة", elevator: true, garage: true, year: 2013, listed: "2026-11-21", agent: "داليا عزت", furnished: true,
    note: "مفروشة بالكامل وتكييفات في كل الغرف. مناسبة لعيلة أو شركة." },
  { id: "LR-0603R", purpose: "rent", type: "apartment", area: "loran", street: "شارع عبد السلام عارف", size: 130, rooms: 2, baths: 1, floor: 6, floors: 9, facing: "شرقي", view: "street", finishing: "lux", price: 17500, payment: "تأمين شهر، عقد سنة", elevator: true, garage: false, year: 2009, listed: "2026-11-19", agent: "شريف منصور", furnished: false,
    note: "فاضية، مطبخ متركب، قريبة من محطة ترام لوران." },
  { id: "KA-0302R", purpose: "rent", type: "apartment", area: "kafr-abdo", street: "شارع صلاح مصطفى", size: 220, rooms: 4, baths: 3, floor: 3, floors: 5, facing: "بحري", view: "garden", finishing: "super-lux", price: 48000, payment: "تأمين شهرين، عقد سنتين", elevator: true, garage: true, year: 2010, listed: "2026-11-16", agent: "شريف منصور", furnished: true,
    note: "مفروشة، شارع هادي جدًا، أمن ٢٤ ساعة. مناسبة للسفارات والشركات." },
  { id: "MI-0702R", purpose: "rent", type: "apartment", area: "miami", street: "شارع ٤٥", size: 110, rooms: 2, baths: 1, floor: 7, floors: 10, facing: "بحري", view: "side-sea", finishing: "lux", price: 12500, payment: "تأمين شهر، عقد سنة", elevator: true, garage: false, year: 2012, listed: "2026-11-20", agent: "داليا عزت", furnished: false,
    note: "جانبي بحر من البلكونة، فاضية، والإيجار شامل البواب." },
  { id: "SP-0201R", purpose: "rent", type: "studio", area: "sporting", street: "شارع بورسعيد", size: 55, rooms: 1, baths: 1, floor: 2, floors: 7, facing: "قبلي", view: "street", finishing: "super-lux", price: 9500, payment: "تأمين شهر، عقد ٦ شهور", elevator: true, garage: false, year: 2020, listed: "2026-11-13", agent: "شريف منصور", furnished: true,
    note: "استوديو مفروش لفرد أو اتنين، قريب من الجامعات في الشاطبي." },
  { id: "MA-0102R", purpose: "rent", type: "chalet", area: "maamoura", street: "المعمورة الشاطئ، الحي الأول", size: 85, rooms: 2, baths: 1, floor: 1, floors: 3, facing: "بحري", view: "sea", finishing: "lux", price: 14000, payment: "إيجار شتوي ٦ شهور", elevator: false, garage: false, year: 1998, listed: "2026-11-11", agent: "داليا عزت", furnished: true,
    note: "إيجار شتوي بسعر أقل من الصيف، مفروش وقدامه البحر على طول." },
];

export function areaName(id) {
  return AREAS.find((a) => a.id === id)?.name ?? id;
}
export function typeName(id) {
  return TYPES.find((t) => t.id === id)?.name ?? id;
}
export function findUnit(id) {
  return UNITS.find((u) => u.id === id) ?? null;
}
