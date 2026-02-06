package remote

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"
)


type RemoteHandler struct {
	ctx     context.Context
	client  *http.Client
	storage *ConfigManager 
}

func NewRemoteHandler() *RemoteHandler {
	store, _ := NewConfigManager()
	
	return &RemoteHandler{
		client:  &http.Client{Timeout: 30 * time.Second},
		storage: store,
	}
}

func (h *RemoteHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *RemoteHandler) GetRemotes() ([]RemoteSource, error) {
	return h.storage.LoadRemotes()
}

func (h *RemoteHandler) SaveRemote(source RemoteSource) error {
	remotes, err := h.storage.LoadRemotes()

	if err != nil {
		remotes = []RemoteSource{}
	}

	found := false

	for i, r := range remotes {
		if r.ID == source.ID {
			remotes[i] = source
			found = true
			break
		}
	}

	if !found {
		remotes = append(remotes, source)
	}

	return h.storage.SaveRemotes(remotes)
}

func (h *RemoteHandler) DeleteRemote(id string) error {

	remotes, err := h.storage.LoadRemotes()

	if err != nil {
		return err
	}

	var updated []RemoteSource

	for _, r := range remotes {
		if r.ID != id {
			updated = append(updated, r)
		}
	}

	h.storage.DeleteCache(id)

	return h.storage.SaveRemotes(updated)
}


type Manifest struct {
	Assets []RemoteAsset `json:"assets"`
}


func (h *RemoteHandler) GetCachePath() (string, error) {

	configDir, err := os.UserConfigDir()
	
	if err != nil {
		return "", fmt.Errorf("could not find user config directory: %w", err)
	}

	cacheFolder := filepath.Join(configDir, "AssetStudioGo", "cache_assets")

	if _, err := os.Stat(cacheFolder); os.IsNotExist(err) {
		if err := os.MkdirAll(cacheFolder, 0755); err != nil {
			return "", fmt.Errorf("failed to create cache folder: %w", err)
		}
	}

	return cacheFolder, nil
}
