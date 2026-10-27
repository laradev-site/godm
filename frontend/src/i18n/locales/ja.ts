import { Translations } from '../types';

export const ja: Translations = {
  // Toolbar
  addUrl: 'URL追加',
  resume: '再開',
  stop: '停止',
  stopAll: 'すべて停止',
  delete: '削除',
  openFile: 'ファイルを開く',
  folder: 'フォルダ',
  threads: 'スレッド',
  extension: '拡張機能',
  searchPlaceholder: 'ダウンロードを検索...',
  language: '言語 (Language)',

  // Sidebar Categories
  categories: 'カテゴリ',
  allDownloads: 'すべてのダウンロード',
  compressed: '圧縮ファイル',
  documents: 'ドキュメント',
  music: '音楽・オーディオ',
  programs: 'プログラム',
  video: '動画・ビデオ',

  // Sidebar Status
  status: 'ステータス',
  downloading: 'ダウンロード中',
  paused: '一時停止',
  completed: '完了',
  error: 'エラー',

  // Table Headers
  fileName: 'ファイル名',
  size: 'サイズ',
  progress: '進捗状況',
  speed: '速度',
  timeLeft: '残り時間',
  connections: 'スレッド数',

  // Inspector Panel
  downloadThreadsTitle: 'ダウンロードスレッドと分割セグメント',
  activeSegmentation: 'アクティブ動的分割：{count} 並行接続',
  threadCol: 'スレッド',
  byteOffsetCol: 'バイト範囲オフセット',
  downloadedTotalCol: 'ダウンロード済 / 合計',
  statusCol: '状態',
  connectionNum: '接続 #{num}',
  finished: '完了',
  active: '通信中',
  idle: '待機中',
  saveTo: '保存先',

  // Status Bar
  downloadsTotal: '合計 {count} 件のダウンロード',
  activeCount: '{count} 件進行中',
  completedCount: '{count} 件完了',

  // Add Download Modal
  enterDownloadUrl: 'ダウンロードURLを入力',
  urlPlaceholder: 'ダウンロードリンクを貼り付け (HTTP, HTTPS, YouTube, TikTokなど)',
  inspecting: 'メディアとサーバー情報を解析中...',
  saveFolder: '保存先フォルダ',
  browse: '参照...',
  filenameOnDisk: 'ディスク上のファイル名',
  parallelThreads: '並列接続数 (スレッド)',
  selectQuality: '画質・解像度を選択',
  startDownload: 'ダウンロード開始',
  cancel: 'キャンセル',
  videoDetected: '動画 / 音声ストリームを検出しました',

  // Extension Modal
  extensionGuideTitle: 'ブラウザ拡張機能の導入ガイド',
  step1: 'ブラウザの拡張機能ページを開きます (chrome://extensions または edge://extensions)',
  step2: '画面右上の「デベロッパーモード」を有効にします',
  step3: '「パッケージ化されていない拡張機能を読み込む」をクリックし、下記フォルダを選択',
  extensionPathLabel: '拡張機能フォルダのパス',
  copyPath: 'パスをコピー',
  copied: 'コピー完了！',
  openExtensionFolder: '拡張機能フォルダを開く',
  close: '閉じる',

  // Alerts & Messages
  errorStarting: 'ダウンロードの開始に失敗しました',
  failedInspect: 'URLの解析に失敗しました',
  confirmDelete: 'このダウンロードタスクを削除してもよろしいですか？',
};
