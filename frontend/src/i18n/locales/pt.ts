import { Translations } from '../types';

export const pt: Translations = {
  // Toolbar
  addUrl: 'Adicionar URL',
  resume: 'Retomar',
  stop: 'Parar',
  stopAll: 'Parar Tudo',
  delete: 'Excluir',
  openFile: 'Abrir Arquivo',
  folder: 'Pasta',
  threads: 'Threads',
  extension: 'Extensão',
  searchPlaceholder: 'Pesquisar downloads...',
  language: 'Idioma',

  // Sidebar Categories
  categories: 'CATEGORIAS',
  allDownloads: 'Todos os downloads',
  compressed: 'Compactados',
  documents: 'Documentos',
  music: 'Músicas',
  programs: 'Programas',
  video: 'Vídeos',

  // Sidebar Status
  status: 'STATUS',
  downloading: 'Baixando',
  paused: 'Pausado',
  completed: 'Concluído',
  error: 'Erro',

  // Table Headers
  fileName: 'NOME DO ARQUIVO',
  size: 'TAMANHO',
  progress: 'PROGRESSO',
  speed: 'VELOCIDADE',
  timeLeft: 'TEMPO RESTANTE',
  connections: 'THREADS',

  // Inspector Panel
  downloadThreadsTitle: 'THREADS E SEGMENTOS DE DOWNLOAD',
  activeSegmentation: 'Segmentação Dinâmica Ativa: {count} Conexões Paralelas',
  threadCol: 'Thread',
  byteOffsetCol: 'Intervalo de Bytes',
  downloadedTotalCol: 'Baixado / Total',
  statusCol: 'Status',
  connectionNum: 'Conexão #{num}',
  finished: 'Concluído',
  active: 'Ativo',
  idle: 'Ocioso',
  saveTo: 'Salvar em',

  // Status Bar
  downloadsTotal: '{count} downloads no total',
  activeCount: '{count} ativos',
  completedCount: '{count} concluídos',

  // Add Download Modal
  enterDownloadUrl: 'Inserir URL de Download',
  urlPlaceholder: 'Cole o link de download (HTTP, HTTPS, YouTube, TikTok, Vimeo...)',
  inspecting: 'Inspecionando informações do servidor...',
  saveFolder: 'Pasta de destino',
  browse: 'Procurar...',
  filenameOnDisk: 'Nome do arquivo no disco',
  parallelThreads: 'Conexões Paralelas (Threads)',
  selectQuality: 'Selecionar Qualidade / Resolução',
  startDownload: 'Iniciar Download',
  cancel: 'Cancelar',
  videoDetected: 'Vídeo / Áudio Detectado',

  // Extension Modal
  extensionGuideTitle: 'Guia de Instalação da Extensão',
  step1: 'Abra a página de extensões no seu navegador (chrome://extensions ou edge://extensions)',
  step2: 'Ative a opção "Modo de desenvolvedor" no canto superior direito',
  step3: 'Clique em "Carregar sem compactação" e selecione a pasta abaixo',
  extensionPathLabel: 'Caminho da pasta da extensão',
  copyPath: 'Copiar Caminho',
  copied: 'Copiado!',
  openExtensionFolder: 'Abrir Pasta da Extensão',
  close: 'Fechar',

  // Alerts & Messages
  errorStarting: 'Erro ao iniciar o download',
  failedInspect: 'Falha ao inspecionar a URL',
  confirmDelete: 'Tem certeza de que deseja remover este download?',
};
