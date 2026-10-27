import { Translations } from '../types';

export const en: Translations = {
  // Toolbar
  addUrl: 'Add URL',
  resume: 'Resume',
  stop: 'Stop',
  stopAll: 'Stop All',
  delete: 'Delete',
  openFile: 'Open File',
  folder: 'Folder',
  threads: 'Threads',
  extension: 'Extension',
  searchPlaceholder: 'Search downloads...',
  language: 'Language',

  // Sidebar Categories
  categories: 'CATEGORIES',
  allDownloads: 'All Downloads',
  compressed: 'Compressed',
  documents: 'Documents',
  music: 'Music',
  programs: 'Programs',
  video: 'Video',

  // Sidebar Status
  status: 'STATUS',
  downloading: 'Downloading',
  paused: 'Paused',
  completed: 'Completed',
  error: 'Error',

  // Table Headers
  fileName: 'FILE NAME',
  size: 'SIZE',
  progress: 'PROGRESS',
  speed: 'SPEED',
  timeLeft: 'TIME LEFT',
  connections: 'THREADS',

  // Inspector Panel
  downloadThreadsTitle: 'DOWNLOAD THREADS & CHUNKS',
  activeSegmentation: 'Active Dynamic Segmentation: {count} Parallel Connections',
  threadCol: 'Thread',
  byteOffsetCol: 'Byte Range Offset',
  downloadedTotalCol: 'Downloaded / Total',
  statusCol: 'Status',
  connectionNum: 'Connection #{num}',
  finished: 'Finished',
  active: 'Active',
  idle: 'Idle',
  saveTo: 'Save to',

  // Status Bar
  downloadsTotal: '{count} downloads total',
  activeCount: '{count} active',
  completedCount: '{count} completed',

  // Add Download Modal
  enterDownloadUrl: 'Enter Download URL',
  urlPlaceholder: 'Paste download link (HTTP, HTTPS, or YouTube, TikTok, Vimeo...)',
  inspecting: 'Inspecting media / server info...',
  saveFolder: 'Save Folder',
  browse: 'Browse...',
  filenameOnDisk: 'Filename on disk',
  parallelThreads: 'Parallel Connections (Threads)',
  selectQuality: 'Select Quality / Resolution',
  startDownload: 'Start Download',
  cancel: 'Cancel',
  videoDetected: 'Universal Video / Audio Stream Detected',

  // Extension Modal
  extensionGuideTitle: 'Browser Extension Setup Guide',
  step1: 'Open Extensions page in your browser (chrome://extensions or edge://extensions)',
  step2: 'Enable "Developer Mode" toggle in the top-right corner',
  step3: 'Click "Load unpacked" and select the extension directory below',
  extensionPathLabel: 'Extension Directory Path',
  copyPath: 'Copy Path',
  copied: 'Copied!',
  openExtensionFolder: 'Open Extension Folder',
  close: 'Close',

  // Alerts & Messages
  errorStarting: 'Error starting download',
  failedInspect: 'Failed to inspect URL',
  confirmDelete: 'Are you sure you want to remove this download task?',
};
