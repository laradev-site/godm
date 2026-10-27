import { Translations } from '../types';

export const ar: Translations = {
  // Toolbar
  addUrl: 'إضافة رابط',
  resume: 'استئناف',
  stop: 'إيقاف',
  stopAll: 'إيقاف الكل',
  delete: 'حذف',
  openFile: 'فتح الملف',
  folder: 'المجلد',
  threads: 'المسارات',
  extension: 'إضافة المتصفح',
  searchPlaceholder: 'بحث في التنزيلات...',
  language: 'اللغة',

  // Sidebar Categories
  categories: 'التصنيفات',
  allDownloads: 'جميع التنزيلات',
  compressed: 'ملفات مضغوطة',
  documents: 'مستندات',
  music: 'موسيقى وصوتيات',
  programs: 'برامج وتطبيقات',
  video: 'فيديو',

  // Sidebar Status
  status: 'الحالة',
  downloading: 'قيد التنزيل',
  paused: 'متوقف مؤقتاً',
  completed: 'مكتمل',
  error: 'خطأ',

  // Table Headers
  fileName: 'اسم الملف',
  size: 'الحجم',
  progress: 'التقدم',
  speed: 'السرعة',
  timeLeft: 'الوقت المتبقي',
  connections: 'المسارات',

  // Inspector Panel
  downloadThreadsTitle: 'مسارات وأجزاء التنزيل المتزامنة',
  activeSegmentation: 'التقسيم الديناميكي النشط: {count} اتصالات متزامنة',
  threadCol: 'المسار',
  byteOffsetCol: 'إزاحة نطاق البايتات',
  downloadedTotalCol: 'تم تنزيله / الإجمالي',
  statusCol: 'الحالة',
  connectionNum: 'الاتصال #{num}',
  finished: 'منتهي',
  active: 'نشط',
  idle: 'خامل',
  saveTo: 'الحفظ في',

  // Status Bar
  downloadsTotal: '{count} إجمالي التنزيلات',
  activeCount: '{count} نشط',
  completedCount: '{count} مكتمل',

  // Add Download Modal
  enterDownloadUrl: 'إدخال رابط التنزيل',
  urlPlaceholder: 'الصق رابط التحميل (HTTP, HTTPS، أو يوتيوب، تيك توك، فيميو...)',
  inspecting: 'جاري فحص الرابط ومعلومات الخادم...',
  saveFolder: 'مجلد الحفظ',
  browse: 'استعراض...',
  filenameOnDisk: 'اسم الملف على القرص',
  parallelThreads: 'عدد الاتصالات المتوازية (المسارات)',
  selectQuality: 'اختر الجودة / الدقة',
  startDownload: 'بدء التنزيل',
  cancel: 'إلغاء',
  videoDetected: 'تم اكتشاف فيديو / صوت من منصة وسائط',

  // Extension Modal
  extensionGuideTitle: 'دليل تثبيت إضافة المتصفح',
  step1: 'افتح صفحة الإضافات في متصفحك (chrome://extensions أو edge://extensions)',
  step2: 'قم بتفعيل زر "وضع مطور البرامج" (Developer Mode) في الزاوية العلوية',
  step3: 'انقر على "تحميل إضافة غير محزومة" (Load unpacked) واختر المجلد الموضح أدناه',
  extensionPathLabel: 'مسار مجلد الإضافة',
  copyPath: 'نسخ المسار',
  copied: 'تم النسخ!',
  openExtensionFolder: 'فتح مجلد الإضافة',
  close: 'إغلاق',

  // Alerts & Messages
  errorStarting: 'حدث خطأ أثناء بدء التنزيل',
  failedInspect: 'فشل فحص الرابط',
  confirmDelete: 'هل أنت متأكد من رغبتك في حذف مهمة التنزيل هذه؟',

  // Authentication & Private Videos
  authSessionActive: 'جلسة مسجلة ونشطة',
  authSessionDesc: 'تم التقاط كوكيز الجلسة من إضافة المتصفح الخاصة بك',
  authRequiredTitle: 'يتطلب تسجيل الدخول / فيديو خاص',
  authRequiredDesc: 'يبدو أن هذا الفيديو خاص أو يتطلب تسجيل الدخول.',
  importFromBrowser: 'استيراد الكوكيز من المتصفح',
  useExtensionRecommended: 'استخدم إضافة godm للمتصفح (موصى به)',
};
