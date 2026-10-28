import { useState, useEffect } from 'react';
import {
  Download,
  Zap,
  Pause,
  Play,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Video,
  Terminal,
  ShieldCheck,
  RefreshCw,
  FolderArchive,
  Music,
  ExternalLink,
  Cpu,
  Globe,
  Sparkles,
} from 'lucide-react';

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

interface MockTask {
  id: string;
  name: string;
  size: string;
  speed: string;
  eta: string;
  percent: number;
  status: 'downloading' | 'paused' | 'completed';
  category: string;
}

export default function App() {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Mock tasks for interactive demo
  const [mockTasks, setMockTasks] = useState<MockTask[]>([
    {
      id: '1',
      name: 'Cyberpunk_2077_Update_2.1.zip',
      size: '14.8 GB',
      speed: '62.4 MB/s',
      eta: '00:02:45',
      percent: 74,
      status: 'downloading',
      category: 'Compressed',
    },
    {
      id: '2',
      name: 'Interstellar_4K_HDR_Remux.mp4',
      size: '22.1 GB',
      speed: '78.9 MB/s',
      eta: '00:03:10',
      percent: 52,
      status: 'downloading',
      category: 'Video',
    },
    {
      id: '3',
      name: 'golang_1.24_linux_amd64.tar.gz',
      size: '185 MB',
      speed: '--',
      eta: 'Completed',
      percent: 100,
      status: 'completed',
      category: 'Compressed',
    },
    {
      id: '4',
      name: 'Unreal_Engine_5.4_Source.zip',
      size: '8.4 GB',
      speed: '--',
      eta: 'Paused',
      percent: 38,
      status: 'paused',
      category: 'Programs',
    },
  ]);

  const [selectedTask, setSelectedTask] = useState<string>('2');

  // Simulated thread segments (16 threads)
  const [threadSegments, setThreadSegments] = useState<number[]>([
    94, 88, 76, 68, 62, 59, 54, 51, 48, 44, 42, 38, 35, 30, 24, 18,
  ]);

  // Live simulation ticker for the interactive mockup
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setThreadSegments((prev) =>
        prev.map((pct) => (pct >= 100 ? Math.floor(Math.random() * 20) : pct + 1))
      );
      setMockTasks((prev) =>
        prev.map((task) => {
          if (task.status !== 'downloading') return task;
          const nextPct = task.percent >= 99 ? 100 : task.percent + 0.3;
          return {
            ...task,
            percent: nextPct,
            status: nextPct === 100 ? 'completed' : 'downloading',
            eta: nextPct === 100 ? 'Completed' : task.eta,
          };
        })
      );
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const [stars, setStars] = useState<number | string>(0);

  // Fetch real stargazer count from GitHub API
  useEffect(() => {
    fetch('https://api.github.com/repos/laradev-site/godm')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.stargazers_count === 'number') {
          const count = data.stargazers_count;
          if (count >= 1000) {
            setStars((count / 1000).toFixed(1) + 'k');
          } else {
            setStars(count);
          }
        }
      })
      .catch(() => {
        setStars(0);
      });
  }, []);

  const handleCopyCli = () => {
    navigator.clipboard.writeText('curl -fsSL https://raw.githubusercontent.com/laradev/godm/master/install.sh | bash');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const currentTask = mockTasks.find((t) => t.id === selectedTask) || mockTasks[1];

  return (
    <div className="landing-root">
      <div className="bg-glow-top" />
      <div className="bg-grid" />

      {/* 1. Header / Navbar */}
      <nav className="navbar">
        <div className="container nav-container">
          <a href="#" className="brand-link">
            <div className="brand-icon">
              <Download size={18} strokeWidth={2.5} />
            </div>
            <span>GoDM</span>
            <span className="brand-badge">v0.2.0</span>
          </a>

          <ul className="nav-links">
            <li><a href="#features" className="nav-link">Features</a></li>
            <li><a href="#video-engine" className="nav-link">Video Capture</a></li>
            <li><a href="#comparison" className="nav-link">vs IDM</a></li>
            <li><a href="#cli" className="nav-link">CLI</a></li>
            <li><a href="#faq" className="nav-link">FAQ</a></li>
          </ul>

          <div className="nav-actions">
            <a
              href="https://github.com/laradev-site/godm"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <GithubIcon size={16} />
              <span>Star on GitHub</span>
              <span style={{ background: '#334155', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>★ {stars}</span>
            </a>
            <a href="#download" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <Download size={15} />
              <span>Download</span>
            </a>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <header className="hero-section">
        <div className="container">
          <div className="hero-pill">
            <Sparkles size={14} color="#60a5fa" />
            <span>Open-Source • Native Go Engine • Up to 32 Parallel Connections</span>
          </div>

          <h1 className="hero-title">
            The Blazing Fast <br />
            <span className="gradient-text">Download Accelerator</span> for Desktop & CLI
          </h1>

          <p className="hero-subtitle">
            Engineered in Go for extreme throughput. Features multi-connection HTTP chunk splitting,
            16-thread YouTube/TikTok video extraction, seamless pause/resume with byte-level persistence,
            and automatic IDM-style folder organization.
          </p>

          <div className="hero-cta-group">
            <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a
                href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm-v0.2.0-windows-amd64.zip"
                className="btn-primary btn-large"
              >
                <Download size={20} />
                <span>Download for Windows (v0.2.0)</span>
              </a>
              <a
                href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm-v0.2.0-linux-amd64.tar.gz"
                className="btn-secondary btn-large"
              >
                <span>Linux (.tar.gz / CLI)</span>
              </a>
            </div>
          </div>

          <div className="hero-os-note">
            <span>✓ Windows 10/11</span>
            <span>•</span>
            <span>✓ Linux (Ubuntu, Debian, Fedora, Arch)</span>
            <span>•</span>
            <span>✓ 100% Free & Open Source (MIT)</span>
          </div>

          {/* Quick curl installer snippet */}
          <div className="quick-install-box">
            <span>$ curl -fsSL https://godm.download/install.sh | bash</span>
            <button className="copy-btn" onClick={handleCopyCli}>
              {copiedCmd ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedCmd ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {/* 3. Interactive GoDM Desktop App Showcase Mockup */}
          <div className="showcase-wrapper">
            <div className="showcase-header-bar">
              <div className="window-dots">
                <div className="window-dot dot-red" />
                <div className="window-dot dot-yellow" />
                <div className="window-dot dot-green" />
              </div>
              <div className="showcase-title">godm — Download Accelerator [Interactive Preview]</div>
              <div className="showcase-badge">● LIVE DEMO</div>
            </div>

            {/* Mock Toolbar */}
            <div className="mock-toolbar">
              <div className="mock-actions">
                <button className="mock-btn primary" onClick={() => alert('Install GoDM from the download links below!')}>
                  <span>+ Add URL</span>
                </button>
                <button
                  className={`mock-btn ${isPlaying ? 'warning' : 'success'}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                  title="Toggle Live Simulation Pause/Resume"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? 'Pause Active' : 'Resume'}</span>
                </button>
                <button className="mock-btn" onClick={() => alert('Folder categorization preview below!')}>
                  <FolderOpen size={14} />
                  <span>Folder</span>
                </button>
              </div>

              <div className="mock-speed-meter">
                <Zap size={14} />
                <span>{isPlaying ? '141.3 MB/s' : '0.00 B/s (Paused)'}</span>
              </div>
            </div>

            {/* Mock Workspace */}
            <div className="mock-body">
              {/* Left Sidebar */}
              <div className="mock-sidebar">
                <div className="mock-sidebar-title">Categories</div>
                <div className="mock-category-item active">
                  <span>All Downloads</span>
                  <span style={{ fontSize: '0.7rem', color: '#60a5fa' }}>4</span>
                </div>
                <div className="mock-category-item">
                  <span>📁 Compressed</span>
                  <span style={{ fontSize: '0.7rem' }}>2</span>
                </div>
                <div className="mock-category-item">
                  <span>🎬 Video</span>
                  <span style={{ fontSize: '0.7rem' }}>1</span>
                </div>
                <div className="mock-category-item">
                  <span>🎵 Music</span>
                  <span style={{ fontSize: '0.7rem' }}>0</span>
                </div>
                <div className="mock-category-item">
                  <span>💻 Programs</span>
                  <span style={{ fontSize: '0.7rem' }}>1</span>
                </div>
                <div className="mock-category-item">
                  <span>📄 Documents</span>
                  <span style={{ fontSize: '0.7rem' }}>0</span>
                </div>
              </div>

              {/* Main Table + Threads Dock */}
              <div className="mock-main">
                <div className="mock-table-wrap">
                  <table className="mock-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Size</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Speed</th>
                        <th>Threads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTasks.map((t) => (
                        <tr
                          key={t.id}
                          className={selectedTask === t.id ? 'selected' : ''}
                          onClick={() => setSelectedTask(t.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{t.size}</td>
                          <td>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background:
                                  t.status === 'downloading'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : t.status === 'paused'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(59, 130, 246, 0.15)',
                                color:
                                  t.status === 'downloading'
                                    ? '#34d399'
                                    : t.status === 'paused'
                                    ? '#fbbf24'
                                    : '#60a5fa',
                              }}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td>
                            <div className="mock-progress-track">
                              <div
                                className="mock-progress-fill"
                                style={{
                                  width: `${t.percent}%`,
                                  background: t.status === 'paused' ? '#f59e0b' : undefined,
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                              {t.percent.toFixed(0)}%
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: t.status === 'downloading' ? '#34d399' : '#64748b' }}>
                            {t.status === 'downloading' && isPlaying ? t.speed : '--'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>16 Threads</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* IDM Signature Threads Visualizer Panel */}
                <div className="mock-threads-panel">
                  <div className="threads-strip-label">
                    <span>
                      Dynamic Chunk Segmentation: <strong>{currentTask.name}</strong>
                    </span>
                    <span style={{ color: '#38bdf8' }}>16 Parallel Connections Active</span>
                  </div>

                  <div className="threads-visual-grid">
                    {threadSegments.map((pct, i) => (
                      <div className="thread-cell-demo" key={i} title={`Thread #${i + 1}: ${pct}%`}>
                        <div
                          className={`thread-cell-fill-demo ${pct >= 100 ? 'done' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                        <span>#{i + 1}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#64748b', marginTop: '6px' }}>
                    <span>Random-Access Offset Writing (`WriteAt`) — Zero temporary file stitching</span>
                    <span>Buffer: 256KB • TCP Keep-Alive Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 4. Core Architecture Features */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-tag">High Performance Architecture</div>
          <h2 className="section-title">Built From The Ground Up for Speed</h2>
          <p className="section-subtitle">
            Most downloaders download files sequentially. GoDM splits files into dynamic multi-threaded byte ranges and writes directly to pre-allocated disk sectors.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box">
                <Cpu size={24} />
              </div>
              <h3 className="feature-title">Up to 32 Parallel Connections</h3>
              <p className="feature-desc">
                Maximizes available network bandwidth by splitting large files into concurrent chunk streams. Saturates high-speed gigabit fiber connections effortlessly.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <Zap size={24} />
              </div>
              <h3 className="feature-title">Zero-Stitch Direct Disk Writes</h3>
              <p className="feature-desc">
                Unlike older download managers that save separate temporary files and stitch them together at 99%, GoDM uses random-access concurrent <code>WriteAt</code>. Instant completion.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <RefreshCw size={24} />
              </div>
              <h3 className="feature-title">Smooth Pause & Resume</h3>
              <p className="feature-desc">
                Atomic <code>.godm</code> state files remember exact byte offsets down to the millisecond. Stop and resume downloads anytime without losing progress or corrupting files.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <Video size={24} />
              </div>
              <h3 className="feature-title">16-Thread Video Extraction</h3>
              <p className="feature-desc">
                Powered by a managed yt-dlp backend with <code>-N 16</code> concurrent fragments. Downloads 4K/1080p video & MP3 audio from YouTube, TikTok, Instagram, Twitter/X, and Vimeo.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <FolderArchive size={24} />
              </div>
              <h3 className="feature-title">IDM-Style Smart Folders</h3>
              <p className="feature-desc">
                Auto-sorts incoming files into organized directories: <code>Downloads/Video</code>, <code>Downloads/Music</code>, <code>Downloads/Compressed</code>, <code>Downloads/Programs</code>, and <code>Downloads/Documents</code>.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <Globe size={24} />
              </div>
              <h3 className="feature-title">Zero-Config Browser Extension</h3>
              <p className="feature-desc">
                Intercepts browser downloads and detects streaming web videos automatically via a local, secure loopback RPC bridge on <code>127.0.0.1:9246</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Video Engine Showcase */}
      <section className="section" id="video-engine" style={{ background: '#070b16', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', alignItems: 'center' }}>
            <div>
              <div className="section-tag">Universal Streaming Media</div>
              <h2 className="section-title">Download Any Video in 4K with 16 Concurrent Threads</h2>
              <p className="section-subtitle" style={{ marginBottom: '24px' }}>
                Stop waiting for slow single-connection video streams. GoDM automatically inspects video resolutions, merges pristine video with highest-quality audio streams, or extracts MP3s with a single click.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} color="#10b981" />
                  <span style={{ fontSize: '0.95rem' }}>YouTube (4K 60fps, 1080p, 720p, Audio Only MP3/M4A)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} color="#10b981" />
                  <span style={{ fontSize: '0.95rem' }}>TikTok & Instagram Reels (Watermark-free downloads)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} color="#10b981" />
                  <span style={{ fontSize: '0.95rem' }}>Twitter / X Videos, Twitch Clips, Vimeo & Facebook</span>
                </div>
              </div>

              <a href="#download" className="btn-primary">
                <Download size={16} />
                <span>Try Video Downloader</span>
              </a>
            </div>

            {/* Video preview mock */}
            <div style={{ background: '#0b1120', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '120px', height: '70px', borderRadius: '8px', background: 'linear-gradient(135deg, #1e293b, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Video size={28} color="#60a5fa" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>Cyberpunk 2077: Phantom Liberty — Official 4K Trailer</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Platform: YouTube • Channel: CD PROJEKT RED • 02:45</div>
                </div>
              </div>

              <div style={{ background: '#080c14', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>Resolution / Format:</span>
                  <strong style={{ color: '#38bdf8' }}>4K 2160p (MP4 - ~450 MB)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Concurrent Acceleration:</span>
                  <strong style={{ color: '#10b981' }}>16 Fragments (-N 16)</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <Download size={16} />
                  <span>Download 4K Video</span>
                </button>
                <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  <Music size={16} />
                  <span>Extract MP3 Audio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Comparison Table (GoDM vs IDM vs Browser) */}
      <section className="section" id="comparison">
        <div className="container">
          <div className="section-tag">Feature Comparison</div>
          <h2 className="section-title">Why Developers & Power Users Choose GoDM</h2>
          <p className="section-subtitle">
            See how GoDM compares to legacy proprietary download software.
          </p>

          <div className="comparison-card">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Feature</th>
                  <th className="highlight" style={{ width: '25%' }}>GoDM</th>
                  <th style={{ width: '20%' }}>Internet Download Manager</th>
                  <th style={{ width: '20%' }}>Browser Downloader</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>License & Pricing</td>
                  <td className="highlight">100% Free & Open Source (MIT)</td>
                  <td>$24.95 / year (Proprietary)</td>
                  <td>Free</td>
                </tr>
                <tr>
                  <td>Maximum Connections</td>
                  <td className="highlight">Up to 32 Parallel Threads</td>
                  <td>Up to 32 Threads</td>
                  <td>1 Connection</td>
                </tr>
                <tr>
                  <td>Operating System Support</td>
                  <td className="highlight">Windows & Linux Native</td>
                  <td>Windows Only</td>
                  <td>All Platforms</td>
                </tr>
                <tr>
                  <td>Streaming Video Capture (YouTube, TikTok)</td>
                  <td className="highlight">Yes (16-thread yt-dlp)</td>
                  <td>Yes (Proprietary extension)</td>
                  <td>No (Extension blocked)</td>
                </tr>
                <tr>
                  <td>Headless CLI Mode (Servers/VPS)</td>
                  <td className="highlight">Yes (<code>godm-cli</code> standalone)</td>
                  <td>No (GUI only)</td>
                  <td>No</td>
                </tr>
                <tr>
                  <td>File Reassembly Method</td>
                  <td className="highlight">Direct <code>WriteAt</code> (Zero stitch time)</td>
                  <td>Concatenates temp parts at 99%</td>
                  <td>Single stream write</td>
                </tr>
                <tr>
                  <td>Modern Dark UI</td>
                  <td className="highlight">Yes (Modern glassmorphic)</td>
                  <td>No (Windows 98 aesthetic)</td>
                  <td>Minimalist</td>
                </tr>
                <tr>
                  <td>RAM Footprint</td>
                  <td className="highlight">&lt; 35 MB (Go Runtime)</td>
                  <td>~30 MB</td>
                  <td>&gt; 500 MB (Full browser)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7. CLI Section */}
      <section className="section" id="cli" style={{ background: '#070b16', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', alignItems: 'center' }}>
            <div>
              <div className="section-tag">Developers & Automation</div>
              <h2 className="section-title">Automate Anywhere With The Standalone CLI</h2>
              <p className="section-subtitle" style={{ marginBottom: '24px' }}>
                Run high-speed accelerated downloads directly from your terminal, bash scripts, CI/CD jobs, or headless Linux servers without running any graphical interface.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Terminal size={18} color="#38bdf8" />
                  <span>Single static binary — Zero external runtime dependencies</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Terminal size={18} color="#38bdf8" />
                  <span>Interactive progress bars with download speed and ETA</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Terminal size={18} color="#38bdf8" />
                  <span>Configure connections, retries, headers, and output paths</span>
                </div>
              </div>
            </div>

            {/* Terminal Mockup */}
            <div style={{ background: '#040711', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '18px 22px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <div className="window-dot dot-red" />
                <div className="window-dot dot-yellow" />
                <div className="window-dot dot-green" />
                <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '6px' }}>bash — godm-cli</span>
              </div>

              <div style={{ color: '#38bdf8', marginBottom: '8px' }}>
                $ godm-cli download "https://releases.ubuntu.com/24.04/ubuntu.iso" -c 16
              </div>

              <div style={{ color: '#94a3b8', marginBottom: '14px', lineHeight: 1.5 }}>
                File:        ubuntu-24.04-desktop-amd64.iso<br />
                Size:        5.80 GB (6228541440 bytes)<br />
                Multi-part:  Supported (16 parallel connections)<br />
                --------------------------------------------------
              </div>

              <div style={{ color: '#34d399', marginBottom: '6px' }}>
                [=======================&gt;--------] 74.2%  78.4 MB/s  ETA: 00:00:22
              </div>
              <div style={{ color: '#64748b', fontSize: '0.775rem' }}>
                Downloaded 4.30 GB of 5.80 GB • 16 Active Workers • 0 Retries
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Download Matrix */}
      <section className="section" id="download">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-tag">Get Started Today</div>
          <h2 className="section-title">Download GoDM For Your Operating System</h2>
          <p className="section-subtitle" style={{ margin: '0 auto 40px' }}>
            Available as a native desktop application with full GUI or as a standalone CLI tool.
          </p>

          <div className="downloads-grid">
            <div className="download-target-card recommended">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>Windows (x64)</span>
                  <span className="target-badge badge-rec">Recommended</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
                  Full Desktop GUI application for Windows 10 & 11. Includes system tray and download threads inspector.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm.exe"
                  className="btn-primary"
                  style={{ justifyContent: 'center' }}
                >
                  <Download size={16} />
                  <span>Download .EXE (Windows)</span>
                </a>
                <a
                  href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm-v0.2.0-windows-amd64.zip"
                  className="btn-secondary"
                  style={{ justifyContent: 'center', fontSize: '0.85rem' }}
                >
                  <span>Download Portable .ZIP</span>
                </a>
              </div>
            </div>

            <div className="download-target-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>Linux (x86_64)</span>
                  <span className="target-badge" style={{ background: '#1e293b', color: '#94a3b8' }}>Native</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
                  Native WebKit2GTK desktop application for Ubuntu, Debian, Fedora, Arch Linux, and desktop distros.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm-v0.2.0-linux-amd64.tar.gz"
                  className="btn-primary"
                  style={{ justifyContent: 'center' }}
                >
                  <Download size={16} />
                  <span>Download .TAR.GZ</span>
                </a>
                <a
                  href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm-linux-amd64"
                  className="btn-secondary"
                  style={{ justifyContent: 'center', fontSize: '0.85rem' }}
                >
                  <span>Download Standalone CLI Binary</span>
                </a>
              </div>
            </div>

            <div className="download-target-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>Browser Extension</span>
                  <span className="target-badge" style={{ background: '#1e293b', color: '#94a3b8' }}>Manifest V3</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
                  Chrome, Edge, Brave & Chromium extension. Intercepts web downloads and auto-detects video streams.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  href="https://chromewebstore.google.com/detail/godm-download-manager-vid/Inffmibelanhbalcgakhfolgedlgjhjf"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ justifyContent: 'center' }}
                >
                  <ExternalLink size={16} />
                  <span>Chrome Web Store</span>
                </a>
                <a
                  href="https://github.com/laradev-site/godm/raw/master/godm-chrome-extension.zip"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ justifyContent: 'center', fontSize: '0.85rem' }}
                >
                  <span>Download Extension .ZIP</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section className="section" id="faq">
        <div className="container">
          <div className="section-tag" style={{ textAlign: 'center' }}>Frequently Asked Questions</div>
          <h2 className="section-title" style={{ textAlign: 'center' }}>Everything You Need To Know</h2>
          <p className="section-subtitle" style={{ margin: '0 auto 40px', textAlign: 'center' }}>
            Answers to common questions regarding performance, browser integration, and open source licensing.
          </p>

          <div className="faq-grid">
            {[
              {
                q: 'How does GoDM achieve faster download speeds than browsers?',
                a: 'Standard browsers open a single TCP connection per download, which is subject to network latency and server throttling. GoDM probes whether the server supports HTTP Range requests, and opens up to 32 parallel connections, each requesting a specific byte slice. All chunks are written simultaneously to the pre-allocated destination file.',
              },
              {
                q: 'How does the browser extension communicate with the desktop app?',
                a: 'GoDM runs a lightweight, zero-configuration local loopback RPC server on 127.0.0.1:9246. When you click download on a webpage or play a video stream on YouTube/TikTok, the extension sends the link directly to GoDM, bringing up the download dialog with pre-analyzed format options.',
              },
              {
                q: 'Is GoDM really 100% free and open-source?',
                a: 'Yes! GoDM is licensed under the permissive MIT license. There are no paywalls, speed limits, subscription fees, or advertisements. You are free to inspect the Go code, compile it from source, or contribute features.',
              },
              {
                q: 'What happens if my connection drops or my PC turns off during a download?',
                a: 'GoDM writes atomic .godm JSON task state files alongside your download. When restarted, GoDM loads the state file, verifies which byte ranges were already written to disk, and resumes only the remaining unfinished segments without downloading everything from scratch.',
              },
              {
                q: 'How does the automated folder categorization work?',
                a: 'Just like IDM, GoDM analyzes the file extension and automatically routes downloads to dedicated subfolders: Compressed (.zip, .rar, .7z), Documents (.pdf, .docx), Music (.mp3, .flac), Programs (.exe, .msi, .apk), and Video (.mp4, .mkv). You can customize or change the directory at any time.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="faq-item"
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                <div className="faq-question">
                  <span>{faq.q}</span>
                  {activeFaq === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {activeFaq === index && (
                  <div className="faq-answer">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>
                <div className="brand-icon" style={{ width: '28px', height: '28px' }}>
                  <Download size={15} />
                </div>
                <span>GoDM</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: '320px' }}>
                The open-source, high-performance Internet Download Manager clone engineered in Go for Windows & Linux.
              </p>
            </div>

            <div>
              <div className="footer-col-title">Downloads</div>
              <ul className="footer-links">
                <li><a href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm.exe">Windows Binary (.exe)</a></li>
                <li><a href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm-v0.2.0-windows-amd64.zip">Windows Portable (.zip)</a></li>
                <li><a href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm-v0.2.0-linux-amd64.tar.gz">Linux Package (.tar.gz)</a></li>
                <li><a href="https://github.com/laradev-site/godm/releases/download/v0.2.0/godm-linux-amd64">Standalone CLI Binary</a></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Resources</div>
              <ul className="footer-links">
                <li><a href="https://github.com/laradev-site/godm">GitHub Repository</a></li>
                <li><a href="https://github.com/laradev-site/godm/tree/master/extension">Browser Extension</a></li>
                <li><a href="https://github.com/laradev-site/godm/blob/master/PRIVACY.md">Privacy Policy</a></li>
                <li><a href="https://github.com/laradev-site/godm/blob/master/README.md">Documentation</a></li>
                <li><a href="https://github.com/laradev-site/godm/releases">Release Notes</a></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Community</div>
              <ul className="footer-links">
                <li><a href="https://github.com/laradev-site/godm/issues">Report an Issue</a></li>
                <li><a href="https://github.com/laradev-site/godm/pulls">Submit a Pull Request</a></li>
                <li><a href="https://github.com/laradev-site/godm/blob/master/LICENSE">MIT License</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 Laradev. Open-source under the MIT License.</span>
            <span>Crafted with Go, Wails & React</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
