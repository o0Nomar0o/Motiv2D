package common

import (
	"encoding/json"
	"fmt"
	"motiv2d/pkg/common"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (s *CubismCommons) ImportFromDialog() error {
	dir, err := runtime.OpenDirectoryDialog(s.ctx, runtime.OpenDialogOptions{
		Title: "Select Root Folder containing Live2D Assets",
	})
	if err != nil || dir == "" {
		return err
	}

	go s.recursiveImport(dir, false)
	return nil
}

func (s *CubismCommons) recursiveImport(rootSearchDir string, isRemote bool) {
	err := filepath.WalkDir(rootSearchDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		//.model3.json
		if !d.IsDir() && strings.HasSuffix(strings.ToLower(d.Name()), ".model3.json") {
			asset := s.ProcessLive2DAsset(path)
			if asset != nil {
				asset.IsRemote = isRemote
				
				if isRemote {
					relPath, _ := filepath.Rel(rootSearchDir, path)
					parts := strings.Split(filepath.ToSlash(relPath), "/")
					if len(parts) >= 2 {
						asset.SourceName = parts[0]
					}
				}

				// Emit event to frontend
				runtime.EventsEmit(s.ctx, "live2d_discovered", asset)
				time.Sleep(1 * time.Millisecond)
			}
		}
		return nil
	})

	if err != nil {
		fmt.Println("Live2D Scan error:", err)
	}
	runtime.EventsEmit(s.ctx, "scan_complete", true)
}

func (s *CubismCommons) ProcessLive2DAsset(modelJsonPath string) *Live2DMetadata {
	data, err := os.ReadFile(modelJsonPath)
	if err != nil {
		return nil
	}

	var m3 Model3Json
	if err := json.Unmarshal(data, &m3); err != nil {
		fmt.Printf("Error parsing Live2D JSON %s: %v\n", modelJsonPath, err)
		return nil
	}

	modelDir := filepath.Dir(modelJsonPath)
	assetID := filepath.Base(modelDir)

	createFileInfo := func(relativePath string) common.FileInfo {
		fullPath := filepath.Join(modelDir, relativePath)
		return common.FileInfo{
			Name:      filepath.Base(fullPath),
			LocalPath: fullPath,
			URL: "/spine-assets/" + url.PathEscape(filepath.ToSlash(fullPath)),
		}
	}

	if m3.FileReferences.Moc == "" {
		return nil
	}

	asset := &Live2DMetadata{
		ID:            assetID,
		Version:       fmt.Sprintf("Cubism %d", m3.Version),
		ModelJSONFile: createFileInfo(filepath.Base(modelJsonPath)),
		MocFile:       createFileInfo(m3.FileReferences.Moc),
	}

	for _, texPath := range m3.FileReferences.Textures {
		asset.TextureFiles = append(asset.TextureFiles, createFileInfo(texPath))
	}

	return asset
}