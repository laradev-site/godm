import { Translations } from '../types';

export const hi: Translations = {
  // Toolbar
  addUrl: 'URL जोड़ें',
  resume: 'पुनः आरंभ',
  stop: 'रोकें',
  stopAll: 'सभी रोकें',
  delete: 'हटाएं',
  openFile: 'फ़ाइल खोलें',
  folder: 'फ़ोल्डर',
  threads: 'थ्रेड्स',
  extension: 'एक्सटेंशन',
  searchPlaceholder: 'डाउनलोड खोजें...',
  language: 'भाषा (Language)',

  // Sidebar Categories
  categories: 'श्रेणियाँ',
  allDownloads: 'सभी डाउनलोड',
  compressed: 'कंप्रेस्ड फ़ाइलें',
  documents: 'दस्तावेज़',
  music: 'संगीत और ऑडियो',
  programs: 'प्रोग्राम और ऐप्स',
  video: 'वीडियो',

  // Sidebar Status
  status: 'स्थिति',
  downloading: 'डाउनलोड हो रहा है',
  paused: 'रोका गया',
  completed: 'पूर्ण हुआ',
  error: 'त्रुटि',

  // Table Headers
  fileName: 'फ़ाइल का नाम',
  size: 'आकार',
  progress: 'प्रगति',
  speed: 'गति',
  timeLeft: 'शेष समय',
  connections: 'थ्रेड्स',

  // Inspector Panel
  downloadThreadsTitle: 'डाउनलोड थ्रेड्स और खंड विवरण',
  activeSegmentation: 'सक्रिय गतिशील विभाजन: {count} समानांतर कनेक्शन',
  threadCol: 'थ्रेड',
  byteOffsetCol: 'बाइट ऑफ़सेट श्रेणी',
  downloadedTotalCol: 'डाउनलोड / कुल',
  statusCol: 'स्थिति',
  connectionNum: 'कनेक्शन #{num}',
  finished: 'समाप्त',
  active: 'सक्रिय',
  idle: 'निष्क्रिय',
  saveTo: 'यहाँ सहेजें',

  // Status Bar
  downloadsTotal: 'कुल {count} डाउनलोड',
  activeCount: '{count} सक्रिय',
  completedCount: '{count} पूर्ण',

  // Add Download Modal
  enterDownloadUrl: 'डाउनलोड URL दर्ज करें',
  urlPlaceholder: 'डाउनलोड लिंक पेस्ट करें (HTTP, HTTPS, YouTube, TikTok...)',
  inspecting: 'सर्वर और मीडिया की जाँच हो रही है...',
  saveFolder: 'फ़ोल्डर सहेजें',
  browse: 'ब्राउज़...',
  filenameOnDisk: 'डिस्क पर फ़ाइल का नाम',
  parallelThreads: 'समानांतर कनेक्शन (थ्रेड्स)',
  selectQuality: 'गुणवत्ता / रिज़ॉल्यूशन चुनें',
  startDownload: 'डाउनलोड शुरू करें',
  cancel: 'रद्द करें',
  videoDetected: 'वीडियो / ऑडियो स्ट्रीम पहचानी गई',

  // Extension Modal
  extensionGuideTitle: 'ब्राउज़र एक्सटेंशन सेटअप गाइड',
  step1: 'अपने ब्राउज़र में एक्सटेंशन पेज खोलें (chrome://extensions या edge://extensions)',
  step2: 'ऊपर दाईं ओर "डेवलपर मोड" चालू करें',
  step3: '"Load unpacked" पर क्लिक करें और नीचे दिए गए फ़ोल्डर को चुनें',
  extensionPathLabel: 'एक्सटेंशन फ़ोल्डर पाथ',
  copyPath: 'पाथ कॉपी करें',
  copied: 'कॉपी हो गया!',
  openExtensionFolder: 'एक्सटेंशन फ़ोल्डर खोलें',
  close: 'बंद करें',

  // Alerts & Messages
  errorStarting: 'डाउनलोड शुरू करने में त्रुटि',
  failedInspect: 'URL की जाँच करने में विफल',
  confirmDelete: 'क्या आप वाकई इस डाउनलोड कार्य को हटाना चाहते हैं?',
};
