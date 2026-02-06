package update

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"runtime"

	"github.com/blang/semver"
	"github.com/minio/selfupdate"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type CheckUpdateResponse struct {
	Available bool       `json:"available"`
	Info      UpdateInfo `json:"info"`
}

type UpdateInfo struct {
	Version   string `json:"version"`
	URL       string `json:"url"`
	Changelog string `json:"changelog"`
	Checksum  string `json:"checksum"`
}

type Manifest struct {
	Version   string `json:"version"`
	Changelog string `json:"changelog"`
	Platforms map[string]struct {
		URL      string `json:"url"`
		Checksum string `json:"checksum"`
	} `json:"platforms"`
}

type UpdaterService struct {
	ctx context.Context
}

func NewUpdaterService() *UpdaterService {
	return &UpdaterService{}
}

func (u *UpdaterService) Startup(ctx context.Context) {
	u.ctx = ctx
}

func (u *UpdaterService) CheckForUpdates() (*CheckUpdateResponse, error) {
	const CurrentVersion = "1.0.0"
	const ManifestURL = "https://your-api.com/update.json"

	resp, err := http.Get(ManifestURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var m Manifest
	if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
		return nil, err
	}

	data, exists := m.Platforms[runtime.GOOS]
	if !exists {
		return nil, fmt.Errorf("platform %s not supported", runtime.GOOS)
	}

	vCurrent := semver.MustParse(CurrentVersion)
	vRemote, _ := semver.Parse(m.Version)

	return &CheckUpdateResponse{
		Available: vRemote.GT(vCurrent),
		Info: UpdateInfo{
			Version:   m.Version,
			Changelog: m.Changelog,
			URL:       data.URL,
			Checksum:  data.Checksum,
		},
	}, nil
}

func (u *UpdaterService) ProcessUpdate(info UpdateInfo) error {
	resp, err := http.Get(info.URL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned non-200 status: %d", resp.StatusCode)
	}

	progressReader := &ProgressReader{
		Reader: resp.Body,
		Total:  resp.ContentLength,
		u:      u,
	}

	body, err := io.ReadAll(progressReader)
	if err != nil {
		return err
	}

	hash := sha256.Sum256(body)
	if hex.EncodeToString(hash[:]) != info.Checksum {
		return fmt.Errorf("checksum mismatch: security risk or corrupted download")
	}

	err = selfupdate.Apply(bytes.NewReader(body), selfupdate.Options{})
	if err != nil {
		return err
	}

	wailsRuntime.MessageDialog(u.ctx, wailsRuntime.MessageDialogOptions{
		Type:    wailsRuntime.InfoDialog,
		Title:   "Update Complete",
		Message: "The application has been updated successfully. Please restart to apply changes.",
	})

	return nil
}