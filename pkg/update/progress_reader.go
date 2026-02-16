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
	"time"

	"github.com/blang/semver"
	"github.com/minio/selfupdate"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const CurrentAppVersion = "1.0.0"

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

type CheckUpdateResponse struct {
	Available bool       `json:"available"`
	Info      UpdateInfo `json:"info"`
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

	client := &http.Client{Timeout: 10 * time.Second}

	const ManifestURL = "https://raw.githubusercontent.com/o0Nomar0o/Motiv2D/main/update.json"

	resp, err := client.Get(ManifestURL)

	if err != nil {
		return nil, fmt.Errorf("network error: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("server error: %d", resp.StatusCode)
	}

	var m Manifest

	if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
		return nil, fmt.Errorf("failed to parse manifest: %w", err)
	}

	data, exists := m.Platforms[runtime.GOOS]

	if !exists {
		return &CheckUpdateResponse{Available: false}, nil
	}

	vCurrent, err := semver.Parse(CurrentAppVersion)

	if err != nil {
		return nil, fmt.Errorf("internal version error: %w", err)
	}

	vRemote, err := semver.Parse(m.Version)

	if err != nil {
		return nil, fmt.Errorf("remote version error: %w", err)
	}

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

	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Get(info.URL)

	if err != nil {
		return fmt.Errorf("failed to start download: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download server returned %d", resp.StatusCode)
	}

	progressReader := &ProgressReader{
		Reader: resp.Body,
		Total:  resp.ContentLength,
		u:      u,
	}

	var buf bytes.Buffer
	hasher := sha256.New()
	teeReader := io.TeeReader(progressReader, &buf)

	if _, err := io.Copy(hasher, teeReader); err != nil {
		return fmt.Errorf("interrupted download: %w", err)
	}

	downloadedHash := hex.EncodeToString(hasher.Sum(nil))

	if downloadedHash != info.Checksum {
		return fmt.Errorf("security mismatch: expected %s, got %s", info.Checksum, downloadedHash)
	}

	err = selfupdate.Apply(bytes.NewReader(buf.Bytes()), selfupdate.Options{})

	if err != nil {
		return fmt.Errorf("failed to apply binary swap: %w", err)
	}

	wailsRuntime.MessageDialog(u.ctx, wailsRuntime.MessageDialogOptions{
		Type:    wailsRuntime.InfoDialog,
		Title:   "Update Successful",
		Message: "The app has been updated. It will now restart to apply changes.",
	})

	wailsRuntime.Quit(u.ctx)

	return nil
}
