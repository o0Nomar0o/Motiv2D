package handler

// import (
// 	"fmt"
// 	"os"
// 	"path/filepath"
// 	"strings"

// 	"github.com/wailsapp/wails/v2/pkg/runtime"
// )

// func (h *FileHandler) ImportAssets(importType string) error {
// 	dir, err := runtime.OpenDirectoryDialog(h.ctx, runtime.OpenDialogOptions{
// 		Title: "Select Asset Folder (Spine or Live2D)",
// 	})
// 	if err != nil || dir == "" {
// 		return err
// 	}

// 	return h.startScan(dir, false, importType)
// }

// func (h *FileHandler) startScan(rootDir string, isRemote bool, importType string) error {
// 	go func() {
// 		err := filepath.WalkDir(rootDir, func(path string, d os.DirEntry, err error) error {
// 			if err != nil || d.IsDir() {
// 				return nil
// 			}

// 			fileName := strings.ToLower(d.Name())

// 			if strings.HasSuffix(fileName, ".model3.json") {
// 				// asset := h.live2dService.ProcessLive2D(path)
// 				// runtime.EventsEmit(h.ctx, "live2d_discovered", asset)
// 				return nil
// 			}

// 			ext := strings.ToLower(filepath.Ext(path))
// 			if ext == ".skel" || (ext == ".json" && !strings.Contains(fileName, "model3")) {
// 				asset := h.spineService.ProcessSingleAsset(path)
// 				if asset != nil {
// 					asset.IsRemote = isRemote
// 					runtime.EventsEmit(h.ctx, "spine_discovered", asset)
// 				}
// 			}

// 			return nil
// 		})

// 		if err != nil {
// 			fmt.Println("Scan error:", err)
// 		}
// 		runtime.EventsEmit(h.ctx, "scan_complete", true)
// 	}()
// 	return nil
// }