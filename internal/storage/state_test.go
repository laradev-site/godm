package storage

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStatePersistence(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "godm-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	testFilePath := filepath.Join(tempDir, "testfile.dat")

	// Create new state
	state := NewTaskState("https://example.com/file.dat", "testfile.dat", 1024, true, "etag-123", "")
	state.Segments = []SegmentState{
		{Index: 0, Start: 0, End: 511, Current: 256, Done: false},
		{Index: 1, Start: 512, End: 1023, Current: 1024, Done: true},
	}

	// Verify TotalDownloaded
	if dl := state.TotalDownloaded(); dl != 256+512 {
		t.Errorf("expected downloaded bytes %d, got %d", 256+512, dl)
	}

	// Save state
	if err := state.Save(testFilePath); err != nil {
		t.Fatalf("failed to save state: %v", err)
	}

	if !HasState(testFilePath) {
		t.Fatalf("expected state file to exist")
	}

	// Load state
	loaded, err := LoadState(testFilePath)
	if err != nil {
		t.Fatalf("failed to load state: %v", err)
	}

	if loaded.URL != state.URL {
		t.Errorf("expected URL %s, got %s", state.URL, loaded.URL)
	}
	if loaded.TotalSize != state.TotalSize {
		t.Errorf("expected TotalSize %d, got %d", state.TotalSize, loaded.TotalSize)
	}
	if len(loaded.Segments) != 2 {
		t.Fatalf("expected 2 segments, got %d", len(loaded.Segments))
	}
	if loaded.Segments[0].Current != 256 {
		t.Errorf("expected segment 0 current 256, got %d", loaded.Segments[0].Current)
	}

	// Update segment to complete
	state.UpdateSegment(0, 512, true)
	if !state.IsComplete() {
		t.Errorf("expected state to be complete")
	}

	// Clean state
	if err := RemoveState(testFilePath); err != nil {
		t.Fatalf("failed to remove state: %v", err)
	}
	if HasState(testFilePath) {
		t.Errorf("expected state file to be removed")
	}
}
