package common

import (
	"context"
)

type SpineCommons struct {
	ctx context.Context
}

func NewSpineCommon() *SpineCommons {
	return &SpineCommons{}
}

func (s *SpineCommons) Startup(ctx context.Context) {
	s.ctx = ctx
}