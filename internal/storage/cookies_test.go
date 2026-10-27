package storage

import (
	"testing"
)

func TestNormalizeDomain(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"https://www.facebook.com/reel/1624720077709087", "facebook.com"},
		{"http://m.facebook.com/watch?v=123", "facebook.com"},
		{"facebook.com", "facebook.com"},
		{".facebook.com", "facebook.com"},
		{"https://sub.sub2.instagram.com:8080/p/abc", "sub.sub2.instagram.com"},
	}

	for _, tc := range tests {
		actual := NormalizeDomain(tc.input)
		if actual != tc.expected {
			t.Errorf("NormalizeDomain(%q) = %q; want %q", tc.input, actual, tc.expected)
		}
	}
}

func TestSaveAndGetCookies(t *testing.T) {
	domain := "example-test-site.com"
	sampleJar := "# Netscape HTTP Cookie File\n.example-test-site.com\tTRUE\t/\tTRUE\t2000000000\tsession\tabc123\n"
	sampleHeader := "session=abc123"

	err := SaveDomainCookies(domain, sampleJar, sampleHeader)
	if err != nil {
		t.Fatalf("SaveDomainCookies failed: %v", err)
	}
	defer RemoveDomainCookies(domain)

	path, found := GetCookieFilePath("https://www.example-test-site.com/video/123")
	if !found || path == "" {
		t.Fatalf("GetCookieFilePath failed to find cookie file for domain")
	}

	header := GetCookieHeader("https://www.example-test-site.com/video/123")
	if header != sampleHeader {
		t.Errorf("GetCookieHeader = %q; want %q", header, sampleHeader)
	}

	if !HasCookiesForDomain(domain) {
		t.Errorf("HasCookiesForDomain(%q) = false; want true", domain)
	}
}
