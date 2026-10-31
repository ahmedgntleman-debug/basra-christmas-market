// English interface (Arabic stays the default).
// Works on the rendered page: every Arabic interface text is mapped to English when the
// language is set to English, including text that appears later (dialogs, toasts, lists).
// Data typed by users (customer names, notes) is left as written.

export const LANG = (() => { try { return localStorage.getItem('bcm.lang') || 'ar'; } catch { return 'ar'; } })();
export function setLang(l) { try { localStorage.setItem('bcm.lang', l); } catch {} location.reload(); }
export const isEn = () => LANG === 'en';

const D = {
  'اكتب auto ليختار النظام أحدث نموذج متاح تلقائياً، حتى لو أوقفت Google نموذجاً قديماً.': 'Type auto to let the system pick the newest available model, even when Google retires an old one.',
  'موعد تسديد لكل الحجوزات غير المدفوعة — هل تؤكد؟': 'One payment deadline for all unpaid bookings — confirm?', 'آخر موعد للتسديد': 'Payment deadline', 'عدد الحجوزات': 'Bookings', 'الجهات': 'Customers',
  '↺ إعادة الكشك للحجز': '↺ Make bookable again',
  'حذف من الخريطة نهائياً': 'Delete from the map permanently',
  'جعل الكشك غير متاح': 'Make kiosk unavailable',
  'هذا الكشك غير متاح للإيجار.': 'This kiosk is not offered for rent.',
  'سيُحذف الكشك نهائياً من الخريطة ومن قائمة الأكشاك.': 'The kiosk will be permanently removed from the map and the kiosk list.',
  '⇄ تبديل كشكين': '⇄ Switch two kiosks',
  '⇄ تبديل مع كشك آخر': '⇄ Switch with another kiosk',
  '⇄ تنفيذ التبديل': '⇄ Switch now',
  'اضغط على الكشك الأول الذي تريد تبديله.': 'Tap the first kiosk you want to switch.',
  'تبديل الحجوزات بين الكشكين': 'Swap the bookings between the two kiosks',
  'تبديل مكان الكشكين على الخريطة': 'Swap the two kiosks’ places on the map',
  'لا توجد حجوزات — متوفر': 'No bookings — available',
  'تم التراجع عن التبديل': 'Switch undone',
  'تراجع': 'Undo',
  'الأسعار المتفق عليها لا تتغير. العقود المطبوعة سابقاً تبقى بالرقم القديم؛ افتح العقد من الحجز لطباعته بالرقم الجديد.': 'Agreed prices do not change. Contracts printed earlier keep the old number; open the contract from the booking to print it with the new one.',
  'يبقى كل حجز على رقم كشكه، لكن موقعي الكشكين يتبادلان على الخريطة. استخدمه عند نقل الكشكين فعلياً في الموقع.': 'Each booking keeps its kiosk number, but the two kiosks swap positions on the map. Use it when the kiosks are physically moved on site.',
  // P&L
  'الأرباح والخسائر': 'Profit & Loss',
  'قائمة الأرباح والخسائر': 'Profit & Loss statement',
  'قيود الإيرادات والمصاريف': 'Income & expense entries',
  'كامل النسخة (مع مصاريف التحضير)': 'Whole edition (incl. preparation costs)',
  'أيام المهرجان فقط': 'Festival days only',
  'فترة مخصصة': 'Custom period',
  'حسب العقود': 'Contract basis',
  'حسب المحصّل': 'Cash basis',
  '＋ إيراد يومي': '＋ Daily income',
  '＋ مصروف يومي': '＋ Daily expense',
  '＋ مصروف تشغيلي': '＋ Operating expense',
  '＋ إيراد آخر': '＋ Other income',
  'استيراد من Excel': 'Import from Excel',
  'تقرير احترافي / PDF': 'Professional report / PDF',
  'إجمالي الإيرادات': 'Total revenue',
  'إجمالي المصاريف': 'Total expenses',
  'صافي الربح': 'Net profit',
  'صافي الخسارة': 'Net loss',
  'مجمل الربح': 'Gross profit',
  'تغطية المصاريف': 'Expense coverage',
  'الزوار': 'Visitors',
  'مستحقات غير محصّلة': 'Uncollected receivables',
  'القائمة المالية': 'Financial statement',
  'البند': 'Line item',
  'المبلغ (د.ع)': 'Amount (IQD)',
  '% من الإيرادات': '% of revenue',
  'الإيرادات': 'Revenue',
  'إيجار الأكشاك': 'Kiosk rent',
  'الرعاية': 'Sponsorship',
  'المصاريف اليومية (المباشرة)': 'Daily (direct) expenses',
  'إجمالي المصاريف اليومية': 'Total daily expenses',
  'المصاريف التشغيلية': 'Operating expenses',
  'إجمالي المصاريف التشغيلية': 'Total operating expenses',
  'مصادر الإيرادات': 'Revenue sources',
  'توزيع المصاريف': 'Expense breakdown',
  'الإيرادات والمصاريف يوماً بيوم': 'Revenue and expenses day by day',
  'الحركة اليومية': 'Daily movement',
  'المصاريف': 'Expenses',
  'صافي اليوم': 'Net for the day',
  'التراكمي': 'Cumulative',
  'إيرادات العقود': 'Contract revenue',
  'إيراد يومي': 'Daily income',
  'إيراد آخر': 'Other income',
  'مصاريف يومية': 'Daily expenses',
  'مصاريف تشغيلية': 'Operating expenses',
  'مصروف يومي': 'Daily expense',
  'مصروف تشغيلي': 'Operating expense',
  'قيد مالي جديد': 'New entry',
  'تعديل قيد': 'Edit entry',
  'النوع': 'Type',
  'المصدر / البند': 'Source / item',
  'الوصف': 'Description',
  'حفظ وإضافة آخر': 'Save and add another',
  'حذف القيد': 'Delete entry',
  'الجهة الدافعة (اختياري)': 'Paid by (optional)',
  'المستلم / المورّد (اختياري)': 'Paid to / supplier (optional)',
  'كل الأنواع': 'All types',
  'لا توجد قيود': 'No entries',
  'تنزيل قالب جاهز': 'Download template',
  'استيراد': 'Import',
  'استيراد الإيرادات والمصاريف من Excel': 'Import income and expenses from Excel',
  'الإيرادات تغطي المصاريف': 'Revenue covers expenses',
  'لم تصل لنقطة التعادل بعد': 'Not yet at break-even',
  'لا توجد مصاريف بعد': 'No expenses yet',
  'حسب قيمة العقود موزعة على الأيام': 'contract value spread over the days',
  'حسب المبالغ المحصّلة فعلياً': 'amounts actually collected',
  'لا توجد مصاريف يومية مسجلة': 'No daily expenses recorded',
  'لا توجد مصاريف تشغيلية مسجلة': 'No operating expenses recorded',
  'لا توجد بيانات بعد.': 'No data yet.',
  'تم حذف القيد': 'Entry deleted',
  // festive layer
  'إدارة الأكشاك': 'Kiosk management', 'زلاجة بابا نويل — اضغط عليها': 'Santa’s sleigh — tap it', '🎶 Jingle Bells — اضغط على الزلاجة لإيقافها': '🎶 Jingle Bells — tap the sleigh to stop',
  '＋ إضافة كشك': '＋ Add kiosk', '－ حذف كشك': '－ Remove kiosk', 'اضغط على المكان الفارغ في الخريطة حيث تريد إضافة الكشك الجديد.': 'Tap an empty spot on the map where the new kiosk should go.',
  'اضغط على الكشك الذي تريد حذفه من الخريطة.': 'Tap the kiosk you want to remove from the map.', 'إنهاء': 'Done', 'كشك جديد': 'New kiosk', 'إضافة الكشك': 'Add kiosk',
  'سيظهر الكشك في المكان الذي ضغطت عليه. يمكنك تحريكه أو تغيير حجمه لاحقاً من «تحرير الخريطة».': 'The kiosk appears where you tapped. You can move or resize it later in “Edit map”.',
  'الفئة (اختياري)': 'Category (optional)', 'الحجم والاتجاه': 'Size and direction', 'إضافة كشك آخر': 'Add another kiosk', 'حذف الكشك': 'Delete kiosk',
  'سيُحذف الكشك من الخريطة ومن قائمة الأكشاك. لا توجد عليه حجوزات.': 'The kiosk will be removed from the map and the kiosk list. It has no bookings.',
  'امسح رسم الكشك المطبوع على صورة الخريطة أيضاً': 'Also erase the kiosk drawn on the map image',
  'فعّل هذا الخيار إذا كان الكشك مرسوماً في صورة المخطط الأصلية، حتى لا يبقى مربعه ظاهراً بعد الحذف. يمكنك التراجع عن المسح بعد الحذف مباشرة.': 'Use this when the kiosk is printed on the original plan image so its box does not stay visible. You can undo the erase right after.',
  'تراجع عن مسح الرسم': 'Undo erase', 'أُعيدت صورة الخريطة السابقة': 'Previous map image restored', 'فتح الحجز': 'Open booking', 'جعله غير متاح': 'Make unavailable', 'إغلاق': 'Close',
  'على هذا الكشك حجوزات ملغاة محفوظة في السجل، لذلك لا يُحذف. يمكنك إخفاؤه كـ«غير متاح» بدلاً من ذلك.': 'This kiosk has cancelled bookings kept in the record, so it cannot be deleted. You can mark it “Not available” instead.', 'يفتتح المهرجان بعد': 'The festival opens in', 'يوم': 'days', 'ساعة': 'hours', 'دقيقة': 'min', 'ثانية': 'sec',
  '❄ الزينة: تعمل': '❄ Decorations: on', '❄ الزينة: متوقفة': '❄ Decorations: off', 'زينة': 'Ornament', 'هو هو هو! 🎅': 'Ho ho ho! 🎅',
  'شجرة الميلاد — اضغط لإضاءتها': 'Christmas tree — tap to light it', 'زلاجة بابا نويل': 'Santa’s sleigh', 'شكراً لكم — نلقاكم في الموسم القادم ✨': 'Thank you — see you next season ✨',
  'عقد الإيجار': 'Rental contract', 'عقد الرعاية': 'Sponsorship contract', 'عيد ميلاد مجيد وعام سعيد': 'Merry Christmas and a Happy New Year',
  // shell & navigation
  'سوق البصرة لعيد الميلاد': 'Basra Christmas Market', 'سوق البصرة': 'Basra', 'لعيد الميلاد': 'Christmas Market',
  'الرئيسية': 'Home', 'الخريطة': 'Map', 'الحجوزات': 'Reservations', 'العملاء': 'Customers', 'التقارير': 'Reports', 'الإعدادات': 'Settings',
  'القائمة الرئيسية': 'Main menu', 'تسجيل الخروج': 'Sign out', 'خروج': 'Sign out', 'تسجيل الدخول': 'Sign in', 'البريد الإلكتروني': 'Email', 'كلمة المرور': 'Password',
  'نسخة المهرجان': 'Festival edition', 'خريطة الأكشاك': 'Kiosk map', 'المساعد الذكي': 'Smart assistant', 'Basra Christmas Market — إدارة الأكشاك': 'Basra Christmas Market — Kiosk management',
  'إدارة الأكشاك — Basra Christmas Market': 'Kiosk management — Basra Christmas Market',
  'مدير عام': 'Super administrator', 'مدير الحجوزات': 'Reservation manager', 'المسؤول المالي': 'Finance officer', 'اطلاع فقط': 'Read-only',
  // status
  'متوفر': 'Available', 'محجوز': 'Reserved', 'حجز مؤقت': 'Temporary hold', 'متوفر جزئياً': 'Partly available', 'غير متاح': 'Not available',
  'مسدد بالكامل': 'Fully paid', 'مسدد جزئياً': 'Partly paid', 'غير مسدد': 'Unpaid', 'متأخر': 'Overdue', 'السعر غير محدد': 'Price not yet confirmed', 'ملغى': 'Cancelled', 'مؤكد': 'Confirmed',
  'مسدد': 'Paid', 'مستحق': 'Due', 'مؤقت': 'Temporary', 'غير محدد': 'Not set',
  // dashboard
  'إجمالي الأكشاك': 'Total kiosks', 'محجوزة بالكامل': 'Fully reserved', 'محجوزة جزئياً': 'Partly reserved', 'محجوز جزئياً': 'Partly booked', 'محجوز لجزء من الفترة المعروضة فقط، وباقي الأيام متاحة للحجز.': 'Booked for part of the shown period only; the other days are free to book.', 'متوفرة': 'Available', 'حجوزات مؤقتة': 'Temporary holds',
  'العملاء المشاركون': 'Participating customers', 'قيمة العقود': 'Contract value', 'المبالغ المحصلة': 'Collected', 'المبالغ المتبقية': 'Outstanding', 'دفعات متأخرة': 'Overdue payments',
  'حجوزات بلا سعر': 'Unpriced reservations', 'تخصيص البطاقات': 'Customize cards', 'البطاقات الظاهرة في الرئيسية': 'Cards shown on Home',
  'المهرجان قائم الآن': 'The festival is running', 'انتهت هذه النسخة': 'This edition has ended', 'يفتتح بعد': 'Opens in', 'من الأكشاك عليها حجز': 'of kiosks have a booking',
  'دفعات تستحق المتابعة': 'Payments to follow up', 'يمكن إيقاف هذه التنبيهات من الإعدادات': 'You can turn these alerts off in Settings',
  'لديه مبلغ متبقٍ قدره': 'has an outstanding balance of', 'وموعد التسديد': 'due', 'متأخر منذ': 'overdue since', 'غداً': 'tomorrow',
  'إعداد تذكير': 'Prepare reminder', 'تأجيل يوم': 'Snooze 1 day', 'تجاهل': 'Dismiss', 'عرض الحجز': 'View reservation',
  'تحليلات هذه النسخة': 'This edition’s analytics', 'من الحجوزات المسجلة فقط': 'From recorded reservations only', 'إشغال أيام الأكشاك': 'Kiosk-day occupancy',
  'نسبة التحصيل من العقود المسعّرة': 'Collection rate (priced contracts)', 'متوسط مدة الحجز': 'Average booking length', 'الجهات المشاركة': 'Participating customers',
  'المجموعة': 'Group', 'الأكشاك': 'Kiosks', 'عليها حجز': 'Booked', 'الإشغال': 'Occupancy', 'الإيراد المتعاقد': 'Contracted revenue', 'أعلى الأكشاك إيراداً': 'Top kiosks by revenue',
  'عند حجز عدة أكشاك بعقد واحد يُقسَم المبلغ عليها بالتساوي.': 'a contract covering several kiosks is split equally between them.',
  'لا توجد نسخة مهرجان بعد': 'No festival edition yet', 'شغّل ملف seed.sql من دليل التشغيل لإضافة نسخة 2026 والأكشاك، أو أنشئ نسخة من الإعدادات.': 'Run seed.sql from the setup guide to add the 2026 edition and kiosks, or create an edition in Settings.',
  // map
  'من تاريخ': 'From', 'إلى تاريخ': 'To', 'من': 'From', 'إلى': 'to', 'كامل المهرجان': 'Whole festival', 'اليوم': 'Today', 'كل أيام المهرجان': 'All festival days',
  'ابحث برقم الكشك أو اسم العميل': 'Search kiosk number or customer', 'كل المجموعات': 'All groups', 'تحديد عدة أكشاك': 'Select several kiosks', 'تحرير الخريطة': 'Edit map',
  'الفترة': 'Period', 'اختر كشكاً': 'Choose a kiosk', 'اضغط على أي كشك في الخريطة لعرض حجوزاته أو حجزه. لحجز عدة أكشاك لنفس الجهة فعّل «تحديد عدة أكشاك».': 'Tap any kiosk on the map to see or make bookings. To book several kiosks for one customer, turn on “Select several kiosks”.',
  'كشك بحاجة لتأكيد الرقم': 'kiosk(s) need number verification', 'أكشاك محددة': 'kiosks selected', 'عليها حجوزات في الفترة المختارة': 'Booked in the selected period',
  'حجز الأكشاك المحددة': 'Book selected kiosks', 'إلغاء التحديد': 'Clear selection', 'حجز هذا الكشك': 'Book this kiosk', 'أيام متوفرة': 'Free days',
  'هذا الكشك غير متاح للإيجار.': 'This kiosk is not offered for rent.', 'لا توجد حجوزات على هذا الكشك': 'No bookings on this kiosk', 'السعر الاسترشادي': 'Guide price',
  'رقم هذا الكشك بحاجة لتأكيد.': 'This kiosk number needs verification.', 'الكلي': 'Total', 'مدفوع': 'Paid', 'متبقٍ': 'Due', 'مع': 'with', 'حتى': 'until',
  'تكبير': 'Zoom in', 'تصغير': 'Zoom out', 'عرض الكل': 'Fit all', 'خريطة الأكشاك': 'Kiosk map',
  'إضافة كشك': 'Add kiosk', 'استبدال صورة الخريطة': 'Replace map image', 'تأكيد كل الأكشاك': 'Verify all kiosks',
  'اختر كشكاً ثم اسحبه لتحريكه. المقبض الذهبي في الزاوية يغيّر الحجم، والدائرة أعلاه تدوّره. كل تغيير يُحفظ فوراً.': 'Select a kiosk, then drag to move it. The gold corner handle resizes, the circle above rotates. Every change saves immediately.',
  'رقم الكشك': 'Kiosk number', 'الفئة': 'Category', 'المنطقة': 'Zone', 'الشكل': 'Shape', 'الدوران (درجة)': 'Rotation (°)', 'مستطيل': 'Rectangle', 'مثلث': 'Triangle', 'دائرة / بيضوي': 'Circle / oval',
  'السعر الاسترشادي (اختياري)': 'Guide price (optional)', 'ملاحظة داخلية': 'Internal note', 'متاح للإيجار': 'Offered for rent', 'مفعّل (يظهر كمتوفر/محجوز)': 'Active (shown as available/reserved)',
  'الرقم بحاجة لتأكيد': 'Number needs verification', 'حذف الكشك': 'Delete kiosk', 'اضغط على مكان الكشك الجديد في الخريطة': 'Click where the new kiosk goes', 'تم إيقاف الإضافة': 'Adding stopped',
  'رقم الكشك الجديد (مثل B20):': 'New kiosk number (e.g. B20):', 'كل الأكشاك مؤكدة': 'All kiosks verified', 'تم تأكيد الأكشاك': 'Kiosks verified', 'تم تحديث صورة الخريطة': 'Map image updated',
  'رفع الصورة': 'Upload image', 'سيُحذف الكشك من خريطة هذه النسخة.': 'The kiosk will be removed from this edition’s map.', 'تم حذف الكشك': 'Kiosk deleted', 'تم حفظ الكشك': 'Saved kiosk',
  'تمت إضافة الكشك': 'Added kiosk', 'يوجد كشك آخر بنفس الرقم': 'Another kiosk has this number', 'يوجد كشك بنفس الرقم': 'A kiosk with this number exists',
  'على هذا الكشك حجوزات مسجلة؛ ألغِ تفعيله بدلاً من حذفه': 'This kiosk has bookings; deactivate it instead of deleting', 'السعر غير صالح': 'Invalid price', 'اكتب رقم الكشك': 'Enter the kiosk number',
  'ستبقى الأكشاك في أماكنها النسبية على الصورة الجديدة. هل تريد المتابعة؟': 'Kiosks keep their relative positions on the new image. Continue?',
  'نسبة أبعاد الصورة الجديدة تختلف عن الحالية، لذلك قد تحتاج لتحريك الأكشاك بعد الرفع. هل تريد المتابعة؟': 'The new image has a different shape, so you may need to move kiosks afterwards. Continue?',
  // booking
  'حجز جديد': 'New reservation', 'الأكشاك': 'Kiosks', 'أضف رقم كشك مثل B5': 'Add kiosk number, e.g. B5', 'العميل أو الجهة': 'Customer or agency',
  'اكتب اسم الشركة أو الشخص أو رقم الهاتف': 'Type company, person or phone', 'رقم الهاتف': 'Phone', 'معلومات إضافية عن العميل (اختياري)': 'More customer details (optional)',
  'اسم الشركة': 'Company', 'الشخص المسؤول': 'Contact person', 'هاتف ثانٍ': 'Second phone', 'فئة العميل': 'Customer category', 'مثلاً: طعام، ألعاب، ملابس': 'e.g. food, games, clothes',
  'تغيير': 'Change', 'حجز مؤكد': 'Confirmed booking', 'نوع الحجز': 'Booking type', 'ينتهي الحجز المؤقت بعد': 'Hold expires after', 'إذا لم يُؤكَّد يُحرَّر الكشك تلقائياً': 'If not confirmed, the kiosk is released automatically',
  '24 ساعة': '24 hours', '48 ساعة': '48 hours', '3 أيام': '3 days', 'أسبوع': '1 week', 'بدون انتهاء': 'No expiry',
  'مبلغ الإيجار المتفق عليه': 'Agreed rent', 'اتركه فارغاً إذا لم يُتفق على السعر بعد': 'leave empty if the price is not agreed yet', 'مثال: 5 مليون أو 5,000,000': 'e.g. 5 مليون or 5,000,000',
  'خصم أو رسوم إضافية': 'Discount or extra charges', 'خصم': 'Discount', 'رسوم إضافية': 'Extra charges', 'دفعة أولى (اختياري)': 'First payment (optional)', 'طريقة الدفع': 'Payment method',
  'موعد تسديد المتبقي': 'Balance due date', 'ملاحظات (اختياري)': 'Notes (optional)', 'حفظ الحجز': 'Save reservation', 'إلغاء': 'Cancel', 'جارٍ الحفظ…': 'Saving…',
  'نقداً': 'Cash', 'تحويل بنكي': 'Bank transfer', 'شيك': 'Cheque', 'بطاقة': 'Card', 'أخرى': 'Other', 'مبلغ غير صالح': 'Invalid amount',
  'محجوز في هذه الفترة': 'Booked in this period', 'الكشك محجوز في هذه الفترة': 'Kiosk booked in this period', 'الكشك محجوز لجهة أخرى في هذه الفترة': 'This kiosk is booked by someone else in this period',
  'اختر كشكاً واحداً على الأقل': 'Choose at least one kiosk', 'اكتب اسم العميل، أو اختر «حجز مؤقت» إذا لم يُعرف بعد': 'Enter the customer name, or choose “Temporary hold” if not known yet',
  'تاريخ النهاية قبل تاريخ البداية': 'End date is before start date', 'تاريخ النهاية قبل البداية': 'End date is before start date', 'أحد المبالغ غير صالح': 'One of the amounts is invalid',
  'لا يوجد كشك بالرقم': 'No kiosk with number', 'تم حفظ الحجز بنجاح': 'Reservation saved', 'تم حفظ الحجز بنجاح. هل ترغب في إنشاء عقد إيجار لهذا الكشك؟': 'Reservation saved. Create a rental contract for this kiosk?',
  'إنشاء العقد': 'Create contract', 'ليس الآن': 'Not now', 'ليس لديك صلاحية إنشاء حجز': 'You don’t have permission to create reservations', 'لا يمكن تغيير التواريخ: أحد الأكشاك محجوز لجهة أخرى في هذه الفترة': 'Can’t change dates: a kiosk is booked by someone else then',
  // reservation details
  'لم يتم العثور على الحجز': 'Reservation not found', 'إضافة دفعة': 'Add payment', 'تعديل': 'Edit', 'تغيير / نقل الأكشاك': 'Change / move kiosks', 'تأكيد الحجز': 'Confirm booking',
  'عقد الإيجار': 'Rental contract', 'تذكير واتساب': 'WhatsApp reminder', 'إلغاء الحجز': 'Cancel reservation', 'التاريخ': 'Date', 'النوع': 'Type', 'المبلغ': 'Amount', 'الطريقة': 'Method',
  'ملاحظة': 'Note', 'سجّلها': 'Recorded by', 'دفعة': 'Payment', 'استرجاع': 'Refund', 'تصحيح': 'Correction', 'الإيصال': 'Receipt', 'لا توجد دفعات مسجلة بعد.': 'No payments recorded yet.',
  'عدد الأيام': 'Days', 'المبلغ الكلي': 'Total', 'المدفوع': 'Paid', 'المتبقي': 'Remaining', 'السعر المتفق / خصم / إضافات': 'Agreed / discount / extras', 'موعد التسديد': 'Due date', 'القسط القادم': 'Next installment',
  'العميل': 'Customer', 'المسؤول': 'Contact', 'حجز مؤقت بدون عميل محدد.': 'Temporary hold without a customer.', 'ملاحظات': 'Notes', 'سبب الإلغاء': 'Cancellation reason', 'سجل الدفعات': 'Payment history',
  'أُنشئ': 'Created', 'آخر تعديل': 'last edited', 'ينتهي الحجز المؤقت': 'Hold expires', 'أضف اسم العميل أولاً ثم أكّد الحجز': 'Add the customer name first, then confirm', 'تم تأكيد الحجز': 'Booking confirmed',
  'سبب الإلغاء (اختياري)': 'Cancellation reason (optional)', 'رجوع': 'Back', 'تم إلغاء الحجز وأصبحت الأكشاك متوفرة': 'Reservation cancelled; kiosks are available again',
  'وتصبح متوفرة. تبقى الدفعات في السجل': 'and they become available. Payments stay on record', 'وإذا أعدت المبلغ سجّله كاسترجاع': 'if you return money, record it as a refund',
  'سيتم إلغاء حجز': 'This will cancel the reservation of', 'للأكشاك': 'for kiosks', 'الأقساط': 'Installments', 'تعديل الأقساط': 'Edit installments', 'جدولة أقساط': 'Schedule installments',
  'موعد القسط': 'Due', 'بدون أقساط. يُعتمد موعد التسديد الواحد إن وُجد.': 'No installments. The single due date applies, if set.', 'العقود والمرفقات': 'Contracts & attachments', 'إرفاق ملف': 'Attach file',
  'لا توجد عقود محفوظة أو مرفقات.': 'No saved contracts or attachments.', 'عقد': 'Contract', 'ملف': 'File', 'عقد إيجار': 'Rental contract', 'تم إرفاق الملف': 'File attached', 'تعذر رفع الملف': 'Couldn’t upload file',
  'سجل التعديلات': 'Change history', 'إنشاء الحجز': 'Reservation created', 'الحالة': 'Status', 'البداية': 'Start', 'النهاية': 'End', 'السعر': 'Price', 'الخصم': 'Discount', 'الإضافات': 'Extras', 'الملاحظات': 'Notes', 'انتهاء الحجز المؤقت': 'Hold expiry',
  // edit / kiosks / payments
  'تعديل الحجز': 'Edit reservation', 'فارغ يعني السعر غير محدد': 'empty means price not confirmed', 'حفظ التعديلات': 'Save changes', 'الحجز المؤكد يحتاج اسم العميل': 'A confirmed booking needs a customer name', 'تم حفظ التعديلات': 'Changes saved',
  'تغيير أكشاك الحجز': 'Change reservation kiosks', 'لنقل الحجز من A1 إلى A2: احذف A1 وأضف A2 ثم احفظ.': 'To move from A1 to A2: remove A1, add A2, then save.', 'محجوز لجهة أخرى': 'Booked by someone else', 'حفظ': 'Save', 'تم تحديث الأكشاك': 'Kiosks updated',
  'ليس لديك صلاحية تسجيل دفعات': 'You don’t have permission to record payments', 'الحجز': 'Reservation', 'اختر الحجز': 'Choose the reservation', '— اختر الحجز —': '— choose reservation —', 'استرجاع مبلغ للعميل': 'Refund to customer',
  'كامل المتبقي': 'Full balance', 'تسجيل': 'Record', 'صورة الإيصال (اختياري)': 'Receipt photo (optional)', 'اكتب المبلغ': 'Enter the amount', 'تعذر رفع الإيصال': 'Couldn’t upload receipt', 'تم تسجيل': 'Recorded',
  'الدفعة': 'payment', 'الاسترجاع': 'refund', 'المتبقي الآن': 'Remaining now', 'تصحيح دفعة': 'Correct a payment', 'المبلغ المراد عكسه': 'Amount to reverse', 'السبب': 'Reason', 'تسجيل التصحيح': 'Record correction',
  'الدفعة الأصلية': 'Original payment', 'بتاريخ': 'on', 'لن تُحذف، بل يُسجَّل قيد تصحيح بالسالب حتى يبقى السجل كاملاً.': 'It won’t be deleted; a negative correction is recorded so the history stays complete.',
  'سبب التصحيح': 'Reason for correction', 'المبلغ يجب أن يكون بين 1 وقيمة الدفعة الأصلية': 'Amount must be between 1 and the original payment', 'تم تسجيل التصحيح': 'Correction recorded',
  'جدولة الأقساط': 'Schedule installments', 'قسّم المتبقي إلى': 'Split the balance into', 'أقساط، أولها': 'installments, first on', 'وكل': 'every', 'يوماً': 'days', 'تقسيم': 'Split', 'إضافة قسط': 'Add installment',
  'حفظ الأقساط': 'Save installments', 'حذف القسط': 'Delete installment', 'المتبقي حالياً': 'Current balance', 'يُعتبر القسط مسدداً عندما يغطيه مجموع الدفعات بالترتيب.': 'An installment counts as paid once payments cover it, in order.',
  'مجموع الأقساط': 'Installments total', 'غير متطابق': 'does not match', 'حدد سعر الحجز أولاً حتى يمكن تقسيمه': 'Set the reservation price first to split it', 'كل قسط يحتاج تاريخاً ومبلغاً': 'Each installment needs a date and amount',
  'تم حفظ الأقساط': 'Installments saved', 'تم حذف الأقساط': 'Installments removed',
  // contract & reminder
  'اسمح بالنوافذ المنبثقة لهذا الموقع لتتمكن من فتح العقد': 'Allow pop-ups for this site to open the contract', 'اسمح بالنوافذ المنبثقة لهذا الموقع لتتمكن من الطباعة': 'Allow pop-ups for this site to print',
  'تم حفظ العقد في سجل الحجز والعميل': 'Contract saved to the reservation and customer record', 'تذكير بالدفع': 'Payment reminder', 'فتح في واتساب': 'Open in WhatsApp',
  'سيفتح واتساب برسالة جاهزة إلى': 'WhatsApp will open with a ready message to', 'لا يُرسل شيء تلقائياً — أنت من يضغط إرسال.': 'Nothing is sent automatically — you press send.',
  // customers
  'الاسم (شخص أو جهة)': 'Name (person or agency)', 'إضافة العميل': 'Add customer', 'حجز جديد لهذا العميل': 'New reservation for this customer', 'واتساب': 'WhatsApp', 'الحجوزات في كل النسخ': 'Reservations across all editions',
  'النسخة': 'Edition', 'لا توجد حجوزات.': 'No reservations.', 'اكتب اسم العميل': 'Enter the customer name', 'عميل مسجل مسبقاً': 'Customer already exists', 'رقم الهاتف مسجل باسم': 'This phone number belongs to',
  'هل تريد إضافة عميل جديد بالرغم من ذلك؟': 'Add a new customer anyway?', 'إضافة': 'Add', 'تم حفظ بيانات العميل': 'Customer saved', 'تمت إضافة العميل': 'Customer added', 'عميل جديد': 'New customer',
  'بحث بالاسم أو الشركة أو الهاتف أو رقم الكشك': 'Search name, company, phone or kiosk', 'المشاركون في هذه النسخة': 'In this edition', 'كل العملاء': 'All customers', 'الاسم': 'Name', 'الشركة': 'Company',
  'الهاتف': 'Phone', 'العقود': 'Contracts', 'بلا سعر': 'No price', 'لا يوجد عملاء مطابقون': 'No matching customers', 'اعرض «كل العملاء» لرؤية عملاء النسخ السابقة.': 'Show “All customers” to see past editions’ customers.',
  'أضف عميلاً جديداً أو أنشئ حجزاً.': 'Add a customer or create a reservation.', 'قائمة العملاء': 'Customer list',
  // reservations list
  'بحث بالاسم أو الهاتف أو رقم الكشك': 'Search name, phone or kiosk', 'الحجوزات الفعّالة': 'Active reservations', 'المؤكدة': 'Confirmed', 'المؤقتة': 'Temporary', 'الملغاة': 'Cancelled', 'الكل': 'All',
  'كل حالات الدفع': 'All payment statuses', 'الأحدث أولاً': 'Newest first', 'حسب رقم الكشك': 'By kiosk number', 'الأعلى متبقياً': 'Highest balance', 'أقرب موعد تسديد': 'Nearest due date',
  'لا توجد حجوزات مطابقة': 'No matching reservations', 'لا توجد حجوزات بعد': 'No reservations yet', 'غيّر البحث أو الفلاتر.': 'Change the search or filters.',
  'ابدأ من الخريطة: اضغط على كشك متوفر ثم «حجز هذا الكشك».': 'Start from the map: tap an available kiosk, then “Book this kiosk”.', 'الأيام': 'Days', 'الدفع': 'Payment', 'حجز': 'reservation(s)',
  'حالة الدفع': 'Payment status', 'حالة الحجز': 'Booking status', 'من': 'From', 'تقرير الحجوزات': 'Reservations report', 'طباعة / PDF': 'Print / PDF', 'المجموع': 'Total',
  // reports
  'الدفعات': 'Payments', 'التحصيل اليومي': 'Daily collection', 'توفر الأكشاك': 'Kiosk availability', 'الحجوزات حسب الفترة': 'Reservations by period', 'مقارنة النسخ': 'Compare editions', 'سجل النشاط': 'Activity log',
  'كل الحجوزات التي عليها مبلغ متبقٍ أو لم يُحدد سعرها بعد، مرتبة حسب موعد التسديد.': 'All reservations with a balance or no price yet, sorted by due date.', 'الإجمالي حسب طريقة الدفع': 'Totals by method',
  'تقرير الدفعات': 'Payments report', 'وقت الإدخال': 'Entered at', 'مجموع ما استُلم يوم': 'Total received on', 'عملية': 'transactions', 'الكشك': 'Kiosk', 'الحجوزات في الفترة': 'Bookings in period',
  'أرقام فعلية من الحجوزات المسجلة في كل نسخة. النسخ التي لم تُسجل في النظام لا تظهر لها أرقام.': 'Real figures from each edition’s recorded reservations. Editions not recorded in the system show no figures.',
  'الجهات': 'Customers', 'أكشاك عليها حجز': 'Kiosks booked', 'نسبة الإشغال': 'Occupancy', 'إيراد العقود': 'Contract revenue', 'المحصل': 'Collected', 'نسبة التحصيل': 'Collection rate', 'مقارنة نسخ المهرجان': 'Festival editions compared',
  'آخر 300 عملية. السجل لا يمكن تعديله أو حذفه.': 'Last 300 actions. The log cannot be edited or deleted.', 'الوقت': 'Time', 'المستخدم': 'User', 'العملية': 'Action', 'التفاصيل': 'Details', 'النظام': 'System',
  'إضافة دفعة': 'Add payment', 'لا توجد بيانات': 'No data', 'غيّر الفترة أو الفلتر.': 'Change the period or filter.', 'أكشاك حجز': 'reservation kiosks', 'نسخة': 'edition', 'مستخدم': 'user', 'كشك': 'kiosk', 'عميل': 'customer',
  // settings
  'بيانات النسخة': 'Edition details', 'اسم النسخة': 'Edition name', 'الرابط المختصر (للصفحة العامة)': 'Short link (public page)', 'تاريخ الافتتاح': 'Opening date', 'تاريخ الختام': 'Closing date',
  'رقم الاتصال للاستفسار': 'Inquiry phone', 'رقم واتساب للاستفسار': 'Inquiry WhatsApp', 'الصفحة العامة مفعّلة': 'Public page enabled', 'نسخة مؤرشفة (منتهية)': 'Archived edition (finished)',
  'رابط خريطة الأكشاك العامة': 'Public kiosk map link', 'شاركه على واتساب وفيسبوك وإنستغرام. يعرض الأكشاك المتوفرة والمحجوزة فقط، بدون أسماء أو أرقام أو مبالغ.': 'Share it on WhatsApp, Facebook and Instagram. It shows only available and reserved kiosks — no names, numbers or amounts.',
  'نسخ الرابط': 'Copy link', 'فتح الصفحة العامة': 'Open public page', 'مشاركة عبر واتساب': 'Share on WhatsApp', 'تم نسخ الرابط': 'Link copied', 'ألوان الحالات على الخريطة': 'Status colours on the map',
  'الميزات الاختيارية': 'Optional features', 'تنبيهات الدفعات المستحقة في الرئيسية': 'Payment-due alerts on Home', 'أظهر التنبيه قبل موعد التسديد بـ': 'Show the alert', 'أيام': 'days before the due date',
  'أظهر المتأخرة فقط': 'Show overdue only', 'عرض التحليلات في الرئيسية': 'Show analytics on Home', 'إرفاق صور الإيصالات مع الدفعات': 'Receipt photos with payments',
  'معلومات العميل الإضافية (الشركة، المسؤول، البريد، الفئة)': 'Extended customer info (company, contact, email, category)', 'التقارير المتقدمة (الحجوزات حسب الفترة، مقارنة النسخ)': 'Advanced reports (by period, edition comparison)',
  'بعد حفظ الحجز — عقد الإيجار': 'After saving a reservation — rental contract', 'اسأل في كل مرة': 'Ask every time', 'افتح العقد تلقائياً بعد الحفظ': 'Open the contract automatically', 'لا تسأل (أنشئ العقد من الحجز عند الحاجة)': 'Don’t ask (create from the reservation when needed)',
  'رابط شعار الشركة (يظهر في العقد)': 'Company logo link (shown on contract)', 'أو ارفع صورة الشعار': 'or upload the logo', 'نص عقد الإيجار': 'Rental contract text', 'حفظ الإعدادات': 'Save settings', 'استعادة نص العقد الافتراضي': 'Restore default contract text',
  'الحقول التي تُملأ تلقائياً: {festival} {festival_start} {festival_end} {customer} {company_line} {contact} {phone} {email} {kiosks} {start} {end} {days} {daily} {total} {paid} {remaining} {deadline} {today} {notes}': 'Auto-filled fields: {festival} {festival_start} {festival_end} {customer} {company_line} {contact} {phone} {email} {kiosks} {start} {end} {days} {daily} {total} {paid} {remaining} {deadline} {today} {notes}',
  'تعديل الإعدادات متاح للمدير العام فقط.': 'Only the super administrator can change settings.', 'الاسم والرابط والتواريخ مطلوبة': 'Name, link and dates are required',
  'الرابط المختصر: أحرف إنجليزية صغيرة وأرقام وشرطة فقط': 'Short link: lowercase English letters, numbers and dashes only', 'الرابط المختصر مستخدم لنسخة أخرى': 'That short link is used by another edition',
  'تم حفظ بيانات النسخة': 'Edition saved', 'تم حفظ الإعدادات': 'Settings saved', 'تم رفع الشعار — اضغط حفظ': 'Logo uploaded — press Save',
  'إنشاء نسخة جديدة من المهرجان': 'Create a new festival edition', 'لنسخة السنة القادمة. اختر ما يُنسخ من النسخة الحالية': 'For next year. Choose what to copy from the current edition',
  'الاسم': 'Name', 'الرابط المختصر': 'Short link', 'الافتتاح': 'Opening', 'الختام': 'Closing', 'الخريطة': 'Map', 'أرقام الأكشاك وأماكنها': 'Kiosk numbers and positions', 'فئات الأكشاك': 'Kiosk categories',
  'الأسعار الاسترشادية': 'Guide prices', 'الألوان والإعدادات': 'Colours and settings', 'إنشاء النسخة الجديدة': 'Create new edition', 'إنشاء نسخة جديدة': 'Create new edition', 'إنشاء': 'Create',
  'لن تُنسخ أي حجوزات أو دفعات، وتبقى النسخة الحالية محفوظة كما هي.': 'No reservations or payments are copied; the current edition stays as it is.', 'ستُنشأ': 'This will create',
  'تم إنشاء النسخة الجديدة والانتقال إليها': 'New edition created and opened', 'المستخدمون والصلاحيات': 'Users & permissions',
  'لإضافة موظف: من لوحة Supabase ← Authentication ← Add user (بريد وكلمة مرور). يظهر هنا بصلاحية «اطلاع فقط»، ثم اختر له الصلاحية المناسبة.': 'To add staff: Supabase dashboard → Authentication → Add user (email and password). They appear here as “Read-only”; then choose their role.',
  'الصلاحية': 'Role', 'اسم الموظف': 'Staff name', 'تم تغيير الصلاحية': 'Role changed', 'تم حفظ الاسم': 'Name saved',
  'المدير العام: كل شيء. مدير الحجوزات: الحجوزات والعملاء والدفعات. المسؤول المالي: الدفعات والعملاء. اطلاع فقط: مشاهدة بدون تعديل.': 'Super administrator: everything. Reservation manager: reservations, customers, payments. Finance officer: payments and customers. Read-only: view only.',
  'حسابي': 'My account', 'كلمة مرور جديدة': 'New password', 'تأكيدها': 'Confirm it', 'تغيير كلمة المرور': 'Change password', 'كلمة المرور 8 أحرف على الأقل': 'Password must be at least 8 characters',
  'كلمتا المرور غير متطابقتين': 'Passwords don’t match', 'تم تغيير كلمة المرور': 'Password changed', 'النسخ الاحتياطي': 'Backup', 'تنزيل نسخة احتياطية كاملة (Excel)': 'Download full backup (Excel)', 'جارٍ التجهيز…': 'Preparing…',
  'ملف Excel واحد فيه كل النسخ والأكشاك والعملاء والحجوزات والدفعات والأقساط والعقود وسجل النشاط. احفظه أسبوعياً في مكان آمن.': 'One Excel file with all editions, kiosks, customers, reservations, payments, installments, contracts and the activity log. Save it weekly somewhere safe.',
  'تم تنزيل النسخة الاحتياطية': 'Backup downloaded', 'المساعد الذكي (اختياري)': 'Smart assistant (optional)', 'تفعيل المساعد الذكي': 'Enable the smart assistant', 'مفتاح Gemini API': 'Gemini API key', 'النموذج': 'Model',
  'فحص المفتاح': 'Test key', 'ضع المفتاح أولاً': 'Enter the key first', 'جارٍ الفحص…': 'Checking…', 'المفتاح لا يعمل': 'Key doesn’t work', 'تم حفظ إعدادات المساعد': 'Assistant settings saved',
  'يفهم الأوامر المكتوبة بالعربية مثل «احجز الكشك A1 لشركة بيبسي…» ويعرض المعاينة قبل التنفيذ. يحتاج مفتاح Google Gemini مجاني من aistudio.google.com ← Get API key. بدون المفتاح يعمل النظام بشكل طبيعي.': 'Understands Arabic commands like “احجز الكشك A1 لشركة بيبسي…” and shows a preview before doing anything. Needs a free Google Gemini key from aistudio.google.com → Get API key. Without it, everything else works normally.',
  'المفتاح يُحفظ في قاعدة البيانات ويراه الموظفون المسجلون فقط. مع المفتاح المجاني قد تستخدم Google النصوص المرسلة لتحسين خدماتها؛ تُرسل أسماء العملاء وأرقام الأكشاك والمبالغ فقط، ولا تُرسل أرقام الهواتف إلا إذا كتبتها في الطلب.': 'The key is stored in the database and visible to signed-in staff only. With a free key, Google may use submitted text to improve its services; only customer names, kiosk numbers and amounts are sent — phone numbers only if you type them.',
  // assistant
  'إرسال': 'Send', 'جارٍ الفهم…': 'Understanding…', 'اكتب ما تريد بالعربية. سأعرض عليك ما فهمته قبل أي تعديل، ولن يتغير شيء إلا بعد ضغطك «تأكيد».': 'Type what you need (Arabic works best). I’ll show what I understood before changing anything, and nothing changes until you press “Confirm”.',
  'منو باقي عليه فلوس؟': 'Who still owes money?', 'اعرض الأكشاك المتوفرة': 'Show available kiosks', 'اعرض الدفعات المتأخرة': 'Show overdue payments', 'اعرض حجوزات أكشاك A': 'Show group A bookings',
  'يُرسَل نص طلبك مع قائمة الأكشاك وأسماء العملاء والحجوزات إلى خدمة Google Gemini لفهمه.': 'Your request, the kiosk list, customer names and reservations are sent to Google Gemini to understand it.',
  'تأكيد وتنفيذ': 'Confirm and apply', 'جارٍ التنفيذ…': 'Applying…', 'تم الإلغاء، لم يتغير شيء.': 'Cancelled — nothing changed.', '✓ تم التنفيذ.': '✓ Done.', 'فهمت': 'I understood',
  'صحّح الطلب أو أكمل المعلومة الناقصة.': 'Correct the request or add the missing detail.', 'هل يمكنك توضيح الطلب أكثر؟': 'Could you clarify the request?',
  'فعّل المساعد الذكي وأضف مفتاح Gemini من الإعدادات': 'Enable the smart assistant and add a Gemini key in Settings', 'لم أفهم الطلب. جرّب صياغة أخرى.': 'I didn’t understand. Try rephrasing.',
  'لم أتعرف على الحجز المقصود.': 'I couldn’t identify the reservation.', 'لم يُذكر رقم الكشك.': 'No kiosk number given.', 'تواريخ الحجز غير محددة.': 'Booking dates not given.', 'لم يُذكر اسم العميل.': 'No customer name given.',
  'أحد المبالغ غير صالح.': 'One of the amounts is invalid.', 'مبلغ الدفعة غير محدد.': 'Payment amount not given.', 'السعر الجديد غير محدد.': 'New price not given.', 'لن يبقى أي كشك في الحجز.': 'No kiosk would remain in the reservation.',
  'نص الملاحظة فارغ.': 'The note is empty.', 'التاريخ غير محدد.': 'Date not given.', 'تاريخ النهاية قبل البداية.': 'End date is before start date.',
  'حجز جديد — هل تؤكد؟': 'New reservation — confirm?', 'إضافة دفعة — هل تؤكد؟': 'Add payment — confirm?', 'تغيير السعر — هل تؤكد؟': 'Change price — confirm?', 'نقل / تغيير الأكشاك — هل تؤكد؟': 'Move / change kiosks — confirm?',
  'إضافة ملاحظة — هل تؤكد؟': 'Add note — confirm?', 'تعديل موعد التسديد — هل تؤكد؟': 'Change due date — confirm?', 'إلغاء الحجز — هل تؤكد؟': 'Cancel reservation — confirm?',
  'عميل مسجل': 'existing customer', 'الدفعة الأولى': 'First payment', 'لا يوجد': 'None', 'المتبقي بعدها': 'Remaining after', 'السعر الحالي': 'Current price', 'السعر الجديد': 'New price', 'الأكشاك الحالية': 'Current kiosks',
  'بعد التعديل': 'After the change', 'الملاحظة': 'Note', 'موعد التسديد الجديد': 'New due date', 'الحجز المراد إلغاؤه': 'Reservation to cancel', 'حجز مؤقت (48 ساعة)': 'Temporary hold (48 hours)',
  'جهة عليها مبالغ، المجموع': 'customers owe money, total', 'دفعة متأخرة': 'overdue payment(s)', 'الموعد': 'Due', 'كشك متوفر بالكامل': 'kiosks fully available', 'جزئياً': 'Partly', 'لا توجد نتائج.': 'No results.',
  'تعذر الاتصال بخدمة الذكاء الاصطناعي': 'Couldn’t reach the AI service', 'خطأ من خدمة الذكاء الاصطناعي': 'AI service error', 'لم أفهم رد المساعد. أعد صياغة الطلب.': 'Couldn’t read the assistant’s reply. Rephrase your request.',
  'مثال: احجز الكشك A1 لشركة بيبسي من الافتتاح لمدة 10 أيام بمبلغ 5 مليون، دفعوا مليونين والباقي بعد أسبوع': 'e.g. احجز الكشك A1 لشركة بيبسي من الافتتاح لمدة 10 أيام بمبلغ 5 مليون، دفعوا مليونين والباقي بعد أسبوع',
  // misc
  'إغلاق': 'Close', 'تأكيد': 'Confirm', 'اختياري': 'optional', 'حذف': 'Delete', 'ليس لديك صلاحية لهذه العملية': 'You don’t have permission for this action',
  'تعذر الاتصال بالإنترنت. تحقق من الاتصال وحاول مرة أخرى.': 'No internet connection. Check it and try again.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة': 'Wrong email or password',
  'لم يتم إنشاء ملف المستخدم. تأكد من تشغيل ملف قاعدة البيانات schema.sql قبل إنشاء الحساب.': 'User profile not created. Make sure schema.sql was run before creating the account.',
  'لم يتم ربط التطبيق بقاعدة البيانات بعد.': 'The app is not connected to the database yet.', 'افتح ملف': 'Open', 'وضع فيه رابط مشروع Supabase والمفتاح العام كما في دليل التشغيل.': 'and add your Supabase project URL and public key as described in the setup guide.',
  'ليس لديك صلاحية إلغاء الحجز.': 'You don’t have permission to cancel reservations.', 'ليس لديك صلاحية إنشاء حجز.': 'You don’t have permission to create reservations.', 'ليس لديك صلاحية تسجيل دفعات.': 'You don’t have permission to record payments.',
  'ليس لديك صلاحية تعديل الحجز.': 'You don’t have permission to edit reservations.', 'ليس لديك صلاحية تعديل الحجز': 'You don’t have permission to edit reservations', 'هذه العملية للمدير العام فقط': 'Only the super administrator can do this',
  'انتهت مدة الحجز المؤقت': 'Temporary hold expired', 'أُلغي عبر المساعد': 'Cancelled via assistant', 'عبر المساعد': 'via assistant', 'أرشيف': 'archive', 'مجموعة': 'Group', 'أكشاك': 'Group',
  // public page
  'خريطة الأكشاك المتوفرة للحجز': 'Kiosks available to book', 'رقم الكشك، مثل A1': 'Kiosk number, e.g. A1', 'ابحث عن كشك': 'Find a kiosk', 'آخر تحديث': 'Updated', 'اتصال الآن': 'Call now', 'اتصال': 'Call', 'تصدير الخريطة': 'Export map', 'تصدير': 'Export', 'الصيغة': 'Format', 'صورة PNG': 'PNG image', 'PDF / طباعة': 'PDF / print', 'إظهار أسماء العملاء على الأكشاك المحجوزة (للاستخدام الداخلي فقط)': 'Show customer names on booked kiosks (internal use only)', 'تم تصدير الخريطة': 'Map exported', 'تعذر تحميل صورة الخريطة': 'Could not load the map image', 'الزوار والإيراد اليومي': 'Daily visitors & income', 'تسجيل يومية': 'Log a day', 'تسجيل يومية المهرجان': 'Log festival day', 'عدد الزوار': 'Visitors', 'إجمالي الإيراد لهذا اليوم': 'Total income for the day', 'إذا كان اليوم مسجلاً من قبل يتم تحديثه.': 'If the day is already logged, it is updated.', 'اختر اليوم': 'Choose the day', 'أحد الأرقام غير صالح': 'One of the numbers is invalid', 'اكتب عدد الزوار أو الإيراد': 'Enter visitors or income', 'إجمالي الزوار': 'Total visitors', 'إجمالي الإيراد': 'Total income', 'متوسط الزوار يومياً': 'Average visitors per day', 'متوسط الإيراد يومياً': 'Average income per day', 'أيام مسجلة': 'Days logged', 'أعلى يوم زيارة': 'Busiest day', 'الإيراد': 'Income', 'اليوم من الأسبوع': 'Weekday', 'إيراد المهرجان اليومي (المجموع)': 'Festival daily income (total)', 'عدد زوار المهرجان وإيراده لكل يوم. اضغط على أي يوم لتسجيله أو تعديله.': 'Festival visitors and income for each day. Tap a day to log or edit it.', 'اختياري، مثل: عطلة رسمية، حفل موسيقي': 'optional, e.g. public holiday, concert', 'مثال: 3,500,000 أو 3.5 مليون': 'e.g. 3,500,000 or 3.5 مليون', 'حجز مساحة': 'Rent an area', 'مساحة جديدة للإيجار': 'New rental area', 'رمز المساحة': 'Area code', 'الوصف (اختياري)': 'Description (optional)', 'مثال: ساحة العروض، مساحة سيارة، منطقة ألعاب': 'e.g. show stage, car display, play zone', 'إنشاء المساحة وحجزها': 'Create area and book it', 'ستُضاف المساحة إلى الخريطة كمكان قابل للحجز، ثم يُفتح نموذج الحجز مباشرة.': 'The area is added to the map as a bookable space, then the booking form opens.', 'اكتب رمز المساحة': 'Enter the area code', 'يوجد كشك أو مساحة بنفس الرمز': 'A kiosk or area already uses this code', 'اسحب بالماوس أو بإصبعك على الخريطة لرسم المساحة المطلوب تأجيرها. للتحريك أثناء الرسم أوقف «حجز مساحة» مؤقتاً.': 'Drag on the map with the mouse or your finger to draw the area to rent. To pan while drawing, switch “Rent an area” off.', 'مساحة': 'Area', 'إيجار كشك': 'Kiosk rental', 'رعاية': 'Sponsorship', 'نوع الاتفاق': 'Agreement type', 'قيمة الرعاية المتفق عليها': 'Agreed sponsorship value', 'عقد الرعاية': 'Sponsorship contract', 'عقد الإيجار': 'Rental contract', 'الإيجار والرعاية': 'Rental & sponsorship', 'نص عقد إيجار الكشك': 'Kiosk rental contract text', 'نص عقد الرعاية': 'Sponsorship contract text', 'استعادة نصوص العقود الافتراضية': 'Restore default contract texts', 'تم حفظ الحجز بنجاح. هل ترغب في إنشاء عقد رعاية؟': 'Reservation saved. Create a sponsorship contract?', 'النوع': 'Type', 'أرقام الاستفسار في الصفحة العامة': 'Inquiry contacts on the public page', 'يظهر لكل شخص زر اتصال وزر واتساب عند الضغط على كشك متوفر.': 'Each person gets a Call and a WhatsApp button when a visitor taps an available kiosk.', 'إضافة رقم': 'Add contact', 'الاسم، مثل Mr. Samer': 'Name, e.g. Mr. Samer', 'أضف رقم الهاتف لكل جهة اتصال': 'Add a phone number for each contact',
  'استفسار عبر واتساب': 'Ask on WhatsApp', 'للاستفسار يرجى التواصل مع إدارة': 'For inquiries, please contact the management of', 'الصفحة غير مفعّلة بعد.': 'This page is not active yet.',
  'خريطة الحجز غير متاحة حالياً.': 'The booking map is not available right now.', 'تعذر تحميل الخريطة. تحقق من الاتصال بالإنترنت ثم أعد تحميل الصفحة.': 'Couldn’t load the map. Check your connection and reload.',
  'الكشك رقم': 'Kiosk', 'متوفر للحجز.': 'is available to book.', 'متوفر لجزء من الفترة المحددة.': 'is available for part of the selected period.', 'محجوز خلال الفترة المحددة.': 'is reserved during the selected period.', 'غير متاح للإيجار.': 'is not offered for rent.',
  // weekdays
  'الأحد': 'Sun', 'الاثنين': 'Mon', 'الثلاثاء': 'Tue', 'الأربعاء': 'Wed', 'الخميس': 'Thu', 'الجمعة': 'Fri', 'السبت': 'Sat',
  'يوم': 'day', 'د.ع': 'IQD',
};

