package config

import (
	"time"
)

const (
	DefaultConnections  = 8
	DefaultBufferSize   = 64 * 1024       // 64 KB buffer per worker
	DefaultMinChunkSize = 1024 * 1024     // 1 MB min chunk to split
	DefaultTimeout      = 30 * time.Second
	DefaultUserAgent    = "godm/1.0 (Compatible; Go-Download-Manager; Windows NT 10.0; Win64; x64)"
	DefaultMaxRetries   = 3
	DefaultRetryDelay   = 2 * time.Second
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
