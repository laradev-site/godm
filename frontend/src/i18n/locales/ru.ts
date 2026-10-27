import { Translations } from '../types';

export const ru: Translations = {
  // Toolbar
  addUrl: 'Добавить URL',
  resume: 'Возобновить',
  stop: 'Остановить',
  stopAll: 'Стоп все',
  delete: 'Удалить',
  openFile: 'Открыть файл',
  folder: 'Папка',
  threads: 'Потоки',
  extension: 'Расширение',
  searchPlaceholder: 'Поиск загрузок...',
  language: 'Язык',

  // Sidebar Categories
  categories: 'КАТЕГОРИИ',
  allDownloads: 'Все загрузки',
  compressed: 'Архивы',
  documents: 'Документы',
  music: 'Музыка',
  programs: 'Программы',
  video: 'Видео',

  // Sidebar Status
  status: 'СТАТУС',
  downloading: 'Загрузка',
  paused: 'Приостановлено',
  completed: 'Завершено',
  error: 'Ошибка',

  // Table Headers
  fileName: 'ИМЯ ФАЙЛА',
  size: 'РАЗМЕР',
  progress: 'ПРОГРЕСС',
  speed: 'СКОРОСТЬ',
  timeLeft: 'ОСТАЛОСЬ',
  connections: 'ПОТОКИ',

  // Inspector Panel
  downloadThreadsTitle: 'ПОТОКИ И СЕГМЕНТЫ ЗАГРУЗКИ',
  activeSegmentation: 'Динамическая сегментация: {count} параллельных соединений',
  threadCol: 'Поток',
  byteOffsetCol: 'Диапазон байтов',
  downloadedTotalCol: 'Загружено / Всего',
  statusCol: 'Статус',
  connectionNum: 'Соединение #{num}',
  finished: 'Завершено',
  active: 'Активно',
  idle: 'Ожидание',
  saveTo: 'Сохранить в',

  // Status Bar
  downloadsTotal: 'Всего загрузок: {count}',
  activeCount: '{count} активных',
  completedCount: '{count} завершено',

  // Add Download Modal
  enterDownloadUrl: 'Введите URL для загрузки',
  urlPlaceholder: 'Вставьте ссылку (HTTP, HTTPS, YouTube, TikTok, Vimeo...)',
  inspecting: 'Проверка ссылки и информации о сервере...',
  saveFolder: 'Папка сохранения',
  browse: 'Обзор...',
  filenameOnDisk: 'Имя файла на диске',
  parallelThreads: 'Параллельные соединения (потоки)',
  selectQuality: 'Выберите качество / разрешение',
  startDownload: 'Начать загрузку',
  cancel: 'Отмена',
  videoDetected: 'Обнаружен видео / аудио поток',

  // Extension Modal
  extensionGuideTitle: 'Установка расширения для браузера',
  step1: 'Откройте страницу расширений в браузере (chrome://extensions или edge://extensions)',
  step2: 'Включите "Режим разработчика" в правом верхнем углу',
  step3: 'Нажмите "Загрузить распакованное" и выберите папку ниже',
  extensionPathLabel: 'Путь к папке расширения',
  copyPath: 'Копировать путь',
  copied: 'Скопировано!',
  openExtensionFolder: 'Открыть папку с расширением',
  close: 'Закрыть',

  // Alerts & Messages
  errorStarting: 'Ошибка при запуске загрузки',
  failedInspect: 'Не удалось проверить URL',
  confirmDelete: 'Вы уверены, что хотите удалить эту загрузку?',
};
