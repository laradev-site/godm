package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"

	"godm/internal/engine"
	"godm/internal/media"
	"godm/internal/protocol"
	"godm/internal/segment"
	"godm/internal/storage"
	"godm/pkg/config"
)

type DownloadStatus string

const (
	StatusPending     DownloadStatus = "pending"
	StatusProbing     DownloadStatus = "probing"
	StatusDownloading DownloadStatus = "downloading"
	StatusPaused      DownloadStatus = "paused"
	StatusCompleted   DownloadStatus = "completed"
	StatusError       DownloadStatus = "error"
)

// IDM-style Categories
const (
	CategoryCompressed = "Compressed"
	CategoryDocuments  = "Documents"
	CategoryMusic      = "Music"
	CategoryPrograms   = "Programs"
	CategoryVideo      = "Video"
	CategoryGeneral    = "General"
)

// DownloadItem represents a download task's state presented to the UI.
type DownloadItem struct {
	ID              string                 `json:"id"`
	URL             string                 `json:"url"`
	Filename        string                 `json:"filename"`
	DestPath        string                 `json:"destPath"`
	TotalSize       int64                  `json:"totalSize"`
	DownloadedBytes int64                  `json:"downloadedBytes"`
	Speed           float64                `json:"speed"` // bytes/sec
	ETA             string                 `json:"eta"`
	Percent         float64                `json:"percent"`
	Status          DownloadStatus         `json:"status"`
	Connections     int                    `json:"connections"`
	Segments        []storage.SegmentState `json:"segments"`
	Error           string                 `json:"error,omitempty"`
	CreatedAt       time.Time              `json:"createdAt"`
	IsVideo         bool                   `json:"isVideo"`
	FormatID        string                 `json:"formatId,omitempty"`
	Category        string                 `json:"category"`
}

type activeTask struct {
	item      *DownloadItem
	cancel    context.CancelFunc
	state     *storage.TaskState
	cfg       *config.Config
	running   bool
	isVid     bool
	formatID  string
	mediaOpts *media.MediaOptions
}

// DownloadService is registered as a Wails service to bind download management methods.
type DownloadService struct {
	app        *application.App
	mu         sync.RWMutex
	tasks      map[string]*activeTask
	httpClient *http.Client
}

// NewDownloadService creates a new DownloadService with persistent history and connection pooling.
func NewDownloadService() *DownloadService {
	cfg := config.NewDefaultConfig()
	s := &DownloadService{
		tasks:      make(map[string]*activeTask),
		httpClient: engine.NewHTTPClient(cfg),
	}
	s.loadHistory()
	return s
}

// SetApp sets the Wails application reference for event emission.
func (s *DownloadService) SetApp(app *application.App) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.app = app
}

// GetDefaultDownloadDir returns the user's standard Downloads folder.
func (s *DownloadService) GetDefaultDownloadDir() string {
	if runtime.GOOS == "linux" {
		if xdg := os.Getenv("XDG_DOWNLOAD_DIR"); xdg != "" {
			if info, err := os.Stat(xdg); err == nil && info.IsDir() {
				return xdg
			}
		}
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "."
	}
	downloads := filepath.Join(home, "Downloads")
	if info, err := os.Stat(downloads); err == nil && info.IsDir() {
		return downloads
	}
	_ = os.MkdirAll(downloads, 0755)
	return downloads
}

// GetCategory determines the IDM-style category based on file extension.
func (s *DownloadService) GetCategory(filename string) string {
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(filename), "."))
	switch ext {
	case "zip", "rar", "7z", "tar", "gz", "bz2", "iso", "xz", "cab", "tgz", "z", "dmg":
		return CategoryCompressed
	case "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "epub", "odt", "rtf", "csv", "md":
		return CategoryDocuments
	case "mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus", "alac", "aiff":
		return CategoryMusic
	case "exe", "msi", "apk", "bat", "cmd", "pkg", "deb", "rpm", "appx", "ps1":
		return CategoryPrograms
	case "mp4", "mkv", "avi", "mov", "webm", "flv", "m4v", "3gp", "wmv", "mpg", "mpeg", "ts":
		return CategoryVideo
	default:
		return CategoryGeneral
	}
}

// GetCategoryDir returns the absolute path to a category download folder, creating it if necessary.
func (s *DownloadService) GetCategoryDir(category string) string {
	if category == "" {
		category = CategoryGeneral
	}
	base := s.GetDefaultDownloadDir()
	catDir := filepath.Join(base, category)
	_ = os.MkdirAll(catDir, 0755)
	return catDir
}

