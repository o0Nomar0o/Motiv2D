package main

import (
	"context"
	"embed"
	"fmt"
	"motiv2d/pkg/monitors"
	"motiv2d/pkg/services"
	spineservices "motiv2d/pkg/spine-services"
	"motiv2d/pkg/spine-services/common"
	"motiv2d/pkg/spine-services/remote"
	"motiv2d/pkg/theme"
	"motiv2d/pkg/update"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {

	app := NewApp()
	fileService := services.NewCLIService()
	runtimeService := monitors.NewAnalyzeService()
	spineService := spineservices.NewSpineService()
	spineCommon := common.NewSpineCommon()
	remoteHandler := remote.NewRemoteHandler()
	updateService := update.NewUpdaterService()

	err := wails.Run(&options.App{
		Title:     "MOTIV.2D",
		MinWidth:  1000,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
			Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

				if strings.HasPrefix(r.URL.Path, "/spine-assets/") {

					path := strings.TrimPrefix(r.URL.Path, "/spine-assets/")

					decodedPath, err := url.PathUnescape(path)
					if err != nil {
						http.Error(w, "Invalid path encoding", http.StatusBadRequest)
						return
					}

					fmt.Printf("WAILS ASSET REQUEST: %s\n", decodedPath)

					filePath := filepath.Clean(decodedPath)
					data, err := os.ReadFile(filePath)

					if err != nil {
						fmt.Printf("FILE NOT FOUND: %s\n", filePath)
						w.WriteHeader(http.StatusNotFound)
						return
					}

					if strings.HasSuffix(filePath, ".png") {
						w.Header().Set("Content-Type", "image/png")
					}

					w.Write(data)
					return
				}
				http.NotFound(w, r)
			}),
		},
		BackgroundColour: theme.GetPreferredTheme(),
		// BackgroundColour: &options.RGBA{
		// 	R: 0, G: 0, B: 0, A: 0,
		// },
		OnStartup: func(ctx context.Context) {
			app.startup(ctx)
			fileService.Startup(ctx)
			runtimeService.Startup(ctx)
			spineService.Startup(ctx)
			spineCommon.Startup(ctx)
			remoteHandler.Startup(ctx)
			updateService.Startup(ctx)
		},
		Bind: []interface{}{
			app,
			fileService,
			runtimeService,
			spineService,
			spineCommon,
			remoteHandler,
			updateService,
		},
		Menu: app.makeMenu(),
		Mac: &mac.Options{
			TitleBar:             mac.TitleBarHiddenInset(),
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WebviewIsTransparent: true,
		},
		Windows: &windows.Options{
			WebviewIsTransparent:  true,
			WindowIsTranslucent:   true,
			BackdropType:          windows.Mica,
			DisableWindowIcon:     true,
			EnableFramelessBorder: true,
			Frameless:             true,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}

}
