import { Translations } from '../types';

export const it: Translations = {
  // Toolbar
  addUrl: 'Aggiungi URL',
  resume: 'Riprendi',
  stop: 'Interrompi',
  stopAll: 'Ferma tutti',
  delete: 'Elimina',
  openFile: 'Apri file',
  folder: 'Cartella',
  threads: 'Thread',
  extension: 'Estensione',
  searchPlaceholder: 'Cerca nei download...',
  language: 'Lingua',

  // Sidebar Categories
  categories: 'CATEGORIE',
  allDownloads: 'Tutti i download',
  compressed: 'Archivi',
  documents: 'Documenti',
  music: 'Musica',
  programs: 'Programmi',
  video: 'Video',

  // Sidebar Status
  status: 'STATO',
  downloading: 'In download',
  paused: 'In pausa',
  completed: 'Completato',
  error: 'Errore',

  // Table Headers
  fileName: 'NOME DEL FILE',
  size: 'DIMENSIONE',
  progress: 'AVANZAMENTO',
  speed: 'VELOCITÀ',
  timeLeft: 'TEMPO RIMASTO',
  connections: 'THREAD',

  // Inspector Panel
  downloadThreadsTitle: 'THREAD E SEGMENTI DI DOWNLOAD',
  activeSegmentation: 'Segmentazione Dinamica Attiva: {count} Connessioni Parallele',
  threadCol: 'Thread',
  byteOffsetCol: 'Intervallo di byte',
  downloadedTotalCol: 'Scaricato / Totale',
  statusCol: 'Stato',
  connectionNum: 'Connessione #{num}',
  finished: 'Finito',
  active: 'Attivo',
  idle: 'Inattivo',
  saveTo: 'Salva in',

  // Status Bar
  downloadsTotal: '{count} download totali',
  activeCount: '{count} attivi',
  completedCount: '{count} completati',

  // Add Download Modal
  enterDownloadUrl: 'Inserisci URL di download',
  urlPlaceholder: 'Incolla link di download (HTTP, HTTPS, YouTube, TikTok, Vimeo...)',
  inspecting: 'Analisi delle informazioni del server...',
  saveFolder: 'Cartella di destinazione',
  browse: 'Sfoglia...',
  filenameOnDisk: 'Nome del file sul disco',
  parallelThreads: 'Connessioni parallele (Thread)',
  selectQuality: 'Seleziona qualità / risoluzione',
  startDownload: 'Avvia download',
  cancel: 'Annulla',
  videoDetected: 'Rilevato flusso video o audio',

  // Extension Modal
  extensionGuideTitle: 'Guida all\'installazione dell\'estensione',
  step1: 'Apri la pagina delle estensioni nel browser (chrome://extensions o edge://extensions)',
  step2: 'Attiva l\'interruttore "Modalità sviluppatore" in alto a destra',
  step3: 'Fai clic su "Carica estensione non pacchettizzata" e seleziona la cartella',
  extensionPathLabel: 'Percorso della cartella dell\'estensione',
  copyPath: 'Copia percorso',
  copied: 'Copiato!',
  openExtensionFolder: 'Apri cartella estensione',
  close: 'Chiudi',

  // Alerts & Messages
  errorStarting: 'Errore durante l\'avvio del download',
  failedInspect: 'Impossibile analizzare l\'URL',
  confirmDelete: 'Sei sicuro di voler rimuovere questa attività di download?',
};
