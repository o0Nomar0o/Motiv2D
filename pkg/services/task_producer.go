package services

import (
	"io/fs"
	"path/filepath"
)

func (s *CLIService) OldQueueTasks(opts ExtractionOptions) error {
    
    processedFolders := make(map[string]bool)

    task := ExtractionTask{
        SourcePath: opts.InputPath,
        OutputPath: s.getUniquePath(filepath.Join(opts.OutputPath, "RootFiles")),
        Name:       "Root_Assets",
        Status:     StatusPending,
    }
    s.taskQueue <- WorkPackage{Task: task, Options: opts}
    processedFolders[opts.InputPath] = true

    err := filepath.WalkDir(opts.InputPath, func(path string, d fs.DirEntry, err error) error {
        if err != nil { return err }
        
        if d.IsDir() && path != opts.InputPath {
            parentFolder := path
            
            if !processedFolders[parentFolder] {
                task := ExtractionTask{
                    SourcePath: parentFolder,
                    OutputPath: s.getUniquePath(filepath.Join(opts.OutputPath, filepath.Base(parentFolder))),
                    Name:       filepath.Base(parentFolder),
                    Status:     StatusPending, 
                }

                s.taskQueue <- WorkPackage{Task: task, Options: opts}
                processedFolders[parentFolder] = true
            }
     
            return filepath.SkipDir 
        }

        return nil
    })

    return err
}

func (s *CLIService) QueueTasks(opts ExtractionOptions) error {

    processed := make(map[string]bool)

    err := filepath.WalkDir(opts.InputPath, func(path string, d fs.DirEntry, err error) error {
        if err != nil { return err }
        
        if !d.IsDir() {
            parentFolder := filepath.Dir(path)

            if !processed[parentFolder] {
                task := ExtractionTask{
                    SourcePath: parentFolder,
                    OutputPath: opts.OutputPath,
                    Name:       filepath.Base(parentFolder),
                    Status:     StatusPending, 
                }
                s.taskQueue <- WorkPackage{Task: task, Options: opts}
                processed[parentFolder] = true
            }
        }
        return nil
    })
    return err
}