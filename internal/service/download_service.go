package service

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
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
}

type activeTask struct {
	item    *DownloadItem
	cancel  context.CancelFunc
	state   *storage.TaskState
	cfg     *config.Config
	eng     *engine.Engine
	running bool
}

// DownloadService is registered as a Wails service to bind download management methods.
type DownloadService struct {
	app   *application.App
	mu    sync.RWMutex
	tasks map[string]*activeTask
}

// NewDownloadService creates a new DownloadService.
func NewDownloadService() *DownloadService {
	return &DownloadService{
		tasks: make(map[string]*activeTask),
	}
}

// SetApp sets the Wails application reference for event emission.
func (s *DownloadService) SetApp(app *application.App) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.app = app
}

// GetDefaultDownloadDir returns the user's standard Downloads folder.
func (s *DownloadService) GetDefaultDownloadDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return "."
	}
	downloads := filepath.Join(home, "Downloads")
	if info, err := os.Stat(downloads); err == nil && info.IsDir() {
		return downloads
	}
	return home
}

// ProbeURL inspects target URL capabilities (Content-Length, Accept-Ranges, filename).
func (s *DownloadService) ProbeURL(rawURL string) (*protocol.ResourceInfo, error) {
	cfg := config.NewDefaultConfig()
	cfg.URL = rawURL
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
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return media.InspectMedia(ctx, rawURL)
}

// StartVideoDownload begins downloading a video from YouTube, TikTok, or other platforms.
func (s *DownloadService) StartVideoDownload(rawURL string, formatID string, outputDir string, customFilename string) (*DownloadItem, error) {
	if outputDir == "" {
		outputDir = s.GetDefaultDownloadDir()
	}

	ctxProbe, cancelProbe := context.WithTimeout(context.Background(), 30*time.Second)
	info, err := media.InspectMedia(ctxProbe, rawURL)
	cancelProbe()
	if err != nil {
		return nil, fmt.Errorf("failed to inspect video: %w", err)
	}

	filename := info.Title + ".mp4"
	if customFilename != "" {
		filename = customFilename
	}
	destPath := filepath.Join(outputDir, filename)

	taskID := fmt.Sprintf("vid_%d", time.Now().UnixNano())
	item := &DownloadItem{
		ID:          taskID,
		URL:         rawURL,
		Filename:    filename,
		DestPath:    destPath,
		Status:      StatusDownloading,
		Connections: 1,
		CreatedAt:   time.Now(),
	}

	ctx, cancel := context.WithCancel(context.Background())
	task := &activeTask{
		item:    item,
		cancel:  cancel,
		running: true,
	}

	s.mu.Lock()
	s.tasks[taskID] = task
	s.mu.Unlock()

	go func() {
		defer func() {
			s.mu.Lock()
			task.running = false
			s.mu.Unlock()
		}()

		err := media.DownloadMedia(ctx, rawURL, formatID, outputDir, customFilename, func(p media.MediaProgress) {
			s.mu.Lock()
			item.Percent = p.Percent
			item.Speed = p.Speed
			item.ETA = p.ETA
			item.DownloadedBytes = p.Downloaded
			item.TotalSize = p.Total
			itemCopy := *item
			s.mu.Unlock()

			if s.app != nil {
				s.app.Event.Emit("download:progress", itemCopy)
			}
		})

		s.mu.Lock()
		defer s.mu.Unlock()

		if ctx.Err() != nil {
			item.Status = StatusPaused
			if s.app != nil {
				s.app.Event.Emit("download:status", *item)
			}
			return
		}

		if err != nil {
			item.Status = StatusError
			item.Error = err.Error()
			if s.app != nil {
				s.app.Event.Emit("download:status", *item)
			}
			return
		}

		item.Status = StatusCompleted
		item.Percent = 100
		item.Speed = 0
		item.ETA = "00:00:00"
		if s.app != nil {
			s.app.Event.Emit("download:status", *item)
		}
	}()

	return item, nil
}


