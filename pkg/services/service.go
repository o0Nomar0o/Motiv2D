package services

import (
	"context"
	"fmt"
	"os"
)

type CLIService struct {
	ctx       context.Context
	taskQueue chan WorkPackage
	Config    *Config
}

func NewCLIService() *CLIService {

	return &CLIService{
		taskQueue: make(chan WorkPackage, 100),
	}

}

func (s *CLIService) Startup(ctx context.Context) {

	s.ctx = ctx

	placeholder := ""
	cfg, err := s.LoadConfig()

	if err != nil {

		if os.IsNotExist(err) {

			defaultCfg := &Config{
				DLLPath:    placeholder,
				Decompress: true,
				MaxTasks:   3,
				Shortcuts: GetDefaultShortcuts(),
			}

			s.SaveConfig(*defaultCfg)
			s.Config = defaultCfg

		} else {
			fmt.Printf("Error loading config: %v\n", err)
		}

	} else {
		s.Config = cfg
	}

	go s.startWorker()

}
