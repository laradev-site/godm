import { Translations } from '../types';

export const fr: Translations = {
  // Toolbar
  addUrl: 'Ajouter URL',
  resume: 'Reprendre',
  stop: 'Arrêter',
  stopAll: 'Tout arrêter',
  delete: 'Supprimer',
  openFile: 'Ouvrir',
  folder: 'Dossier',
  threads: 'Fils',
  extension: 'Extension',
  searchPlaceholder: 'Rechercher des téléchargements...',
  language: 'Langue',

  // Sidebar Categories
  categories: 'CATÉGORIES',
  allDownloads: 'Tous les téléchargements',
  compressed: 'Compressés',
  documents: 'Documents',
  music: 'Musique',
  programs: 'Applications',
  video: 'Vidéo',

  // Sidebar Status
  status: 'STATUT',
  downloading: 'Téléchargement',
  paused: 'En pause',
  completed: 'Terminé',
  error: 'Erreur',

  // Table Headers
  fileName: 'NOM DU FICHIER',
  size: 'TAILLE',
  progress: 'PROGRESSION',
  speed: 'VITESSE',
  timeLeft: 'TEMPS RESTANT',
  connections: 'FILS',

  // Inspector Panel
  downloadThreadsTitle: 'FILS ET SEGMENTS DE TÉLÉCHARGEMENT',
  activeSegmentation: 'Segmentation Dynamique Active : {count} Connexions Parallèles',
  threadCol: 'Fil',
  byteOffsetCol: 'Plage d\'octets',
  downloadedTotalCol: 'Téléchargé / Total',
  statusCol: 'Statut',
  connectionNum: 'Connexion #{num}',
  finished: 'Terminé',
  active: 'Actif',
  idle: 'Inactif',
  saveTo: 'Enregistrer dans',

  // Status Bar
  downloadsTotal: '{count} téléchargements au total',
  activeCount: '{count} actifs',
  completedCount: '{count} terminés',

  // Add Download Modal
  enterDownloadUrl: 'Entrer l\'URL de téléchargement',
  urlPlaceholder: 'Coller le lien de téléchargement (HTTP, HTTPS, YouTube, TikTok...)',
  inspecting: 'Inspection du fichier / serveur...',
  saveFolder: 'Dossier de destination',
  browse: 'Parcourir...',
  filenameOnDisk: 'Nom du fichier sur le disque',
  parallelThreads: 'Connexions parallèles (Fils)',
  selectQuality: 'Choisir la qualité / résolution',
  startDownload: 'Démarrer le téléchargement',
  cancel: 'Annuler',
  videoDetected: 'Flux Vidéo / Audio Détecté',

  // Extension Modal
  extensionGuideTitle: 'Guide d\'installation de l\'extension',
  step1: 'Ouvrez la page des extensions dans votre navigateur (chrome://extensions ou edge://extensions)',
  step2: 'Activez le bouton "Mode développeur" en haut à droite',
  step3: 'Cliquez sur "Charger l\'extension non empaquetée" et sélectionnez le dossier',
  extensionPathLabel: 'Chemin du dossier de l\'extension',
  copyPath: 'Copier le chemin',
  copied: 'Copié !',
  openExtensionFolder: 'Ouvrir le dossier de l\'extension',
  close: 'Fermer',

  // Alerts & Messages
  errorStarting: 'Erreur lors du démarrage du téléchargement',
  failedInspect: 'Impossible d\'inspecter l\'URL',
  confirmDelete: 'Voulez-vous vraiment supprimer cette tâche de téléchargement ?',
};