// whole-text patterns (word order differs from Arabic)
const P = [
  [/^الكشك رقم (\S+) متوفر للحجز\.$/, 'Kiosk $1 is available to book.'],
  [/^الكشك رقم (\S+) متوفر لجزء من الفترة المحددة\.$/, 'Kiosk $1 is available for part of the selected period.'],
  [/^الكشك رقم (\S+) محجوز خلال الفترة المحددة\.$/, 'Kiosk $1 is reserved during the selected period.'],
  [/^الكشك رقم (\S+) غير متاح للإيجار\.$/, 'Kiosk $1 is not offered for rent.'],
  [/^يفتتح بعد (\d+) يوماً$/, 'Opens in $1 days'],
  [/^لا يمكن حذف الكشك (\S+)$/, 'Kiosk $1 cannot be deleted'],
  [/^حذف الكشك (\S+)$/, 'Delete kiosk $1'],
  [/^تمت إضافة الكشك (\S+)$/, 'Kiosk $1 added'],
  [/^تم حذف الكشك (\S+)$/, 'Kiosk $1 deleted'],
  [/^تم حذف الكشك (\S+) ومسح رسمه من الخريطة$/, 'Kiosk $1 deleted and erased from the map'],
  [/^(\d+) قيد · إيرادات ([\d,]+) · مصاريف ([\d,]+) د\.ع$/, '$1 entries · income $2 · expenses $3 IQD'],
  [/^تم استيراد (\d+) قيد$/, '$1 entries imported'],
  [/^هامش صافي (.+)$/, 'Net margin $1'],
  [/^هامش (.+)$/, 'Margin $1'],
  [/^تبديل (\S+) و (\S+)$/, 'Switch $1 and $2'],
  [/^الكشك الأول: (\S+) — الآن اضغط على الكشك الذي تريد التبديل معه\.$/, 'First kiosk: $1 — now tap the kiosk to switch with.'],
  [/^تم التبديل: (\d+) حجز انتقل من (\S+) إلى (\S+)، و(\d+) حجز من (\S+) إلى (\S+)$/, 'Switched: $1 booking(s) moved from $2 to $3, and $4 from $5 to $6'],
  [/^كل حجز على (\S+) ينتقل إلى (\S+) والعكس، مع دفعاته ومبالغه كما هي\. استخدمه عندما يتبادل مشاركان مكانيهما\.$/, 'Every booking on $1 moves to $2 and vice versa, with its payments unchanged. Use it when two participants trade places.'],
  [/^أُعيد الكشك (\S+) وأصبح متاحاً للحجز$/, 'Kiosk $1 is bookable again'],
  [/^أصبح الكشك (\S+) غير متاح$/, 'Kiosk $1 is now unavailable'],
  [/^المفتاح يعمل ✓ — (\d+) نموذج متاح\. الاختيار التلقائي سيستخدم: (.+)$/, 'Key works ✓ — $1 models available. Auto will use: $2'],
  [/^🎄 المهرجان قائم الآن — اليوم (\d+) من (\d+)$/, '🎄 The festival is on — day $1 of $2'],
  [/^(\d+) كشك بحاجة لتأكيد الرقم: (.*)$/, '$1 kiosk(s) need number verification: $2'],
  [/^(\d+) أكشاك محددة$/, '$1 kiosks selected'],
  [/^(\d+) من (\d+)$/, '$1 of $2'],
  [/^(كشك|الكشك) (\S+)$/, 'Kiosk $2'],
  [/^مجموعة (\S+)$/, 'Group $1'],
  [/^أكشاك (\S+)$/, 'Group $1 kiosks'],
  [/^(\d+) حجز$/, '$1 reservation(s)'],
  [/^المجموع \((\d+)\)$/, 'Total ($1)'],
  [/^ \((\d+) عملية\)$/, ' ($1 transactions)'],
  [/^تم حفظ الكشك (\S+)$/, 'Kiosk $1 saved'],
  [/^تمت إضافة الكشك (\S+)$/, 'Kiosk $1 added'],
  [/^حذف الكشك (\S+)$/, 'Delete kiosk $1'],
  [/^تم تسجيل الدفعة\. المتبقي الآن: (.*)$/, 'Payment recorded. Remaining now: $1'],
  [/^تم تسجيل الاسترجاع\. المتبقي الآن: (.*)$/, 'Refund recorded. Remaining now: $1'],
  [/^المفتاح يعمل ✓ — (\d+) نموذج متاح\. .*$/, 'Key works ✓ — $1 models available. Pick one from the list (flash recommended).'],
];

