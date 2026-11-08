// Every sentence the assistant says, in English and Egyptian Arabic.
// Edit the wording here to match a client's tone. {placeholders} are filled in.

const STR = {
  welcome: {
    en: "Hi! I'm {assistant}, the virtual assistant for {clinic}. I can answer questions, and book, change or cancel appointments. How can I help?",
    ar: 'أهلًا بيك! أنا {assistant}، المساعد الافتراضي لـ{clinic}. أقدر أرد على أسئلتك، وأحجزلك أو أغيّر أو ألغي ميعاد. أقدر أساعدك في إيه؟',
  },
  menu: { en: ['Book an appointment', 'Prices', 'Opening hours', 'Location', 'Talk to staff'], ar: ['احجز ميعاد', 'الأسعار', 'المواعيد', 'العنوان', 'كلم حد من العيادة'] },
  askService: { en: 'Sure! Which service would you like to book?', ar: 'تمام! تحب تحجز أنهي خدمة؟' },
  askDate: { en: '{service} it is. Which day suits you? (e.g. tomorrow, Saturday, 12/11)', ar: 'تمام، {service}. يناسبك يوم إيه؟ (مثلًا: بكرة، السبت، ١٢/١١)' },
  daysQuick: { en: ['Today', 'Tomorrow', 'Earliest available'], ar: ['النهارده', 'بكرة', 'أقرب ميعاد'] },
  closedDay: { en: "We're closed on {date}.", ar: 'العيادة إجازة يوم {date}.' },
  noSlotsDay: { en: 'No free times left on {date}.', ar: 'مفيش مواعيد فاضية يوم {date}.' },
  offerSlots: { en: 'Here are the nearest free times{forDate}. Reply with the number, or tell me another time:', ar: 'دي أقرب مواعيد فاضية{forDate}. ابعت رقم الميعاد، أو قولي وقت تاني:' },
  forDate: { en: ' on {date}', ar: ' يوم {date}' },
  noSlotsAtAll: { en: "I couldn't find free times in the next few days. I'll ask our team to contact you with options.", ar: 'مش لاقي مواعيد فاضية في الأيام الجاية. هخلي فريق العيادة يتواصل معاك بالاختيارات المتاحة.' },
  slotTaken: { en: 'Sorry, that time is not available.', ar: 'معلش، الوقت ده مش متاح.' },
  askName: { en: 'Great, {slot} is free. What name should I put the booking under?', ar: 'تمام، {slot} متاح. الحجز يكون باسم مين؟' },
  askPhone: { en: 'Thanks {name}. What mobile number can we reach you on? (used for your confirmation and reminder)', ar: 'شكرًا يا {name}. ابعتلي رقم الموبايل عشان نبعتلك التأكيد والتذكير.' },
  badPhone: { en: "That doesn't look like a valid mobile number. Please send it with country code or as 01xxxxxxxxx.", ar: 'الرقم ده شكله مش مظبوط. ابعته كده مثلًا 01xxxxxxxxx أو بكود الدولة.' },
  badName: { en: 'Please send the patient\'s name (first and last name is best).', ar: 'ابعتلي اسم المريض (الاسم الأول والأخير أفضل).' },
  confirmBooking: { en: 'Please confirm your booking:\n• Service: {service}\n• Time: {slot}\n• Name: {name}\n• Mobile: {phone}\nShall I confirm it?', ar: 'من فضلك أكّد الحجز:\n• الخدمة: {service}\n• الميعاد: {slot}\n• الاسم: {name}\n• الموبايل: {phone}\nأأكّد الحجز؟' },
  yesNo: { en: ['Yes, confirm', 'Change something'], ar: ['أيوه، أكّد', 'عايز أغيّر حاجة'] },
  booked: { en: "You're booked ✅\n{service} – {slot}\nBooking code: {code}\nYou'll get a reminder the day before. To change or cancel, just message me with your code.", ar: 'تم الحجز ✅\n{service} – {slot}\nكود الحجز: {code}\nهيوصلك تذكير قبلها بيوم. لو حابب تغيّر أو تلغي ابعتلي الكود.' },
  duplicate: { en: 'You already have a booking for {service} on {slot} (code {code}). Would you like to keep it, or change it?', ar: 'إنت عندك حجز بالفعل لـ{service} يوم {slot} (كود {code}). تحب تسيبه زي ما هو ولا تغيّره؟' },
  whatChange: { en: 'No problem. What would you like to change?', ar: 'ولا يهمك. تحب تغيّر إيه؟' },
  changeOpts: { en: ['Time', 'Service', 'Cancel booking request'], ar: ['الميعاد', 'الخدمة', 'إلغاء الطلب'] },
  flowCancelled: { en: "Okay, I've stopped that. Anything else I can help with?", ar: 'تمام، وقفت الطلب. أقدر أساعدك في حاجة تانية؟' },
  askIdentify: { en: 'Sure. Please send your booking code (like SH-4F7K) or the mobile number you booked with.', ar: 'تمام. ابعتلي كود الحجز (زي SH-4F7K) أو رقم الموبايل اللي حجزت بيه.' },
  notFound: { en: "I couldn't find an upcoming booking with that. Please check the code or number, or I can connect you to our team.", ar: 'مش لاقي حجز جاي بالبيانات دي. اتأكد من الكود أو الرقم، أو أوصلك بفريق العيادة.' },
  chooseBooking: { en: 'I found these bookings. Which one?', ar: 'لقيت الحجوزات دي. أنهي واحد؟' },
  confirmCancel: { en: 'Cancel {service} on {slot} (code {code})?', ar: 'ألغي {service} يوم {slot} (كود {code})؟' },
  cancelOpts: { en: ['Yes, cancel it', 'No, keep it'], ar: ['أيوه، ألغيه', 'لأ، سيبه'] },
  cancelled: { en: 'Your appointment {code} has been cancelled. Would you like to book another time?', ar: 'تم إلغاء الحجز {code}. تحب تحجز ميعاد تاني؟' },
  kept: { en: 'Okay, your appointment stays as it is.', ar: 'تمام، الحجز زي ما هو.' },
  rescheduleWhen: { en: 'Moving {service} (currently {slot}). Which day would you prefer?', ar: 'هنغيّر ميعاد {service} (حاليًا {slot}). يناسبك يوم إيه؟' },
  askNewDate: { en: 'Which day would you like to move it to? (e.g. tomorrow, Monday, 12/11)', ar: 'تحب تنقله ليوم إيه؟ (مثلًا: بكرة، الاتنين، ١٢/١١)' },
  confirmReschedule: { en: 'Move {service} from {old} to {slot}?', ar: 'أنقل {service} من {old} لـ {slot}؟' },
  rescheduled: { en: 'Done ✅ {service} is now on {slot}. Your code is still {code}.', ar: 'تم ✅ {service} بقى يوم {slot}. الكود زي ما هو {code}.' },
  lateChange: { en: 'This appointment is less than {hours} hours away, so I can\'t change it here. I\'ve asked our team to help you directly.', ar: 'الميعاد ده باقي عليه أقل من {hours} ساعات، فمش هقدر أغيّره من هنا. بلّغت فريق العيادة يساعدك مباشرة.' },
  medical: {
    en: "I'm not able to give medical advice or a diagnosis — only the dentist can do that after examining you. The safest next step is a check-up. Would you like me to book the earliest available one?",
    ar: 'مش هقدر أدي نصيحة طبية أو تشخيص، ده بيحدده الدكتور بعد الكشف. أنسب خطوة إنك تحجز كشف. تحب أحجزلك أقرب ميعاد متاح؟',
  },
  medicalOpts: { en: ['Book earliest check-up', 'Talk to staff'], ar: ['احجز أقرب كشف', 'كلم حد من العيادة'] },
  handoff: { en: "I've passed your conversation to {staff}. They'll reply here {within}. Ticket: {ticket}", ar: 'حوّلت المحادثة لـ{staff}، وهيردوا عليك هنا {within}. رقم الطلب: {ticket}' },
  inHandoff: { en: 'Thanks, I\'ve added that to your request. A team member will reply here soon.', ar: 'تمام، ضفت رسالتك للطلب. حد من الفريق هيرد عليك هنا قريب.' },
  dontKnow: { en: "I don't have that information. I can connect you to our team, or help you book an appointment.", ar: 'معنديش المعلومة دي. أقدر أوصلك بفريق العيادة، أو أساعدك تحجز ميعاد.' },
  dontKnowOpts: { en: ['Talk to staff', 'Book an appointment'], ar: ['كلم حد من العيادة', 'احجز ميعاد'] },
  anythingElse: { en: 'Would you like to book an appointment?', ar: 'تحب أحجزلك ميعاد؟' },
  bookOpts: { en: ['Book an appointment', 'No, thanks'], ar: ['احجز ميعاد', 'لأ، شكرًا'] },
  thanks: { en: "You're welcome! Message me anytime.", ar: 'العفو! ابعتلي في أي وقت.' },
  bye: { en: 'No problem. Have a great day!', ar: 'ولا يهمك، يومك سعيد!' },
  backToStep: { en: 'Back to your booking:', ar: 'نرجع للحجز:' },
  staffReturned: { en: 'You are now back with the virtual assistant. How can I help?', ar: 'رجعت للمساعد الافتراضي تاني. أقدر أساعدك في إيه؟' },
  error: { en: "Sorry, something went wrong on our side. I've told the team; please try again in a moment.", ar: 'معلش، حصلت مشكلة عندنا. بلّغت الفريق، جرّب تاني كمان شوية.' },
  confirmMsg: { en: 'Hi {name}, your {service} appointment at {clinic} is confirmed for {slot}. Code: {code}. Address: {address}. Reply to change or cancel.', ar: 'أهلًا {name}، حجزك لـ{service} في {clinic} اتأكد يوم {slot}. الكود: {code}. العنوان: {address}. لو حابب تغيّر أو تلغي رد على الرسالة دي.' },
  reminderMsg: { en: 'Reminder: {name}, you have a {service} appointment at {clinic} tomorrow, {slot}. Reply 1 to confirm or 2 to reschedule.', ar: 'تذكير: يا {name}، عندك ميعاد {service} في {clinic} بكرة، {slot}. رد بـ ١ للتأكيد أو ٢ للتغيير.' },
};

export function t(key, lang, vars = {}) {
  const entry = STR[key];
  if (!entry) return key;
  let v = entry[lang] ?? entry.en;
  if (Array.isArray(v)) return v;
  return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
