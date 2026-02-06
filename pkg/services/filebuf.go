package services

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (s *CLIService) SelectFolder() string {

	selection, err := runtime.OpenDirectoryDialog(s.ctx, runtime.OpenDialogOptions{

		Title: "Select Asset Folder",
	})

	if err != nil {
		return ""
	}

	return selection

}

func (s *CLIService) SelectExportFolder() string {
    selection, err := runtime.SaveFileDialog(s.ctx, runtime.SaveDialogOptions{
        Title:           "Select or Create Export Destination",
        DefaultFilename: "ExtractedAssets",
    })

    if err != nil || selection == "" {
        return ""
    }
    
    return selection
}

func (s *CLIService) AnalyzeFolder(inputPath string) (FolderSummary, error) {

	var summary FolderSummary
	var totalSizeBytes int64

	err := filepath.WalkDir(inputPath, func(path string, d fs.DirEntry, err error) error {

		if err != nil { return err }

		if d.IsDir(){ 

			summary.FolderCount++

		} else {

			summary.FileCount++
			info, err := d.Info()

			if err == nil { totalSizeBytes += info.Size() }
		}

		return nil

	})

	if err != nil { return summary, err }

	summary.TotalSize = formatBytes(totalSizeBytes)
	return summary, nil

}

func (s *CLIService) getUniquePath(targetPath string) string {

	if _, err := os.Stat(targetPath); os.IsNotExist(err){
		return targetPath
	} 

	counter := 1
	newPath := targetPath

	for{

		newPath = fmt.Sprintf("%s-%d", targetPath, counter)

			if _, err := os.Stat(newPath); os.IsNotExist(err){
				break
			}

			counter++
	}

	return newPath
}

func formatBytes(b int64) string {

	const unit = 1024

	if b < unit {
		return fmt.Sprintf("% d B", b)
	}

	div, exp := int64(unit), 0

	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}

	return fmt.Sprintf("%.2f %cB", float64(b)/float64(div), "KMGTPE"[exp])

}
