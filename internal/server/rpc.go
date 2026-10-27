package server

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"

	"godm/internal/service"
)

const DefaultRPCPort = 9246

type DownloadRequest struct {
	URL      string `json:"url"`
	Filename string `json:"filename,omitempty"`
	Referrer string `json:"referrer,omitempty"`
	FormatID string `json:"formatId,omitempty"`
}

type RPCServer struct {
	app         *application.App
	downloadSvc *service.DownloadService
	server      *http.Server
	port        int
}

// StartRPCServer starts a local HTTP bridge for the browser extension.
func StartRPCServer(port int, app *application.App, downloadSvc *service.DownloadService) (*RPCServer, error) {
	if port <= 0 {
		port = DefaultRPCPort
	}

	rpc := &RPCServer{
		app:         app,
		downloadSvc: downloadSvc,
		port:        port,
	}

	mux := http.NewServeMux()

	// CORS wrapper
	corsMiddleware := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next(w, r)
		}
	}

	// Ping endpoint
	mux.HandleFunc("/api/ping", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":  "ok",
			"app":     "godm",
			"version": "0.1.0-alpha",
		})
	}))

	// Download trigger endpoint
	mux.HandleFunc("/api/download", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req DownloadRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request: "+err.Error(), http.StatusBadRequest)
			return
		}

		if req.URL == "" {
			http.Error(w, "missing url parameter", http.StatusBadRequest)
			return
		}

		// Focus and show main window
		if app != nil {
			windows := app.Window.GetAll()
			for _, win := range windows {
				win.Show()
				win.Focus()
			}
			// Notify UI to open Add Download modal prefilled with URL
			app.Event.Emit("extension:new-download", req)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"message": "Download sent to godm",
			"url":     req.URL,
		})
	}))

	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return nil, fmt.Errorf("failed to bind RPC server on port %d: %w", port, err)
	}

	srv := &http.Server{
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	rpc.server = srv

	go func() {
		_ = srv.Serve(listener)
	}()

	return rpc, nil
}

// Close terminates the RPC server.
func (r *RPCServer) Close() error {
	if r.server != nil {
		return r.server.Close()
	}
	return nil
}
