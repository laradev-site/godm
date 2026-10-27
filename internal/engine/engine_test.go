package engine

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"godm/pkg/config"
)

func TestEngineDownloadEndToEnd(t *testing.T) {
	// Generate 5MB of test payload
	testSize := 5 * 1024 * 1024
	testData := make([]byte, testSize)
	for i := 0; i < testSize; i++ {
		testData[i] = byte(i % 256)
	}

	// Mock HTTP server supporting Range requests
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Accept-Ranges", "bytes")
		w.Header().Set("ETag", `"test-etag-12345"`)
		w.Header().Set("Content-Disposition", `attachment; filename="test_payload.bin"`)

		rangeHdr := r.Header.Get("Range")
		if rangeHdr == "" {
			w.Header().Set("Content-Length", strconv.Itoa(testSize))
			if r.Method == http.MethodHead {
				w.WriteHeader(http.StatusOK)
				return
			}
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(testData)
			return
		}

		// Handle Range: bytes=start-end
		if !strings.HasPrefix(rangeHdr, "bytes=") {
			http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
			return
		}

		parts := strings.Split(strings.TrimPrefix(rangeHdr, "bytes="), "-")
		start, _ := strconv.Atoi(parts[0])
		end := testSize - 1
		if len(parts) > 1 && parts[1] != "" {
			end, _ = strconv.Atoi(parts[1])
		}

		if start > end || start >= testSize {
			w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", testSize))
			http.Error(w, "range not satisfiable", http.StatusRequestedRangeNotSatisfiable)
			return
		}

		chunkLength := end - start + 1
		w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, testSize))
		w.Header().Set("Content-Length", strconv.Itoa(chunkLength))
		w.WriteHeader(http.StatusPartialContent)

		if r.Method != http.MethodHead {
			_, _ = w.Write(testData[start : end+1])
		}
	}))
	defer server.Close()

	tempDir, err := os.MkdirTemp("", "godm-integration-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	cfg := config.NewDefaultConfig()
	cfg.URL = server.URL + "/files/download"
	cfg.OutputDir = tempDir
	cfg.Connections = 4
	cfg.MinChunkSize = 256 * 1024 // 256KB min chunk
	cfg.Quiet = true
	cfg.Timeout = 10 * time.Second

	eng := NewEngine(cfg)
	ctx := context.Background()

	if err := eng.Execute(ctx); err != nil {
		t.Fatalf("engine execute failed: %v", err)
	}

	destFile := filepath.Join(tempDir, "test_payload.bin")
	downloadedData, err := os.ReadFile(destFile)
	if err != nil {
		t.Fatalf("failed to read downloaded file: %v", err)
	}

	if len(downloadedData) != testSize {
		t.Fatalf("size mismatch: expected %d bytes, got %d", testSize, len(downloadedData))
	}

	if !bytes.Equal(downloadedData, testData) {
		t.Fatalf("downloaded data does not match original data")
	}
}
