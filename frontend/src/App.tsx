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
} from 'lucide-react';
import * as DownloadService from '../bindings/godm/internal/service/downloadservice';
import { DownloadItem, DownloadStatus } from '../bindings/godm/internal/service/models';
import { ResourceInfo } from '../bindings/godm/internal/protocol/models';
import { MediaInfo } from '../bindings/godm/internal/media/models';
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

function getCategory(filename: string): CategoryType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso', 'xz'].includes(ext)) return 'compressed';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'wma'].includes(ext)) return 'music';
  if (['exe', 'msi', 'apk', 'dmg', 'pkg', 'deb', 'rpm'].includes(ext)) return 'programs';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'epub'].includes(ext)) return 'documents';
  return 'other';
}

function getFileIcon(filename: string) {
  const cat = getCategory(filename);
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
  const [isProbing, setIsProbing] = useState(false);
  const [probeInfo, setProbeInfo] = useState<ResourceInfo | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('bestvideo+bestaudio/best');
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [probeError, setProbeError] = useState('');

  // Initial load
  useEffect(() => {
    DownloadService.GetDefaultDownloadDir().then(setDefaultDir);
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

    // Extension trigger: opens modal with URL prefilled
    const unbindExtension = Events.On('extension:new-download', (event: any) => {
      const data = event.data;
      if (data && data.url) {
        setUrl(data.url);
        setIsModalOpen(true);
        if (data.filename) {
          setCustomFilename(data.filename);
        }
      }
    });

    return () => {
      unbindProgress();
      unbindStatus();
      unbindExtension();
    };
  }, []);

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
      const cat = getCategory(d.filename);
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
      if (activeCategory !== 'all' && getCategory(d.filename) !== activeCategory) {
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
      DownloadService.ResumeDownload(targetId);
    }
  };

  const handlePause = (id?: string) => {
    const targetId = id || selectedId;
    if (targetId) {
      DownloadService.PauseDownload(targetId);
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

  const handleProbe = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setIsProbing(true);
    setProbeError('');
    setProbeInfo(null);
    setMediaInfo(null);

    try {
      const isVid = await DownloadService.IsVideoURL(trimmed);
      if (isVid) {
        setIsVideoMode(true);
        const info = await DownloadService.InspectVideo(trimmed);
        if (info) {
          setMediaInfo(info);
          if (info.formats && info.formats.length > 0) {
            setSelectedFormat(info.formats[0].formatId);
          }
          if (!customFilename && info.title) {
            setCustomFilename(`${info.title}.mp4`);
          }
        }
      } else {
        setIsVideoMode(false);
        const info = await DownloadService.ProbeURL(trimmed);
        if (info) {
          setProbeInfo(info);
          if (!customFilename && info.Filename) {
            setCustomFilename(info.Filename);
          }
        }
      }
    } catch (err: any) {
      setProbeError(err?.message || 'Failed to inspect URL');
    } finally {
      setIsProbing(false);
    }
  };

  const handleStartDownload = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    try {
      let item: DownloadItem | null = null;
      if (isVideoMode || mediaInfo) {
        item = await DownloadService.StartVideoDownload(
          trimmed,
          selectedFormat,
          defaultDir,
          customFilename.trim()
        );
      } else {
        item = await DownloadService.StartDownload(
          trimmed,
          connections,
          defaultDir,
          customFilename.trim()
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
            <span className="tool-btn-label">Add URL</span>
          </button>

          <button
            className="tool-btn success"
            onClick={() => handleResume()}
            disabled={!selectedItem || selectedItem.status !== DownloadStatus.StatusPaused}
            title="Resume selected download"
          >
            <Play size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">Resume</span>
          </button>

          <button
            className="tool-btn warning"
            onClick={() => handlePause()}
            disabled={!selectedItem || selectedItem.status !== DownloadStatus.StatusDownloading}
            title="Pause selected download"
          >
            <Pause size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">Stop</span>
          </button>

          <button
            className="tool-btn"
            onClick={handleStopAll}
            title="Stop all active downloads"
          >
            <Square size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">Stop All</span>
          </button>

          <button
            className="tool-btn danger"
            onClick={() => handleDelete()}
            disabled={!selectedItem}
            title="Delete selected download from list"
          >
            <Trash2 size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">Delete</span>
          </button>

          <div className="toolbar-separator" />

          <button
            className="tool-btn"
            onClick={() => selectedItem && handleOpenFile(selectedItem.destPath)}
            disabled={!selectedItem || selectedItem.status !== DownloadStatus.StatusCompleted}
            title="Open completed file"
          >
            <ExternalLink size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">Open File</span>
          </button>

          <button
            className="tool-btn"
            onClick={() => selectedItem && handleOpenFolder(selectedItem.destPath)}
            disabled={!selectedItem}
            title="Open destination folder"
          >
            <FolderOpen size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">Folder</span>
          </button>

          <div className="toolbar-separator" />

          <button
            className={`tool-btn ${isInspectorOpen ? 'active' : ''}`}
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            title="Toggle Download Threads Visualizer"
          >
            <Activity size={20} className="tool-btn-icon" />
            <span className="tool-btn-label">Threads</span>
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
              placeholder="Search downloads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* 2. Workspace: Categories Sidebar + Main Downloads Table */}
      <div className="idm-workspace">
        {/* Left Category Tree */}
        <aside className="idm-sidebar">
          <div>
            <div className="sidebar-section-title">Categories</div>
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
                  <span>All Downloads</span>
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
                  <span>Compressed</span>
                </div>
                <span className="sidebar-badge">{counts.compressed}</span>
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
                  <span>Documents</span>
                </div>
                <span className="sidebar-badge">{counts.documents}</span>
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
                  <span>Music</span>
                </div>
                <span className="sidebar-badge">{counts.music}</span>
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
                  <span>Programs</span>
                </div>
                <span className="sidebar-badge">{counts.programs}</span>
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
                  <span>Video</span>
                </div>
                <span className="sidebar-badge">{counts.video}</span>
              </li>
            </ul>
          </div>

          <div>
            <div className="sidebar-section-title">Status</div>
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
                  <span>Downloading</span>
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
                  <span>Paused</span>
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
                  <span>Completed</span>
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
                  <th style={{ width: '30%' }}>File Name</th>
                  <th style={{ width: '10%' }}>Size</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '16%' }}>Progress</th>
                  <th style={{ width: '10%' }}>Speed</th>
                  <th style={{ width: '10%' }}>Time Left</th>
                  <th style={{ width: '12%' }}>Threads</th>
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
                        onDoubleClick={() => setIsInspectorOpen(true)}
                      >
                        <td>
                          <div className="file-col">
                            <div className="file-col-icon">{getFileIcon(item.filename)}</div>
                            <span className="file-col-name" title={item.filename}>
                              {item.filename}
                            </span>
                          </div>
                        </td>
                        <td className="font-mono-val">
                          {item.totalSize > 0 ? formatBytes(item.totalSize) : 'Streaming'}
                        </td>
                        <td>
                          <span className={`status-pill status-${item.status}`}>
                            {item.status}
                          </span>
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
                          {item.segments && item.segments.length > 0 ? `${item.segments.length} Conns` : '1 Conn'}
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
                    <span>Download Threads & Chunks</span>
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
                      Active Dynamic Segmentation: {selectedItem.segments?.length || 1} Parallel Connections
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
                        <th style={{ width: '12%' }}>Thread</th>
                        <th style={{ width: '28%' }}>Byte Range Offset</th>
                        <th style={{ width: '22%' }}>Downloaded / Total</th>
                        <th style={{ width: '20%' }}>Progress</th>
                        <th style={{ width: '18%' }}>Status</th>
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
                                Connection #{idx + 1}
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
                                  {seg.done ? 'Finished' : selectedItem.status === DownloadStatus.StatusDownloading ? 'Receiving...' : 'Idle'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td style={{ fontWeight: 600, color: '#60a5fa' }}>Connection #1</td>
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
          <span>{downloads.length} downloads total</span>
          <span>{counts.downloading} active</span>
          <span>{counts.completed} completed</span>
        </div>
        <div className="statusbar-right">
          <span>Save to: {defaultDir || 'Downloads'}</span>
          <span>godm v0.1.0-alpha</span>
        </div>
      </footer>

      {/* 5. Add Download Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Download</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label>Download URL (File, Direct Link, YouTube, TikTok, X...)</label>
              <div className="input-with-button">
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://... or YouTube video link"
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
                  <span>{isProbing ? 'Inspecting...' : 'Inspect'}</span>
                </button>
              </div>
            </div>

            {probeError && (
              <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{probeError}</div>
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
                    <label>Select Quality / Resolution</label>
                    <select
                      className="format-select"
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value)}
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
                  <span className="probe-label">File Name:</span>
                  <span className="probe-val">{probeInfo.Filename || 'Unknown'}</span>
                </div>
                <div className="probe-row">
                  <span className="probe-label">Size:</span>
                  <span className="probe-val">
                    {probeInfo.ContentLength > 0
                      ? formatBytes(probeInfo.ContentLength)
                      : 'Unknown (Stream)'}
                  </span>
                </div>
                <div className="probe-row">
                  <span className="probe-label">Range Acceleration:</span>
                  <span className="probe-val">
                    {probeInfo.AcceptRanges ? (
                      <span className="badge-tag">Multi-Thread Supported</span>
                    ) : (
                      'Single Stream'
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>File Name (Optional rename)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Filename on disk"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
              />
            </div>

            {!mediaInfo && (
              <div className="form-group">
                <label>Parallel Connections (Threads)</label>
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
              <label>Save Location</label>
              <input
                type="text"
                className="form-input"
                value={defaultDir}
                onChange={(e) => setDefaultDir(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleStartDownload}
                disabled={!url.trim()}
              >
                {mediaInfo ? <Video size={16} /> : <Download size={16} />}
                <span>{mediaInfo ? 'Download Video' : 'Start Download'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
