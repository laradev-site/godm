import { Translations } from '../types';

export const de: Translations = {
  // Toolbar
  addUrl: 'URL hinzufügen',
  resume: 'Fortsetzen',
  stop: 'Anhalten',
  stopAll: 'Alle anhalten',
  delete: 'Löschen',
  openFile: 'Datei öffnen',
  folder: 'Ordner',
  threads: 'Threads',
  extension: 'Erweiterung',
  searchPlaceholder: 'Downloads durchsuchen...',
  language: 'Sprache',

  // Sidebar Categories
  categories: 'KATEGORIEN',
  allDownloads: 'Alle Downloads',
  compressed: 'Komprimiert',
  documents: 'Dokumente',
  music: 'Musik',
  programs: 'Programme',
  video: 'Video',

  // Sidebar Status
  status: 'STATUS',
  downloading: 'Wird heruntergeladen',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  error: 'Fehler',

  // Table Headers
  fileName: 'DATEINAME',
  size: 'GRÖSSE',
  progress: 'FORTSCHRITT',
  speed: 'GESCHWINDIGKEIT',
  timeLeft: 'VERBLEIBENDE ZEIT',
  connections: 'THREADS',

  // Inspector Panel
  downloadThreadsTitle: 'DOWNLOAD-THREADS & SEGMENTE',
  activeSegmentation: 'Aktive dynamische Segmentierung: {count} parallele Verbindungen',
  threadCol: 'Thread',
  byteOffsetCol: 'Byte-Bereich',
  downloadedTotalCol: 'Geladen / Gesamt',
  statusCol: 'Status',
  connectionNum: 'Verbindung #{num}',
  finished: 'Fertig',
  active: 'Aktiv',
  idle: 'Leerlauf',
  saveTo: 'Speichern unter',

  // Status Bar
  downloadsTotal: '{count} Downloads insgesamt',
  activeCount: '{count} aktiv',
  completedCount: '{count} abgeschlossen',

  // Add Download Modal
  enterDownloadUrl: 'Download-URL eingeben',
  urlPlaceholder: 'Download-Link einfügen (HTTP, HTTPS, YouTube, TikTok, Vimeo...)',
  inspecting: 'Server- und Medieninformationen prüfen...',
  saveFolder: 'Zielordner',
  browse: 'Durchsuchen...',
  filenameOnDisk: 'Dateiname auf der Festplatte',
  parallelThreads: 'Parallele Verbindungen (Threads)',
  selectQuality: 'Qualität / Auflösung wählen',
  startDownload: 'Download starten',
  cancel: 'Abbrechen',
  videoDetected: 'Video-/Audiostream erkannt',

  // Extension Modal
  extensionGuideTitle: 'Browser-Erweiterungs-Anleitung',
  step1: 'Öffnen Sie die Erweiterungsseite im Browser (chrome://extensions oder edge://extensions)',
  step2: 'Aktivieren Sie den "Entwicklermodus" oben rechts',
  step3: 'Klicken Sie auf "Entpackte Erweiterung laden" und wählen Sie den Ordner aus',
  extensionPathLabel: 'Pfad zum Erweiterungsordner',
  copyPath: 'Pfad kopieren',
  copied: 'Kopiert!',
  openExtensionFolder: 'Erweiterungsordner öffnen',
  close: 'Schließen',

  // Alerts & Messages
  errorStarting: 'Fehler beim Starten des Downloads',
  failedInspect: 'URL konnte nicht geprüft werden',
  confirmDelete: 'Möchten Sie diesen Download-Task wirklich entfernen?',
};
