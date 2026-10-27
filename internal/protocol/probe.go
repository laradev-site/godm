package protocol

import (
	"context"
	"fmt"
	"mime"
	"net/http"
	"net/url"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"godm/pkg/config"
)

// ResourceInfo represents inspected metadata for a target URL.
type ResourceInfo struct {
	URL           string
	Filename      string
	ContentLength int64
	AcceptRanges  bool
	ETag          string
	LastModified  string
	StatusCode    int
	ContentType   string
}

// Probe inspects the target URL to determine file size, range support, and filename.
// It uses an IDM-grade two-tier probing mechanism:
// 1. Attempts an HTTP HEAD request.
// 2. If HEAD fails, is forbidden/not allowed, or omits range headers, it performs a
//    single-byte Range GET (Range: bytes=0-0) to conclusively test range capabilities.
func Probe(ctx context.Context, cfg *config.Config) (*ResourceInfo, error) {
	client := &http.Client{
		Timeout: cfg.Timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return fmt.Errorf("stopped after 10 redirects")
			}
			// Copy custom headers to redirect requests
			for k, v := range cfg.Headers {
				req.Header.Set(k, v)
			}
			req.Header.Set("User-Agent", cfg.UserAgent)
			return nil
		},
	}

	info := &ResourceInfo{
		URL: cfg.URL,
	}

	// Step 1: Try HEAD request
	headReq, err := http.NewRequestWithContext(ctx, http.MethodHead, cfg.URL, nil)
	if err == nil {
		applyHeaders(headReq, cfg)
		resp, headErr := client.Do(headReq)
		if headErr == nil {
			defer resp.Body.Close()
			info.StatusCode = resp.StatusCode
			if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusPartialContent {
				populateFromHeaders(info, resp.Header, cfg.URL)
				if resp.ContentLength > 0 {
					info.ContentLength = resp.ContentLength
				}
			}
		}
	}

	// Step 2: If Range support is not explicitly confirmed or HEAD failed, test via Range: bytes=0-0
	if !info.AcceptRanges || info.ContentLength <= 0 {
		probeReq, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.URL, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create range probe request: %w", err)
		}
		applyHeaders(probeReq, cfg)
		probeReq.Header.Set("Range", "bytes=0-0")

		resp, err := client.Do(probeReq)
		if err != nil {
			// If even this fails and we had a valid HEAD, return HEAD info
			if info.ContentLength > 0 {
				return info, nil
			}
			return nil, fmt.Errorf("probe request failed: %w", err)
		}
		defer resp.Body.Close()

		info.StatusCode = resp.StatusCode
		populateFromHeaders(info, resp.Header, cfg.URL)

		if resp.StatusCode == http.StatusPartialContent {
			info.AcceptRanges = true
			// Parse Content-Range: bytes 0-0/1234567
			contentRange := resp.Header.Get("Content-Range")
			if total := parseContentRangeTotal(contentRange); total > 0 {
				info.ContentLength = total
			}
		} else if resp.StatusCode == http.StatusOK {
			// Server ignored Range header and returned full response
			info.AcceptRanges = false
			if resp.ContentLength > 0 {
				info.ContentLength = resp.ContentLength
			}
		}
	}

	// Fallback filename if not yet resolved
	if info.Filename == "" {
		info.Filename = extractFilenameFromURL(cfg.URL)
	}

	return info, nil
}

func applyHeaders(req *http.Request, cfg *config.Config) {
	req.Header.Set("User-Agent", cfg.UserAgent)
	req.Header.Set("Accept", "*/*")
	for k, v := range cfg.Headers {
		req.Header.Set(k, v)
	}
}

func populateFromHeaders(info *ResourceInfo, headers http.Header, rawURL string) {
	if acceptRanges := headers.Get("Accept-Ranges"); strings.EqualFold(acceptRanges, "bytes") {
		info.AcceptRanges = true
	}

	if etag := headers.Get("ETag"); etag != "" {
		info.ETag = etag
	}

	if lastModified := headers.Get("Last-Modified"); lastModified != "" {
		info.LastModified = lastModified
	}

	if contentType := headers.Get("Content-Type"); contentType != "" {
		info.ContentType = contentType
	}

	if cd := headers.Get("Content-Disposition"); cd != "" {
		if filename := parseContentDisposition(cd); filename != "" {
			info.Filename = sanitizeFilename(filename)
		}
	}
}

// parseContentDisposition extracts filename from Content-Disposition header.
func parseContentDisposition(header string) string {
	_, params, err := mime.ParseMediaType(header)
	if err == nil {
		if filename, ok := params["filename*"]; ok {
			// e.g. UTF-8''encoded_name
			parts := strings.SplitN(filename, "''", 2)
			if len(parts) == 2 {
				if unescaped, err := url.PathUnescape(parts[1]); err == nil {
					return unescaped
				}
			}
		}
		if filename, ok := params["filename"]; ok {
			return filename
		}
	}
	return ""
}

// extractFilenameFromURL extracts and decodes a filename from URL path.
func extractFilenameFromURL(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "download.bin"
	}

	base := path.Base(u.Path)
	if base == "" || base == "/" || base == "." {
		return "download.bin"
	}

	decoded, err := url.PathUnescape(base)
	if err == nil && decoded != "" {
		base = decoded
	}

	return sanitizeFilename(base)
}

var illegalFileChars = regexp.MustCompile(`[\\/:*?"<>|]`)

// sanitizeFilename strips characters invalid for file systems.
func sanitizeFilename(name string) string {
	clean := illegalFileChars.ReplaceAllString(name, "_")
	clean = strings.TrimSpace(clean)
	if clean == "" || clean == "." {
		return "download.bin"
	}
	return filepath.Clean(clean)
}

// parseContentRangeTotal extracts total size from Content-Range: bytes 0-0/12345
func parseContentRangeTotal(contentRange string) int64 {
	if contentRange == "" {
		return 0
	}
	parts := strings.Split(contentRange, "/")
	if len(parts) != 2 {
		return 0
	}
	totalStr := strings.TrimSpace(parts[1])
	if totalStr == "*" {
		return 0
	}
	total, err := strconv.ParseInt(totalStr, 10, 64)
	if err != nil {
		return 0
	}
	return total
}