const AR = /[؀-ۿ]/;
const PHRASES = Object.keys(D).filter(k => /\s/.test(k.trim()) || ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','يوماً','يوم','د.ع','غداً','أُنشئ'].includes(k))
  .sort((a, b) => b.length - a.length);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PHRASE_RE = PHRASES.length ? new RegExp('(?<![\\u0600-\\u06FF])(' + PHRASES.map(esc).join('|') + ')(?![\\u0600-\\u06FF])', 'g') : null;

export function tr(text) {
  if (!text || !AR.test(text)) return text;
  const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
  const core = text.trim();
  if (D[core]) return lead + D[core] + trail;
  const noColon = core.replace(/[:：]$/, '');
  if (noColon !== core && D[noColon]) return lead + D[noColon] + ':' + trail;
  for (const [re, rep] of P) if (re.test(text)) return text.replace(re, rep);
  // "Label: value", "Label — value", "Label (12)"
  const m = /^(.+?)(: | — | \()(.*)$/s.exec(core);
  if (m && D[m[1]]) return lead + D[m[1]] + m[2] + tr(m[3]) + trail;
  let out = text.replace(PHRASE_RE, m => D[m]);
  out = out.replace(/،\s?/g, ', ').replace(/؛\s?/g, '; ').replace(/«/g, '“').replace(/»/g, '”').replace(/؟/g, '?');
  return out;
}

const ATTRS = ['placeholder', 'aria-label', 'title'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);
function translateNode(root) {
  if (root.nodeType === 3) { const p = root.parentNode; if (p && !SKIP.has(p.nodeName) && !p.closest?.('[data-raw]')) { const t = tr(root.nodeValue); if (t !== root.nodeValue) root.nodeValue = t; } return; }
  if (root.nodeType !== 1 || SKIP.has(root.nodeName) || root.closest?.('[data-raw]')) return;
  for (const a of ATTRS) { const v = root.getAttribute?.(a); if (v && AR.test(v)) { const t = tr(v); if (t !== v) root.setAttribute(a, t); } }
  if (root.nodeName === 'OPTION' && AR.test(root.textContent)) { const t = tr(root.textContent); if (t !== root.textContent) root.textContent = t; }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n; while ((n = w.nextNode())) {
    if (n.nodeType === 1) { if (SKIP.has(n.nodeName) || n.hasAttribute('data-raw')) continue; for (const a of ATTRS) { const v = n.getAttribute(a); if (v && AR.test(v)) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } } }
    else if (AR.test(n.nodeValue) && !SKIP.has(n.parentNode.nodeName) && !n.parentNode.closest('[data-raw]')) { const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
  }
}

export function startI18n() {
  for (const id of ['lang-toggle', 'lang-toggle2']) {
    const btn = document.getElementById(id);
    if (btn) { btn.textContent = isEn() ? 'العربية' : 'English'; btn.setAttribute('data-raw', ''); btn.onclick = () => setLang(isEn() ? 'ar' : 'en'); }
  }
  if (!isEn()) return;
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  translateNode(document.body);
  document.title = tr(document.title);
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') translateNode(m.target);
      else if (m.type === 'attributes') translateNode(m.target);
      else m.addedNodes.forEach(translateNode);
    }
    if (AR.test(document.title)) { const t = tr(document.title); if (t !== document.title) document.title = t; }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  const origPrompt = window.prompt.bind(window);
  window.prompt = (msg, def) => origPrompt(tr(msg), def);
}
