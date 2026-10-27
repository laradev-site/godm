package segment

import (
	"godm/internal/storage"
)

// PlanSegments divides totalSize into optimal segments based on connections and minChunkSize.
func PlanSegments(totalSize int64, requestedConnections int, minChunkSize int64) []storage.SegmentState {
	// If size is unknown or non-positive, single stream
	if totalSize <= 0 {
		return []storage.SegmentState{
			{
				Index:   0,
				Start:   0,
				End:     -1, // Indicates indefinite / EOF stream
				Current: 0,
				Done:    false,
			},
		}
	}

	if requestedConnections <= 1 || (minChunkSize > 0 && totalSize < minChunkSize) {
		return []storage.SegmentState{
			{
				Index:   0,
				Start:   0,
				End:     totalSize - 1,
				Current: 0,
				Done:    false,
			},
		}
	}

	// Calculate maximum viable connections given minChunkSize
	conns := requestedConnections
	if minChunkSize > 0 {
		maxPossible := int(totalSize / minChunkSize)
		if maxPossible < 1 {
			maxPossible = 1
		}
		if conns > maxPossible {
			conns = maxPossible
		}
	}

	chunkSize := totalSize / int64(conns)
	segments := make([]storage.SegmentState, conns)

	for i := 0; i < conns; i++ {
		start := int64(i) * chunkSize
		var end int64
		if i == conns-1 {
			// Last segment absorbs any remainder bytes
			end = totalSize - 1
		} else {
			end = start + chunkSize - 1
		}

		segments[i] = storage.SegmentState{
			Index:   i,
			Start:   start,
			End:     end,
			Current: start,
			Done:    false,
		}
	}

	return segments
}
