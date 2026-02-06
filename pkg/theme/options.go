package theme

import "github.com/wailsapp/wails/v2/pkg/options"

var (
    BlackTheme = &options.RGBA{R: 8, G: 7, B: 8, A: 255}
    DarkGrey   = &options.RGBA{R: 30, G: 30, B: 30, A: 255}
    NavyBlue   = &options.RGBA{R: 10, G: 15, B: 30, A: 255}
)

func GetPreferredTheme() *options.RGBA {
    return BlackTheme
}