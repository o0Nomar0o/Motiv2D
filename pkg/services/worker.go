package services

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type WorkPackage struct {
    Task    ExtractionTask
    Options ExtractionOptions
}

func (s *CLIService) startWorker() {
    for task := range s.taskQueue{
        s.runTask(task.Task, task.Options)
    }
}

func (s *CLIService) runTask(task ExtractionTask, opts ExtractionOptions){

    task.Status = StatusRunning
    runtime.EventsEmit(s.ctx, "task_update", task)

    fullArgs := s.BuildCLICommand(opts, task.SourcePath, task.OutputPath)
    cmd := exec.Command("dotnet", fullArgs...)

    stdout, _ := cmd.StdoutPipe()
	scanner := bufio.NewScanner(stdout)

    stderr, _ := cmd.StderrPipe()

	go func() {
		errScanner := bufio.NewScanner(stderr)
		for errScanner.Scan() {
			fmt.Printf("CLI STDERR: %s\n", errScanner.Text())
		}
	}()

	go func() {
		outScanner := bufio.NewScanner(stdout)
		for outScanner.Scan() {
			fmt.Printf("CLI STDOUT: %s\n", outScanner.Text())
		}
	}()

    go func() {
		for scanner.Scan() {
			line := scanner.Text()
			runtime.EventsEmit(s.ctx, "cli_log", map[string]string{
				"name":    task.Name,
				"message": line,
			})
		}
	}()

    err := cmd.Run()

	if err != nil {
		task.Status = StatusFailed
	} else {
		task.Status = StatusCompleted
        s.renameToMeaningful(task)
	}

    runtime.EventsEmit(s.ctx, "task_update", task)
}

func (s *CLIService) renameToMeaningful(task ExtractionTask) {
    files, err := os.ReadDir(task.OutputPath)
    if err != nil || len(files) == 0 { return }

    counts := make(map[string]int)
    for _, f := range files {
        name := f.Name()
        base := strings.Split(name, ".")[0]
        counts[base]++
    }

    var bestName string
    maxCount := 0
    for name, count := range counts {
        if count > maxCount {
            maxCount = count
            bestName = name
        }
    }

    if bestName != "" && bestName != task.Name {
        newPath := filepath.Join(filepath.Dir(task.OutputPath), bestName)
        // Ensure the new name is unique (using your existing helper)
        finalPath := s.getUniquePath(newPath)
        os.Rename(task.OutputPath, finalPath)
    }
}