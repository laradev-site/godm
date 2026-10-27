package engine

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"godm/internal/storage"
	"godm/pkg/config"
)

// downloadWorker executes the download of a single segment with retry support.
func downloadWorker(
	ctx context.Context,
	cfg *config.Config,
	client *http.Client,
	writer *storage.FileWriter,
	state *storage.TaskState,
	segIndex int,
) error {
	seg, ok := state.GetSegment(segIndex)
	if !ok || seg.Done {
		return nil
	}

	retries := 0
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		err := downloadSegmentStream(ctx, cfg, client, writer, state, segIndex)
		if err == nil {
			return nil
		}

		// If context was cancelled, exit immediately without retrying
		if ctx.Err() != nil {
			return ctx.Err()
		}

		retries++
		if retries > cfg.MaxRetries {
			return fmt.Errorf("segment %d failed after %d retries: %w", segIndex, cfg.MaxRetries, err)
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(cfg.RetryDelay):
		}
	}
}

func downloadSegmentStream(
	ctx context.Context,
	cfg *config.Config,
	client *http.Client,
	writer *storage.FileWriter,
	state *storage.TaskState,
	segIndex int,
) error {
	seg, ok := state.GetSegment(segIndex)
	if !ok || seg.Done {
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.URL, nil)
	if err != nil {
		return err
	}

	req.Header.Set("User-Agent", cfg.UserAgent)
	req.Header.Set("Accept", "*/*")
	for k, v := range cfg.Headers {
		req.Header.Set(k, v)
	}

	// Set Range header if end offset is valid (not single-stream indefinite)
	if seg.End >= 0 {
		rangeHeader := fmt.Sprintf("bytes=%d-%d", seg.Current, seg.End)
		req.Header.Set("Range", rangeHeader)
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if seg.End >= 0 && resp.StatusCode != http.StatusPartialContent && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code %d for range request", resp.StatusCode)
	}
	if seg.End < 0 && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code %d", resp.StatusCode)
	}

	buf := make([]byte, cfg.BufferSize)
	curr := seg.Current

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			// Direct random-access write to the designated byte offset
			if _, writeErr := writer.WriteAt(buf[:n], curr); writeErr != nil {
				return fmt.Errorf("failed to write to file at offset %d: %w", curr, writeErr)
			}
			curr += int64(n)

			// Mark progress
			isDone := seg.End >= 0 && curr > seg.End
			state.UpdateSegment(segIndex, curr, isDone)
		}

		if readErr != nil {
			if readErr == io.EOF {
				// Completed
				state.UpdateSegment(segIndex, curr, true)
				return nil
			}
			return readErr
		}
	}
}
