package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"godm/internal/engine"
	"godm/internal/protocol"
	"godm/internal/ui"
	"godm/pkg/config"
)

const (
	Version = "0.1.0-alpha"
	Banner  = `
 ██████╗  ██████╗ ██████╗ ███╗   ███╗
██╔════╝ ██╔═══██╗██╔══██╗████╗ ████║
██║  ███╗██║   ██║██║  ██║██╔████╔██║
██║   ██║██║   ██║██║  ██║██║╚██╔╝██║
╚██████╔╝╚██████╔╝██████╔╝██║ ╚═╝ ██║
 ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝
 High-Performance Multi-Connection Download Accelerator
`
)

type headerFlags []string

func (h *headerFlags) String() string {
	return strings.Join(*h, ", ")
}

func (h *headerFlags) Set(val string) error {
	*h = append(*h, val)
	return nil
}

func main() {
	var (
		conns       = flag.Int("c", config.DefaultConnections, "Number of concurrent connections")
		connsLong   = flag.Int("connections", config.DefaultConnections, "Number of concurrent connections")
		output      = flag.String("o", "", "Output filename")
		outputLong  = flag.String("output", "", "Output filename")
		dir         = flag.String("d", "", "Destination directory")
		dirLong     = flag.String("dir", "", "Destination directory")
		userAgent   = flag.String("u", config.DefaultUserAgent, "Custom User-Agent header")
		quiet       = flag.Bool("q", false, "Quiet mode (no progress bar)")
		probeOnly   = flag.Bool("info", false, "Probe URL information only without downloading")
		showVersion = flag.Bool("v", false, "Show version")
	)

	var headers headerFlags
	flag.Var(&headers, "H", "Custom HTTP header (can be repeated, e.g. -H \"Cookie: session=xyz\")")

	flag.Usage = func() {
		fmt.Print(Banner)
		fmt.Printf("godm v%s - High-Performance Download Manager\n\n", Version)
		fmt.Println("Usage:")
		fmt.Println("  godm [options] <URL>")
		fmt.Println("\nOptions:")
		flag.PrintDefaults()
		fmt.Println("\nExamples:")
		fmt.Println("  godm https://example.com/file.zip")
		fmt.Println("  godm -c 16 -o myapp.iso https://example.com/large.iso")
		fmt.Println("  godm --info https://example.com/video.mp4")
		fmt.Println("  godm -H \"Authorization: Bearer token123\" https://example.com/private.tar.gz")
	}

	flag.Parse()

	if *showVersion {
		fmt.Printf("godm version %s\n", Version)
		return
	}

	args := flag.Args()
	if len(args) < 1 {
		flag.Usage()
		os.Exit(1)
	}

	targetURL := args[0]

	// Resolve flags precedence
	numConns := *conns
	if *connsLong != config.DefaultConnections {
		numConns = *connsLong
	}

	outputFile := *output
	if *outputLong != "" {
		outputFile = *outputLong
	}

	outputDir := *dir
	if *dirLong != "" {
		outputDir = *dirLong
	}

	// Build configuration
	cfg := config.NewDefaultConfig()
	cfg.URL = targetURL
	cfg.Connections = numConns
	cfg.OutputFile = outputFile
	cfg.OutputDir = outputDir
	cfg.UserAgent = *userAgent
	cfg.Quiet = *quiet

	for _, h := range headers {
		parts := strings.SplitN(h, ":", 2)
		if len(parts) == 2 {
			cfg.Headers[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}

	// Setup graceful interrupt handling
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Probe only mode
	if *probeOnly {
		fmt.Printf("Probing %s ...\n", targetURL)
		info, err := protocol.Probe(ctx, cfg)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("--------------------------------------------------")
		fmt.Printf("Filename:     %s\n", info.Filename)
		if info.ContentLength > 0 {
			fmt.Printf("Size:         %s (%d bytes)\n", ui.FormatBytes(info.ContentLength), info.ContentLength)
		} else {
			fmt.Println("Size:         Unknown")
		}
		fmt.Printf("Range Support: %v\n", info.AcceptRanges)
		if info.ETag != "" {
			fmt.Printf("ETag:         %s\n", info.ETag)
		}
		if info.LastModified != "" {
			fmt.Printf("Modified:     %s\n", info.LastModified)
		}
		if info.ContentType != "" {
			fmt.Printf("Content-Type: %s\n", info.ContentType)
		}
		return
	}

	// Start Download
	if !cfg.Quiet {
		fmt.Print(Banner)
	}

	eng := engine.NewEngine(cfg)
	if err := eng.Execute(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}
}
