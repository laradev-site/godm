import { useState, useEffect, useMemo } from 'react';
import { Events } from '@wailsio/runtime';
import {
  Download,
  Plus,
  Play,
  Pause,
  Folder,
  Layers,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileBox,
  FileArchive,
  FileVideo,
  FileAudio,
  FileCode,
  X,
  Search,
} from 'lucide-react';
import * as DownloadService from '../bindings/godm/internal/service/downloadservice';
import { DownloadItem, DownloadStatus } from '../bindings/godm/internal/service/models';
import { ResourceInfo } from '../bindings/godm/internal/protocol/models';
import './app.css';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'iso'].includes(ext)) {
    return <FileArchive size={20} />;
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    return <FileVideo size={20} />;
  }
  if (['mp3', 'flac', 'wav', 'aac', 'ogg'].includes(ext)) {
    return <FileAudio size={20} />;
  }
  if (['exe', 'msi', 'dmg', 'deb', 'app'].includes(ext)) {
    return <FileBox size={20} />;
  }
  if (['go', 'ts', 'js', 'py', 'json', 'html'].includes(ext)) {
    return <FileCode size={20} />;
  }
  return <Download size={20} />;
}

export default function App() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'downloading' | 'completed' | 'paused'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultDir, setDefaultDir] = useState('');

  // Add modal state
  const [url, setUrl] = useState('');
  const [connections, setConnections] = useState(8);
  const [customFilename, setCustomFilename] = useState('');
  const [isProbing, setIsProbing] = useState(false);
  const [probeInfo, setProbeInfo] = useState<ResourceInfo | null>(null);
  const [probeError, setProbeError] = useState('');

  // Load initial downloads and default folder
  useEffect(() => {
    DownloadService.GetDefaultDownloadDir().then((dir) => setDefaultDir(dir));
    DownloadService.ListDownloads().then((items) => {
      if (items) {
        setDownloads(items.filter((i): i is DownloadItem => i !== null));
      }
    });

    // Listen for real-time progress updates from Go engine
    const unbindProgress = Events.On('download:progress', (event: any) => {
      const data: DownloadItem = event.data;
      if (!data) return;
      setDownloads((prev) => {
        const index = prev.findIndex((item) => item.id === data.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [data, ...prev];
      });
    });

    // Listen for status changes (complete, paused, error)
    const unbindStatus = Events.On('download:status', (event: any) => {
      const data: DownloadItem = event.data;
      if (!data) return;
      setDownloads((prev) => {
        const index = prev.findIndex((item) => item.id === data.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [data, ...prev];
      });
    });

    return () => {
      unbindProgress();
      unbindStatus();
    };
  }, []);

  // Compute total active downloading speed
  const totalSpeed = useMemo(() => {
    return downloads
      .filter((d) => d.status === DownloadStatus.StatusDownloading)
      .reduce((acc, d) => acc + (d.speed || 0), 0);
  }, [downloads]);

  // Filter items
  const filteredDownloads = useMemo(() => {
    if (activeTab === 'all') return downloads;
    return downloads.filter((d) => {
      if (activeTab === 'downloading') return d.status === DownloadStatus.StatusDownloading;
      if (activeTab === 'completed') return d.status === DownloadStatus.StatusCompleted;
      if (activeTab === 'paused') return d.status === DownloadStatus.StatusPaused;
      return true;
    });
  }, [downloads, activeTab]);

  const handleProbe = async () => {
    if (!url.trim()) return;
    setIsProbing(true);
    setProbeError('');
    try {
      const info = await DownloadService.ProbeURL(url.trim());
      if (info) {
        setProbeInfo(info);
        if (!customFilename && info.Filename) {
          setCustomFilename(info.Filename);
        }
      }
    } catch (err: any) {
      setProbeError(err?.message || 'Failed to inspect URL');
    } finally {
      setIsProbing(false);
    }
  };

  const handleStartDownload = async () => {
    if (!url.trim()) return;
    try {
      const item = await DownloadService.StartDownload(
        url.trim(),
        connections,
        defaultDir,
        customFilename.trim()
      );
      if (item) {
        setDownloads((prev) => [item, ...prev]);
      }
      setIsModalOpen(false);
      setUrl('');
      setCustomFilename('');
      setProbeInfo(null);
    } catch (err: any) {
      alert(`Error starting download: ${err?.message || err}`);
    }
  };

  const handlePause = (id: string) => {
    DownloadService.PauseDownload(id);
  };

  const handleResume = (id: string) => {
    DownloadService.ResumeDownload(id);
  };

  const handleOpenFolder = (path: string) => {
    DownloadService.OpenFolder(path);
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand">
          <div className="logo-badge">
            <Zap size={22} color="#fff" />
          </div>
          <div className="brand-text">
            <h1>godm</h1>
            <p>Multi-Connection High-Speed Engine</p>
          </div>
        </div>

        <div className="header-stats">
          <div className={`speed-badge ${totalSpeed > 0 ? '' : 'idle'}`}>
            <Zap size={15} />
            <span>{totalSpeed > 0 ? `${formatBytes(totalSpeed)}/s` : 'Idle'}</span>
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Add Download</span>
          </button>
        </div>
      </header>

      {/* Toolbar & Filter Tabs */}
      <div className="toolbar">
        <div className="filter-tabs">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({downloads.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'downloading' ? 'active' : ''}`}
            onClick={() => setActiveTab('downloading')}
          >
            Downloading (
            {downloads.filter((d) => d.status === DownloadStatus.StatusDownloading).length}
            )
          </button>
          <button
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed (
            {downloads.filter((d) => d.status === DownloadStatus.StatusCompleted).length}
            )
          </button>
          <button
            className={`tab-btn ${activeTab === 'paused' ? 'active' : ''}`}
            onClick={() => setActiveTab('paused')}
          >
            Paused ({downloads.filter((d) => d.status === DownloadStatus.StatusPaused).length})
          </button>
        </div>
      </div>

      {/* Download List */}
      <main className="content-area">
        {filteredDownloads.length === 0 ? (
          <div className="empty-state">
            <Layers className="empty-icon" />
            <h3>No downloads in this view</h3>
            <p>Paste a download link to begin high-speed multi-threaded acceleration.</p>
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              <span>Add Download</span>
            </button>
          </div>
        ) : (
          filteredDownloads.map((item) => {
            const isDownloading = item.status === DownloadStatus.StatusDownloading;
            const isPaused = item.status === DownloadStatus.StatusPaused;
            const isCompleted = item.status === DownloadStatus.StatusCompleted;
            const isError = item.status === DownloadStatus.StatusError;

            return (
              <div key={item.id} className="download-card">
                <div className="card-top">
                  <div className="file-info">
                    <div className="file-icon">{getFileIcon(item.filename)}</div>
                    <div className="file-details">
                      <div className="filename" title={item.filename}>
                        {item.filename}
                      </div>
                      <div className="filepath" title={item.destPath}>
                        {item.destPath}
                      </div>
                    </div>
                  </div>

                  <div className="card-actions">
                    <span className={`status-pill status-${item.status}`}>
                      {item.status}
                    </span>

                    {isDownloading && (
                      <button
                        className="action-btn"
                        title="Pause"
                        onClick={() => handlePause(item.id)}
                      >
                        <Pause size={15} />
                      </button>
                    )}

                    {isPaused && (
                      <button
                        className="action-btn"
                        title="Resume"
                        onClick={() => handleResume(item.id)}
                      >
                        <Play size={15} />
                      </button>
                    )}

                    <button
                      className="action-btn"
                      title="Open in folder"
                      onClick={() => handleOpenFolder(item.destPath)}
                    >
                      <Folder size={15} />
                    </button>
                  </div>
                </div>

                {/* Progress Track */}
                <div className="progress-container">
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${isPaused ? 'paused' : ''} ${
                        isError ? 'error' : ''
                      }`}
                      style={{ width: `${item.percent || 0}%` }}
                    />
                  </div>

                  <div className="progress-stats">
                    <div className="stat-group">
                      <span>
                        {formatBytes(item.downloadedBytes)} /{' '}
                        {item.totalSize > 0 ? formatBytes(item.totalSize) : 'Streaming'} (
                        {(item.percent || 0).toFixed(1)}%)
                      </span>
                    </div>

                    <div className="stat-group">
                      {isDownloading && item.speed > 0 && (
                        <span className="stat-item active-speed">
                          <Zap size={13} />
                          {formatBytes(item.speed)}/s
                        </span>
                      )}
                      {isDownloading && item.eta && (
                        <span className="stat-item">ETA: {item.eta}</span>
                      )}
                      {isCompleted && (
                        <span className="stat-item" style={{ color: '#60a5fa' }}>
                          <CheckCircle2 size={13} /> Completed
                        </span>
                      )}
                      {isError && (
                        <span className="stat-item" style={{ color: '#f87171' }}>
                          <AlertCircle size={13} /> {item.error || 'Failed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* IDM Signature: Multi-Segment Visualizer */}
                {item.segments && item.segments.length > 1 && (
                  <div className="segments-container">
                    <div className="segments-header">
                      <span>Multi-part Range Segments ({item.segments.length} Threads)</span>
                      <span>Accelerated</span>
                    </div>
                    <div className="segments-grid">
                      {item.segments.map((seg, idx) => {
                        const total = seg.end - seg.start + 1;
                        const downloaded = seg.done
                          ? total
                          : Math.max(0, seg.current - seg.start);
                        const pct = total > 0 ? (downloaded / total) * 100 : 0;

                        return (
                          <div
                            key={idx}
                            className="segment-cell"
                            title={`Thread #${idx + 1}: ${pct.toFixed(0)}%`}
                          >
                            <div
                              className={`segment-cell-fill ${seg.done ? 'done' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Add Download Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Accelerated Download</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label>Download URL</label>
              <div className="input-with-button">
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://example.com/file.zip"
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
                  <span>{isProbing ? 'Inspecting...' : 'Probe'}</span>
                </button>
              </div>
            </div>

            {probeError && (
              <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{probeError}</div>
            )}

            {probeInfo && (
              <div className="probe-preview">
                <div className="probe-row">
                  <span className="probe-label">File:</span>
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
                  <span className="probe-label">Range Support:</span>
                  <span className="probe-val">
                    {probeInfo.AcceptRanges ? (
                      <span className="badge-tag">Multi-part Accelerated</span>
                    ) : (
                      'Single Stream'
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>File Name (Optional override)</label>
              <input
                type="text"
                className="form-input"
                placeholder={probeInfo?.Filename || 'Auto-detected filename'}
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Concurrent Connections (Threads)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 4, 8, 16, 32].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`tab-btn ${connections === num ? 'active' : ''}`}
                    onClick={() => setConnections(num)}
                  >
                    {num} Threads
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Save Directory</label>
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
                <Download size={16} />
                <span>Start Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
