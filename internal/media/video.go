package media

import (
	"bufio"
	"bytes"
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
	"runtime"
	"strconv"
	"strings"
	"time"

	"godm/internal/storage"
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

// GetBinaryPath finds yt-dlp (or yt-dlp.exe on Windows) in local tools, config dir, or PATH.
func GetBinaryPath() string {
	binName := "yt-dlp"
	if runtime.GOOS == "windows" {
		binName = "yt-dlp.exe"
	}

	// 1. Check local tools folder in current/project dir
	localTools := filepath.Join(".", "tools", binName)
	if _, err := os.Stat(localTools); err == nil {
		abs, err := filepath.Abs(localTools)
		if err == nil {
			return abs
		}
		return localTools
	}

	// 2. Check exe dir/tools
	if exePath, err := os.Executable(); err == nil {
		sibling := filepath.Join(filepath.Dir(exePath), "tools", binName)
		if _, err := os.Stat(sibling); err == nil {
			return sibling
		}
	}

	// 3. Check AppData/Config/godm/tools
	if appData, err := os.UserConfigDir(); err == nil {
		appDataPath := filepath.Join(appData, "godm", "tools", binName)
		if _, err := os.Stat(appDataPath); err == nil {
			return appDataPath
		}
	}

	// 4. On Linux, check common system locations
	if runtime.GOOS != "windows" {
		for _, common := range []string{"/usr/local/bin/yt-dlp", "/usr/bin/yt-dlp", "/usr/share/godm/tools/yt-dlp"} {
			if _, err := os.Stat(common); err == nil {
				return common
			}
		}
	}

	// 5. Check system PATH
	if path, err := exec.LookPath(binName); err == nil {
		return path
	}

	return ""
}

// GetFFmpegPath searches for ffmpeg in local tools, next to executable, AppData, common system locations, and PATH.
func GetFFmpegPath() string {
	binName := "ffmpeg"
	if runtime.GOOS == "windows" {
		binName = "ffmpeg.exe"
	}

	// 1. Local tools folder in current/project dir
	localTools := filepath.Join(".", "tools", binName)
	if _, err := os.Stat(localTools); err == nil {
		if abs, err := filepath.Abs(localTools); err == nil {
			return abs
		}
		return localTools
	}

	// 2. Sibling in exe dir / tools
	if exePath, err := os.Executable(); err == nil {
		dir := filepath.Dir(exePath)
		sibling := filepath.Join(dir, "tools", binName)
		if _, err := os.Stat(sibling); err == nil {
			return sibling
		}
		nextToExe := filepath.Join(dir, binName)
		if _, err := os.Stat(nextToExe); err == nil {
			return nextToExe
		}
	}

	// 3. AppData / UserConfigDir
	if appData, err := os.UserConfigDir(); err == nil {
		appDataPath := filepath.Join(appData, "godm", "tools", binName)
		if _, err := os.Stat(appDataPath); err == nil {
			return appDataPath
		}
	}

	// 4. Common OS locations
	if runtime.GOOS == "windows" {
		commonPaths := []string{
			`C:\Program Files\ShareX\ffmpeg.exe`,
			`C:\ffmpeg\bin\ffmpeg.exe`,
			`C:\Program Files\ffmpeg\bin\ffmpeg.exe`,
			`C:\ProgramData\chocolatey\bin\ffmpeg.exe`,
			`C:\tools\ffmpeg\bin\ffmpeg.exe`,
			filepath.Join(os.Getenv("LOCALAPPDATA"), "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
		}
		for _, p := range commonPaths {
			if _, err := os.Stat(p); err == nil {
				return p
			}
		}
	} else {
		for _, common := range []string{"/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/share/godm/tools/ffmpeg"} {
			if _, err := os.Stat(common); err == nil {
				return common
			}
		}
	}

	// 5. System PATH
	if path, err := exec.LookPath(binName); err == nil {
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

	binName := "yt-dlp"
	downloadURL := "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
	if runtime.GOOS == "windows" {
		binName = "yt-dlp.exe"
		downloadURL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
	} else if runtime.GOOS == "darwin" {
		downloadURL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
	}

	// Download to local tools directory
	targetDir := filepath.Join(".", "tools")
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create tools dir: %w", err)
	}

	targetPath := filepath.Join(targetDir, binName)

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

	_ = os.Chmod(targetPath, 0755)
	abs, _ := filepath.Abs(targetPath)
	return abs, nil
}

// RawYTDLPOutput is a partial representation of yt-dlp --dump-json output.
type RawYTDLPOutput struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Thumbnail   string  `json:"thumbnail"`
	Duration    float64 `json:"duration"`
	Uploader    string  `json:"uploader"`
	Extractor   string  `json:"extractor_key"`
	Description string  `json:"description"`
	Formats     []struct {
		FormatID   string  `json:"format_id"`
		Resolution string  `json:"resolution"`
		Height     float64 `json:"height"`
		Ext        string  `json:"ext"`
		Filesize   float64 `json:"filesize"`
		FilesizeAp float64 `json:"filesize_approx"`
		VCodec     string  `json:"vcodec"`
		ACodec     string  `json:"acodec"`
		TBR        float64 `json:"tbr"`
		FormatNote string  `json:"format_note"`
	} `json:"formats"`
}

// MediaOptions provides authentication, headers, and browser cookies for media inspection and download.
type MediaOptions struct {
	Cookies            string `json:"cookies,omitempty"`            // Raw Cookie header string
	CookieJar          string `json:"cookieJar,omitempty"`          // Netscape format cookie text
	CookieFile         string `json:"cookieFile,omitempty"`         // Path to existing cookies.txt
	CookiesFromBrowser string `json:"cookiesFromBrowser,omitempty"` // "chrome", "edge", "firefox", "brave", "opera", "vivaldi"
	UserAgent          string `json:"userAgent,omitempty"`
	Referer            string `json:"referer,omitempty"`
}

// buildAuthArgs resolves cookies, headers, and returns the extra CLI arguments and any temporary files to clean up.
func buildAuthArgs(mediaURL string, opts *MediaOptions) (args []string, cleanup func()) {
	var tempFiles []string
	cleanup = func() {
		for _, f := range tempFiles {
			_ = os.Remove(f)
		}
	}

	var cookieFilePath string
	var userAgent string
	var referer string
	var browserName string
	var rawCookieStr string

	if opts != nil {
		if opts.CookieFile != "" {
			cookieFilePath = opts.CookieFile
		} else if opts.CookieJar != "" {
			// Write temporary cookie file
			tFile := filepath.Join(os.TempDir(), fmt.Sprintf("godm_cookie_%d.txt", time.Now().UnixNano()))
			if err := os.WriteFile(tFile, []byte(opts.CookieJar), 0600); err == nil {
				cookieFilePath = tFile
				tempFiles = append(tempFiles, tFile)
			}
		}
		browserName = strings.TrimSpace(opts.CookiesFromBrowser)
		userAgent = strings.TrimSpace(opts.UserAgent)
		referer = strings.TrimSpace(opts.Referer)
		rawCookieStr = strings.TrimSpace(opts.Cookies)
	}

	// If no explicit cookie file was given, check storage for saved domain cookies
	if cookieFilePath == "" && browserName == "" {
		if path, found := storage.GetCookieFilePath(mediaURL); found {
			cookieFilePath = path
		}
	}

	// 1. Pass cookie file if available
	if cookieFilePath != "" {
		args = append(args, "--cookies", cookieFilePath)
	} else if browserName != "" {
		// 2. Pass --cookies-from-browser
		args = append(args, "--cookies-from-browser", browserName)
	} else if rawCookieStr != "" {
		// 3. Fallback raw cookie header
		args = append(args, "--add-header", fmt.Sprintf("Cookie: %s", rawCookieStr))
	}

	// Add User-Agent if provided
	if userAgent != "" {
		args = append(args, "--user-agent", userAgent)
	}

	// Add Referer if provided
	if referer != "" {
		args = append(args, "--add-header", fmt.Sprintf("Referer: %s", referer))
	}

	return args, cleanup
}

// InspectMedia queries yt-dlp for video metadata and available qualities.
func InspectMedia(ctx context.Context, mediaURL string) (*MediaInfo, error) {
	return InspectMediaWithOptions(ctx, mediaURL, nil)
}

// InspectMediaWithOptions queries yt-dlp for video metadata with optional authentication.
func InspectMediaWithOptions(ctx context.Context, mediaURL string, opts *MediaOptions) (*MediaInfo, error) {
	binPath := GetBinaryPath()
	if binPath == "" {
		var err error
		binPath, err = EnsureEngine(nil)
		if err != nil {
			return nil, fmt.Errorf("media engine not available: %w", err)
		}
	}

	authArgs, cleanup := buildAuthArgs(mediaURL, opts)
	defer cleanup()

	args := []string{"--dump-json", "--no-playlist", "--no-warnings"}
	args = append(args, authArgs...)
	args = append(args, mediaURL)

	cmd := exec.CommandContext(ctx, binPath, args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		errStr := strings.TrimSpace(stderr.String())
		if strings.Contains(errStr, "Cannot parse data") || strings.Contains(errStr, "login") || strings.Contains(errStr, "private") || strings.Contains(errStr, "Private") {
			return nil, fmt.Errorf("this video appears to be private or requires login. Please open it with the godm browser extension or import cookies: %s", errStr)
		}
		if errStr != "" {
			return nil, fmt.Errorf("media inspection failed: %s", errStr)
		}
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
		hInt := int(f.Height)
		if f.VCodec != "none" && hInt >= 360 {
			resLabel := fmt.Sprintf("%dp", hInt)
			if !seenRes[resLabel] {
				seenRes[resLabel] = true
				sz := int64(f.Filesize)
				if sz <= 0 {
					sz = int64(f.FilesizeAp)
				}

				label := fmt.Sprintf("%s (%s)", resLabel, strings.ToUpper(f.Ext))
				info.Formats = append(info.Formats, MediaFormat{
					FormatID:    fmt.Sprintf("bestvideo[height<=%d]+bestaudio/best[height<=%d]", hInt, hInt),
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
	return DownloadMediaWithOptions(ctx, mediaURL, formatID, outputDir, customFilename, nil, progressCb)
}

// DownloadMediaWithOptions streams and downloads video via yt-dlp with authentication and cookies.
func DownloadMediaWithOptions(
	ctx context.Context,
	mediaURL string,
	formatID string,
	outputDir string,
	customFilename string,
	opts *MediaOptions,
	progressCb func(p MediaProgress),
) error {
	binPath := GetBinaryPath()
	if binPath == "" {
		return errors.New("media engine yt-dlp is not available")
	}

	ffmpegPath := GetFFmpegPath()

	if formatID == "" {
		formatID = "bestvideo+bestaudio/best"
	}

	isAudioOnly := formatID == "bestaudio/best" || (strings.HasPrefix(formatID, "bestaudio") && !strings.Contains(formatID, "bestvideo"))

	var outTemplate string
	var baseTitle string
	if customFilename != "" {
		ext := filepath.Ext(customFilename)
		baseTitle = strings.TrimSuffix(customFilename, ext)
		outTemplate = filepath.Join(outputDir, baseTitle+".%(ext)s")
	} else {
		outTemplate = filepath.Join(outputDir, "%(title)s.%(ext)s")
	}

	authArgs, cleanup := buildAuthArgs(mediaURL, opts)
	defer cleanup()

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
	}

	// Append authentication arguments (--cookies, --user-agent, etc.)
	args = append(args, authArgs...)

	if ffmpegPath != "" {
		args = append(args, "--ffmpeg-location", ffmpegPath)
		if !isAudioOnly {
			args = append(args, "--merge-output-format", "mp4")
		} else {
			args = append(args, "-x", "--audio-format", "mp3")
		}
	}

	args = append(args, "-o", outTemplate, mediaURL)

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

	waitErr := cmd.Wait()

	// Post-check: If yt-dlp finished but left unmerged video & audio fragments, merge them with ffmpeg
	if ffmpegPath != "" && baseTitle != "" {
		mergeUnmergedFragments(outputDir, baseTitle, ffmpegPath)
	}

	return waitErr
}

// mergeUnmergedFragments scans for any remaining .f*.mp4 and .f*.webm pieces and merges them into a single clean .mp4
func mergeUnmergedFragments(dir string, baseTitle string, ffmpegPath string) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}

	var vidFile, audioFile string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasPrefix(name, baseTitle) {
			if strings.Contains(name, ".f") && strings.HasSuffix(name, ".mp4") {
				vidFile = filepath.Join(dir, name)
			} else if strings.Contains(name, ".f") && (strings.HasSuffix(name, ".webm") || strings.HasSuffix(name, ".m4a")) {
				audioFile = filepath.Join(dir, name)
			}
		}
	}

	finalTarget := filepath.Join(dir, baseTitle+".mp4")
	if vidFile != "" && audioFile != "" {
		// Run ffmpeg to mux video + audio
		muxCmd := exec.Command(ffmpegPath, "-i", vidFile, "-i", audioFile, "-c", "copy", "-y", finalTarget)
		if err := muxCmd.Run(); err == nil {
			_ = os.Remove(vidFile)
			_ = os.Remove(audioFile)
		}
	}
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

func formatSeconds(sec float64) string {
	sTotal := int(sec)
	if sTotal <= 0 {
		return "--:--"
	}
	m := sTotal / 60
	s := sTotal % 60
	if m >= 60 {
		h := m / 60
		m = m % 60
		return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%02d:%02d", m, s)
}
