package handler

import (
	"context"
	"motiv2d/pkg/spine-services/common"
)

type FileHandler struct {
	ctx          context.Context
	spineService *common.SpineCommons
}

func NewFileHandler(spine *common.SpineCommons) *FileHandler {
	return &FileHandler{
		spineService: spine,
	}
}

func (h *FileHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}