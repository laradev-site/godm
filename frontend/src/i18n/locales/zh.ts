import { Translations } from '../types';

export const zh: Translations = {
  // Toolbar
  addUrl: '新建任务',
  resume: '继续',
  stop: '暂停',
  stopAll: '全部暂停',
  delete: '删除',
  openFile: '打开文件',
  folder: '打开目录',
  threads: '线程视图',
  extension: '浏览器扩展',
  searchPlaceholder: '搜索下载任务...',
  language: '语言 (Language)',

  // Sidebar Categories
  categories: '分类管理',
  allDownloads: '全部任务',
  compressed: '压缩文件',
  documents: '文档文件',
  music: '音频音乐',
  programs: '应用程序',
  video: '视频文件',

  // Sidebar Status
  status: '任务状态',
  downloading: '正在下载',
  paused: '已暂停',
  completed: '已完成',
  error: '下载错误',

  // Table Headers
  fileName: '文件名',
  size: '文件大小',
  progress: '下载进度',
  speed: '实时速度',
  timeLeft: '剩余时间',
  connections: '连接线程',

  // Inspector Panel
  downloadThreadsTitle: '下载线程与分块详情',
  activeSegmentation: '动态分块多线程并发：{count} 条连接',
  threadCol: '线程编号',
  byteOffsetCol: '字节分段范围',
  downloadedTotalCol: '已下载 / 总大小',
  statusCol: '连接状态',
  connectionNum: '连接通道 #{num}',
  finished: '已完成',
  active: '传输中',
  idle: '等待中',
  saveTo: '保存路径',

  // Status Bar
  downloadsTotal: '共 {count} 个下载任务',
  activeCount: '{count} 个进行中',
  completedCount: '{count} 个已完成',

  // Add Download Modal
  enterDownloadUrl: '新建下载任务',
  urlPlaceholder: '粘贴下载链接 (HTTP/HTTPS 或 YouTube、TikTok、B站等视频链接)',
  inspecting: '正在探测服务器与媒体资源信息...',
  saveFolder: '保存目录',
  browse: '浏览...',
  filenameOnDisk: '保存文件名',
  parallelThreads: '并行连接线程数',
  selectQuality: '选择视频清晰度 / 分辨率',
  startDownload: '立即开始下载',
  cancel: '取消',
  videoDetected: '已识别在线视频/音频流',

  // Extension Modal
  extensionGuideTitle: '浏览器嗅探扩展安装指南',
  step1: '在浏览器中打开扩展程序页面 (chrome://extensions 或 edge://extensions)',
  step2: '在页面右上角开启“开发者模式”开关',
  step3: '点击“加载已解压的扩展程序”，并选择以下目录',
  extensionPathLabel: '扩展所在目录绝对路径',
  copyPath: '复制路径',
  copied: '已复制！',
  openExtensionFolder: '在文件夹中打开',
  close: '关闭',

  // Alerts & Messages
  errorStarting: '启动下载任务失败',
  failedInspect: '链接解析失败，请检查网络或地址',
  confirmDelete: '确定要删除此下载任务吗？',
};
