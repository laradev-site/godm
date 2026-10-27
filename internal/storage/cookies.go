package storage

import (
	"encoding/json"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type DomainCookieMeta struct {
	Domain       string    `json:"domain"`
	CookieHeader string    `json:"cookieHeader"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// GetCookiesDir returns the directory path where session cookies are stored.
func GetCookiesDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = os.TempDir()
	}
	dir := filepath.Join(configDir, "godm", "cookies")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return dir, nil
}

// NormalizeDomain extracts a canonical root domain (e.g. "facebook.com" from "https://www.facebook.com/reel/...").
func NormalizeDomain(raw string) string {
	raw = strings.TrimSpace(raw)
	if strings.Contains(raw, "://") {
		if parsed, err := url.Parse(raw); err == nil && parsed.Host != "" {
			raw = parsed.Host
		}
	}
	// Strip port
	if idx := strings.Index(raw, ":"); idx != -1 {
		raw = raw[:idx]
	}
	// Strip leading dot
	raw = strings.TrimPrefix(raw, ".")
	// Strip www. or m.
	raw = strings.TrimPrefix(raw, "www.")
	raw = strings.TrimPrefix(raw, "m.")
	return strings.ToLower(raw)
}

// SaveDomainCookies persists Netscape cookies and metadata for a domain.
func SaveDomainCookies(domain string, netscapeJar string, cookieHeader string) error {
	norm := NormalizeDomain(domain)
	if norm == "" {
		return nil
	}

	dir, err := GetCookiesDir()
	if err != nil {
		return err
	}

	// 1. Write Netscape cookie file
	txtPath := filepath.Join(dir, norm+".txt")
	if netscapeJar != "" {
		if err := os.WriteFile(txtPath, []byte(netscapeJar), 0600); err != nil {
			return err
		}
	}

	// 2. Write JSON metadata
	meta := DomainCookieMeta{
		Domain:       norm,
		CookieHeader: cookieHeader,
		UpdatedAt:    time.Now(),
	}
	metaBytes, err := json.MarshalIndent(meta, "", "  ")
	if err == nil {
		jsonPath := filepath.Join(dir, norm+".json")
		_ = os.WriteFile(jsonPath, metaBytes, 0600)
	}

	return nil
}

// GetCookieFilePath looks up a valid Netscape cookie file for a URL or domain.
// It checks the exact domain first, then falls back to parent domain (e.g. "facebook.com" for "web.facebook.com").
func GetCookieFilePath(rawURLOrDomain string) (string, bool) {
	norm := NormalizeDomain(rawURLOrDomain)
	if norm == "" {
		return "", false
	}

	dir, err := GetCookiesDir()
	if err != nil {
		return "", false
	}

	// Try exact match
	exact := filepath.Join(dir, norm+".txt")
	if info, err := os.Stat(exact); err == nil && info.Size() > 0 {
		return exact, true
	}

	// Try extracting root domain: a.b.c -> b.c
	parts := strings.Split(norm, ".")
	if len(parts) > 2 {
		root := strings.Join(parts[len(parts)-2:], ".")
		rootPath := filepath.Join(dir, root+".txt")
		if info, err := os.Stat(rootPath); err == nil && info.Size() > 0 {
			return rootPath, true
		}
	}

	return "", false
}

// GetCookieHeader returns the raw Cookie string for a domain if available.
func GetCookieHeader(rawURLOrDomain string) string {
	norm := NormalizeDomain(rawURLOrDomain)
	if norm == "" {
		return ""
	}

	dir, err := GetCookiesDir()
	if err != nil {
		return ""
	}

	candidateFiles := []string{
		filepath.Join(dir, norm+".json"),
	}
	parts := strings.Split(norm, ".")
	if len(parts) > 2 {
		root := strings.Join(parts[len(parts)-2:], ".")
		candidateFiles = append(candidateFiles, filepath.Join(dir, root+".json"))
	}

	for _, p := range candidateFiles {
		if data, err := os.ReadFile(p); err == nil {
			var meta DomainCookieMeta
			if err := json.Unmarshal(data, &meta); err == nil && meta.CookieHeader != "" {
				return meta.CookieHeader
			}
		}
	}

	return ""
}

// HasCookiesForDomain checks if we have stored cookies for a domain.
func HasCookiesForDomain(rawURLOrDomain string) bool {
	_, found := GetCookieFilePath(rawURLOrDomain)
	return found
}

// ListSyncedDomains returns a list of all domains that have stored cookies.
func ListSyncedDomains() []string {
	dir, err := GetCookiesDir()
	if err != nil {
		return nil
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}

	domains := make([]string, 0)
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".txt") {
			domain := strings.TrimSuffix(entry.Name(), ".txt")
			domains = append(domains, domain)
		}
	}
	return domains
}

// RemoveDomainCookies deletes stored cookies for a domain.
func RemoveDomainCookies(domain string) error {
	norm := NormalizeDomain(domain)
	if norm == "" {
		return nil
	}

	dir, err := GetCookiesDir()
	if err != nil {
		return err
	}

	_ = os.Remove(filepath.Join(dir, norm+".txt"))
	_ = os.Remove(filepath.Join(dir, norm+".json"))
	return nil
}
