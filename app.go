package main

import (
	"context"
	"fmt"
	"runtime"

	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) onDomReady(ctx context.Context) {
	// a.ctx = ctx
    // C.SetTrafficLightPosition(20.0, -10.0)

	applyPlatformCode(ctx)
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	fmt.Printf("CMD: %s\n", name)
	return fmt.Sprintf("%s + 1", name)
}

func (a *App) Platform() string {
	return runtime.GOOS
}

func (a *App) CurrentPlatform() string {
    return fmt.Sprintf("%s_%s", runtime.GOOS, runtime.GOARCH)
}

//Menu Items
func (a *App) makeMenu() *menu.Menu {
	AppMenu := menu.NewMenu()

	appMenu := AppMenu.AddSubmenu("MOTIV.2D")

	appMenu.AddText("About MOTIV.2D", nil, func(_ *menu.CallbackData) {
		if a.ctx != nil {
        wailsRuntime.EventsEmit(a.ctx, "open_about_modal")
	}
})

appMenu.AddText("Check for Updates", keys.CmdOrCtrl("u"), func(_ *menu.CallbackData) {
    if a.ctx != nil {
        wailsRuntime.EventsEmit(a.ctx, "open_update_modal")
    }
})

	appMenu.AddSeparator()

	appMenu.AddText("Quit MOTIV.2D", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		wailsRuntime.Quit(a.ctx)
	})

	if runtime.GOOS == "darwin" {
		AppMenu.Append(menu.EditMenu())

		return AppMenu
	}

	return AppMenu
}

func (a *App) SetWindowColor(r, g, b uint8, a_alpha uint8) {
	wailsRuntime.WindowSetBackgroundColour(a.ctx, r, g, b, a_alpha)
}