import { en } from './en';

/**
 * Arabic. Strings not yet translated fall back to English, so the editor never shows blanks.
 * Kitchen / dressing tools (wizard, finishes, quote) carry their own Arabic copy.
 */
const overrides: Partial<Record<keyof typeof en, string>> = {
  'settings.title': 'الإعدادات',
  'settings.close': 'إغلاق الإعدادات',
  'settings.tabProject': 'المشروع',
  'settings.tabDimensions': 'الأبعاد',
  'settings.tabAppearance': 'المظهر',
  'settings.projectName': 'اسم المشروع',
  'settings.projectNamePlaceholder': 'مشروع بدون اسم',
  'settings.description': 'الوصف',
  'settings.descriptionPlaceholder': 'أضف وصفاً لهذا المشروع...',
  'settings.metricsUnit': 'وحدة القياس',
  'settings.metric': 'م، سم',
  'settings.imperial': 'قدم، بوصة',
  'settings.dimensions': 'الأبعاد',
  'settings.externalDimensions': 'الأبعاد الخارجية',
  'settings.internalDimensions': 'الأبعاد الداخلية',
  'settings.theme': 'المظهر',
  'settings.themeLight': 'فاتح',
  'settings.themeDark': 'داكن',
  'settings.themeSystem': 'حسب النظام',
  'settings.language': 'اللغة',
  'settings.saved': '✓ تم الحفظ',
  'settings.remove': 'حذف',
  'settings.wallSnap': 'الالتصاق بالحائط',
  'settings.wallSnapHelp': 'الأثاث بيلزق ضهره في الحيطة القريبة تلقائياً',
  'floors.title': 'ارتفاع الأدوار',
  'welcome.title': 'أهلاً بيك',
  'welcome.subtitle': 'صمّم مساحتك في 2D و 3D',
  'welcome.startFromScratch': 'ابدأ من الصفر',
  'welcome.startFromScratchDesc': 'افتح محرر فاضي',
  'welcome.useTemplate': 'استخدم قالب',
  'welcome.useTemplateDesc': 'ابدأ بغرفة جاهزة',
  'welcome.importPlan': 'استيراد مخطط',
  'welcome.importPlanDesc': 'حمّل ملف JSON أو RoomPlan',
  'welcome.quickTour': 'جولة سريعة',
  'welcome.quickTourDesc': 'اتعلم الأساسيات في 30 ثانية',
  'welcome.next': 'التالي',
  'welcome.getStarted': 'يلا نبدأ',
  'welcome.back': 'رجوع ←',
  'welcome.templatesTitle': 'قوالب المخططات',
};

export const ar: Record<keyof typeof en, string> = { ...en, ...overrides } as Record<keyof typeof en, string>;
