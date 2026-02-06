package spineservices

import (
	"context"
)

type SpineServices struct {
	ctx context.Context
}

func NewSpineService() *SpineServices {
	return &SpineServices{}
}

func (s *SpineServices) Startup(ctx context.Context) {
	s.ctx = ctx
}