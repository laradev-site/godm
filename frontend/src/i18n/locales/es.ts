import { Translations } from '../types';

export const es: Translations = {
  // Toolbar
  addUrl: 'Añadir URL',
  resume: 'Reanudar',
  stop: 'Detener',
  stopAll: 'Detener Todo',
  delete: 'Eliminar',
  openFile: 'Abrir Archivo',
  folder: 'Carpeta',
  threads: 'Hilos',
  extension: 'Extensión',
  searchPlaceholder: 'Buscar descargas...',
  language: 'Idioma',

  // Sidebar Categories
  categories: 'CATEGORÍAS',
  allDownloads: 'Todas las descargas',
  compressed: 'Comprimidos',
  documents: 'Documentos',
  music: 'Música',
  programs: 'Programas',
  video: 'Vídeo',

  // Sidebar Status
  status: 'ESTADO',
  downloading: 'Descargando',
  paused: 'En pausa',
  completed: 'Completado',
  error: 'Error',

  // Table Headers
  fileName: 'NOMBRE DEL ARCHIVO',
  size: 'TAMAÑO',
  progress: 'PROGRESO',
  speed: 'VELOCIDAD',
  timeLeft: 'TIEMPO RESTANTE',
  connections: 'HILOS',

  // Inspector Panel
  downloadThreadsTitle: 'HILOS Y SEGMENTOS DE DESCARGA',
  activeSegmentation: 'Segmentación Dinámica Activa: {count} Conexiones Paralelas',
  threadCol: 'Hilo',
  byteOffsetCol: 'Rango de Bytes',
  downloadedTotalCol: 'Descargado / Total',
  statusCol: 'Estado',
  connectionNum: 'Conexión #{num}',
  finished: 'Finalizado',
  active: 'Activo',
  idle: 'Inactivo',
  saveTo: 'Guardar en',

  // Status Bar
  downloadsTotal: '{count} descargas en total',
  activeCount: '{count} activas',
  completedCount: '{count} completadas',

  // Add Download Modal
  enterDownloadUrl: 'Introducir URL de descarga',
  urlPlaceholder: 'Pegar enlace de descarga (HTTP, HTTPS, YouTube, TikTok, Vimeo...)',
  inspecting: 'Inspeccionando información del servidor...',
  saveFolder: 'Carpeta de destino',
  browse: 'Examinar...',
  filenameOnDisk: 'Nombre del archivo en disco',
  parallelThreads: 'Conexiones Paralelas (Hilos)',
  selectQuality: 'Seleccionar Calidad / Resolución',
  startDownload: 'Iniciar Descarga',
  cancel: 'Cancelar',
  videoDetected: 'Vídeo o Audio Detectado',

  // Extension Modal
  extensionGuideTitle: 'Guía de Instalación de la Extensión',
  step1: 'Abre la página de extensiones en tu navegador (chrome://extensions o edge://extensions)',
  step2: 'Activa la casilla "Modo de desarrollador" en la esquina superior derecha',
  step3: 'Haz clic en "Cargar descomprimida" y selecciona el directorio de la extensión',
  extensionPathLabel: 'Ruta del directorio de la extensión',
  copyPath: 'Copiar Ruta',
  copied: '¡Copiado!',
  openExtensionFolder: 'Abrir Carpeta de la Extensión',
  close: 'Cerrar',

  // Alerts & Messages
  errorStarting: 'Error al iniciar la descarga',
  failedInspect: 'Error al inspeccionar la URL',
  confirmDelete: '¿Estás seguro de que deseas eliminar esta tarea de descarga?',
};
