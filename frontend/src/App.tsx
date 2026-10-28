import { useState, useEffect, useMemo } from 'react';
import { Events } from '@wailsio/runtime';
import {
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  FolderOpen,
  ExternalLink,
  Layers,
  Search,
  Zap,
  Activity,
  FileArchive,
  FileVideo,
  FileAudio,
  FileBox,
  FileText,
  File,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Video,
  Puzzle,
  Copy,
  Check,
  Globe,
  Sparkles,
  Lock,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import * as DownloadService from '../bindings/godm/internal/service/downloadservice';
import { DownloadItem, DownloadStatus } from '../bindings/godm/internal/service/models';
import { ResourceInfo } from '../bindings/godm/internal/protocol/models';
import { MediaInfo } from '../bindings/godm/internal/media/models';
import { useI18n, LANGUAGES } from './i18n';
import './app.css';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

type CategoryType = 'all' | 'compressed' | 'documents' | 'music' | 'programs' | 'video' | 'other';
type StatusFilter = 'all' | 'downloading' | 'completed' | 'paused' | 'error';

function getCategory(filename: string, category?: string): CategoryType {
  if (category) {
    const lower = category.toLowerCase();
    if (['compressed', 'documents', 'music', 'programs', 'video'].includes(lower)) {
      return lower as CategoryType;
    }
  }
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'xz', 'cab', 'tgz', 'dmg'].includes(ext)) return 'compressed';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'm4v', '3gp', 'wmv'].includes(ext)) return 'video';
  if (['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'alac'].includes(ext)) return 'music';
  if (['exe', 'msi', 'apk', 'dmg', 'pkg', 'deb', 'rpm', 'bat', 'cmd'].includes(ext)) return 'programs';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'epub', 'odt', 'csv', 'md'].includes(ext)) return 'documents';
  return 'other';
}

function getFileIcon(filename: string, category?: string) {
  const cat = getCategory(filename, category);
  switch (cat) {
    case 'compressed':
      return <FileArchive size={16} />;
    case 'video':
      return <FileVideo size={16} />;
    case 'music':
      return <FileAudio size={16} />;
    case 'programs':
      return <FileBox size={16} />;
    case 'documents':
      return <FileText size={16} />;
    default:
      return <File size={16} />;
  }
}

