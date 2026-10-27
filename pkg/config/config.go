package config

import (
	"time"
)

const (
	DefaultConnections  = 8
	DefaultBufferSize   = 256 * 1024      // 256 KB buffer per worker for maximum throughput
	DefaultMinChunkSize = 256 * 1024      // 256 KB min chunk to split
	DefaultTimeout      = 30 * time.Second
	DefaultUserAgent    = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 godm/1.0"
	DefaultMaxRetries   = 5
	DefaultRetryDelay   = 1 * time.Second
)

// Config holds runtime options for downloading.
type Config struct {
	URL          string
	OutputDir    string
	OutputFile   string
	Connections  int
	BufferSize   int
	MinChunkSize int64
	UserAgent    string
	Headers      map[string]string
	Timeout      time.Duration
	MaxRetries   int
	RetryDelay   time.Duration
	Quiet        bool
}

// NewDefaultConfig returns a Config with sensible default settings.
func NewDefaultConfig() *Config {
	return &Config{
		Connections:  DefaultConnections,
		BufferSize:   DefaultBufferSize,
		MinChunkSize: DefaultMinChunkSize,
		UserAgent:    DefaultUserAgent,
		Headers:      make(map[string]string),
		Timeout:      DefaultTimeout,
		MaxRetries:   DefaultMaxRetries,
		RetryDelay:   DefaultRetryDelay,
		Quiet:        false,
	}
}
