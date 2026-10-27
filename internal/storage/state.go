package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const StateExtension = ".godm"

// SegmentState represents the download state of an individual chunk.
type SegmentState struct {
	Index   int   `json:"index"`
	Start   int64 `json:"start"`   // Beginning byte offset (inclusive)
	End     int64 `json:"end"`     // Ending byte offset (inclusive)
	Current int64 `json:"current"` // Current absolute byte offset to write next
	Done    bool  `json:"done"`    // Whether this segment finished
}

// Downloaded returns the number of bytes downloaded for this segment so far.
func (s *SegmentState) Downloaded() int64 {
	if s.Done {
		return s.End - s.Start + 1
	}
	if s.Current < s.Start {
		return 0
	}
	return s.Current - s.Start
}

// Total returns the total byte length of this segment.
func (s *SegmentState) Total() int64 {
	return s.End - s.Start + 1
}

// TaskState holds the overall progress and metadata required for resuming.
type TaskState struct {
	mu           sync.RWMutex
	URL          string         `json:"url"`
	Filename     string         `json:"filename"`
	TotalSize    int64          `json:"total_size"`
	Resumable    bool           `json:"resumable"`
	ETag         string         `json:"etag"`
	LastModified string         `json:"last_modified"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	Segments     []SegmentState `json:"segments"`
}

// NewTaskState creates a fresh TaskState instance.
func NewTaskState(url, filename string, totalSize int64, resumable bool, etag, lastModified string) *TaskState {
	now := time.Now()
	return &TaskState{
		URL:          url,
		Filename:     filename,
		TotalSize:    totalSize,
		Resumable:    resumable,
		ETag:         etag,
		LastModified: lastModified,
		CreatedAt:    now,
		UpdatedAt:    now,
		Segments:     make([]SegmentState, 0),
	}
}

// StateFilePath returns the path to the state file for a given target download file.
func StateFilePath(downloadFilePath string) string {
	return downloadFilePath + StateExtension
}

// TotalDownloaded calculates the sum of all downloaded bytes across all segments.
func (ts *TaskState) TotalDownloaded() int64 {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	var total int64
	for _, s := range ts.Segments {
		total += s.Downloaded()
	}
	return total
}

// GetSegment safely returns a copy of the segment at the specified index.
func (ts *TaskState) GetSegment(index int) (SegmentState, bool) {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	if index < 0 || index >= len(ts.Segments) {
		return SegmentState{}, false
	}
	return ts.Segments[index], true
}

// SegmentsSnapshot returns a copy of all current segment states.
func (ts *TaskState) SegmentsSnapshot() []SegmentState {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	copyList := make([]SegmentState, len(ts.Segments))
	copy(copyList, ts.Segments)
	return copyList
}

func (ts *TaskState) IsComplete() bool {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	if len(ts.Segments) == 0 {
		return false
	}
	for _, s := range ts.Segments {
		if !s.Done {
			return false
		}
	}
	return true
}

// UpdateSegment updates the current progress of a specific segment.
func (ts *TaskState) UpdateSegment(index int, current int64, done bool) {
	ts.mu.Lock()
	defer ts.mu.Unlock()

	if index >= 0 && index < len(ts.Segments) {
		ts.Segments[index].Current = current
		ts.Segments[index].Done = done
		ts.UpdatedAt = time.Now()
	}
}

// Save writes the task state atomically to disk.
func (ts *TaskState) Save(destPath string) error {
	ts.mu.Lock()
	ts.UpdatedAt = time.Now()
	data, err := json.MarshalIndent(ts, "", "  ")
	ts.mu.Unlock()

	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	stateFile := StateFilePath(destPath)
	dir := filepath.Dir(stateFile)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory for state: %w", err)
	}

	// Atomic write via temp file
	tempFile := fmt.Sprintf("%s.%d.tmp", stateFile, time.Now().UnixNano())
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write temporary state file: %w", err)
	}

	// Rename temp file to target state file
	if err := os.Rename(tempFile, stateFile); err != nil {
		_ = os.Remove(tempFile)
		return fmt.Errorf("failed to commit state file: %w", err)
	}

	return nil
}

// LoadState reads and parses the state file for a target download path.
func LoadState(destPath string) (*TaskState, error) {
	stateFile := StateFilePath(destPath)
	data, err := os.ReadFile(stateFile)
	if err != nil {
		return nil, err
	}

	var state TaskState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("corrupt state file %s: %w", stateFile, err)
	}

	return &state, nil
}

// HasState checks if a state file exists for the given destination path.
func HasState(destPath string) bool {
	stateFile := StateFilePath(destPath)
	info, err := os.Stat(stateFile)
	return err == nil && !info.IsDir()
}

// RemoveState cleans up the state file upon download completion.
func RemoveState(destPath string) error {
	stateFile := StateFilePath(destPath)
	if err := os.Remove(stateFile); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
