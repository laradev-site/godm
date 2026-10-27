package ui

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"godm/internal/storage"
)

// ProgressTracker tracks and renders live download speed, ETA, and per-segment status.
type ProgressTracker struct {
	mu           sync.Mutex
	totalSize    int64
	initialBytes int64
	startTime    time.Time
	lastTime     time.Time
	lastBytes    int64
	currentSpeed float64 // bytes per second
	quiet        bool
}

// NewProgressTracker creates a new progress tracker.
func NewProgressTracker(totalSize, initialBytes int64, quiet bool) *ProgressTracker {
	now := time.Now()
	return &ProgressTracker{
		totalSize:    totalSize,
		initialBytes: initialBytes,
		startTime:    now,
		lastTime:     now,
		lastBytes:    initialBytes,
		quiet:        quiet,
	}
}

// Update calculates speed and prints progress.
func (pt *ProgressTracker) Update(state *storage.TaskState) {
	if pt.quiet {
		return
	}

	pt.mu.Lock()
	defer pt.mu.Unlock()

	now := time.Now()
	downloaded := state.TotalDownloaded()

	elapsedSinceLast := now.Sub(pt.lastTime).Seconds()
	if elapsedSinceLast >= 0.25 { // update speed calculation every 250ms
		deltaBytes := downloaded - pt.lastBytes
		if deltaBytes < 0 {
			deltaBytes = 0
		}
		instantSpeed := float64(deltaBytes) / elapsedSinceLast
		if pt.currentSpeed == 0 {
			pt.currentSpeed = instantSpeed
		} else {
			// Exponential moving average for smooth speed display
			pt.currentSpeed = 0.7*pt.currentSpeed + 0.3*instantSpeed
		}
		pt.lastBytes = downloaded
		pt.lastTime = now
	}

	// Calculate percentage
	var percent float64
	if pt.totalSize > 0 {
		percent = (float64(downloaded) / float64(pt.totalSize)) * 100
		if percent > 100 {
			percent = 100
		}
	}

	// Calculate ETA
	etaStr := "--:--:--"
	if pt.totalSize > 0 && pt.currentSpeed > 0 {
		remaining := pt.totalSize - downloaded
		if remaining > 0 {
			secs := int(float64(remaining) / pt.currentSpeed)
			etaStr = formatDuration(time.Duration(secs) * time.Second)
		} else {
			etaStr = "00:00:00"
		}
	}

	// Progress bar
	barWidth := 25
	filled := 0
	if pt.totalSize > 0 {
		filled = int((percent / 100.0) * float64(barWidth))
	}
	if filled > barWidth {
		filled = barWidth
	}
	bar := strings.Repeat("=", filled)
	if filled < barWidth {
		bar += ">" + strings.Repeat(" ", barWidth-filled-1)
	}

	// Summary string
	var sizeInfo string
	if pt.totalSize > 0 {
		sizeInfo = fmt.Sprintf("%s / %s (%.1f%%)", FormatBytes(downloaded), FormatBytes(pt.totalSize), percent)
	} else {
		sizeInfo = FormatBytes(downloaded)
	}

	speedInfo := fmt.Sprintf("%s/s", FormatBytes(int64(pt.currentSpeed)))

	// Build segment mini-status
	var segStatus strings.Builder
	segs := state.SegmentsSnapshot()
	conns := len(segs)
	if conns > 1 && conns <= 16 {
		segStatus.WriteString(" | [")
		for i, s := range segs {
			p := 0
			if s.Done {
				p = 100
			} else if s.Total() > 0 {
				p = int((float64(s.Downloaded()) / float64(s.Total())) * 100)
			}
			if i > 0 {
				segStatus.WriteString(" ")
			}
			segStatus.WriteString(fmt.Sprintf("C%d:%d%%", i+1, p))
		}
		segStatus.WriteString("]")
	}

	// Carriage return overwrite line
	fmt.Printf("\r[%s] %s | %s | ETA: %s%s   ", bar, sizeInfo, speedInfo, etaStr, segStatus.String())
}

// Finish prints the completion message.
func (pt *ProgressTracker) Finish(totalDownloaded int64) {
	if pt.quiet {
		return
	}
	elapsed := time.Since(pt.startTime)
	avgSpeed := float64(totalDownloaded-pt.initialBytes) / elapsed.Seconds()
	if avgSpeed < 0 {
		avgSpeed = 0
	}

	fmt.Printf("\nDone! Downloaded %s in %s (Avg %s/s)\n",
		FormatBytes(totalDownloaded),
		formatDuration(elapsed),
		FormatBytes(int64(avgSpeed)),
	)
}

// FormatBytes formats byte counts into human-readable strings (KB, MB, GB).
func FormatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.2f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}

func formatDuration(d time.Duration) string {
	d = d.Round(time.Second)
	h := d / time.Hour
	d -= h * time.Hour
	m := d / time.Minute
	d -= m * time.Minute
	s := d / time.Second
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}