export default function App() {
  const { language, setLanguage, t, format } = useI18n();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  useEffect(() => {
    if (!isLangMenuOpen) return;
    const handleClickOutside = () => setIsLangMenuOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isLangMenuOpen]);

  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Add Download Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [connections, setConnections] = useState(8);
  const [defaultDir, setDefaultDir] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [detectedCategory, setDetectedCategory] = useState('General');
  const [isProbing, setIsProbing] = useState(false);
  const [probeInfo, setProbeInfo] = useState<ResourceInfo | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('bestvideo+bestaudio/best');
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [probeError, setProbeError] = useState('');

  // Authentication & Browser Session state
  const [authSession, setAuthSession] = useState<{
    cookies?: string;
    cookieJar?: string;
    userAgent?: string;
    referer?: string;
    directStreams?: Array<{ url: string; quality?: string; contentType?: string; size?: number }>;
  } | null>(null);
  const [availableBrowsers, setAvailableBrowsers] = useState<string[]>([]);
  const [selectedBrowserCookie, setSelectedBrowserCookie] = useState<string>('none');
  const [hasDomainCookies, setHasDomainCookies] = useState<boolean>(false);

  // Extension Guide Modal state
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [extensionPath, setExtensionPath] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [guideBrowser, setGuideBrowser] = useState<'chrome' | 'edge' | 'brave'>('chrome');

  // Check if domain has stored cookies whenever URL changes
  useEffect(() => {
    const trimmed = url.trim();
    if (trimmed) {
      DownloadService.HasCookiesForURL(trimmed).then(setHasDomainCookies).catch(() => {});
    } else {
      setHasDomainCookies(false);
    }
  }, [url]);

  const getBrowserExtensionUrl = (browser: 'chrome' | 'edge' | 'brave') => {
    switch (browser) {
      case 'edge':
        return 'edge://extensions';
      case 'brave':
        return 'brave://extensions';
      default:
        return 'chrome://extensions';
    }
  };

  const handleCopyUrl = (targetUrl: string) => {
    navigator.clipboard.writeText(targetUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const inspectUrl = async (
    targetUrl: string,
    initialFilename?: string,
    overrideAuth?: {
      cookies?: string;
      cookieJar?: string;
      cookiesFromBrowser?: string;
      userAgent?: string;
      referer?: string;
      directStreams?: Array<{ url: string; quality?: string; contentType?: string; size?: number }>;
    }
  ) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;
    setIsProbing(true);
    setProbeError('');
    setProbeInfo(null);
    setMediaInfo(null);

    try {
      const isVid = await DownloadService.IsVideoURL(trimmed);
      if (isVid) {
        setIsVideoMode(true);
        setDetectedCategory('Video');

        const mediaOpts = {
          cookies: overrideAuth?.cookies ?? authSession?.cookies ?? '',
          cookieJar: overrideAuth?.cookieJar ?? authSession?.cookieJar ?? '',
          cookiesFromBrowser:
            overrideAuth?.cookiesFromBrowser ??
            (selectedBrowserCookie !== 'none' ? selectedBrowserCookie : ''),
          userAgent: overrideAuth?.userAgent ?? authSession?.userAgent ?? '',
          referer: overrideAuth?.referer ?? authSession?.referer ?? '',
        };

        // Helper: process, normalize, filter, and sort direct streams from browser extension
        const processDirectStreams = (rawStreams: Array<{ url: string; quality?: string; contentType?: string; size?: number }>) => {
          const map = new Map<string, { url: string; quality?: string; contentType?: string; size?: number }>();
          for (const s of rawStreams) {
            if (!s.url) continue;
            // Clean URL: strip DASH chunk slicing parameters (bytestart/byteend/range)
            const clean = s.url.replace(/[?&](?:bytestart|byteend|range)=\d+/g, '');
            const existing = map.get(clean);
            if (!existing || (s.size || 0) > (existing.size || 0)) {
              map.set(clean, { ...s, url: clean });
            }
          }
          let list = Array.from(map.values());
          // If we have any stream >= 300 KB, filter out tiny noise chunks (< 80 KB)
          const hasDecentSize = list.some((s) => (s.size || 0) >= 300 * 1024);
          if (hasDecentSize) {
            list = list.filter((s) => (s.size || 0) >= 80 * 1024);
          }
          // Sort descending by filesize
          list.sort((a, b) => (b.size || 0) - (a.size || 0));

          return list.map((s, idx) => {
            let label = s.quality || '';
            if (!label) {
              if ((s.size || 0) >= 10 * 1024 * 1024) label = 'HD Video Stream (Direct)';
              else if ((s.size || 0) >= 2 * 1024 * 1024) label = 'Video Stream (Direct)';
              else label = 'Media Stream (Direct)';
            }
            return {
              formatId: `direct_${idx}`,
              resolution: label,
              ext: 'mp4',
              filesize: s.size || 0,
              label: `⚡ ${label}`,
              isAudioOnly: false,
              rawStream: s,
            };
          });
        };

        let info: any = null;
        try {
          info = await DownloadService.InspectVideoWithOptions(trimmed, mediaOpts);
        } catch (inspectErr: any) {
          const rawStreams = overrideAuth?.directStreams || authSession?.directStreams || [];
          const processed = processDirectStreams(rawStreams);
          if (processed.length > 0) {
            const fallbackTitle = initialFilename && initialFilename !== '(1) Facebook' && initialFilename !== 'Facebook'
              ? initialFilename.replace(/\.[^/.]+$/, '')
              : 'Facebook Video';
            info = {
              id: 'direct_stream',
              url: trimmed,
              title: fallbackTitle,
              thumbnail: '',
              duration: 'Direct Stream',
              uploader: 'Browser Sniffer (Authenticated Session)',
              platform: 'Facebook / Direct Stream',
              formats: processed,
            };
          } else {
            throw inspectErr;
          }
        }

        if (info) {
          const rawStreams = overrideAuth?.directStreams || authSession?.directStreams || [];
          const processed = processDirectStreams(rawStreams);
          if (processed.length > 0 && info.formats) {
            info.formats = [...processed, ...info.formats];
          }

          setMediaInfo(info);
          if (info.formats && info.formats.length > 0) {
            setSelectedFormat(info.formats[0].formatId);
          }
          const fname = initialFilename || `${info.title}.mp4`;
          setCustomFilename(fname);
          const vidDir = await DownloadService.GetCategoryDir('Video');
          setDefaultDir(vidDir);
        }
      } else {
        setIsVideoMode(false);
        const headers: Record<string, string> = {};
        const cookies = overrideAuth?.cookies ?? authSession?.cookies;
        if (cookies) headers['Cookie'] = cookies;
        const referer = overrideAuth?.referer ?? authSession?.referer;
        if (referer) headers['Referer'] = referer;
        const ua = overrideAuth?.userAgent ?? authSession?.userAgent ?? '';

        const info = await DownloadService.ProbeURLWithHeaders(trimmed, headers, ua);
        if (info) {
          setProbeInfo(info);
          const fname = initialFilename || info.Filename || 'download.bin';
          setCustomFilename(fname);
          const cat = await DownloadService.GetCategory(fname);
          setDetectedCategory(cat);
          const catDir = await DownloadService.GetCategoryDir(cat);
          setDefaultDir(catDir);
        }
      }
    } catch (err: any) {
      setProbeError(err?.message || 'Failed to inspect URL');
    } finally {
      setIsProbing(false);
    }
  };

  const handleFormatChange = async (fmtId: string) => {
    setSelectedFormat(fmtId);
    const matchedFmt = mediaInfo?.formats?.find((f) => f.formatId === fmtId);
    const isAudioOnly =
      matchedFmt?.isAudioOnly ||
      fmtId === 'bestaudio/best' ||
      (fmtId.startsWith('bestaudio') && !fmtId.includes('bestvideo'));

    if (isAudioOnly) {
      setDetectedCategory('Music');
      const dir = await DownloadService.GetCategoryDir('Music');
      setDefaultDir(dir);
      if (customFilename.endsWith('.mp4')) {
        setCustomFilename(customFilename.replace(/\.mp4$/, '.mp3'));
      }
    } else {
      setDetectedCategory('Video');
      const dir = await DownloadService.GetCategoryDir('Video');
      setDefaultDir(dir);
      if (customFilename.endsWith('.mp3')) {
        setCustomFilename(customFilename.replace(/\.mp3$/, '.mp4'));
      }
    }
  };

  const handleFilenameChange = async (newName: string) => {
    setCustomFilename(newName);
    if (!isVideoMode) {
      const cat = await DownloadService.GetCategory(newName);
      setDetectedCategory(cat);
      const dir = await DownloadService.GetCategoryDir(cat);
      setDefaultDir(dir);
    }
  };

  const handleProbe = () => {
    inspectUrl(url);
  };

  // Initial load
  useEffect(() => {
    DownloadService.GetDefaultDownloadDir().then(setDefaultDir);
    DownloadService.GetExtensionPath().then(setExtensionPath).catch(() => {});
    DownloadService.GetAvailableBrowsers()
      .then((b) => {
        if (b && b.length > 0) setAvailableBrowsers(b);
      })
      .catch(() => {});

    DownloadService.ListDownloads().then((items) => {
      if (items) {
        const valid = items.filter((i): i is DownloadItem => i !== null);
        setDownloads(valid);
        if (valid.length > 0) {
          setSelectedId(valid[0].id);
        }
      }
    });

    // Real-time progress updates from Go
    const unbindProgress = Events.On('download:progress', (event: any) => {
      const data: DownloadItem = event.data;
      if (!data) return;
      setDownloads((prev) => {
        const idx = prev.findIndex((item) => item.id === data.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = data;
          return updated;
        }
        return [data, ...prev];
      });
    });

    // Status updates
    const unbindStatus = Events.On('download:status', (event: any) => {
      const data: DownloadItem = event.data;
      if (!data) return;
      setDownloads((prev) => {
        const idx = prev.findIndex((item) => item.id === data.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = data;
          return updated;
        }
        return [data, ...prev];
      });
    });

    // Extension trigger: opens modal with URL prefilled and starts auto-inspection with auth session
    const unbindExtension = Events.On('extension:new-download', (event: any) => {
      const data = event.data;
      if (data && data.url) {
        setUrl(data.url);
        setIsModalOpen(true);
        const session = {
          cookies: data.cookies || '',
          cookieJar: data.cookieJar || '',
          userAgent: data.userAgent || '',
          referer: data.referrer || data.pageUrl || '',
          directStreams: data.directStreams || [],
        };
        setAuthSession(session);
        inspectUrl(data.url, data.filename, session);
      }
    });

    return () => {
      unbindProgress();
      unbindStatus();
      unbindExtension();
    };
  }, []);

  // Global Escape key listener to dismiss active modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isGuideOpen) setIsGuideOpen(false);
        else if (isModalOpen) setIsModalOpen(false);
        else if (isLangMenuOpen) setIsLangMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGuideOpen, isModalOpen, isLangMenuOpen]);

  // Selected item reference
  const selectedItem = useMemo(() => {
    return downloads.find((d) => d.id === selectedId) || downloads[0] || null;
  }, [downloads, selectedId]);

  // Aggregate download speed across all downloading tasks
  const totalSpeed = useMemo(() => {
    return downloads
      .filter((d) => d.status === DownloadStatus.StatusDownloading)
      .reduce((sum, d) => sum + (d.speed || 0), 0);
  }, [downloads]);

  // Category counts
  const counts = useMemo(() => {
    const res: Record<string, number> = {
      all: downloads.length,
      compressed: 0,
      documents: 0,
      music: 0,
      programs: 0,
      video: 0,
      downloading: 0,
      completed: 0,
      paused: 0,
      error: 0,
    };

    downloads.forEach((d) => {
      const cat = getCategory(d.filename, d.category);
      if (res[cat] !== undefined) res[cat]++;
      if (d.status === DownloadStatus.StatusDownloading) res.downloading++;
      if (d.status === DownloadStatus.StatusCompleted) res.completed++;
      if (d.status === DownloadStatus.StatusPaused) res.paused++;
      if (d.status === DownloadStatus.StatusError) res.error++;
    });

    return res;
  }, [downloads]);

  // Filtered downloads
  const filteredDownloads = useMemo(() => {
    return downloads.filter((d) => {
      if (activeCategory !== 'all' && getCategory(d.filename, d.category) !== activeCategory) {
        return false;
      }
      if (activeStatus !== 'all' && d.status !== activeStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.filename.toLowerCase().includes(q) ||
          d.url.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [downloads, activeCategory, activeStatus, searchQuery]);

  // Action handlers
  const handleResume = (id?: string) => {
    const targetId = id || selectedId;
    if (targetId) {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === targetId ? { ...d, status: DownloadStatus.StatusDownloading, error: '' } : d
        )
      );
      DownloadService.ResumeDownload(targetId).catch((err) => {
        console.error('Failed to resume download:', err);
      });
    }
  };

  const handlePause = (id?: string) => {
    const targetId = id || selectedId;
    if (targetId) {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === targetId ? { ...d, status: DownloadStatus.StatusPaused, speed: 0, eta: 'Paused' } : d
        )
      );
      DownloadService.PauseDownload(targetId).catch((err) => {
        console.error('Failed to pause download:', err);
      });
    }
  };

  const handleStopAll = () => {
    DownloadService.StopAll();
  };

  const handleDelete = (id?: string) => {
    const targetId = id || selectedId;
    if (targetId) {
      DownloadService.DeleteDownload(targetId, false);
      setDownloads((prev) => prev.filter((d) => d.id !== targetId));
      if (selectedId === targetId) {
        setSelectedId(null);
      }
    }
  };

  const handleOpenFile = (path: string) => {
    DownloadService.OpenFile(path);
  };

  const handleOpenFolder = (path: string) => {
    DownloadService.OpenFolder(path);
  };

  const handleCopyPath = () => {
    if (extensionPath) {
      navigator.clipboard.writeText(extensionPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenExtensionFolder = () => {
    DownloadService.OpenExtensionFolder();
  };

  const handleStartDownload = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    try {
      let item: DownloadItem | null = null;
      if (isVideoMode || mediaInfo) {
        // If user picked a direct stream from extension, use accelerated multi-thread download directly
        if (selectedFormat.startsWith('direct_')) {
          const matchedFmt = mediaInfo?.formats?.find((f) => f.formatId === selectedFormat);
          let targetUrl = (matchedFmt as any)?.rawStream?.url;
          if (!targetUrl) {
            const idx = parseInt(selectedFormat.replace('direct_', ''), 10);
            const streams = authSession?.directStreams || [];
            targetUrl = streams[idx]?.url;
          }
          if (targetUrl) {
            const cleanUrl = targetUrl.replace(/[?&](?:bytestart|byteend|range)=\d+/g, '');
            const headers: Record<string, string> = {};
            if (authSession?.cookies) headers['Cookie'] = authSession.cookies;
            if (authSession?.referer) headers['Referer'] = authSession.referer;
            item = await DownloadService.StartDownloadWithHeaders(
              cleanUrl,
              connections,
              defaultDir,
              customFilename.trim(),
              headers,
              authSession?.userAgent || ''
            );
          }
        }

        if (!item) {
          const mediaOpts = {
            cookies: authSession?.cookies || '',
            cookieJar: authSession?.cookieJar || '',
            cookiesFromBrowser:
              selectedBrowserCookie !== 'none' ? selectedBrowserCookie : '',
            userAgent: authSession?.userAgent || '',
            referer: authSession?.referer || '',
          };
          item = await DownloadService.StartVideoDownloadWithOptions(
            trimmed,
            selectedFormat,
            defaultDir,
            customFilename.trim(),
            mediaOpts
          );
        }
      } else {
        const headers: Record<string, string> = {};
        if (authSession?.cookies) headers['Cookie'] = authSession.cookies;
        if (authSession?.referer) headers['Referer'] = authSession.referer;
        item = await DownloadService.StartDownloadWithHeaders(
          trimmed,
          connections,
          defaultDir,
          customFilename.trim(),
          headers,
          authSession?.userAgent || ''
        );
      }

      if (item) {
        setDownloads((prev) => [item as DownloadItem, ...prev]);
        setSelectedId(item.id);
      }

      setIsModalOpen(false);
      setUrl('');
      setCustomFilename('');
      setProbeInfo(null);
      setMediaInfo(null);
      setIsVideoMode(false);
      setAuthSession(null);
      setSelectedBrowserCookie('none');
    } catch (err: any) {
      alert(`Error starting download: ${err?.message || err}`);
    }
  };

  return (
    <div className="idm-window">
      {/* 1. Iconic IDM Toolbar */}
      <header className="idm-toolbar">
        <div className="toolbar-actions">
          <button
            className="tool-btn primary"
            onClick={() => setIsModalOpen(true)}
            title="Add new download URL"
          >
            <Plus size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">{t.addUrl}</span>
          </button>

          <button
            className="tool-btn success"
            onClick={() => handleResume()}
            disabled={!selectedItem || (selectedItem.status !== DownloadStatus.StatusPaused && selectedItem.status !== DownloadStatus.StatusError)}
            title="Resume selected download"
          >
            <Play size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">{t.resume}</span>
          </button>

          <button
            className="tool-btn warning"
            onClick={() => handlePause()}
            disabled={!selectedItem || selectedItem.status !== DownloadStatus.StatusDownloading}
            title="Pause selected download"
          >
            <Pause size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">{t.stop}</span>
          </button>

          <button
            className="tool-btn"
            onClick={handleStopAll}
            title="Stop all active downloads"
          >
            <Square size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">{t.stopAll}</span>
          </button>

          <button
            className="tool-btn danger"
            onClick={() => handleDelete()}
            disabled={!selectedItem}
            title="Delete selected download from list"
          >
            <Trash2 size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">{t.delete}</span>
          </button>

          <div className="toolbar-separator" />

          <button
            className="tool-btn"
            onClick={() => selectedItem && handleOpenFile(selectedItem.destPath)}
            disabled={!selectedItem || selectedItem.status !== DownloadStatus.StatusCompleted}
            title="Open completed file"
          >
            <ExternalLink size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">{t.openFile}</span>
          </button>

          <button
            className="tool-btn"
            onClick={() => selectedItem && handleOpenFolder(selectedItem.destPath)}
            disabled={!selectedItem}
            title="Open destination folder"
          >
            <FolderOpen size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">{t.folder}</span>
          </button>

          <div className="toolbar-separator" />

          <button
            className={`tool-btn ${isInspectorOpen ? 'active' : ''}`}
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            title="Toggle Download Threads Visualizer"
          >
            <Activity size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">{t.threads}</span>
          </button>

          <div className="toolbar-separator" />

          <button
            className={`tool-btn ${isGuideOpen ? 'active' : ''}`}
            onClick={() => setIsGuideOpen(true)}
            title="Browser Extension Installation Guide (Chrome / Edge / Brave)"
          >
            <Puzzle size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">{t.extension}</span>
          </button>

          <div className="toolbar-separator" />

          <button
            className={`tool-btn ${isLangModalOpen ? 'active' : ''}`}
            onClick={() => setIsLangModalOpen(true)}
            title="Select Application Language / اختيار اللغة / Idioma"
          >
            <Globe size={20} className="tool-btn-icon" color="#38bdf8" />
            <span className="tool-btn-label">{t.language || 'Language'}</span>
          </button>
        </div>

        <div className="toolbar-right">
          <div className={`speed-meter ${totalSpeed > 0 ? '' : 'idle'}`}>
            <Zap size={14} />
            <span>{totalSpeed > 0 ? `${formatBytes(totalSpeed)}/s` : '0.00 B/s'}</span>
          </div>

          <div className="search-box">
            <Search size={14} color="#64748b" />
            <input
              type="text"
              className="search-input"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Language Selector Dropdown */}
          <div className="lang-selector-wrap">
            <button
              className="lang-btn"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              title={t.language}
            >
              <Globe size={15} color="#38bdf8" />
              <span className="lang-btn-flag">{LANGUAGES.find((l) => l.code === language)?.flag}</span>
              <span>{LANGUAGES.find((l) => l.code === language)?.name}</span>
              <ChevronDown size={12} color="#94a3b8" />
            </button>

            {isLangMenuOpen && (
              <div className="lang-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    className={`lang-option ${language === item.code ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage(item.code);
                      setIsLangMenuOpen(false);
                    }}
                  >
                    <div className="lang-option-left">
                      <span>{item.flag}</span>
                      <span>{item.name}</span>
                    </div>
                    <span className="lang-native-name">{item.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Workspace: Categories Sidebar + Main Downloads Table */}
      <div className="idm-workspace">
        {/* Left Category Tree */}
        <aside className="idm-sidebar">
          <div>
            <div className="sidebar-section-title">{t.categories}</div>
            <ul className="sidebar-menu">
              <li
                className={`sidebar-item ${activeCategory === 'all' && activeStatus === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory('all');
                  setActiveStatus('all');
                }}
              >
                <div className="sidebar-item-left">
                  <Layers size={15} />
                  <span>{t.allDownloads}</span>
                </div>
                <span className="sidebar-badge">{counts.all}</span>
              </li>
              <li
                className={`sidebar-item ${activeCategory === 'compressed' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory('compressed');
                  setActiveStatus('all');
                }}
              >
                <div className="sidebar-item-left">
                  <FileArchive size={15} />
                  <span>{t.compressed}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="sidebar-folder-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      DownloadService.OpenCategoryFolder('Compressed');
                    }}
                    title="Open Compressed Downloads folder in File Explorer"
                  >
                    <FolderOpen size={12} />
                  </button>
                  <span className="sidebar-badge">{counts.compressed}</span>
                </div>
              </li>
              <li
                className={`sidebar-item ${activeCategory === 'documents' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory('documents');
                  setActiveStatus('all');
                }}
              >
                <div className="sidebar-item-left">
                  <FileText size={15} />
                  <span>{t.documents}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="sidebar-folder-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      DownloadService.OpenCategoryFolder('Documents');
                    }}
                    title="Open Documents Downloads folder in File Explorer"
                  >
                    <FolderOpen size={12} />
                  </button>
                  <span className="sidebar-badge">{counts.documents}</span>
                </div>
              </li>
              <li
                className={`sidebar-item ${activeCategory === 'music' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory('music');
                  setActiveStatus('all');
                }}
              >
                <div className="sidebar-item-left">
                  <FileAudio size={15} />
                  <span>{t.music}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="sidebar-folder-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      DownloadService.OpenCategoryFolder('Music');
                    }}
                    title="Open Music Downloads folder in File Explorer"
                  >
                    <FolderOpen size={12} />
                  </button>
                  <span className="sidebar-badge">{counts.music}</span>
                </div>
              </li>
              <li
                className={`sidebar-item ${activeCategory === 'programs' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory('programs');
                  setActiveStatus('all');
                }}
              >
                <div className="sidebar-item-left">
                  <FileBox size={15} />
                  <span>{t.programs}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="sidebar-folder-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      DownloadService.OpenCategoryFolder('Programs');
                    }}
                    title="Open Programs Downloads folder in File Explorer"
                  >
                    <FolderOpen size={12} />
                  </button>
                  <span className="sidebar-badge">{counts.programs}</span>
                </div>
              </li>
              <li
                className={`sidebar-item ${activeCategory === 'video' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory('video');
                  setActiveStatus('all');
                }}
              >
                <div className="sidebar-item-left">
                  <FileVideo size={15} />
                  <span>{t.video}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="sidebar-folder-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      DownloadService.OpenCategoryFolder('Video');
                    }}
                    title="Open Video Downloads folder in File Explorer"
                  >
                    <FolderOpen size={12} />
                  </button>
                  <span className="sidebar-badge">{counts.video}</span>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <div className="sidebar-section-title">{t.status}</div>
            <ul className="sidebar-menu">
              <li
                className={`sidebar-item ${activeStatus === 'downloading' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory('all');
                  setActiveStatus('downloading');
                }}
              >
                <div className="sidebar-item-left">
                  <Zap size={15} color="#34d399" />
                  <span>{t.downloading}</span>
                </div>
                <span className="sidebar-badge">{counts.downloading}</span>
              </li>
              <li
                className={`sidebar-item ${activeStatus === 'paused' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory('all');
                  setActiveStatus('paused');
                }}
              >
                <div className="sidebar-item-left">
                  <Pause size={15} color="#fbbf24" />
                  <span>{t.paused}</span>
                </div>
                <span className="sidebar-badge">{counts.paused}</span>
              </li>
              <li
                className={`sidebar-item ${activeStatus === 'completed' ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory('all');
                  setActiveStatus('completed');
                }}
              >
                <div className="sidebar-item-left">
                  <ExternalLink size={15} color="#60a5fa" />
                  <span>{t.completed}</span>
                </div>
                <span className="sidebar-badge">{counts.completed}</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Main Content Pane */}
        <section className="idm-content-pane">
          <div className="table-container">
            <table className="idm-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>{t.fileName}</th>
                  <th style={{ width: '10%' }}>{t.size}</th>
                  <th style={{ width: '12%' }}>{t.status}</th>
                  <th style={{ width: '16%' }}>{t.progress}</th>
                  <th style={{ width: '10%' }}>{t.speed}</th>
                  <th style={{ width: '10%' }}>{t.timeLeft}</th>
                  <th style={{ width: '12%' }}>{t.connections}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDownloads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      <Layers size={40} className="table-empty-icon" />
                      <div>No downloads found in this category.</div>
                    </td>
                  </tr>
                ) : (
                  filteredDownloads.map((item) => {
                    const isSelected = selectedId === item.id;
                    const isDownloading = item.status === DownloadStatus.StatusDownloading;
                    const isPaused = item.status === DownloadStatus.StatusPaused;
                    const isError = item.status === DownloadStatus.StatusError;

                    return (
                      <tr
                        key={item.id}
                        className={isSelected ? 'selected' : ''}
                        onClick={() => setSelectedId(item.id)}
                        onDoubleClick={() => {
                          if (item.status === DownloadStatus.StatusCompleted) {
                            handleOpenFile(item.destPath);
                          } else if (item.status === DownloadStatus.StatusDownloading) {
                            handlePause(item.id);
                          } else {
                            handleResume(item.id);
                          }
                        }}
                        title="Double-click to Pause/Resume or Open completed file"
                      >
                        <td>
                          <div className="file-col">
                            <div className="file-col-icon">{getFileIcon(item.filename, item.category)}</div>
                            <span className="file-col-name" title={item.filename}>
                              {item.filename}
                            </span>
                          </div>
                        </td>
                        <td className="font-mono-val">
                          {item.totalSize > 0 ? formatBytes(item.totalSize) : 'Streaming'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`status-pill status-${item.status}`}>
                              {item.status}
                            </span>
                            {isDownloading && (
                              <button
                                className="sidebar-folder-icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePause(item.id);
                                }}
                                title="Stop download"
                              >
                                <Pause size={12} color="#fbbf24" />
                              </button>
                            )}
                            {(isPaused || isError) && (
                              <button
                                className="sidebar-folder-icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResume(item.id);
                                }}
                                title="Resume download"
                              >
                                <Play size={12} color="#34d399" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-progress-wrap">
                            <div className="table-progress-track">
                              <div
                                className={`table-progress-fill ${isPaused ? 'paused' : ''} ${
                                  isError ? 'error' : ''
                                }`}
                                style={{ width: `${item.percent || 0}%` }}
                              />
                            </div>
                            <span className="table-progress-text">
                              {(item.percent || 0).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="font-mono-val" style={{ color: isDownloading && item.speed > 0 ? '#34d399' : undefined }}>
                          {isDownloading && item.speed > 0 ? `${formatBytes(item.speed)}/s` : '--'}
                        </td>
                        <td className="font-mono-val">
                          {isDownloading && item.eta ? item.eta : '--'}
                        </td>
                        <td className="font-mono-val">
                          {item.connections > 0
                            ? `${item.connections} Threads`
                            : item.segments && item.segments.length > 0
                            ? `${item.segments.length} Threads`
                            : '1 Thread'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 3. The Signature IDM Download Threads Inspector Panel */}
          {selectedItem && isInspectorOpen && (
            <div className="threads-inspector-panel">
              <div className="inspector-header" onClick={() => setIsInspectorOpen(!isInspectorOpen)}>
                <div className="inspector-title-group">
                  <div className="inspector-title">
                    <Activity size={14} />
                    <span>{t.downloadThreadsTitle}</span>
                  </div>
                  <span className="inspector-filename">{selectedItem.filename}</span>
                </div>

                <div className="inspector-controls">
                  <span className="font-mono-val" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {formatBytes(selectedItem.downloadedBytes)} /{' '}
                    {selectedItem.totalSize > 0 ? formatBytes(selectedItem.totalSize) : 'Stream'}{' '}
                    ({(selectedItem.percent || 0).toFixed(1)}%)
                  </span>
                  <button className="icon-button" onClick={() => setIsInspectorOpen(!isInspectorOpen)}>
                    {isInspectorOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
              </div>

              <div className="inspector-body">
                {/* Visual Thread Segments Strip */}
                <div className="threads-visual-bar-wrap">
                  <div className="threads-visual-header">
                    <span>
                      {format(t.activeSegmentation, { count: selectedItem.segments?.length || 1 })}
                    </span>
                    <span>
                      {selectedItem.status === DownloadStatus.StatusDownloading ? 'Accelerated Transfer' : selectedItem.status}
                    </span>
                  </div>

                  <div className="threads-visual-strip">
                    {selectedItem.segments && selectedItem.segments.length > 0 ? (
                      selectedItem.segments.map((seg, idx) => {
                        const total = seg.end - seg.start + 1;
                        const downloaded = seg.done
                          ? total
                          : Math.max(0, seg.current - seg.start);
                        const pct = total > 0 ? Math.min(100, (downloaded / total) * 100) : 0;

                        return (
                          <div
                            key={idx}
                            className="thread-cell"
                            title={`Thread #${idx + 1}: ${pct.toFixed(1)}% (${formatBytes(downloaded)} / ${formatBytes(total)})`}
                          >
                            <div
                              className={`thread-cell-fill ${seg.done ? 'done' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                            <span className="thread-cell-label">#{idx + 1}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="thread-cell" title="Single Thread Download">
                        <div
                          className={`thread-cell-fill ${selectedItem.status === DownloadStatus.StatusCompleted ? 'done' : ''}`}
                          style={{ width: `${selectedItem.percent || 0}%` }}
                        />
                        <span className="thread-cell-label">#1 Single Connection</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Threads Data Table */}
                <div className="threads-table-wrap">
                  <table className="threads-grid-table">
                    <thead>
                      <tr>
                        <th style={{ width: '12%' }}>{t.threadCol}</th>
                        <th style={{ width: '28%' }}>{t.byteOffsetCol}</th>
                        <th style={{ width: '22%' }}>{t.downloadedTotalCol}</th>
                        <th style={{ width: '20%' }}>{t.progress}</th>
                        <th style={{ width: '18%' }}>{t.statusCol}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItem.segments && selectedItem.segments.length > 0 ? (
                        selectedItem.segments.map((seg, idx) => {
                          const total = seg.end - seg.start + 1;
                          const downloaded = seg.done
                            ? total
                            : Math.max(0, seg.current - seg.start);
                          const pct = total > 0 ? (downloaded / total) * 100 : 0;

                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600, color: '#60a5fa' }}>
                                {format(t.connectionNum, { num: idx + 1 })}
                              </td>
                              <td>
                                {seg.start.toLocaleString()} - {seg.end >= 0 ? seg.end.toLocaleString() : 'EOF'}
                              </td>
                              <td>
                                {formatBytes(downloaded)} / {total > 0 ? formatBytes(total) : '--'}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ flex: 1, height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        height: '100%',
                                        width: `${pct}%`,
                                        background: seg.done ? '#10b981' : '#3b82f6',
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '0.7rem', width: '32px' }}>
                                    {pct.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span
                                  style={{
                                    color: seg.done ? '#34d399' : '#60a5fa',
                                    fontWeight: 500,
                                  }}
                                >
                                  {seg.done ? t.finished : selectedItem.status === DownloadStatus.StatusDownloading ? t.active : t.idle}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td style={{ fontWeight: 600, color: '#60a5fa' }}>{format(t.connectionNum, { num: 1 })}</td>
                          <td>0 - {selectedItem.totalSize > 0 ? selectedItem.totalSize.toLocaleString() : 'Stream'}</td>
                          <td>{formatBytes(selectedItem.downloadedBytes)}</td>
                          <td>{(selectedItem.percent || 0).toFixed(1)}%</td>
                          <td>{selectedItem.status}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 4. Bottom Status Bar */}
      <footer className="idm-statusbar">
        <div className="statusbar-left">
          <span>{format(t.downloadsTotal, { count: downloads.length })}</span>
          <span>{format(t.activeCount, { count: counts.downloading })}</span>
          <span>{format(t.completedCount, { count: counts.completed })}</span>
        </div>
        <div className="statusbar-right">
          <span>{t.saveTo}: {defaultDir || 'Downloads'}</span>
          <span>godm v0.1.0-alpha</span>
        </div>
      </footer>

      {/* 5. Add Download Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.enterDownloadUrl}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label>{t.enterDownloadUrl}</label>
              <div className="input-with-button">
                <input
                  type="text"
                  className="form-input"
                  placeholder={t.urlPlaceholder}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus
                />
                <button
                  className="btn-secondary"
                  onClick={handleProbe}
                  disabled={isProbing || !url.trim()}
                >
                  <Search size={15} />
                  <span>{isProbing ? t.inspecting : 'Inspect'}</span>
                </button>
              </div>
            </div>

            {(authSession?.cookies || authSession?.cookieJar) ? (
              <div className="auth-status-banner active">
                <Lock size={14} />
                <div className="auth-status-text">
                  <strong>{t.authSessionActive || 'Authenticated Session Active'}</strong>
                  <span>{t.authSessionDesc || 'Live session cookies captured from your browser extension'}</span>
                </div>
              </div>
            ) : hasDomainCookies ? (
              <div className="auth-status-banner saved">
                <Check size={14} />
                <div className="auth-status-text">
                  <strong>Saved Browser Session</strong>
                  <span>Using stored authentication cookies for this platform</span>
                </div>
              </div>
            ) : null}

            {probeError && (
              <div className="probe-error-card">
                <div className="probe-error-msg">{probeError}</div>
                {(probeError.toLowerCase().includes('private') ||
                  probeError.toLowerCase().includes('login') ||
                  probeError.toLowerCase().includes('exit status 1')) && (
                  <div className="private-video-helper">
                    <div className="helper-header">
                      <ShieldAlert size={14} />
                      <span>{t.authRequiredTitle || 'Private Video / Login Required'}</span>
                    </div>
                    <p className="helper-text">
                      {t.authRequiredDesc ||
                        'This video appears to be private or requires login. Use the godm extension or import cookies from your browser.'}
                    </p>
                    <div className="helper-options">
                      {availableBrowsers.length > 0 && (
                        <div className="browser-auth-row">
                          <label>{t.importFromBrowser || 'Import from browser'}:</label>
                          <select
                            className="browser-select"
                            value={selectedBrowserCookie}
                            onChange={(e) => {
                              const b = e.target.value;
                              setSelectedBrowserCookie(b);
                              if (b !== 'none') {
                                inspectUrl(url, customFilename, { cookiesFromBrowser: b });
                              }
                            }}
                          >
                            <option value="none">Choose browser...</option>
                            {availableBrowsers.map((b) => (
                              <option key={b} value={b}>
                                {b.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn-extension-helper"
                        onClick={() => setIsGuideOpen(true)}
                      >
                        <Compass size={13} />
                        <span>{t.useExtensionRecommended || 'Use godm Browser Extension (Recommended)'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video Preview */}
            {mediaInfo && (
              <div className="video-preview-card">
                {mediaInfo.thumbnail && (
                  <div className="video-thumb-container">
                    <img
                      src={mediaInfo.thumbnail}
                      alt={mediaInfo.title}
                      className="video-thumb"
                    />
                    {mediaInfo.platform && (
                      <span className="platform-tag">{mediaInfo.platform}</span>
                    )}
                    {mediaInfo.duration && (
                      <span className="duration-tag">{mediaInfo.duration}</span>
                    )}
                  </div>
                )}

                <div className="video-details">
                  <div className="video-title">{mediaInfo.title}</div>
                  {mediaInfo.uploader && (
                    <div className="video-author">Channel: {mediaInfo.uploader}</div>
                  )}

                  <div className="form-group" style={{ marginTop: '6px' }}>
                    <label>{t.selectQuality}</label>
                    <select
                      className="format-select"
                      value={selectedFormat}
                      onChange={(e) => handleFormatChange(e.target.value)}
                    >
                      {mediaInfo.formats?.map((fmt) => (
                        <option key={fmt.formatId} value={fmt.formatId}>
                          {fmt.label}{' '}
                          {fmt.filesize > 0 ? `(~${formatBytes(fmt.filesize)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Regular File Preview */}
            {!mediaInfo && probeInfo && (
              <div className="probe-preview">
                <div className="probe-row">
                  <span className="probe-label">{t.fileName}:</span>
                  <span className="probe-val">{probeInfo.Filename || 'Unknown'}</span>
                </div>
                <div className="probe-row">
                  <span className="probe-label">{t.size}:</span>
                  <span className="probe-val">
                    {probeInfo.ContentLength > 0
                      ? formatBytes(probeInfo.ContentLength)
                      : 'Unknown (Stream)'}
                  </span>
                </div>
                <div className="probe-row">
                  <span className="probe-label">{t.categories}:</span>
                  <span className="probe-val">
                    <span className="badge-tag">{detectedCategory}</span>
                  </span>
                </div>
                <div className="probe-row">
                  <span className="probe-label">Range Acceleration:</span>
                  <span className="probe-val">
                    {probeInfo.AcceptRanges ? (
                      <span className="badge-tag" style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                        Multi-Thread Supported
                      </span>
                    ) : (
                      'Single Stream'
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>{t.filenameOnDisk}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t.filenameOnDisk}
                value={customFilename}
                onChange={(e) => handleFilenameChange(e.target.value)}
              />
            </div>

            {!mediaInfo && (
              <div className="form-group">
                <label>{t.parallelThreads}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 4, 8, 16, 24, 32].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`btn-secondary ${connections === num ? 'active' : ''}`}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        borderColor: connections === num ? 'var(--accent)' : undefined,
                        background: connections === num ? 'rgba(59, 130, 246, 0.2)' : undefined,
                      }}
                      onClick={() => setConnections(num)}
                    >
                      {num} Conns
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0 }}>{t.saveFolder}</label>
                <span className="badge-tag">{detectedCategory} Folder</span>
              </div>
              <input
                type="text"
                className="form-input"
                value={defaultDir}
                onChange={(e) => setDefaultDir(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                {t.cancel}
              </button>
              <button
                className="btn-primary"
                onClick={handleStartDownload}
                disabled={!url.trim()}
              >
                {mediaInfo ? <Video size={16} /> : <Download size={16} />}
                <span>{t.startDownload}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 4. Browser Extension Installation Guide Modal (Popup Overlay) */}
      {isGuideOpen && (
        <div
          className="modal-overlay guide-modal-overlay"
          onClick={() => setIsGuideOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-modal-title"
        >
          <div
            className="modal-card guide-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header guide-header">
              <div className="guide-title-wrap">
                <div className="guide-icon-badge">
                  <Puzzle size={22} />
                </div>
                <div>
                  <h2 id="guide-modal-title" className="guide-main-title">
                    {t.extensionGuideTitle}
                  </h2>
                  <p className="guide-subtitle">
                    Automatic download interception & high-speed media sniffing for your browser
                  </p>
                </div>
              </div>
              <button
                className="guide-close-btn"
                onClick={() => setIsGuideOpen(false)}
                title={t.close}
                aria-label={t.close}
              >
                <X size={18} />
              </button>
            </div>

            {/* Feature Pills */}
            <div className="guide-pills-row">
              <span className="guide-pill">
                <Zap size={13} /> Automatic Capture
              </span>
              <span className="guide-pill">
                <Video size={13} /> YouTube, Reels & Media Sniffer
              </span>
              <span className="guide-pill">
                <Sparkles size={13} /> 16x Parallel Acceleration
              </span>
            </div>

            {/* Extension Directory Path Card */}
            <div className="guide-path-card">
              <div className="guide-path-header">
                <div className="guide-path-label">
                  <FolderOpen size={14} />
                  <span>{t.extensionPathLabel}</span>
                </div>
                <span className="guide-path-badge">Unpacked Source</span>
              </div>
              <div className="path-box">
                <span className="path-text" title={extensionPath}>
                  {extensionPath || 'Loading extension directory path...'}
                </span>
                <div className="path-actions">
                  <button
                    type="button"
                    className={`btn-small ${copied ? 'btn-copied' : ''}`}
                    onClick={handleCopyPath}
                    title="Copy folder path to clipboard"
                  >
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copied ? t.copied : t.copyPath}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-small btn-open-folder"
                    onClick={handleOpenExtensionFolder}
                    title="Open extension directory in File Explorer"
                  >
                    <FolderOpen size={14} />
                    <span>{t.openExtensionFolder}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Browser Selection Tabs */}
            <div className="guide-browser-section">
              <div className="browser-tabs-label">Select your browser:</div>
              <div className="browser-tabs">
                <button
                  type="button"
                  className={`browser-tab-btn ${guideBrowser === 'chrome' ? 'active' : ''}`}
                  onClick={() => setGuideBrowser('chrome')}
                >
                  <Globe size={15} />
                  <span>Google Chrome</span>
                </button>
                <button
                  type="button"
                  className={`browser-tab-btn ${guideBrowser === 'edge' ? 'active' : ''}`}
                  onClick={() => setGuideBrowser('edge')}
                >
                  <Globe size={15} />
                  <span>Microsoft Edge</span>
                </button>
                <button
                  type="button"
                  className={`browser-tab-btn ${guideBrowser === 'brave' ? 'active' : ''}`}
                  onClick={() => setGuideBrowser('brave')}
                >
                  <Globe size={15} />
                  <span>Brave Browser</span>
                </button>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="steps-list">
              {/* Step 1 */}
              <div className="step-item">
                <div className="step-number-wrap">
                  <div className="step-number">1</div>
                  <div className="step-line" />
                </div>
                <div className="step-content">
                  <div className="step-title">Open Extension Manager</div>
                  <div className="step-desc">
                    In your browser, open a new tab and navigate to:
                  </div>
                  <div className="step-url-box">
                    <span className="step-code">{getBrowserExtensionUrl(guideBrowser)}</span>
                    <button
                      type="button"
                      className="step-copy-url-btn"
                      onClick={() => handleCopyUrl(getBrowserExtensionUrl(guideBrowser))}
                      title="Copy URL"
                    >
                      {copiedUrl ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedUrl ? 'Copied!' : 'Copy Address'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="step-item">
                <div className="step-number-wrap">
                  <div className="step-number">2</div>
                  <div className="step-line" />
                </div>
                <div className="step-content">
                  <div className="step-title">Enable Developer Mode</div>
                  <div className="step-desc">
                    Turn ON the <strong>Developer mode</strong> toggle located in the top-right corner.
                  </div>
                  <div className="step-badge-preview">
                    <span className="step-toggle-chip">
                      <span className="toggle-dot" />
                      Developer mode: ON
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="step-item">
                <div className="step-number-wrap">
                  <div className="step-number">3</div>
                  <div className="step-line" />
                </div>
                <div className="step-content">
                  <div className="step-title">Load Unpacked Extension</div>
                  <div className="step-desc">
                    Click the <strong>Load unpacked</strong> button that appears on the top toolbar.
                  </div>
                  <div className="step-badge-preview">
                    <span className="step-btn-chip">
                      <FolderOpen size={13} />
                      Load unpacked
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="step-item">
                <div className="step-number-wrap">
                  <div className="step-number">4</div>
                </div>
                <div className="step-content">
                  <div className="step-title">Select Extension Folder</div>
                  <div className="step-desc">
                    Select the GoDM extension directory path shown above, or click <strong>{t.openExtensionFolder}</strong> to locate it.
                  </div>
                </div>
              </div>
            </div>

            {/* Zero-Config Bridge Status Callout */}
            <div className="guide-features">
              <div className="bridge-status-pulse">
                <span className="pulse-dot" />
                <span className="pulse-ring" />
              </div>
              <div className="bridge-status-text">
                <div className="bridge-status-title">
                  <strong>Zero Configuration Required</strong> — Local RPC Bridge Active
                </div>
                <div className="bridge-status-desc">
                  Listening on <code>127.0.0.1:9246</code>. Once loaded, browser downloads and media streams (YouTube, TikTok, Instagram, X) are captured automatically.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer guide-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleOpenExtensionFolder}
              >
                <FolderOpen size={15} />
                <span>{t.openExtensionFolder}</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsGuideOpen(false)}
              >
                <Check size={16} />
                <span>{t.close}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Dedicated Language Selection Modal */}
      {isLangModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsLangModalOpen(false)}>
          <div
            className="modal-card lang-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="modal-header">
              <div className="modal-title">
                <Globe size={20} style={{ color: 'var(--accent)' }} />
                <span>{t.language} / Select Language</span>
              </div>
              <button
                className="icon-btn-ghost"
                onClick={() => setIsLangModalOpen(false)}
                title={t.close}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Choose your preferred interface language. Changes apply immediately and are remembered across sessions.
            </div>

            <div className="lang-modal-grid">
              {LANGUAGES.map((item) => {
                const isSelected = language === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    className={`lang-card-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setLanguage(item.code);
                    }}
                  >
                    <span className="lang-card-flag">{item.flag}</span>
                    <div className="lang-card-info">
                      <span className="lang-card-native">{item.nativeName}</span>
                      <span className="lang-card-name">
                        {item.name} {item.isRTL ? '(RTL)' : ''}
                      </span>
                    </div>
                    {isSelected && <Check size={18} color="#10b981" />}
                  </button>
                );
              })}
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsLangModalOpen(false)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Check size={16} />
                <span>{t.close}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
