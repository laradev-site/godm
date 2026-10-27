package server

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"

	"godm/internal/service"
	"godm/internal/storage"
)

const DefaultRPCPort = 9246

type DirectStream struct {
	URL         string `json:"url"`
	ContentType string `json:"contentType,omitempty"`
	Quality     string `json:"quality,omitempty"`
	Size        int64  `json:"size,omitempty"`
}

type DownloadRequest struct {
	URL           string            `json:"url"`
	Filename      string            `json:"filename,omitempty"`
	Referrer      string            `json:"referrer,omitempty"`
	FormatID      string            `json:"formatId,omitempty"`
	PageURL       string            `json:"pageUrl,omitempty"`
	UserAgent     string            `json:"userAgent,omitempty"`
	Cookies       string            `json:"cookies,omitempty"`
	CookieJar     string            `json:"cookieJar,omitempty"`
	Headers       map[string]string `json:"headers,omitempty"`
	DirectStreams []DirectStream    `json:"directStreams,omitempty"`
}

type CookieSyncRequest struct {
	Domain       string `json:"domain"`
	CookieJar    string `json:"cookieJar"`
	CookieHeader string `json:"cookieHeader"`
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

	// Cookie sync endpoint from browser extension
	mux.HandleFunc("/api/cookies/sync", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req CookieSyncRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request: "+err.Error(), http.StatusBadRequest)
			return
		}

		if req.Domain != "" && (req.CookieJar != "" || req.CookieHeader != "") {
			_ = storage.SaveDomainCookies(req.Domain, req.CookieJar, req.CookieHeader)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"domain":  req.Domain,
			"message": "Cookies synchronized successfully",
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

		// Automatically persist session cookies for domain if provided
		targetDomain := req.PageURL
		if targetDomain == "" {
			targetDomain = req.URL
		}
		if req.CookieJar != "" || req.Cookies != "" {
			_ = storage.SaveDomainCookies(targetDomain, req.CookieJar, req.Cookies)
		}

		// Focus and show main window
		if app != nil {
			windows := app.Window.GetAll()
			for _, win := range windows {
				win.Show()
				win.Focus()
			}
			// Notify UI to open Add Download modal prefilled with URL and auth session
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
