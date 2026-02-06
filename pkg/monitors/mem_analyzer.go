package monitors

import (
	"os"
	"runtime"

	"github.com/shirou/gopsutil/v3/process"
)

type MemoryStats struct {
	Alloc       uint64 `json:"alloc"`
	MainRSS     uint64 `json:"mainRss"`
	ChildrenRSS uint64 `json:"childrenRss"` 
	Total       uint64 `json:"total"`
	WorkerCount int    `json:"workerCount"`
}

func (a *RunAnalyze) GetMemoryStats() MemoryStats {

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	p, err := process.NewProcess(int32(os.Getpid()))
	
	if err != nil {
		return MemoryStats{Alloc: m.Alloc / 1024 / 1024}
	}

	memInfo, _ := p.MemoryInfo()
	mainRSS := memInfo.RSS
	var childrenRSS uint64
	var count int

	children, _ := p.Children()

	for _, child := range children {

		name, _ := child.Name()

		if name == "dotnet" {
			if childMem, err := child.MemoryInfo(); err == nil {
				childrenRSS += childMem.RSS
				count++
			}
		}

	}

	return MemoryStats{
		Alloc:       m.Alloc / 1024 / 1024,
		MainRSS:     mainRSS / 1024 / 1024,
		ChildrenRSS: childrenRSS / 1024 / 1024,
		Total:       (mainRSS + childrenRSS) / 1024 / 1024,
		WorkerCount: count,
	}
}