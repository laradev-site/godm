import { Translations } from '../types';

export const tr: Translations = {
  // Toolbar
  addUrl: 'URL Ekle',
  resume: 'Devam Et',
  stop: 'Durdur',
  stopAll: 'Tümünü Durdur',
  delete: 'Sil',
  openFile: 'Dosyayı Aç',
  folder: 'Klasör',
  threads: 'İş Parçacıkları',
  extension: 'Uzantı',
  searchPlaceholder: 'İndirmeleri ara...',
  language: 'Dil (Language)',

  // Sidebar Categories
  categories: 'KATEGORİLER',
  allDownloads: 'Tüm İndirmeler',
  compressed: 'Sıkıştırılmış',
  documents: 'Belgeler',
  music: 'Müzik ve Ses',
  programs: 'Programlar',
  video: 'Video',

  // Sidebar Status
  status: 'DURUM',
  downloading: 'İndiriliyor',
  paused: 'Duraklatıldı',
  completed: 'Tamamlandı',
  error: 'Hata',

  // Table Headers
  fileName: 'DOSYA ADI',
  size: 'BOYUT',
  progress: 'İLERLEME',
  speed: 'HIZ',
  timeLeft: 'KALAN SÜRE',
  connections: 'İŞ PARÇACIĞI',

  // Inspector Panel
  downloadThreadsTitle: 'İNDİRME İŞ PARÇACIKLARI VE PARÇALARI',
  activeSegmentation: 'Aktif Dinamik Bölümleme: {count} Paralel Bağlantı',
  threadCol: 'İş Parçacığı',
  byteOffsetCol: 'Bayt Aralığı',
  downloadedTotalCol: 'İndirilen / Toplam',
  statusCol: 'Durum',
  connectionNum: 'Bağlantı #{num}',
  finished: 'Bitti',
  active: 'Aktif',
  idle: 'Boşta',
  saveTo: 'Kayıt yeri',

  // Status Bar
  downloadsTotal: 'Toplam {count} indirme',
  activeCount: '{count} aktif',
  completedCount: '{count} tamamlandı',

  // Add Download Modal
  enterDownloadUrl: 'İndirme URL\'sini Girin',
  urlPlaceholder: 'İndirme bağlantısını yapıştırın (HTTP, HTTPS, YouTube, TikTok...)',
  inspecting: 'Medya ve sunucu bilgisi taranıyor...',
  saveFolder: 'Kayıt Klasörü',
  browse: 'Gözat...',
  filenameOnDisk: 'Diskteki dosya adı',
  parallelThreads: 'Paralel Bağlantılar (İş Parçacıkları)',
  selectQuality: 'Kalite / Çözünürlük Seçin',
  startDownload: 'İndirmeyi Başlat',
  cancel: 'İptal',
  videoDetected: 'Video veya Ses Akışı Algılandı',

  // Extension Modal
  extensionGuideTitle: 'Tarayıcı Uzantısı Kurulum Kılavuzu',
  step1: 'Tarayıcınızda uzantılar sayfasını açın (chrome://extensions veya edge://extensions)',
  step2: 'Sağ üst köşedeki "Geliştirici Modu" anahtarını açın',
  step3: '"Paketlenmemiş öge yükle" düğmesine tıklayın ve aşağıdaki klasörü seçin',
  extensionPathLabel: 'Uzantı Klasör Yolu',
  copyPath: 'Yolu Kopyala',
  copied: 'Kopyalandı!',
  openExtensionFolder: 'Uzantı Klasörünü Aç',
  close: 'Kapat',

  // Alerts & Messages
  errorStarting: 'İndirme başlatılırken hata oluştu',
  failedInspect: 'URL çözümlenemedi',
  confirmDelete: 'Bu indirme görevini silmek istediğinize emin misiniz?',
};
