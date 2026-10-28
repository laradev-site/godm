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

	// Test CDN parent mapping: facebook.com cookies resolved for fbcdn.net
	fbJar := "# Netscape HTTP Cookie File\n.facebook.com\tTRUE\t/\tTRUE\t2000000000\tc_user\t100001\n"
	fbHeader := "c_user=100001; xs=sec_tok;"
	if err := SaveDomainCookies("facebook.com", fbJar, fbHeader); err != nil {
		t.Fatalf("SaveDomainCookies for facebook.com failed: %v", err)
	}
	defer RemoveDomainCookies("facebook.com")

	cdnURL := "https://video.faly1-1.fna.fbcdn.net/v/t39.25447-2/123456_n.mp4?_nc_cat=101"
	if cdnPath, found := GetCookieFilePath(cdnURL); !found || cdnPath == "" {
		t.Errorf("GetCookieFilePath for CDN %q should resolve facebook.com cookies", cdnURL)
	}
	if cdnHeader := GetCookieHeader(cdnURL); cdnHeader != fbHeader {
		t.Errorf("GetCookieHeader for CDN = %q; want %q", cdnHeader, fbHeader)
	}
}
