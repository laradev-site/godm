.PHONY: all dev build build-cli build-desktop test lint bindings frontend-install frontend-build

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
	go build -o bin/godm-cli.exe ./cmd/godm

# Build desktop GUI app (Wails + embedded frontend)
build-desktop: frontend-build
	go build -o bin/godm.exe .

# Full build (both Desktop and CLI)
build: frontend-build build-desktop build-cli
	@echo "Build complete: bin/godm.exe & bin/godm-cli.exe"

# Package extension zip
extension-zip:
	powershell Compress-Archive -Path "extension/*" -DestinationPath "bin/godm-extension.zip" -Force

