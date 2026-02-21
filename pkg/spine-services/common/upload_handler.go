package common

import (
	"bufio"
	"fmt"
	"motiv2d/pkg/spine-services/detector"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (s *SpineCommons) SelectFolder() ([]SpineMetadata, error) {

	dir, err := runtime.OpenDirectoryDialog(s.ctx, runtime.OpenDialogOptions{
		Title: "Select Spine Asset Folder",
	})

	if err != nil || dir == "" {
		return nil, err
	}

	// Read all files in the folder
	entries, _ := os.ReadDir(dir)
	var paths []string
	for _, e := range entries {
		if !e.IsDir() {
			paths = append(paths, filepath.Join(dir, e.Name()))
		}
	}

	return s.GroupFilesIntoAssets(paths), nil
}

func (s *SpineCommons) SelectFiles() ([]SpineMetadata, error) {

	files, err := runtime.OpenMultipleFilesDialog(s.ctx, runtime.OpenDialogOptions{
		Title: "Select Spine Files (.skel, .json, .atlas, .png)",
		Filters: []runtime.FileFilter{
			{DisplayName: "Spine Assets", Pattern: "*.skel;*.json;*.atlas;*.png"},
		},
	})

	if err != nil || len(files) == 0 {
		return nil, err
	}

	return s.GroupFilesIntoAssets(files), nil
}

func (s *SpineCommons) GroupFilesIntoAssets(paths []string) []SpineMetadata {
	allFiles := make(map[string]string)
	for _, p := range paths {
		allFiles[filepath.Base(p)] = p
	}

	skelPaths := []string{}
	atlasPaths := []string{}

	for _, p := range paths {
		ext := strings.ToLower(filepath.Ext(p))
		switch ext {
		case ".skel", ".json":
			skelPaths = append(skelPaths, p)
		case ".atlas":
			atlasPaths = append(atlasPaths, p)
		}
	}

	var results []SpineMetadata

	for _, sp := range skelPaths {
		ext := filepath.Ext(sp)
		baseName := strings.TrimSuffix(filepath.Base(sp), ext)

		f, _ := os.Open(sp)
		header := make([]byte, 1)
		f.Read(header)
		f.Close()

		isJsonContent := header[0] == 0x7B

		asset := SpineMetadata{
			ID:        baseName,
			IsBinary:  ext == ".skel" && !isJsonContent,
			HasSkel:   true,
			IsRemote:  false,
			SourceURL: "",
			SkelFile: FileInfo{
				Name:      filepath.Base(sp),
				LocalPath: sp,
				URL:       "/spine-assets/" + url.PathEscape(filepath.ToSlash(sp)),
			},
		}

		if isJsonContent {
			fmt.Printf("INFO [%s]: Detected JSON content in file with %s extension. Forcing JSON loader.\n", filepath.Base(sp), ext)
		}

		atlasName := baseName + ".atlas"
		targetAtlas := ""
		if ap, ok := allFiles[atlasName]; ok {
			targetAtlas = ap
		} else if len(atlasPaths) > 0 {
			targetAtlas = atlasPaths[0]
		}

		if targetAtlas != "" {
			asset.AtlasFile = FileInfo{
				Name:      filepath.Base(targetAtlas),
				LocalPath: targetAtlas,
				URL:       "/spine-assets/" + url.PathEscape(filepath.ToSlash(targetAtlas)),
			}
			asset.HasAtlas = true
			asset.DefaultPMA = checkPMAInAtlas(targetAtlas)

			requiredPngs := parsePngsFromAtlas(targetAtlas)
			for _, pngName := range requiredPngs {
				if fullPath, exists := allFiles[pngName]; exists {
					asset.PngFiles = append(asset.PngFiles, FileInfo{
						Name:      pngName,
						LocalPath: fullPath,
						URL:       "/spine-assets/" + url.PathEscape(filepath.ToSlash(fullPath)),
					})
				} else {
					asset.MissingPng = append(asset.MissingPng, pngName)
				}
			}
		}
		ver, _ := detector.DetectVersion(sp, asset.IsBinary)
		asset.Version = ver
		// f, _ := os.Open(sp)
		// header := make([]byte, 16)
		// f.Read(header)
		// f.Close()
		// fmt.Printf("DEBUG [%s] Header: %X\n", filepath.Base(sp), header)
		// f, _ := os.Open(sp)
		// header := make([]byte, 32)
		// f.Read(header)
		// f.Close()
		// fmt.Printf("RAW HEADER [%s]: %X\n", filepath.Base(sp), header)

		results = append(results, asset)
	}
	return results
}

func parsePngsFromAtlas(path string) []string {

	var pngs []string
	file, err := os.Open(path)

	if err != nil {
		return pngs
	}

	defer file.Close()

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if strings.HasSuffix(strings.ToLower(line), ".png") {
			pngs = append(pngs, line)
		}

	}

	return pngs
}

func (s *SpineCommons) ImportFromDialog() error {
	return s.RecursiveImport("", false)
}

func (s *SpineCommons) ImportFromCache(cachePath string) error {
	return s.RecursiveImport(cachePath, true)
}

func (s *SpineCommons) RecursiveImport(dir string, isRemote bool) error {

	// dir, err := runtime.OpenDirectoryDialog(s.ctx, runtime.OpenDialogOptions{
	// 	Title: "Select Root Folder containing Spine Assets",
	// })
	if dir == "" {
		var err error
		dir, err = runtime.OpenDirectoryDialog(s.ctx, runtime.OpenDialogOptions{
			Title: "Select Root Folder containing Spine Assets",
		})
		if err != nil || dir == "" {
			return err
		}
	}

	// if err != nil || dir == "" {
	// 	return err
	// }

	go func() {

		err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {

			if err != nil {
				return nil
			}

			if !d.IsDir() {

				ext := strings.ToLower(filepath.Ext(path))

				if ext == ".skel" || ext == ".json" {
					asset := s.ProcessSingleAsset(path)

					if asset != nil {
						if isRemote {
							asset.IsRemote = isRemote

							relPath, err := filepath.Rel(dir, path)
							if err == nil {
								parts := strings.Split(filepath.ToSlash(relPath), "/")
								if len(parts) >= 2 {
									// The first part of the relative path is your sourceName
									asset.SourceName = parts[0]
								}
							}
						}
						runtime.EventsEmit(s.ctx, "asset_discovered", asset)
						time.Sleep(1 * time.Millisecond)
					}

				}

			}
			return nil
		})

		if err != nil {
			fmt.Println("Scan error:", err)
		}

		runtime.EventsEmit(s.ctx, "scan_complete", true)
	}()

	return nil
}

func (s *SpineCommons) ProcessSingleAsset(skelPath string) *SpineMetadata {

	dir := filepath.Dir(skelPath)
	baseName := strings.TrimSuffix(filepath.Base(skelPath), filepath.Ext(skelPath))

	entries, _ := os.ReadDir(dir)
	var localPaths []string
	for _, e := range entries {
		if !e.IsDir() {
			localPaths = append(localPaths, filepath.Join(dir, e.Name()))
		}
	}

	results := s.GroupFilesIntoAssets(localPaths)

	for _, r := range results {
		if r.ID == baseName {
			return &r
		}
	}
	return nil
}

func checkPMAInAtlas(path string) bool {

	data, _ := os.ReadFile(path)

	return strings.Contains(string(data), "pma: true") ||
		strings.Contains(string(data), "premultiplyAlpha: true") ||
		strings.Contains(string(data), "premultiplyAlpha:true") ||
		strings.Contains(string(data), "pma:true")

}
