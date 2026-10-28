# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Power Users & Developers**: Users looking for an open-source, high-throughput alternative to Internet Download Manager (IDM), FDM, or JDownloader with multi-threaded segment splitting, byte-level pause/resume, and headless CLI support.
- **Casual Web Downloaders**: Users seeking frictionless 1-click video and stream capture from platforms like YouTube, Facebook (public & private reels), and TikTok via Chrome/Chromium browser extension.

## Product Purpose
GoDM is a high-performance download accelerator and media stream sniffer built in Go. It exists to maximize bandwidth utilization through multi-connection chunked HTTP downloading while offering zero-friction browser integration and automated file organization, completely free and open source.

## Positioning
The modern open-source revival of classic IDM: combines extreme Go engine speed (up to 32 parallel connections per download) and zero-config loopback RPC browser integration with an engineered, utilitarian desktop GUI and cross-platform CLI.

## Operating Context
- **Web Landing Page**: Marketing, live interactive simulation, feature proofs, comparison matrices, and direct binary downloads.
- **Desktop Application (Wails v3 + React)**: Persistent task queue, per-thread visual progress inspector, speed meters, categorized folder routing, and system tray integration on Windows & Linux.
- **Browser Extension (Manifest V3)**: Passive network sniffer, progressive video URL resolution, and direct handoff to local RPC port `127.0.0.1:9246`.
- **Terminal CLI (`godm-cli`)**: Standalone binary for automation, remote servers, and scripting.

## Capabilities and Constraints
- **Multi-Part Chunk Splitting**: Server HTTP Range detection and dynamic segmentation into up to 32 parallel streams written concurrently to pre-allocated disk files.
- **Byte-Level Resilience**: Atomic `.godm` JSON task files track segment completion for instant resumption without redownloading finished bytes.
- **Video Sniffing**: Progressive MP4 detection and media stream normalization bypassing rate-limited scrapers.
- **Aesthetic Tone**: Classic IDM modern retrofit — utilitarian, high data density, engineered precision controls, clear telemetry, no gimmicky gradients or AI slop.

## Brand Commitments
- **Name**: GoDM (godm)
- **Identity**: Clean, functional, developer-grade download accelerator.
- **License**: 100% Free & Open-Source under MIT License.
- **Source Code**: Transparent Go and React codebase at `https://github.com/laradev-site/godm`.

## Evidence on Hand
- Published cross-platform binaries for Windows and Linux (`v0.2.0`).
- Validated Chrome Web Store package (`godm-chrome-extension.zip`).
- Live production website deployments on Cloudflare Pages (`godm.pages.dev` and `godm-3i6.pages.dev`).

## Product Principles
1. **Speed & Throughput First**: Every UI surface must reflect real engine telemetry (active workers, chunk segments, transferred bytes, accurate ETAs).
2. **Utilitarian Density over Decorative Fluff**: Avoid decorative AI gradients, hollow cards, or fake empty space; prioritize dense, readable data tables and immediate controls.
3. **Rock-Solid Reliability**: Byte persistence and resume states are first-class citizens in both UI and core logic.
4. **Seamless Handoff**: The boundary between browser extension, desktop GUI, and CLI is fluid and immediate.
