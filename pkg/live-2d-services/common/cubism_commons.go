package common

import (
	"context"
)

type CubismCommons struct {
	ctx context.Context
}

func NewCubismCommon() *CubismCommons {
	return &CubismCommons{}
}

func (s *CubismCommons) Startup(ctx context.Context) {
	s.ctx = ctx
}
