package main

import (
	"embed"
	"fmt"
	"log"
	"os"

	"github.com/wailsapp/wails/v3/pkg/application"

	"godm/internal/server"
	"godm/internal/service"
)

//go:embed all:frontend/dist
var assets embed.FS

const (
	AppName    = "godm"
	AppTitle   = "godm - Download Accelerator"
	AppVersion = "0.1.0-alpha"
)

func main() {
	downloadSvc := service.NewDownloadService()

	app := application.New(application.Options{
		Name:        AppName,
		Description: "High-Performance Multi-Connection Download Accelerator",
		Services: []application.Service{
			application.NewService(downloadSvc),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false,
		},
	})
	downloadSvc.SetApp(app)

	// Start local extension RPC bridge on 127.0.0.1:9246
	rpcSrv, err := server.StartRPCServer(server.DefaultRPCPort, app, downloadSvc)
	if err == nil {
		defer rpcSrv.Close()
	}

	// Create main window
	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  AppTitle,
		Width:  1080,
		Height: 700,
		MinWidth: 800,
		MinHeight: 500,
		BackgroundColour: application.NewRGB(15, 23, 42), // slate-900 dark background
		URL: "/",
	})

	// Add system tray
	tray := app.SystemTray.New()
	tray.SetLabel(AppName)
	tray.SetTooltip("godm - Running in background")

	trayMenu := app.Menu.New()
	trayMenu.Add("Show godm").OnClick(func(ctx *application.Context) {
		mainWindow.Show()
		mainWindow.Focus()
	})
	trayMenu.AddSeparator()
	trayMenu.Add("Quit").OnClick(func(ctx *application.Context) {
		app.Quit()
	})
	tray.SetMenu(trayMenu)

	// Keep window hidden on minimize to tray if desired, or standard close
	if err := app.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "application error: %v\n", err)
		log.Fatal(err)
	}
}
