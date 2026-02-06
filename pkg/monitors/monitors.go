package monitors

import (
	"context"
)

type RunAnalyze struct {
	ctx context.Context
}

func NewAnalyzeService() *RunAnalyze {
	return &RunAnalyze{}
}

func (s *RunAnalyze) Startup(ctx context.Context) {
	s.ctx = ctx
}