package engine

import (
	"context"
	"errors"
	"fmt"
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

// NewEngine creates a new Engine instance with the given configuration.
func NewEngine(cfg *config.Config) *Engine {
	transport := &http.Transport{
		MaxIdleConns:        cfg.Connections * 2,
		MaxIdleConnsPerHost: cfg.Connections * 2,
		IdleConnTimeout:     90 * time.Second,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   cfg.Timeout,
	}

	return &Engine{
		cfg:    cfg,
		client: client,
	}
}

// Execute performs the download or resumes an existing one.
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

	// Context for coordinating workers and flusher
	workerCtx, cancelWorkers := context.WithCancel(ctx)
	defer cancelWorkers()

	// Flusher goroutine: periodically saves state so sudden kill or Ctrl+C keeps download safe
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

	// Step 6: Spawn segment download workers
	var wg sync.WaitGroup
	errChan := make(chan error, len(state.Segments))

	for i := range state.Segments {
		if state.Segments[i].Done {
			continue
		}
		wg.Add(1)
		go func(segIdx int) {
			defer wg.Done()
			if err := downloadWorker(workerCtx, e.cfg, e.client, writer, state, segIdx); err != nil {
				if !errors.Is(err, context.Canceled) {
					errChan <- err
				}
			}
		}(i)
	}

	// Wait for workers to finish
	wg.Wait()
	cancelWorkers()
	<-flusherDone

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
		return fmt.Errorf("\ndownload paused / interrupted (resumable state saved)")
	}
	if firstErr != nil {
		_ = state.Save(destPath)
		return fmt.Errorf("\ndownload error: %w", firstErr)
	}

	// Step 7: Finalize
	_ = writer.Sync()
	_ = writer.Close()

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
