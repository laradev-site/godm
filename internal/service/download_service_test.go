package service

import (
	"testing"
)

func TestGetCategory(t *testing.T) {
	svc := &DownloadService{}

	tests := []struct {
		filename string
		expected string
	}{
		{"archive.zip", CategoryCompressed},
		{"backup.tar.gz", CategoryCompressed},
		{"installer.exe", CategoryPrograms},
		{"package.deb", CategoryPrograms},
		{"song.mp3", CategoryMusic},
		{"album.flac", CategoryMusic},
		{"movie.mp4", CategoryVideo},
		{"clip.webm", CategoryVideo},
		{"document.pdf", CategoryDocuments},
		{"notes.md", CategoryDocuments},
		{"unknown.dat", CategoryGeneral},
		{"no_extension", CategoryGeneral},
	}

	for _, tt := range tests {
		got := svc.GetCategory(tt.filename)
		if got != tt.expected {
			t.Errorf("GetCategory(%q) = %q; want %q", tt.filename, got, tt.expected)
		}
	}
}

func TestVideoSegments(t *testing.T) {
	segs := makeVideoSegments(16)
	if len(segs) != 16 {
		t.Fatalf("expected 16 segments, got %d", len(segs))
	}

	// Initial state: none done
	for i, s := range segs {
		if s.Done {
			t.Errorf("segment %d initially marked as done", i)
		}
	}

	// At 50% progress, exactly 8 segments should be complete
	updateVideoSegments(segs, 50.0)
	for i := 0; i < 8; i++ {
		if !segs[i].Done {
			t.Errorf("segment %d expected done at 50%%", i)
		}
	}
	for i := 9; i < 16; i++ {
		if segs[i].Done {
			t.Errorf("segment %d should not be done at 50%%", i)
		}
	}

	// At 100% progress, all segments should be complete
	updateVideoSegments(segs, 100.0)
	for i, s := range segs {
		if !s.Done {
			t.Errorf("segment %d should be done at 100%%", i)
		}
	}
}

func TestIsVideoURL(t *testing.T) {
	svc := &DownloadService{}

	if !svc.IsVideoURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ") {
		t.Errorf("expected YouTube URL to be recognized as video")
	}
	if !svc.IsVideoURL("https://youtu.be/jNQXAC9IVRw") {
		t.Errorf("expected youtu.be URL to be recognized as video")
	}
	if svc.IsVideoURL("https://example.com/archive.zip") {
		t.Errorf("expected zip file URL to not be recognized as video")
	}
}
