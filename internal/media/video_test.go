package media

import (
	"encoding/json"
	"math"
	"testing"
)

func TestUnmarshalFloatDuration(t *testing.T) {
	sampleJSON := []byte(`{
		"id": "1015206624938375",
		"title": "Facebook Reel Sample",
		"duration": 51.0,
		"extractor_key": "facebook",
		"formats": [
			{
				"format_id": "hd",
				"height": 720.0,
				"ext": "mp4",
				"vcodec": "av01",
				"acodec": "mp4a",
				"filesize": 15420000.0
			}
		]
	}`)

	var raw RawYTDLPOutput
	if err := json.Unmarshal(sampleJSON, &raw); err != nil {
		t.Fatalf("failed to unmarshal JSON with float values: %v", err)
	}

	if raw.Duration != 51.0 {
		t.Errorf("expected duration 51.0, got %f", raw.Duration)
	}
	if len(raw.Formats) != 1 || raw.Formats[0].Height != 720.0 {
		t.Errorf("expected format height 720.0, got %v", raw.Formats)
	}
}

func TestIsVideoPlatform(t *testing.T) {
	tests := []struct {
		url      string
		expected bool
	}{
		{"https://www.youtube.com/watch?v=dQw4w9WgXcQ", true},
		{"https://youtu.be/jNQXAC9IVRw", true},
		{"https://m.youtube.com/shorts/abcdef123", true},
		{"https://www.tiktok.com/@user/video/1234567890", true},
		{"https://www.instagram.com/reel/C-xyz123/", true},
		{"https://twitter.com/i/status/123456789", true},
		{"https://x.com/user/status/987654321", true},
		{"https://www.facebook.com/watch/?v=12345", true},
		{"https://fb.watch/xyz123/", true},
		{"https://vimeo.com/12345678", true},
		{"https://reddit.com/r/videos/comments/xyz/", true},
		{"https://example.com/file.zip", false},
		{"https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.1.tar.xz", false},
		{"http://127.0.0.1:8080/download/document.pdf", false},
	}

	for _, tt := range tests {
		got := IsVideoPlatform(tt.url)
		if got != tt.expected {
			t.Errorf("IsVideoPlatform(%q) = %v; want %v", tt.url, got, tt.expected)
		}
	}
}

func TestSanitizeFilename(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			input:    "Rick Astley - Never Gonna Give You Up (Official Music Video) [4K] | Remastered",
			expected: "Rick Astley - Never Gonna Give You Up (Official Music Video) [4K] _ Remastered",
		},
		{
			input:    "Can you code this?: Top 10 Tips <Guide> *Must Watch*",
			expected: "Can you code this?_ Top 10 Tips _Guide_ _Must Watch_",
		},
		{
			input:    "File/With\\Slashes:And*Wildcards?In\"Quotes\"<And>|Pipes",
			expected: "File_With_Slashes_And_Wildcards_In_Quotes_And_Pipes",
		},
		{
			input:    "   Trimmed Title.   ",
			expected: "Trimmed Title",
		},
		{
			input:    "???",
			expected: "_",
		},
		{
			input:    "",
			expected: "video",
		},
		{
			input:    "...",
			expected: "video",
		},
	}

	for _, tt := range tests {
		got := SanitizeFilename(tt.input)
		// Verify that none of the Windows illegal characters (\ / : * " < > |) remain
		for _, ch := range []rune{'\\', '/', ':', '*', '"', '<', '>', '|'} {
			for _, r := range got {
				if r == ch {
					t.Errorf("SanitizeFilename(%q) = %q still contains illegal character %q", tt.input, got, string(ch))
				}
			}
		}
		if got == "" {
			t.Errorf("SanitizeFilename(%q) returned empty string", tt.input)
		}
	}
}

func TestParseSpeed(t *testing.T) {
	tests := []struct {
		input    string
		expected float64
	}{
		{"15.4MiB/s", 15.4 * 1024 * 1024},
		{"800KiB/s", 800 * 1024},
		{"1.5GiB/s", 1.5 * 1024 * 1024 * 1024},
		{"~2.5 MB/s", 2.5 * 1024 * 1024},
		{"500 B/s", 500},
		{"0 B/s", 0},
		{"", 0},
		{"unknown", 0},
	}

	for _, tt := range tests {
		got := parseSpeed(tt.input)
		if math.Abs(got-tt.expected) > 1.0 {
			t.Errorf("parseSpeed(%q) = %f; want %f", tt.input, got, tt.expected)
		}
	}
}

func TestFormatSeconds(t *testing.T) {
	tests := []struct {
		input    float64
		expected string
	}{
		{0, "--:--"},
		{-10, "--:--"},
		{45, "00:45"},
		{213, "03:33"},
		{3600, "01:00:00"},
		{3665, "01:01:05"},
	}

	for _, tt := range tests {
		got := formatSeconds(tt.input)
		if got != tt.expected {
			t.Errorf("formatSeconds(%f) = %q; want %q", tt.input, got, tt.expected)
		}
	}
}
