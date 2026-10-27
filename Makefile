EXE :=
ifeq ($(OS),Windows_NT)
	EXE := .exe
endif

.PHONY: all dev build build-cli build-desktop test lint bindings frontend-install frontend-build clean

all: test build

# Install frontend dependencies
frontend-install:
	cd frontend && pnpm install

# Build frontend production assets
frontend-build:
	cd frontend && pnpm build

# Generate Wails TypeScript bindings from Go services
bindings:
	wails3 generate bindings -ts -i ./...

# Run Wails desktop app in live hot-reload development mode
dev:
	wails3 dev

# Run all Go unit and integration tests
test:
	go test -v ./...

# Build standalone CLI binary (headless)
build-cli:
	go build -trimpath -ldflags="-w -s" -o bin/godm-cli$(EXE) ./cmd/godm

# Build desktop GUI app (Wails + embedded frontend)
build-desktop: frontend-build
	wails3 build

# Full build (both Desktop and CLI)
build: frontend-build build-desktop build-cli
	@echo "Build complete: bin/godm$(EXE) & bin/godm-cli$(EXE)"

# Build Linux packages (deb, rpm, appimage) when on Linux
package-linux:
	wails3 task linux:package
