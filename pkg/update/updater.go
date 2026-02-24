package update

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	_ "embed"
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

//go:embed version.json
var versionData []byte
type AppMetadata struct {
	AppName        string `json:"appName"`
	SemVer         string `json:"semVer"`
	DisplayVersion string `json:"displayVersion"`
	BuildDate      string `json:"buildDate"`
	License        string `json:"license"`
	Author         string `json:"author"`
	Links          []MetadataLink `json:"links"`
}

type MetadataLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

func (u *UpdaterService) GetMetadata() (AppMetadata, error) {
	var meta AppMetadata
	err := json.Unmarshal(versionData, &meta)
	return meta, err
}

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
		return fmt.Sprintf("windows_%s_%s_embed", BuildVariant, runtime.GOARCH)
	}

	fmt.Printf("darwin_%s", runtime.GOARCH)
	return fmt.Sprintf("darwin_%s", runtime.GOARCH)
}

func (u *UpdaterService) CheckForUpdates() (*CheckUpdateResponse, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	const ManifestURL = "https://cdn.jsdelivr.net/gh/o0Nomar0o/Motiv2D@main/update.json"

	req, err := http.NewRequest("GET", ManifestURL, nil)
	if err != nil {
		return nil, err
	}
	defer req.Body.Close()

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
	fmt.Printf("DEBUG: App is searching for platform key: '%s'\n", platformKey)
	data, exists := m.Platforms[platformKey]
	fmt.Printf("DEBUG: PlatformKey Generated: [%s] | Found in Manifest: %v\n", platformKey, exists)

	if !exists {
		return &CheckUpdateResponse{Available: false}, nil
	}

	meta, err := u.GetMetadata()
    if err != nil {
        return nil, fmt.Errorf("failed to read local version: %w", err)
    }

	vCurrent, err := semver.Parse(meta.SemVer)
	// vCurrent, _ := semver.Parse(CurrentAppVersion)

	vRemote, err := semver.Parse(m.Version)
	if err != nil {
		return nil, fmt.Errorf("remote version error: %w", err)
	}

	isNewer := vRemote.GT(vCurrent)
	fmt.Printf("DEBUG: Version Check - Current: %s | Remote: %s | IsNewer: %v\n", vCurrent, vRemote, isNewer)

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

	err = selfupdate.Apply(bytes.NewReader(updateData), selfupdate.Options{})
	if err != nil {
		return fmt.Errorf("failed to apply update: %w", err)
	}

	u.restartApp()
	return nil
}

func (u *UpdaterService) applyMacUpdate(data []byte) error {

	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return err
	}

	var binData []byte
	for _, f := range r.File {

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
