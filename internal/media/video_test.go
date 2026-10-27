package media

import (
	"encoding/json"
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
