export interface Translations {
  // Toolbar
  addUrl: string;
  resume: string;
  stop: string;
  stopAll: string;
  delete: string;
  openFile: string;
  folder: string;
  threads: string;
  extension: string;
  searchPlaceholder: string;
  language: string;

  // Sidebar Categories
  categories: string;
  allDownloads: string;
  compressed: string;
  documents: string;
  music: string;
  programs: string;
  video: string;

  // Sidebar Status
  status: string;
  downloading: string;
  paused: string;
  completed: string;
  error: string;

  // Table Headers
  fileName: string;
  size: string;
  progress: string;
  speed: string;
  timeLeft: string;
  connections: string;

  // Inspector Panel
  downloadThreadsTitle: string;
  activeSegmentation: string;
  threadCol: string;
  byteOffsetCol: string;
  downloadedTotalCol: string;
  statusCol: string;
  connectionNum: string;
  finished: string;
  active: string;
  idle: string;
  saveTo: string;

  // Status Bar
  downloadsTotal: string;
  activeCount: string;
  completedCount: string;

  // Add Download Modal
  enterDownloadUrl: string;
  urlPlaceholder: string;
  inspecting: string;
  saveFolder: string;
  browse: string;
  filenameOnDisk: string;
  parallelThreads: string;
  selectQuality: string;
  startDownload: string;
  cancel: string;
  videoDetected: string;

  // Extension Modal
  extensionGuideTitle: string;
  step1: string;
  step2: string;
  step3: string;
  extensionPathLabel: string;
  copyPath: string;
  copied: string;
  openExtensionFolder: string;
  close: string;

  // Alerts & Messages
  errorStarting: string;
  failedInspect: string;
  confirmDelete: string;
}

export type SupportedLanguage =
  | 'en'
  | 'ar'
  | 'es'
  | 'fr'
  | 'de'
  | 'zh'
  | 'ja'
  | 'ru'
  | 'pt'
  | 'it'
  | 'tr'
  | 'hi'
  | 'ko';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  isRTL?: boolean;
}
