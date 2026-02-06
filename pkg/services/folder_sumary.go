package services

type FolderSummary struct {
    FolderCount int    `json:"folderCount"`
    FileCount   int    `json:"fileCount"` 
    TotalSize   string `json:"totalSize"`
}