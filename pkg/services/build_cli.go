package services

import (
	"fmt"
	"strings"
)

func (s *CLIService) BuildCLICommand(opts ExtractionOptions, taskSource string, taskOutput string) []string {

	args := []string{s.Config.DLLPath, taskSource}

	if opts.ActivePreset == "live2d" {
		args = append(args, "-m", "live2d")
	}

	args = append(args, "-o", taskOutput)

	switch opts.ActivePreset {
	case "live2d":
		args = append(args, "--l2d-group-option", "fileName")
		args = append(args, "--l2d-search-by-filename")

	case "spine":
		spineTypes := []string{"Texture2D", "TextAsset"}
		args = append(args, "-t", strings.Join(spineTypes, ","))
	}

	if opts.Decompress {
		args = append(args, "--decompress-to-disk")
	}

	if opts.MaxTasks > 0 {
		args = append(args, "--max-export-tasks", fmt.Sprint(opts.MaxTasks))
	}

	if opts.Regex != "" {
		args = append(args, "--filter-with-regex")
		args = append(args, "--filter-by-name", opts.Regex)
	}

	if opts.UnityVersion != "" {
		args = append(args, "--unity-version", opts.UnityVersion)
	}

	fmt.Printf("Full Command: dotnet %s\n", strings.Join(args, " "))

	return args
}