// StartDownload initiates a download task in the background.
func (s *DownloadService) StartDownload(rawURL string, conns int, outputDir string, customFilename string) (*DownloadItem, error) {
	if conns <= 0 {
		conns = config.DefaultConnections
	}
	if outputDir == "" {
		outputDir = s.GetDefaultDownloadDir()
	}

	cfg := config.NewDefaultConfig()
	cfg.URL = rawURL
	cfg.Connections = conns
	cfg.OutputDir = outputDir
	cfg.OutputFile = customFilename
	cfg.Quiet = true

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
	destPath := filepath.Join(outputDir, filename)

	taskID := fmt.Sprintf("dl_%d", time.Now().UnixNano())
	item := &DownloadItem{
		ID:          taskID,
		URL:         rawURL,
		Filename:    filename,
		DestPath:    destPath,
		TotalSize:   info.ContentLength,
		Status:      StatusDownloading,
		Connections: conns,
		CreatedAt:   time.Now(),
	}

	ctx, cancel := context.WithCancel(context.Background())
	task := &activeTask{
		item:    item,
		cancel:  cancel,
		cfg:     cfg,
		running: true,
	}

	s.mu.Lock()
	s.tasks[taskID] = task
	s.mu.Unlock()

	// Launch download worker goroutine
	go s.runDownload(ctx, taskID, task, info)

	return item, nil
}

func (s *DownloadService) runDownload(ctx context.Context, id string, t *activeTask, info *protocol.ResourceInfo) {
	defer func() {
		s.mu.Lock()
		t.running = false
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

	client := engine.NewEngine(t.cfg)

	// Progress monitor loop
	monitorDone := make(chan struct{})
	go func() {
		defer close(monitorDone)
		ticker := time.NewTicker(250 * time.Millisecond)
		defer ticker.Stop()

		var lastBytes int64 = state.TotalDownloaded()
		var lastTime = time.Now()
		var smoothedSpeed float64

		for {
			select {
			case <-ctx.Done():
				return
			case now := <-ticker.C:
				dl := state.TotalDownloaded()
				elapsed := now.Sub(lastTime).Seconds()
				if elapsed >= 0.25 {
					delta := dl - lastBytes
					if delta < 0 {
						delta = 0
					}
					instant := float64(delta) / elapsed
					if smoothedSpeed == 0 {
						smoothedSpeed = instant
					} else {
						smoothedSpeed = 0.7*smoothedSpeed + 0.3*instant
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

	// Run engine
	dlErr := client.Execute(ctx)
	<-monitorDone

	s.mu.Lock()
	defer s.mu.Unlock()

	if ctx.Err() != nil {
		t.item.Status = StatusPaused
		if s.app != nil {
			s.app.Event.Emit("download:status", *t.item)
		}
		return
	}

	if dlErr != nil {
		t.item.Status = StatusError
		t.item.Error = dlErr.Error()
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
		if s.app != nil {
			s.app.Event.Emit("download:status", *task.item)
		}
	}
}

// PauseDownload pauses an active download.
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
	task.item.Status = StatusPaused
	return nil
}

// ResumeDownload resumes a paused download.
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
	s.mu.Unlock()

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
			task.item.Status = StatusPaused
		}
	}
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
	dir := filepath.Dir(path)
	if _, err := os.Stat(path); err == nil {
		// If path is a file, show it selected if on Windows
		if runtime.GOOS == "windows" {
			return exec.Command("explorer", "/select,", path).Start()
		}
	}
	if runtime.GOOS == "windows" {
		return exec.Command("explorer", dir).Start()
	} else if runtime.GOOS == "darwin" {
		return exec.Command("open", dir).Start()
	}
	return exec.Command("xdg-open", dir).Start()
}

// GetExtensionPath returns the absolute path to the browser extension folder.
func (s *DownloadService) GetExtensionPath() string {
	candidates := []string{
		filepath.Join(".", "extension"),
	}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates,
			filepath.Join(filepath.Dir(exe), "extension"),
			filepath.Join(filepath.Dir(exe), "..", "extension"),
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
