package update

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"runtime"
	"time"

	"github.com/blang/semver"
	"github.com/minio/selfupdate"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const CurrentAppVersion = "1.0.0"

var BuildVariant = "standard"

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

func (u *UpdaterService) getPlatformKey() string {
	if runtime.GOOS == "windows" {
		// Matches your YAML: windows_standard_amd64 or windows_frameless_amd64
		return fmt.Sprintf("windows_%s_%s", BuildVariant, runtime.GOARCH)
	}
	// Matches your YAML: darwin_arm64 or darwin_amd64
	return fmt.Sprintf("darwin_%s", runtime.GOARCH)
}

func (u *UpdaterService) CheckForUpdates() (*CheckUpdateResponse, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	const ManifestURL = "https://cdn.jsdelivr.net/gh/o0Nomar0o/Motiv2D@main/update.json"

	req, err := http.NewRequest("GET", ManifestURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Motiv2D-Updater")

	resp, err := client.Do(req)
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

	platformKey := u.getPlatformKey()
	data, exists := m.Platforms[platformKey]
	if !exists {
		return &CheckUpdateResponse{Available: false}, nil
	}

	vCurrent, _ := semver.Parse(CurrentAppVersion)
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
	client := &http.Client{Timeout: 15 * time.Minute}
	resp, err := client.Get(info.URL)
	if err != nil {
		return fmt.Errorf("failed to start download: %w", err)
	}
	defer resp.Body.Close()

	// Assuming ProgressReader is defined in your progress_reader.go
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
		return fmt.Errorf("security mismatch! expected %s, got %s", info.Checksum, downloadedHash)
	}

	updateData := buf.Bytes()

	if runtime.GOOS == "darwin" {
		return u.applyMacUpdate(updateData)
	}

	// Standard Windows Binary Swap
	err = selfupdate.Apply(bytes.NewReader(updateData), selfupdate.Options{})
	if err != nil {
		return fmt.Errorf("failed to apply update: %w", err)
	}

	u.restartApp()
	return nil
}

func (u *UpdaterService) applyMacUpdate(data []byte) error {
	// For Mac, we download a .zip. We need to extract the binary
	// from motiv2d.app/Contents/MacOS/motiv2d to use selfupdate.
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return err
	}

	var binData []byte
	for _, f := range r.File {
		// Look for the inner binary inside the app bundle
		if filepath.Base(f.Name) == "motiv2d" && !f.FileInfo().IsDir() {
			rc, err := f.Open()
			if err != nil {
				return err
			}
			binData, _ = io.ReadAll(rc)
			rc.Close()
			break
		}
	}

	if len(binData) == 0 {
		return fmt.Errorf("could not find binary inside macos zip")
	}

	err = selfupdate.Apply(bytes.NewReader(binData), selfupdate.Options{})
	if err != nil {
		return err
	}

	u.restartApp()
	return nil
}

func (u *UpdaterService) restartApp() {
	wailsRuntime.MessageDialog(u.ctx, wailsRuntime.MessageDialogOptions{
		Type:    wailsRuntime.InfoDialog,
		Title:   "Update Successful",
		Message: "The app has been updated and will now restart.",
	})
	wailsRuntime.Quit(u.ctx)
}
