package engine

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"path/filepath"
	"sync"
	"time"

	"godm/internal/protocol"
	"godm/internal/segment"
	"godm/internal/storage"
	"godm/internal/ui"
	"godm/pkg/config"
)

// Engine coordinates probing, segment planning, concurrent workers, and progress reporting.
type Engine struct {
	cfg    *config.Config
	client *http.Client
}

// NewHTTPClient creates an optimized HTTP client with aggressive connection pooling and socket tuning.
func NewHTTPClient(cfg *config.Config) *http.Client {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   15 * time.Second,
			KeepAlive: 30 * time.Second,
			DualStack: true,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   100,
		MaxConnsPerHost:       100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		ResponseHeaderTimeout: 30 * time.Second,
		WriteBufferSize:       256 * 1024,
		ReadBufferSize:        256 * 1024,
	}

	return &http.Client{
		Transport: transport,
		Timeout:   cfg.Timeout,
	}
}

// NewEngine creates a new Engine instance with the given configuration.
func NewEngine(cfg *config.Config) *Engine {
	return &Engine{
		cfg:    cfg,
		client: NewHTTPClient(cfg),
	}
}

// RunWorkers concurrently downloads all unfinished segments into writer using the shared TaskState.
func RunWorkers(
	ctx context.Context,
	cfg *config.Config,
	client *http.Client,
	writer *storage.FileWriter,
	state *storage.TaskState,
) error {
	destPath := writer.Path()

	workerCtx, cancelWorkers := context.WithCancel(ctx)
	defer cancelWorkers()

	var wg sync.WaitGroup
	errChan := make(chan error, len(state.Segments))

	// Spawn segment download workers
	for i := range state.Segments {
		seg, ok := state.GetSegment(i)
		if !ok || seg.Done {
			continue
		}
		wg.Add(1)
		go func(segIdx int) {
			defer wg.Done()
			if err := downloadWorker(workerCtx, cfg, client, writer, state, segIdx); err != nil {
				if !errors.Is(err, context.Canceled) {
					errChan <- err
				}
			}
		}(i)
	}

	// Wait for workers to finish
	wg.Wait()

	// Check if any error occurred
	close(errChan)
	var firstErr error
	for err := range errChan {
		if firstErr == nil {
			firstErr = err
		}
	}

	// Handle interruption or worker error
	if ctx.Err() != nil {
		_ = state.Save(destPath)
		return ctx.Err()
	}
	if firstErr != nil {
		_ = state.Save(destPath)
		return firstErr
	}

	_ = writer.Sync()
	return nil
}

// Execute performs the download or resumes an existing one (used primarily by the CLI runner).
func (e *Engine) Execute(ctx context.Context) error {
	// Step 1: Probe target resource
	if !e.cfg.Quiet {
		fmt.Printf("Connecting to %s ...\n", e.cfg.URL)
	}

	info, err := protocol.Probe(ctx, e.cfg)
	if err != nil {
		return fmt.Errorf("probe failed: %w", err)
	}

	// Step 2: Determine output file path
	destPath := e.resolveDestination(info.Filename)

	if !e.cfg.Quiet {
		fmt.Printf("File:        %s\n", filepath.Base(destPath))
		if info.ContentLength > 0 {
			fmt.Printf("Size:        %s (%d bytes)\n", ui.FormatBytes(info.ContentLength), info.ContentLength)
		} else {
			fmt.Println("Size:        Unknown (Streaming)")
		}
		if info.AcceptRanges {
			fmt.Printf("Multi-part:  Supported (%d parallel connections)\n", e.cfg.Connections)
		} else {
			fmt.Println("Multi-part:  Not supported by server (Single connection)")
		}
		fmt.Println("--------------------------------------------------")
	}

	// Step 3: Check for resumable state
	var state *storage.TaskState
	isResume := false

	if storage.HasState(destPath) {
		loaded, loadErr := storage.LoadState(destPath)
		if loadErr == nil && loaded.URL == e.cfg.URL && loaded.TotalSize == info.ContentLength {
			// Validate ETag if present
			if loaded.ETag == "" || loaded.ETag == info.ETag {
				state = loaded
				isResume = true
				if !e.cfg.Quiet {
					fmt.Printf("Resuming existing download from %s ...\n", ui.FormatBytes(state.TotalDownloaded()))
				}
			}
		}
	}

	// If fresh download, plan segments
	if state == nil {
		state = storage.NewTaskState(
			e.cfg.URL,
			filepath.Base(destPath),
			info.ContentLength,
			info.AcceptRanges,
			info.ETag,
			info.LastModified,
		)

		if info.AcceptRanges && info.ContentLength > 0 {
			state.Segments = segment.PlanSegments(info.ContentLength, e.cfg.Connections, e.cfg.MinChunkSize)
		} else {
			// Single stream
			state.Segments = segment.PlanSegments(info.ContentLength, 1, 0)
		}

		if err := state.Save(destPath); err != nil {
			return fmt.Errorf("failed to initialize download state: %w", err)
		}
	}

	// Step 4: Open and preallocate destination file
	writer, err := storage.OpenFileWriter(destPath, info.ContentLength, isResume)
	if err != nil {
		return fmt.Errorf("failed to open output file: %w", err)
	}
	defer writer.Close()

	// Step 5: Start progress tracker & state periodic flusher
	tracker := ui.NewProgressTracker(info.ContentLength, state.TotalDownloaded(), e.cfg.Quiet)

	workerCtx, cancelWorkers := context.WithCancel(ctx)
	defer cancelWorkers()

	flusherDone := make(chan struct{})
	go func() {
		defer close(flusherDone)
		ticker := time.NewTicker(200 * time.Millisecond)
		stateTicker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		defer stateTicker.Stop()

		for {
			select {
			case <-workerCtx.Done():
				_ = state.Save(destPath)
				return
			case <-ticker.C:
				tracker.Update(state)
			case <-stateTicker.C:
				_ = state.Save(destPath)
			}
		}
	}()

	dlErr := RunWorkers(workerCtx, e.cfg, e.client, writer, state)
	cancelWorkers()
	<-flusherDone

	if ctx.Err() != nil {
		_ = state.Save(destPath)
		return fmt.Errorf("\ndownload paused / interrupted (resumable state saved)")
	}
	if dlErr != nil {
		_ = state.Save(destPath)
		return fmt.Errorf("\ndownload error: %w", dlErr)
	}

	if state.IsComplete() {
		tracker.Finish(state.TotalDownloaded())
		_ = storage.RemoveState(destPath)
	}

	return nil
}

func (e *Engine) resolveDestination(probeFilename string) string {
	filename := probeFilename
	if e.cfg.OutputFile != "" {
		filename = e.cfg.OutputFile
	}

	if e.cfg.OutputDir != "" {
		return filepath.Join(e.cfg.OutputDir, filename)
	}
	return filename
}
