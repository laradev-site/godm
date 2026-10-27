package segment

import (
	"testing"
)

func TestPlanSegments(t *testing.T) {
	tests := []struct {
		name          string
		totalSize     int64
		conns         int
		minChunk      int64
		expectedLen   int
		expectValid   bool
	}{
		{
			name:        "Unknown size",
			totalSize:   -1,
			conns:       8,
			minChunk:    1024,
			expectedLen: 1,
			expectValid: true,
		},
		{
			name:        "Single connection requested",
			totalSize:   10000,
			conns:       1,
			minChunk:    1024,
			expectedLen: 1,
			expectValid: true,
		},
		{
			name:        "Even division",
			totalSize:   1000,
			conns:       4,
			minChunk:    100,
			expectedLen: 4,
			expectValid: true,
		},
		{
			name:        "Uneven division with remainder",
			totalSize:   1003,
			conns:       4,
			minChunk:    100,
			expectedLen: 4,
			expectValid: true,
		},
		{
			name:        "File smaller than minChunkSize",
			totalSize:   500,
			conns:       8,
			minChunk:    1000,
			expectedLen: 1,
			expectValid: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			segs := PlanSegments(tc.totalSize, tc.conns, tc.minChunk)
			if len(segs) != tc.expectedLen {
				t.Fatalf("expected %d segments, got %d", tc.expectedLen, len(segs))
			}

			if tc.totalSize > 0 {
				// Verify segment continuity
				var lastEnd int64 = -1
				for i, s := range segs {
					if i == 0 && s.Start != 0 {
						t.Errorf("first segment should start at 0, got %d", s.Start)
					}
					if i > 0 && s.Start != lastEnd+1 {
						t.Errorf("segment %d start (%d) doesn't follow previous end (%d)", i, s.Start, lastEnd)
					}
					if s.End < s.Start {
						t.Errorf("segment %d end (%d) < start (%d)", i, s.End, s.Start)
					}
					lastEnd = s.End
				}
				if lastEnd != tc.totalSize-1 {
					t.Errorf("last segment end (%d) does not match totalSize - 1 (%d)", lastEnd, tc.totalSize-1)
				}
			}
		})
	}
}