// OpenCategoryFolder opens the designated category folder in the OS file explorer.
func (s *DownloadService) OpenCategoryFolder(category string) error {
	dir := s.GetCategoryDir(category)
	if runtime.GOOS == "windows" {
		return exec.Command("explorer", dir).Start()
	} else if runtime.GOOS == "darwin" {
		return exec.Command("open", dir).Start()
	}
	return exec.Command("xdg-open", dir).Start()
}

// ProbeURL inspects target URL capabilities (Content-Length, Accept-Ranges, filename).
func (s *DownloadService) ProbeURL(rawURL string) (*protocol.ResourceInfo, error) {
	return s.ProbeURLWithHeaders(rawURL, nil, "")
}

const standardBrowserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

func applyPlatformHeaderDefaults(cfg *config.Config, rawURL string) {
	if cfg.Headers == nil {
		cfg.Headers = make(map[string]string)
	}

	lower := strings.ToLower(rawURL)
	isFB := strings.Contains(lower, "facebook.com") || strings.Contains(lower, "fbcdn.net") || strings.Contains(lower, "fb.watch")
	isIG := strings.Contains(lower, "instagram.com") || strings.Contains(lower, "cdninstagram.com")
	isTT := strings.Contains(lower, "tiktok.com") || strings.Contains(lower, "tiktokcdn.com")

	if isFB {
		if cfg.Headers["Referer"] == "" {
			cfg.Headers["Referer"] = "https://www.facebook.com/"
		}
		if cfg.Headers["Origin"] == "" {
			cfg.Headers["Origin"] = "https://www.facebook.com"
		}
		if cfg.Headers["Sec-Fetch-Dest"] == "" {
			cfg.Headers["Sec-Fetch-Dest"] = "video"
		}
		if cfg.Headers["Sec-Fetch-Mode"] == "" {
			cfg.Headers["Sec-Fetch-Mode"] = "cors"
		}
	} else if isIG {
		if cfg.Headers["Referer"] == "" {
			cfg.Headers["Referer"] = "https://www.instagram.com/"
		}
	} else if isTT {
		if cfg.Headers["Referer"] == "" {
			cfg.Headers["Referer"] = "https://www.tiktok.com/"
		}
	}

	if (isFB || isIG || isTT) && (cfg.UserAgent == "" || strings.Contains(cfg.UserAgent, "godm/")) {
		cfg.UserAgent = standardBrowserUserAgent
	}

	if cfg.Headers["Cookie"] == "" {
		if cookie := storage.GetCookieHeader(rawURL); cookie != "" {
			cfg.Headers["Cookie"] = cookie
		}
	}
}

// ProbeURLWithHeaders inspects target URL with custom authentication headers and cookies.
func (s *DownloadService) ProbeURLWithHeaders(rawURL string, headers map[string]string, userAgent string) (*protocol.ResourceInfo, error) {
	cfg := config.NewDefaultConfig()
	cfg.URL = rawURL
	if headers != nil {
		cfg.Headers = headers
	}
	if userAgent != "" {
		cfg.UserAgent = userAgent
	}
	applyPlatformHeaderDefaults(cfg, rawURL)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	return protocol.Probe(ctx, cfg)
}

// IsVideoURL checks whether the given URL belongs to a supported video platform (YouTube, TikTok, etc.).
func (s *DownloadService) IsVideoURL(rawURL string) bool {
	return media.IsVideoPlatform(rawURL)
}

// InspectVideo fetches video title, thumbnail, creator, and available resolutions/audio formats.
func (s *DownloadService) InspectVideo(rawURL string) (*media.MediaInfo, error) {
	return s.InspectVideoWithOptions(rawURL, media.MediaOptions{})
}

// InspectVideoWithOptions fetches video metadata with cookies or browser authentication.
func (s *DownloadService) InspectVideoWithOptions(rawURL string, opts media.MediaOptions) (*media.MediaInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	return media.InspectMediaWithOptions(ctx, rawURL, &opts)
}

// HasCookiesForURL returns true if stored session cookies exist for this URL's domain.
func (s *DownloadService) HasCookiesForURL(rawURL string) bool {
	return storage.HasCookiesForDomain(rawURL)
}

// GetSyncedCookieDomains returns the list of domains with stored session cookies.
func (s *DownloadService) GetSyncedCookieDomains() []string {
	return storage.ListSyncedDomains()
}

