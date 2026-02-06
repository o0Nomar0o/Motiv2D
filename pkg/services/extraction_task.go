package services

type TaskStatus int

const (
    StatusPending TaskStatus = iota
    StatusRunning
    StatusCompleted
    StatusFailed
)

type ExtractionTask struct {
    SourcePath      string
    OutputPath      string
    Status          TaskStatus
    Attempts        int
    Name            string
}