package storage

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// FileWriter wraps an os.File for high-performance concurrent random-access writes.
// All segments write directly to their respective byte offsets via WriteAt,
// eliminating the need to create separate temporary files and stitch them together.
type FileWriter struct {
	mu   sync.Mutex
	file *os.File
	path string
	size int64
}

// OpenFileWriter initializes or re-opens a target file for writing.
// If totalSize > 0, it pre-allocates / truncates the file to totalSize so that
// random writes at any offset succeed without file fragmentation.
func OpenFileWriter(destPath string, totalSize int64, isResume bool) (*FileWriter, error) {
	dir := filepath.Dir(destPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create directory %s: %w", dir, err)
	}

	flags := os.O_CREATE | os.O_RDWR
	file, err := os.OpenFile(destPath, flags, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open destination file %s: %w", destPath, err)
	}

	if totalSize > 0 {
		info, statErr := file.Stat()
		if statErr == nil {
			if !isResume || info.Size() != totalSize {
				// Pre-allocate / set the file size
				if err := file.Truncate(totalSize); err != nil {
					_ = file.Close()
					return nil, fmt.Errorf("failed to preallocate file to %d bytes: %w", totalSize, err)
				}
			}
		}
	}

	return &FileWriter{
		file: file,
		path: destPath,
		size: totalSize,
	}, nil
}

// WriteAt writes p to the file starting at byte offset off.
// WriteAt is concurrent-safe because offset is explicit per call.
func (w *FileWriter) WriteAt(p []byte, off int64) (int, error) {
	return w.file.WriteAt(p, off)
}

// Sync commits the current contents of the file to stable storage.
func (w *FileWriter) Sync() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file != nil {
		return w.file.Sync()
	}
	return nil
}

// Close flushes and closes the underlying file.
func (w *FileWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file != nil {
		err := w.file.Close()
		w.file = nil
		return err
	}
	return nil
}

// Path returns the path of the target file.
func (w *FileWriter) Path() string {
	return w.path
}