// SaveDomainCookies stores session cookies for a domain.
func (s *DownloadService) SaveDomainCookies(domain string, netscapeJar string, cookieHeader string) error {
	return storage.SaveDomainCookies(domain, netscapeJar, cookieHeader)
}

// GetAvailableBrowsers returns a list of web browsers detected on this machine for cookie import.
func (s *DownloadService) GetAvailableBrowsers() []string {
	browsers := make([]string, 0)
	checked := make(map[string]bool)

	addBrowser := func(b string) {
		if !checked[b] {
			checked[b] = true
			browsers = append(browsers, b)
		}
	}

	if runtime.GOOS == "windows" {
		progFiles := os.Getenv("ProgramFiles")
		progFilesX86 := os.Getenv("ProgramFiles(x86)")
		localApp := os.Getenv("LOCALAPPDATA")
		appData := os.Getenv("APPDATA")

		// Chrome
		chromePaths := []string{
			filepath.Join(progFiles, "Google", "Chrome", "Application", "chrome.exe"),
			filepath.Join(progFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
			filepath.Join(localApp, "Google", "Chrome", "Application", "chrome.exe"),
		}
		for _, p := range chromePaths {
			if _, err := os.Stat(p); err == nil {
				addBrowser("chrome")
				break
			}
		}

		// Edge
		edgePaths := []string{
			filepath.Join(progFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
			filepath.Join(progFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
		}
		for _, p := range edgePaths {
			if _, err := os.Stat(p); err == nil {
				addBrowser("edge")
				break
			}
		}

		// Firefox
		firefoxPaths := []string{
			filepath.Join(progFiles, "Mozilla Firefox", "firefox.exe"),
			filepath.Join(progFilesX86, "Mozilla Firefox", "firefox.exe"),
			filepath.Join(appData, "Mozilla", "Firefox"),
		}
		for _, p := range firefoxPaths {
			if _, err := os.Stat(p); err == nil {
				addBrowser("firefox")
				break
			}
		}

		// Brave
		bravePaths := []string{
			filepath.Join(progFiles, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
			filepath.Join(localApp, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
		}
		for _, p := range bravePaths {
			if _, err := os.Stat(p); err == nil {
				addBrowser("brave")
				break
			}
		}

		// Opera
		operaPaths := []string{
			filepath.Join(localApp, "Programs", "Opera", "launcher.exe"),
			filepath.Join(progFiles, "Opera", "launcher.exe"),
		}
		for _, p := range operaPaths {
			if _, err := os.Stat(p); err == nil {
				addBrowser("opera")
				break
			}
		}

		// Vivaldi
		vivaldiPaths := []string{
			filepath.Join(localApp, "Vivaldi", "Application", "vivaldi.exe"),
			filepath.Join(progFiles, "Vivaldi", "Application", "vivaldi.exe"),
		}
		for _, p := range vivaldiPaths {
			if _, err := os.Stat(p); err == nil {
				addBrowser("vivaldi")
				break
			}
		}
	} else {
		for _, b := range []string{"chrome", "google-chrome", "chromium", "firefox", "brave", "edge", "opera"} {
			if _, err := exec.LookPath(b); err == nil {
				norm := b
				if strings.Contains(b, "chrome") {
					norm = "chrome"
				}
				addBrowser(norm)
			}
		}
	}

	if len(browsers) == 0 {
		browsers = []string{"chrome", "edge", "firefox"}
	}

	return browsers
}

func makeVideoSegments(n int) []storage.SegmentState {
	segs := make([]storage.SegmentState, n)
	for i := 0; i < n; i++ {
		segs[i] = storage.SegmentState{
			Index:   i,
			Start:   int64(i * 1000),
			End:     int64((i + 1) * 1000),
			Current: int64(i * 1000),
			Done:    false,
		}
	}
	return segs
}

func updateVideoSegments(segs []storage.SegmentState, pct float64) {
	n := len(segs)
	if n == 0 {
		return
	}
	completed := int((pct / 100.0) * float64(n))
	for i := 0; i < n; i++ {
		if i < completed {
			segs[i].Done = true
			segs[i].Current = segs[i].End
		} else if i == completed {
			segs[i].Done = false
			subPct := (pct - (float64(i) / float64(n) * 100.0)) / (100.0 / float64(n))
			if subPct < 0 {
				subPct = 0
			}
			if subPct > 1 {
				subPct = 1
			}
			segs[i].Current = segs[i].Start + int64(subPct*float64(segs[i].End-segs[i].Start))
		} else {
			segs[i].Done = false
			segs[i].Current = segs[i].Start
		}
	}
}

// StartVideoDownload begins downloading a video from YouTube, TikTok, or other platforms using 16 concurrent fragments.
func (s *DownloadService) StartVideoDownload(rawURL string, formatID string, outputDir string, customFilename string) (*DownloadItem, error) {
	return s.StartVideoDownloadWithOptions(rawURL, formatID, outputDir, customFilename, media.MediaOptions{})
}

// StartVideoDownloadWithOptions begins downloading a video with cookies or browser authentication.
func (s *DownloadService) StartVideoDownloadWithOptions(rawURL string, formatID string, outputDir string, customFilename string, opts media.MediaOptions) (*DownloadItem, error) {
	isAudioOnly := formatID == "bestaudio/best" || (strings.HasPrefix(formatID, "bestaudio") && !strings.Contains(formatID, "bestvideo"))
	category := CategoryVideo
	if isAudioOnly {
		category = CategoryMusic
	}

	defaultDir := s.GetDefaultDownloadDir()
	if outputDir == "" || outputDir == defaultDir || (category == CategoryVideo && strings.HasSuffix(outputDir, CategoryMusic)) {
		outputDir = s.GetCategoryDir(category)
	} else {
		_ = os.MkdirAll(outputDir, 0755)
	}

	ctxProbe, cancelProbe := context.WithTimeout(context.Background(), 60*time.Second)
	info, err := media.InspectMediaWithOptions(ctxProbe, rawURL, &opts)
	cancelProbe()
	if err != nil {
		return nil, fmt.Errorf("failed to inspect video: %w", err)
	}

	cleanTitle := media.SanitizeFilename(info.Title)
	filename := cleanTitle + ".mp4"
	if isAudioOnly {
		filename = cleanTitle + ".mp3"
	}
	if customFilename != "" {
		ext := filepath.Ext(customFilename)
		base := strings.TrimSuffix(customFilename, ext)
		cleanBase := media.SanitizeFilename(base)
		if ext == "" {
			if isAudioOnly {
				ext = ".mp3"
			} else {
				ext = ".mp4"
			}
		}
		filename = cleanBase + ext
	}
	destPath := filepath.Join(outputDir, filename)

	taskID := fmt.Sprintf("vid_%d", time.Now().UnixNano())
	item := &DownloadItem{
		ID:          taskID,
		URL:         rawURL,
		Filename:    filename,
		DestPath:    destPath,
		Status:      StatusDownloading,
		Connections: 16,
		Segments:    makeVideoSegments(16),
		CreatedAt:   time.Now(),
		IsVideo:     true,
		FormatID:    formatID,
		Category:    category,
	}

	ctx, cancel := context.WithCancel(context.Background())
	task := &activeTask{
		item:      item,
		cancel:    cancel,
		running:   true,
		isVid:     true,
		formatID:  formatID,
		mediaOpts: &opts,
	}

	s.mu.Lock()
	s.tasks[taskID] = task
	s.saveHistoryLocked()
	s.mu.Unlock()

	go s.runVideoDownload(ctx, taskID, task)
	return item, nil
}

func (s *DownloadService) runVideoDownload(ctx context.Context, id string, t *activeTask) {
	defer func() {
		s.mu.Lock()
		t.running = false
		s.saveHistoryLocked()
		s.mu.Unlock()
	}()

	outputDir := filepath.Dir(t.item.DestPath)
	filename := filepath.Base(t.item.DestPath)

	err := media.DownloadMediaWithOptions(ctx, t.item.URL, t.formatID, outputDir, filename, t.mediaOpts, func(p media.MediaProgress) {
		s.mu.Lock()
		t.item.Percent = p.Percent
		t.item.Speed = p.Speed
		t.item.ETA = p.ETA
		if p.Downloaded > 0 {
			t.item.DownloadedBytes = p.Downloaded
		}
		if p.Total > 0 {
			t.item.TotalSize = p.Total
		}
		updateVideoSegments(t.item.Segments, p.Percent)
		itemCopy := *t.item
		s.mu.Unlock()

		if s.app != nil {
			s.app.Event.Emit("download:progress", itemCopy)
		}
	})

	s.mu.Lock()
	defer s.mu.Unlock()

	if ctx.Err() != nil {
		t.item.Status = StatusPaused
		t.item.Speed = 0
		t.item.ETA = "Paused"
		if s.app != nil {
			s.app.Event.Emit("download:status", *t.item)
		}
		return
	}

	if err != nil {
		t.item.Status = StatusError
		t.item.Error = err.Error()
		t.item.Speed = 0
		if s.app != nil {
			s.app.Event.Emit("download:status", *t.item)
		}
		return
	}

	// Locate the actual final file on disk to ensure exact filesize and filename are captured
	targetBase := strings.TrimSuffix(filename, filepath.Ext(filename))
	var actualFile string
	var actualSize int64

	exactPath := filepath.Join(outputDir, filename)
	if fi, err := os.Stat(exactPath); err == nil && fi.Size() > 0 {
		actualFile = exactPath
		actualSize = fi.Size()
	} else {
		// Scan directory for matching output files (e.g. .mp4, .mkv, .mp3, .webm)
		if files, err := os.ReadDir(outputDir); err == nil {
			for _, f := range files {
				if !f.IsDir() && strings.HasPrefix(f.Name(), targetBase) && !strings.Contains(f.Name(), ".part") {
					ext := strings.ToLower(filepath.Ext(f.Name()))
					if ext == ".mp4" || ext == ".mkv" || ext == ".mp3" || ext == ".webm" {
						full := filepath.Join(outputDir, f.Name())
						if fi, err := os.Stat(full); err == nil && fi.Size() > actualSize {
							actualFile = full
							actualSize = fi.Size()
						}
					}
				}
			}
		}
	}

	if actualFile != "" && actualSize > 0 {
		t.item.DestPath = actualFile
		t.item.Filename = filepath.Base(actualFile)
		t.item.TotalSize = actualSize
		t.item.DownloadedBytes = actualSize
	}

	t.item.Status = StatusCompleted
	t.item.Percent = 100
	t.item.Speed = 0
	t.item.ETA = "00:00:00"
	for i := range t.item.Segments {
		t.item.Segments[i].Done = true
		t.item.Segments[i].Current = t.item.Segments[i].End
	}
	if s.app != nil {
		s.app.Event.Emit("download:status", *t.item)
	}
}

// StartDownload initiates an accelerated multi-connection download task.
func (s *DownloadService) StartDownload(rawURL string, conns int, outputDir string, customFilename string) (*DownloadItem, error) {
	return s.StartDownloadWithHeaders(rawURL, conns, outputDir, customFilename, nil, "")
}

// StartDownloadWithHeaders initiates an accelerated download with custom headers, cookies, and user-agent.
func (s *DownloadService) StartDownloadWithHeaders(rawURL string, conns int, outputDir string, customFilename string, headers map[string]string, userAgent string) (*DownloadItem, error) {
	// Auto-route video platform URLs (YouTube, TikTok, Instagram, etc.) to the media engine
	if s.IsVideoURL(rawURL) {
		opts := media.MediaOptions{}
		if headers != nil {
			opts.Cookies = headers["Cookie"]
			opts.Referer = headers["Referer"]
		}
		opts.UserAgent = userAgent
		return s.StartVideoDownloadWithOptions(rawURL, "bestvideo+bestaudio/best", outputDir, customFilename, opts)
	}

	if conns <= 0 {
		conns = config.DefaultConnections
	}

	cfg := config.NewDefaultConfig()
	cfg.URL = rawURL
	cfg.Connections = conns
	cfg.Quiet = true
	if headers != nil {
		cfg.Headers = headers
	}
	if userAgent != "" {
		cfg.UserAgent = userAgent
	}
	applyPlatformHeaderDefaults(cfg, rawURL)

	// Probe URL
	ctxProbe, cancelProbe := context.WithTimeout(context.Background(), 15*time.Second)
	info, err := protocol.Probe(ctxProbe, cfg)
	cancelProbe()
	if err != nil {
		return nil, fmt.Errorf("failed to probe URL: %w", err)
	}

	filename := info.Filename
	if customFilename != "" {
		filename = customFilename
	}

	category := s.GetCategory(filename)
	defaultDir := s.GetDefaultDownloadDir()
	if outputDir == "" || outputDir == defaultDir {
		outputDir = s.GetCategoryDir(category)
	} else {
		_ = os.MkdirAll(outputDir, 0755)
	}

	destPath := filepath.Join(outputDir, filename)
	cfg.OutputDir = outputDir
	cfg.OutputFile = filename

	taskID := fmt.Sprintf("dl_%d", time.Now().UnixNano())
	item := &DownloadItem{
		ID:          taskID,
		URL:         rawURL,
		Filename:    filename,
		DestPath:    destPath,
		TotalSize:   info.ContentLength,
		Status:      StatusDownloading,
		Connections: conns,
		Category:    category,
		CreatedAt:   time.Now(),
		IsVideo:     false,
	}

	ctx, cancel := context.WithCancel(context.Background())
	task := &activeTask{
		item:    item,
		cancel:  cancel,
		cfg:     cfg,
		running: true,
		isVid:   false,
	}

	s.mu.Lock()
	s.tasks[taskID] = task
	s.saveHistoryLocked()
	s.mu.Unlock()

	go s.runDownload(ctx, taskID, task, info)
	return item, nil
}

func (s *DownloadService) runDownload(ctx context.Context, id string, t *activeTask, info *protocol.ResourceInfo) {
	defer func() {
		s.mu.Lock()
		t.running = false
		s.saveHistoryLocked()
		s.mu.Unlock()
	}()

	destPath := t.item.DestPath
	var state *storage.TaskState
	isResume := false

	if storage.HasState(destPath) {
		loaded, loadErr := storage.LoadState(destPath)
		if loadErr == nil && loaded.URL == t.cfg.URL && loaded.TotalSize == info.ContentLength {
			state = loaded
			isResume = true
		}
	}

	if state == nil {
		state = storage.NewTaskState(
			t.cfg.URL,
			filepath.Base(destPath),
			info.ContentLength,
			info.AcceptRanges,
			info.ETag,
			info.LastModified,
		)
		if info.AcceptRanges && info.ContentLength > 0 {
			state.Segments = segment.PlanSegments(info.ContentLength, t.cfg.Connections, t.cfg.MinChunkSize)
		} else {
			state.Segments = segment.PlanSegments(info.ContentLength, 1, 0)
		}
		_ = state.Save(destPath)
	}

	t.state = state

	writer, err := storage.OpenFileWriter(destPath, info.ContentLength, isResume)
	if err != nil {
		s.setError(id, err.Error())
		return
	}
	defer writer.Close()

	// Initial progress snapshot
	s.mu.Lock()
	t.item.TotalSize = info.ContentLength
	t.item.DownloadedBytes = state.TotalDownloaded()
	t.item.Segments = state.SegmentsSnapshot()
	itemSnap := *t.item
	s.mu.Unlock()
	if s.app != nil {
		s.app.Event.Emit("download:progress", itemSnap)
	}

	// Progress monitor loop
	monitorCtx, cancelMonitor := context.WithCancel(context.Background())
	defer cancelMonitor()

	go func() {
		ticker := time.NewTicker(200 * time.Millisecond)
		defer ticker.Stop()

		var lastBytes int64 = state.TotalDownloaded()
		var lastTime = time.Now()
		var smoothedSpeed float64

		for {
			select {
			case <-monitorCtx.Done():
				return
			case now := <-ticker.C:
				dl := state.TotalDownloaded()
				elapsed := now.Sub(lastTime).Seconds()
				if elapsed >= 0.2 {
					delta := dl - lastBytes
					if delta < 0 {
						delta = 0
					}
					instant := float64(delta) / elapsed
					if smoothedSpeed == 0 {
						smoothedSpeed = instant
					} else {
						smoothedSpeed = 0.65*smoothedSpeed + 0.35*instant
					}
					lastBytes = dl
					lastTime = now
				}

				var pct float64
				if info.ContentLength > 0 {
					pct = (float64(dl) / float64(info.ContentLength)) * 100
					if pct > 100 {
						pct = 100
					}
				}

				etaStr := "--:--:--"
				if info.ContentLength > 0 && smoothedSpeed > 0 {
					rem := info.ContentLength - dl
					if rem > 0 {
						secs := int(float64(rem) / smoothedSpeed)
						etaStr = fmt.Sprintf("%02d:%02d:%02d", secs/3600, (secs%3600)/60, secs%60)
					} else {
						etaStr = "00:00:00"
					}
				}

				s.mu.Lock()
				t.item.DownloadedBytes = dl
				t.item.Percent = pct
				t.item.Speed = smoothedSpeed
				t.item.ETA = etaStr
				t.item.Segments = state.SegmentsSnapshot()
				itemCopy := *t.item
				s.mu.Unlock()

				if s.app != nil {
					s.app.Event.Emit("download:progress", itemCopy)
				}
			}
		}
	}()

	// Execute workers concurrently with shared state and writer
	dlErr := engine.RunWorkers(ctx, t.cfg, s.httpClient, writer, state)
	cancelMonitor()

	s.mu.Lock()
	defer s.mu.Unlock()

	if ctx.Err() != nil {
		t.item.Status = StatusPaused
		t.item.Speed = 0
		t.item.ETA = "Paused"
		_ = state.Save(destPath)
		if s.app != nil {
			s.app.Event.Emit("download:status", *t.item)
		}
		return
	}

	if dlErr != nil {
		t.item.Status = StatusError
		t.item.Error = dlErr.Error()
		t.item.Speed = 0
		_ = state.Save(destPath)
		if s.app != nil {
			s.app.Event.Emit("download:status", *t.item)
		}
		return
	}

	t.item.Status = StatusCompleted
	t.item.Percent = 100
	t.item.DownloadedBytes = t.item.TotalSize
	t.item.Speed = 0
	t.item.ETA = "00:00:00"
	_ = storage.RemoveState(destPath)
	if s.app != nil {
		s.app.Event.Emit("download:status", *t.item)
	}
}

func (s *DownloadService) setError(id, errMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if task, exists := s.tasks[id]; exists {
		task.item.Status = StatusError
		task.item.Error = errMsg
		task.item.Speed = 0
		s.saveHistoryLocked()
		if s.app != nil {
			s.app.Event.Emit("download:status", *task.item)
		}
	}
}

// PauseDownload pauses an active download cleanly and immediately.
func (s *DownloadService) PauseDownload(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, exists := s.tasks[id]
	if !exists {
		return errors.New("task not found")
	}

	if task.cancel != nil {
		task.cancel()
	}
	task.running = false
	task.item.Status = StatusPaused
	task.item.Speed = 0
	task.item.ETA = "Paused"
	if task.state != nil {
		_ = task.state.Save(task.item.DestPath)
	}
	s.saveHistoryLocked()

	if s.app != nil {
		s.app.Event.Emit("download:status", *task.item)
	}
	return nil
}

// ResumeDownload resumes a paused download seamlessly.
func (s *DownloadService) ResumeDownload(id string) error {
	s.mu.Lock()
	task, exists := s.tasks[id]
	if !exists {
		s.mu.Unlock()
		return errors.New("task not found")
	}

	if task.running {
		s.mu.Unlock()
		return nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	task.cancel = cancel
	task.running = true
	task.item.Status = StatusDownloading
	task.item.Error = ""
	s.saveHistoryLocked()

	if s.app != nil {
		s.app.Event.Emit("download:status", *task.item)
	}
	s.mu.Unlock()

	if task.isVid {
		go s.runVideoDownload(ctx, id, task)
		return nil
	}

	if task.cfg == nil {
		cfg := config.NewDefaultConfig()
		cfg.URL = task.item.URL
		cfg.Connections = task.item.Connections
		cfg.OutputDir = filepath.Dir(task.item.DestPath)
		cfg.OutputFile = task.item.Filename
		task.cfg = cfg
	}

	info := &protocol.ResourceInfo{
		URL:           task.item.URL,
		Filename:      task.item.Filename,
		ContentLength: task.item.TotalSize,
		AcceptRanges:  true,
	}

	go s.runDownload(ctx, id, task, info)
	return nil
}

// ListDownloads returns all tracked download items.
func (s *DownloadService) ListDownloads() []*DownloadItem {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*DownloadItem, 0, len(s.tasks))
	for _, t := range s.tasks {
		result = append(result, t.item)
	}
	return result
}

// StopAll pauses all active downloads.
func (s *DownloadService) StopAll() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, task := range s.tasks {
		if task.running && task.cancel != nil {
			task.cancel()
			task.running = false
			task.item.Status = StatusPaused
			task.item.Speed = 0
			task.item.ETA = "Paused"
			if task.state != nil {
				_ = task.state.Save(task.item.DestPath)
			}
			if s.app != nil {
				s.app.Event.Emit("download:status", *task.item)
			}
		}
	}
	s.saveHistoryLocked()
}

// ResumeAll resumes all paused downloads.
func (s *DownloadService) ResumeAll() {
	s.mu.RLock()
	ids := make([]string, 0, len(s.tasks))
	for id, t := range s.tasks {
		if t.item.Status == StatusPaused {
			ids = append(ids, id)
		}
	}
	s.mu.RUnlock()

	for _, id := range ids {
		_ = s.ResumeDownload(id)
	}
}

// DeleteDownload cancels a task, cleans up state, and optionally removes the downloaded file.
func (s *DownloadService) DeleteDownload(id string, deleteFile bool) error {
	s.mu.Lock()
	task, exists := s.tasks[id]
	if !exists {
		s.mu.Unlock()
		return errors.New("task not found")
	}

	if task.cancel != nil {
		task.cancel()
	}
	destPath := task.item.DestPath
	delete(s.tasks, id)
	s.saveHistoryLocked()
	s.mu.Unlock()

	// Clean up state file
	_ = storage.RemoveState(destPath)

	if deleteFile && destPath != "" {
		_ = os.Remove(destPath)
	}

	if s.app != nil {
		s.app.Event.Emit("download:deleted", id)
	}
	return nil
}

// OpenFile opens the downloaded file with the system default application.
func (s *DownloadService) OpenFile(path string) error {
	if runtime.GOOS == "windows" {
		return exec.Command("cmd", "/c", "start", "", path).Start()
	} else if runtime.GOOS == "darwin" {
		return exec.Command("open", path).Start()
	}
	return exec.Command("xdg-open", path).Start()
}

// OpenFolder opens the operating system file explorer at the specified file or folder.
func (s *DownloadService) OpenFolder(path string) error {
	if runtime.GOOS == "windows" {
		if _, err := os.Stat(path); err == nil {
			return exec.Command("explorer", "/select,", path).Start()
		}
		return exec.Command("explorer", filepath.Dir(path)).Start()
	} else if runtime.GOOS == "darwin" {
		if _, err := os.Stat(path); err == nil {
			return exec.Command("open", "-R", path).Start()
		}
		return exec.Command("open", filepath.Dir(path)).Start()
	}

	// Linux / BSD
	dir := path
	if info, err := os.Stat(path); err == nil && !info.IsDir() {
		dir = filepath.Dir(path)
	}
	return exec.Command("xdg-open", dir).Start()
}

// GetExtensionPath returns the absolute path to the browser extension folder.
func (s *DownloadService) GetExtensionPath() string {
	candidates := []string{
		filepath.Join(".", "extension"),
		filepath.Join("..", "extension"),
	}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates,
			filepath.Join(filepath.Dir(exe), "extension"),
			filepath.Join(filepath.Dir(exe), "..", "extension"),
			filepath.Join(filepath.Dir(exe), "..", "share", "godm", "extension"),
		)
	}
	if runtime.GOOS != "windows" {
		if home, err := os.UserHomeDir(); err == nil {
			candidates = append(candidates,
				filepath.Join(home, ".local", "share", "godm", "extension"),
			)
		}
		candidates = append(candidates,
			"/usr/share/godm/extension",
			"/usr/local/share/godm/extension",
			"/opt/godm/extension",
		)
	}
	for _, p := range candidates {
		if info, err := os.Stat(p); err == nil && info.IsDir() {
			if abs, err := filepath.Abs(p); err == nil {
				return abs
			}
			return p
		}
	}
	abs, _ := filepath.Abs("./extension")
	return abs
}

// OpenExtensionFolder opens the extension directory directly in the file explorer.
func (s *DownloadService) OpenExtensionFolder() error {
	p := s.GetExtensionPath()
	if runtime.GOOS == "windows" {
		return exec.Command("explorer", p).Start()
	} else if runtime.GOOS == "darwin" {
		return exec.Command("open", p).Start()
	}
	return exec.Command("xdg-open", p).Start()
}

// Persistent History
func (s *DownloadService) getHistoryPath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	dir := filepath.Join(configDir, "godm")
	_ = os.MkdirAll(dir, 0755)
	return filepath.Join(dir, "tasks.json")
}

func (s *DownloadService) saveHistoryLocked() {
	p := s.getHistoryPath()
	items := make([]*DownloadItem, 0, len(s.tasks))
	for _, t := range s.tasks {
		items = append(items, t.item)
	}
	data, err := json.MarshalIndent(items, "", "  ")
	if err == nil {
		_ = os.WriteFile(p, data, 0644)
	}
}

func (s *DownloadService) loadHistory() {
	p := s.getHistoryPath()
	data, err := os.ReadFile(p)
	if err != nil {
		return
	}
	var items []*DownloadItem
	if err := json.Unmarshal(data, &items); err != nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, item := range items {
		if item == nil || item.ID == "" {
			continue
		}
		if item.Status == StatusDownloading {
			item.Status = StatusPaused
			item.Speed = 0
			item.ETA = "Paused"
		}
		cfg := config.NewDefaultConfig()
		cfg.URL = item.URL
		cfg.Connections = item.Connections
		cfg.OutputDir = filepath.Dir(item.DestPath)
		cfg.OutputFile = item.Filename

		s.tasks[item.ID] = &activeTask{
			item:     item,
			cfg:      cfg,
			isVid:    item.IsVideo,
			formatID: item.FormatID,
			running:  false,
		}
	}
}
