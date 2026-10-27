package media

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// MediaFormat represents a downloadable resolution or audio stream.
type MediaFormat struct {
	FormatID    string `json:"formatId"`
	Resolution  string `json:"resolution"`
	Ext         string `json:"ext"`
	Filesize    int64  `json:"filesize"`
	Label       string `json:"label"`
	IsAudioOnly bool   `json:"isAudioOnly"`
}

// MediaInfo contains metadata extracted from a video platform URL.
type MediaInfo struct {
	ID        string        `json:"id"`
	URL       string        `json:"url"`
	Title     string        `json:"title"`
	Thumbnail string        `json:"thumbnail"`
	Duration  string        `json:"duration"`
	Uploader  string        `json:"uploader"`
	Platform  string        `json:"platform"`
	Formats   []MediaFormat `json:"formats"`
}

// MediaProgress represents real-time progress of a video download.
type MediaProgress struct {
	Percent    float64 `json:"percent"`
	Speed      float64 `json:"speed"` // bytes/sec
	ETA        string  `json:"eta"`
	Downloaded int64   `json:"downloaded"`
	Total      int64   `json:"total"`
}

var videoPlatformPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)(?:youtube\.com|youtu\.be)`),
	regexp.MustCompile(`(?i)tiktok\.com`),
	regexp.MustCompile(`(?i)instagram\.com`),
	regexp.MustCompile(`(?i)(?:twitter\.com|x\.com)`),
	regexp.MustCompile(`(?i)facebook\.com|fb\.watch`),
	regexp.MustCompile(`(?i)reddit\.com`),
	regexp.MustCompile(`(?i)vimeo\.com`),
	regexp.MustCompile(`(?i)twitch\.tv`),
	regexp.MustCompile(`(?i)dailymotion\.com`),
	regexp.MustCompile(`(?i)bilibili\.com`),
}

// IsVideoPlatform returns true if the URL matches popular video platform domains.
func IsVideoPlatform(rawURL string) bool {
	for _, p := range videoPlatformPatterns {
		if p.MatchString(rawURL) {
			return true
		}
	}
	return false
}

// GetBinaryPath finds yt-dlp.exe in local tools, AppData, or PATH.
func GetBinaryPath() string {
	// 1. Check local tools folder in current/project dir
	localTools := filepath.Join(".", "tools", "yt-dlp.exe")
	if _, err := os.Stat(localTools); err == nil {
		abs, err := filepath.Abs(localTools)
		if err == nil {
			return abs
		}
		return localTools
	}

	// 2. Check exe dir/tools
	if exePath, err := os.Executable(); err == nil {
		sibling := filepath.Join(filepath.Dir(exePath), "tools", "yt-dlp.exe")
		if _, err := os.Stat(sibling); err == nil {
			return sibling
		}
	}

	// 3. Check AppData/godm/tools
	if appData, err := os.UserConfigDir(); err == nil {
		appDataPath := filepath.Join(appData, "godm", "tools", "yt-dlp.exe")
		if _, err := os.Stat(appDataPath); err == nil {
			return appDataPath
		}
	}

	// 4. Check system PATH
	if path, err := exec.LookPath("yt-dlp"); err == nil {
		return path
	}

	return ""
}

// EnsureEngine verifies that yt-dlp is installed, downloading it if necessary.
func EnsureEngine(progressCb func(pct float64)) (string, error) {
	existing := GetBinaryPath()
	if existing != "" {
		return existing, nil
	}

	// Download to local tools directory
	targetDir := filepath.Join(".", "tools")
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create tools dir: %w", err)
	}

	targetPath := filepath.Join(targetDir, "yt-dlp.exe")
	downloadURL := "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

	resp, err := http.Get(downloadURL)
	if err != nil {
		return "", fmt.Errorf("failed to download yt-dlp engine: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("bad status %d downloading yt-dlp", resp.StatusCode)
	}

	out, err := os.OpenFile(targetPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
	if err != nil {
		return "", err
	}
	defer out.Close()

	total := resp.ContentLength
	var downloaded int64
	buf := make([]byte, 64*1024)

	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := out.Write(buf[:n]); writeErr != nil {
				return "", writeErr
			}
			downloaded += int64(n)
			if total > 0 && progressCb != nil {
				progressCb((float64(downloaded) / float64(total)) * 100)
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			return "", readErr
		}
	}

	abs, _ := filepath.Abs(targetPath)
	return abs, nil
}

// RawYTDLPOutput is a partial representation of yt-dlp --dump-json output.
type RawYTDLPOutput struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Thumbnail   string `json:"thumbnail"`
	Duration    int    `json:"duration"`
	Uploader    string `json:"uploader"`
	Extractor   string `json:"extractor_key"`
	Description string `json:"description"`
	Formats     []struct {
		FormatID   string  `json:"format_id"`
		Resolution string  `json:"resolution"`
		Height     int     `json:"height"`
		Ext        string  `json:"ext"`
		Filesize   int64   `json:"filesize"`
		FilesizeAp int64   `json:"filesize_approx"`
		VCodec     string  `json:"vcodec"`
		ACodec     string  `json:"acodec"`
		TBR        float64 `json:"tbr"`
		FormatNote string  `json:"format_note"`
	} `json:"formats"`
}

// InspectMedia queries yt-dlp for video metadata and available qualities.
func InspectMedia(ctx context.Context, mediaURL string) (*MediaInfo, error) {
	binPath := GetBinaryPath()
	if binPath == "" {
		var err error
		binPath, err = EnsureEngine(nil)
		if err != nil {
			return nil, fmt.Errorf("media engine not available: %w", err)
		}
	}

	cmd := exec.CommandContext(ctx, binPath, "--dump-json", "--no-playlist", "--no-warnings", mediaURL)
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("media inspection failed: %w", err)
	}

	var raw RawYTDLPOutput
	if err := json.Unmarshal(out, &raw); err != nil {
		return nil, fmt.Errorf("failed to parse media metadata: %w", err)
	}

	info := &MediaInfo{
		ID:        raw.ID,
		URL:       mediaURL,
		Title:     raw.Title,
		Thumbnail: raw.Thumbnail,
		Uploader:  raw.Uploader,
		Platform:  raw.Extractor,
		Duration:  formatSeconds(raw.Duration),
		Formats:   make([]MediaFormat, 0),
	}

	// Filter and format friendly resolutions (e.g. 1080p, 720p, 480p, Audio)
	seenRes := make(map[string]bool)

	// Add pre-defined standard options
	info.Formats = append(info.Formats, MediaFormat{
		FormatID:    "bestvideo+bestaudio/best",
		Resolution:  "Best Quality",
		Ext:         "mp4",
		Label:       "Best Available (Max Quality)",
		IsAudioOnly: false,
	})

	for i := len(raw.Formats) - 1; i >= 0; i-- {
		f := raw.Formats[i]
		if f.VCodec != "none" && f.Height >= 360 {
			resLabel := fmt.Sprintf("%dp", f.Height)
			if !seenRes[resLabel] {
				seenRes[resLabel] = true
				sz := f.Filesize
				if sz <= 0 {
					sz = f.FilesizeAp
				}

				label := fmt.Sprintf("%s (%s)", resLabel, strings.ToUpper(f.Ext))
				info.Formats = append(info.Formats, MediaFormat{
					FormatID:    fmt.Sprintf("bestvideo[height<=%d]+bestaudio/best[height<=%d]", f.Height, f.Height),
					Resolution:  resLabel,
					Ext:         "mp4",
					Filesize:    sz,
					Label:       label,
					IsAudioOnly: false,
				})
			}
		}
	}

	// Audio only option
	info.Formats = append(info.Formats, MediaFormat{
		FormatID:    "bestaudio/best",
		Resolution:  "Audio Only",
		Ext:         "mp3",
		Label:       "Audio Only (MP3/M4A)",
		IsAudioOnly: true,
	})

	return info, nil
}

// DownloadMedia streams and downloads video via yt-dlp with real-time progress callbacks.
func DownloadMedia(
	ctx context.Context,
	mediaURL string,
	formatID string,
	outputDir string,
	customFilename string,
	progressCb func(p MediaProgress),
) error {
	binPath := GetBinaryPath()
	if binPath == "" {
		return errors.New("media engine yt-dlp is not available")
	}

	if formatID == "" {
		formatID = "bestvideo+bestaudio/best"
	}

	outTemplate := filepath.Join(outputDir, "%(title)s.%(ext)s")
	if customFilename != "" {
		outTemplate = filepath.Join(outputDir, customFilename)
	}

	args := []string{
		"-f", formatID,
		"--no-playlist",
		"--newline",
		"--progress-template", "%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s",
		"-N", "16", // 16 concurrent fragments for IDM-speed streaming downloads!
		"--buffer-size", "1024k",
		"--http-chunk-size", "10M",
		"--retries", "10",
		"--fragment-retries", "10",
		"-c", // Automatically continue/resume partially downloaded files
		"-o", outTemplate,
		mediaURL,
	}

	cmd := exec.CommandContext(ctx, binPath, args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		return err
	}

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.Contains(line, "|") {
			parts := strings.Split(line, "|")
			if len(parts) >= 3 {
				pctStr := strings.TrimSpace(strings.ReplaceAll(parts[0], "%", ""))
				pct, _ := strconv.ParseFloat(pctStr, 64)

				speedStr := strings.TrimSpace(parts[1])
				etaStr := strings.TrimSpace(parts[2])

				var downloaded int64
				var total int64
				if len(parts) >= 4 {
					downloaded, _ = strconv.ParseInt(strings.TrimSpace(parts[3]), 10, 64)
				}
				if len(parts) >= 5 {
					total, _ = strconv.ParseInt(strings.TrimSpace(parts[4]), 10, 64)
				}

				if progressCb != nil {
					progressCb(MediaProgress{
						Percent:    pct,
						Speed:      parseSpeed(speedStr),
						ETA:        etaStr,
						Downloaded: downloaded,
						Total:      total,
					})
				}
			}
		}
	}

	return cmd.Wait()
}

func parseSpeed(speedStr string) float64 {
	// e.g. "15.4MiB/s" or "800KiB/s"
	speedStr = strings.ToLower(speedStr)
	if strings.Contains(speedStr, "mib/s") || strings.Contains(speedStr, "mb/s") {
		valStr := strings.TrimSuffix(strings.TrimSuffix(speedStr, "mib/s"), "mb/s")
		val, _ := strconv.ParseFloat(strings.TrimSpace(valStr), 64)
		return val * 1024 * 1024
	}
	if strings.Contains(speedStr, "kib/s") || strings.Contains(speedStr, "kb/s") {
		valStr := strings.TrimSuffix(strings.TrimSuffix(speedStr, "kib/s"), "kb/s")
		val, _ := strconv.ParseFloat(strings.TrimSpace(valStr), 64)
		return val * 1024
	}
	return 0
}

func formatSeconds(sec int) string {
	if sec <= 0 {
		return "--:--"
	}
	m := sec / 60
	s := sec % 60
	if m >= 60 {
		h := m / 60
		m = m % 60
		return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%02d:%02d", m, s)
}
