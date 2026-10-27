# godm (Go Download Manager) ⚡

> **High-Performance Multi-Connection Download Accelerator & IDM Alternative**  
> Built with **Go**, **Wails v3**, **React**, and **TypeScript**.

[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Wails](https://img.shields.io/badge/Wails-v3.0.0--beta.26-DF1A29?style=flat)](https://v3.wails.io)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 Overview

`godm` is a modern open-source download accelerator inspired by Internet Download Manager (IDM). It achieves maximum network throughput by dynamically splitting files into parallel HTTP `Range` segments, eliminating the slow sequential single-connection bottleneck.

Unlike naive download managers that download chunks into separate temporary files and freeze at 99% while merging gigabytes on disk, `godm` writes directly to pre-allocated target byte offsets via concurrent random-access disk I/O (`os.File.WriteAt`).

---

## ✨ Key Features

- **⚡ Multi-Threaded Acceleration**: Splits files across 1 to 32 concurrent HTTP `Range` connections to saturate your bandwidth.
- **💾 Zero-Copy / Zero-Stitch Disk I/O**: Direct concurrent offset writing (`WriteAt`) into pre-allocated disk space — no temp file copying at 100%.
- **🔄 Resilient Pause & Resume**: Atomic `.godm` JSON state tracking allows interrupted or paused downloads to pick up exactly where they stopped without redownloading finished bytes.
- **📊 Real-Time Multi-Segment Visualizer**: Live visual chunk strip showing each active thread's progress in real time (the signature IDM feature).
- **🖥️ Dual Mode (Desktop GUI & Headless CLI)**:
  - **Desktop GUI**: Sleek dark-mode interface built with Wails v3, React, TypeScript, and system tray integration.
  - **Headless CLI (`godm-cli`)**: Terminal download manager with live interactive ANSI progress bars and micro-connection indicators.
- **🔍 Intelligent Server Probing**: Two-tier URL inspector (HEAD with automatic fallback to single-byte `Range: bytes=0-0` probe) to detect range capabilities even on servers that hide `Accept-Ranges`.

---

## 🏗️ Architecture

```
godm/
├── cmd/
│   └── godm/                      # Headless CLI entry point
│       └── main.go
├── internal/
│   ├── engine/                    # Core download engine & worker goroutine pools
│   │   ├── engine.go
│   │   ├── worker.go
│   │   └── engine_test.go         # Full end-to-end integration tests
│   ├── protocol/                  # HTTP range probing, headers, filename extraction
│   │   └── probe.go
│   ├── segment/                   # Dynamic segment planner [start, end, current]
│   │   ├── segment.go
│   │   └── segment_test.go
│   ├── service/                   # Wails v3 application binding service
│   │   └── download_service.go
│   ├── storage/                   # Direct concurrent disk writer & .godm state persistence
│   │   ├── writer.go
│   │   ├── state.go
│   │   └── state_test.go
│   └── ui/                        # Terminal progress bar with speed moving average & ETA
│       └── progress.go
├── pkg/
│   └── config/                    # Configuration structures & defaults
│       └── config.go
├── frontend/                      # React + TypeScript + Vite UI
│   ├── src/
│   │   ├── App.tsx                # Main UI & Multi-Segment Visualizer
│   │   └── app.css                # Dark theme styles
│   └── bindings/                  # Auto-generated typed Wails bindings
├── main.go                        # Desktop application entry point (Wails v3)
├── Makefile                       # Developer shortcuts
└── README.md
```

---

## 🛠️ Getting Started

### Prerequisites

- **Go**: 1.25+ (tested on Go 1.27)
- **Node.js & pnpm**: Node 20+ and `pnpm`
- **Wails v3 CLI**:
  ```bash
  go install github.com/wailsapp/wails/v3/cmd/wails3@latest
  ```

### Development (Live Reload)

Run the desktop GUI in development mode with live hot-reloading for both Go and React:

```bash
# In project root
wails3 dev
```

### Running Unit & Integration Tests

```bash
go test -v ./...
```

### Building Binaries

```bash
# Build both Desktop GUI and Headless CLI
make build

# Output:
#   bin/godm.exe       (Desktop GUI with embedded frontend)
#   bin/godm-cli.exe   (Standalone Headless CLI)
```

---

## 💻 CLI Usage

```bash
# Basic download
./bin/godm-cli.exe https://example.com/largefile.iso

# Accelerated with 16 parallel connections
./bin/godm-cli.exe -c 16 https://example.com/largefile.iso

# Custom output filename and destination directory
./bin/godm-cli.exe -c 16 -o myapp.zip -d C:\Downloads https://example.com/archive.zip

# Inspect URL capabilities without downloading
./bin/godm-cli.exe --info https://example.com/video.mp4

# Custom headers (e.g. authentication or cookies)
./bin/godm-cli.exe -H "Authorization: Bearer mytoken" https://example.com/private.tar.gz
```

---

## 🗺️ Roadmap

- [x] Multi-connection HTTP `Range` concurrent download engine
- [x] Direct concurrent offset disk writer (`WriteAt`)
- [x] State persistence & resume system (`.godm`)
- [x] Wails v3 Desktop GUI with live multi-segment visualizer
- [x] Headless CLI tool with interactive terminal progress
- [ ] Chrome & Firefox Extension (Manifest V3) with Native Messaging host
- [ ] Speed Limiter / Bandwidth Allocation controls
- [ ] Multimedia Stream sniffer (HLS `.m3u8` / DASH `.mpd` extraction via FFmpeg)
- [ ] Scheduled queue management

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
