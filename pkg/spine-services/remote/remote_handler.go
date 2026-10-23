package remote

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"motiv2d/pkg/spine-services/common"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type ProgressWriter struct {
	Writer io.Writer
	OnProgress func(bytesWritten int)
}

func (pw *ProgressWriter) Write(p []byte) (int, error) {
	n, err := pw.Writer.Write(p)
	if n > 0 && pw.OnProgress != nil {
		pw.OnProgress(n)
	}
	return n, err
}

func (h *RemoteHandler) PauseDownload(assetID string) {
	if cancelVal, ok := h.activeDownloads.Load(assetID); ok {
		cancel := cancelVal.(context.CancelFunc)
		cancel()
		h.activeDownloads.Delete(assetID)
	}
}

func (h *RemoteHandler) CancelDownload(sourceName string, assetID string) error {
	h.PauseDownload(assetID)

	err := h.RemoveAssetCache(sourceName, assetID)

	wailsRuntime.EventsEmit(h.ctx, "remote:download_progress", DownloadProgress{
		AssetID:    assetID,
		SourceName: sourceName,
		Status:     "canceled",
	})

	return err
}

func (h *RemoteHandler) CheckSourceHealth(url string) bool {
    checkURL := url

    if strings.Contains(url, "api.github.com/repos/") {
        checkURL = strings.Replace(url, "api.github.com/repos/", "github.com/", 1)
        
        if idx := strings.Index(checkURL, "/git/trees/"); idx != -1 {
            checkURL = checkURL[:idx]
        }

    }

    client := &http.Client{
        Timeout: 5 * time.Second,
    }

    req, _ := http.NewRequest("GET", checkURL, nil) 
    req.Header.Set("User-Agent", "Motiv2D-HealthCheck/1.0")

    resp, err := client.Do(req)
    
    if err != nil {
        fmt.Printf("[HealthCheck] Error pinging %s: %v\n", checkURL, err)
        return false
    }

    defer resp.Body.Close()

    fmt.Printf("[HealthCheck] URL: %s | Status: %d\n", checkURL, resp.StatusCode)

    return resp.StatusCode == http.StatusOK
}

func (h *RemoteHandler) FetchRemoteAssets(
	sourceID string,
	sourceName string,
	baseURL string,
	metaURL string,
	remoteRoot string,
	mode string,
	folderPaths []string,
	mappingRules []MappingRule) ([]RemoteAsset, error) {

	rawKey := baseURL + strings.Join(folderPaths, "")
	hash := md5.Sum([]byte(rawKey))
	cacheKey := fmt.Sprintf("gh_cache_%x", hash)

	var cachedAssets []RemoteAsset
	err := h.storage.LoadCache(cacheKey, &cachedAssets)
	if err == nil && len(cachedAssets) > 0 {
		fmt.Printf("CACHE HIT: Loaded %d assets from disk\n", len(cachedAssets))
		return cachedAssets, nil
	}

	var assets []RemoteAsset
	// var err error

	fmt.Printf("SCANNING SOURCE [%s]: %s\n", sourceName, baseURL)

	if strings.Contains(baseURL, "git/trees") {
		assets, err = h.crawlGitHubRecursive(baseURL, remoteRoot, folderPaths, mappingRules)
	} else if strings.Contains(baseURL, "api.github.com") {
		assets, err = h.crawlGitHub(baseURL)
	} else {
		assets, err = h.fetchManifest(baseURL)
	}

	if err != nil {
		fmt.Printf("SCAN ERROR: %v\n", err)
		return nil, err
	}

	for i := range assets {
		assets[i].SourceName = sourceName
	}

	if metaURL != "" {
		fmt.Printf("Applying metadata from: %s\n", metaURL)
		h.applyMetadata(assets, metaURL)
	}

	// De-duplication
	uniqueAssets := make(map[string]RemoteAsset)
	for _, asset := range assets {
		if _, exists := uniqueAssets[asset.ID]; !exists {
			uniqueAssets[asset.ID] = asset
		}
	}

	var finalAssets []RemoteAsset
	for _, asset := range uniqueAssets {
		finalAssets = append(finalAssets, asset)
	}

	sort.Slice(finalAssets, func(i, j int) bool {
		return finalAssets[i].DisplayName < finalAssets[j].DisplayName
	})

	fmt.Printf("SCAN COMPLETE: Found %d assets\n", len(finalAssets))

	if len(finalAssets) > 0 {
		go func(data []RemoteAsset) {
			saveErr := h.storage.SaveCache(cacheKey, data)
			if saveErr != nil {
				fmt.Printf("CACHE SAVE ERROR: %v\n", saveErr)
			}
		}(finalAssets)
	}

	return finalAssets, nil
}

func (h *RemoteHandler) crawlGitHub(apiURL string) ([]RemoteAsset, error) {

	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("User-Agent", "Spine-Explorer-App")

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var items []struct {
		Name string `json:"name"`
		Type string `json:"type"`
		Path string `json:"path"`
	}
	json.NewDecoder(resp.Body).Decode(&items)

	var results []RemoteAsset
	for _, item := range items {
		if item.Type == "dir" {
			results = append(results, RemoteAsset{
				ID:          item.Name,
				DisplayName: item.Name,
				SourceType:  "github",
				BaseURL:     item.Path,
			})
		}
	}
	return results, nil
}

func (h *RemoteHandler) fetchManifest(url string) ([]RemoteAsset, error) {

	resp, err := h.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var manifest Manifest
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return nil, fmt.Errorf("failed to parse manifest: %w", err)
	}

	for i := range manifest.Assets {
		manifest.Assets[i].SourceType = "fileserver"
		if manifest.Assets[i].DisplayName == "" {
			manifest.Assets[i].DisplayName = manifest.Assets[i].ID
		}
	}

	return manifest.Assets, nil
}

func (h *RemoteHandler) crawlGitHubRecursive(
	apiURL string,
	remoteRoot string,
	filterPaths []string,
	mappingRules []MappingRule,
) ([]RemoteAsset, error) {

	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("User-Agent", "Spine-Explorer-App")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub API Error: %d", resp.StatusCode)
	}

	var treeResponse struct {
		Tree []struct {
			Path string `json:"path"`
			Type string `json:"type"`
		} `json:"tree"`
		Truncated bool `json:"truncated"`
	}

	json.NewDecoder(resp.Body).Decode(&treeResponse)
	assetMap := make(map[string]*RemoteAsset)

	if treeResponse.Truncated {
		fmt.Printf("GitHub API truncated results.\n")
	}

	for _, item := range treeResponse.Tree {
		if item.Type != "blob" {
			continue
		}

		allowed := len(filterPaths) == 0
		for _, fp := range filterPaths {
			cleanFp := fp
			if cleanFp != "" && !strings.HasSuffix(cleanFp, "/") {
				cleanFp += "/"
			}
			if strings.HasPrefix(item.Path, cleanFp) {
				allowed = true
				break
			}
		}
		if !allowed {
			continue
		}

		pathLower := strings.ToLower(item.Path)
		if strings.HasSuffix(pathLower, ".skel") || strings.HasSuffix(pathLower, ".json") ||
			strings.HasSuffix(pathLower, ".atlas") || strings.HasSuffix(pathLower, ".png") {

			parts := strings.Split(item.Path, "/")
			if len(parts) < 2 {
				continue
			}

			folderPath := strings.Join(parts[:len(parts)-1], "/")
			fileName := parts[len(parts)-1]

			folderID := parts[len(parts)-2]

			if len(parts) >= 3 {
				parent := strings.ToLower(parts[len(parts)-2])
				if parent == "aim" || parent == "cover" || parent == "sit" {
					charID := parts[len(parts)-3]
					folderID = fmt.Sprintf("%s_%s", charID, parent)
				}
			}

			displayName := folderID
			for _, rule := range mappingRules {
				if strings.Contains(pathLower, strings.ToLower(rule.Key)) {
					displayName = fmt.Sprintf("%s (%s)", folderID, rule.Label)
				}
			}

			if _, exists := assetMap[folderPath]; !exists {
				assetMap[folderPath] = &RemoteAsset{
					ID:          folderID,
					DisplayName: displayName,
					BaseURL:     folderPath,
					RemoteRoot:  remoteRoot,
					Files:       []string{},
				}
			}

			if strings.HasSuffix(pathLower, ".skel") || (strings.HasSuffix(pathLower, ".json") && !strings.Contains(pathLower, "charinfo")) {
				assetMap[folderPath].HasSkel = true
			} else if strings.HasSuffix(pathLower, ".atlas") {
				assetMap[folderPath].HasAtlas = true
			}
			assetMap[folderPath].Files = append(assetMap[folderPath].Files, fileName)
		}
	}

	var results []RemoteAsset
	for _, asset := range assetMap {
		if asset.HasSkel && asset.HasAtlas {
			results = append(results, *asset)
		}
	}
	return results, nil
}

func (h *RemoteHandler) applyMetadata(assets []RemoteAsset, metaURL string) {

	resp, err := h.client.Get(metaURL)
	if err != nil {
		fmt.Printf("Metadata Download Failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	type CharMetadata struct {
		CharName string `json:"charName"`
		Costumes []struct {
			CostumeName string `json:"costumeName"`
			Spine       string `json:"spine"`
			Cutscene    string `json:"cutscene"`
		} `json:"costumes"`
	}

	var allData []CharMetadata
	if err := json.NewDecoder(resp.Body).Decode(&allData); err != nil {
		fmt.Printf("Metadata Parse Error: %v\n", err)
		return
	}

	nameMap := make(map[string]string)
	for _, char := range allData {
		for _, costume := range char.Costumes {
			fullName := fmt.Sprintf("%s - %s", char.CharName, costume.CostumeName)

			if costume.Spine != "" {
				nameMap[costume.Spine] = fullName
			}

			if costume.Cutscene != "" {
				nameMap[costume.Cutscene] = fullName + " (Cutscene)"
			}
		}
	}

	for i := range assets {
		if prettyName, exists := nameMap[assets[i].ID]; exists {
			assets[i].DisplayName = prettyName
		}
	}
}

func (h *RemoteHandler) _DownloadRemoteAsset(asset RemoteAsset) error {

	cacheDir, err := h.GetCachePath()
	if err != nil {
		return err
	}

	localAssetDir := filepath.Join(cacheDir, asset.SourceName, asset.ID)

	err = os.MkdirAll(localAssetDir, 0755)
	if err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	for _, fileName := range asset.Files {
		downloadURL := fmt.Sprintf("%s/%s/%s",
			strings.TrimSuffix(asset.RemoteRoot, "/"),
			strings.Trim(asset.BaseURL, "/"),
			fileName)

		localPath := filepath.Join(localAssetDir, fileName)

		if _, err := os.Stat(localPath); err == nil {
			continue
		}

		if err := h.performDownload(downloadURL, localPath); err != nil {
			return err
		}
	}
	return nil
}

func (h *RemoteHandler) DownloadRemoteAsset(asset RemoteAsset) error {
	cacheDir, err := h.GetCachePath()
	if err != nil {
		return err
	}

	localAssetDir := filepath.Join(cacheDir, asset.SourceName, asset.ID)
	if err := os.MkdirAll(localAssetDir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// 1. Context setup for Pause/Cancel support
	ctx, cancel := context.WithCancel(h.ctx)
	h.activeDownloads.Store(asset.ID, cancel)
	defer h.activeDownloads.Delete(asset.ID)

	// 2. Initialize file progress array
	fileProgressList := make([]FileProgress, len(asset.Files))
	for i, name := range asset.Files {
		localPath := filepath.Join(localAssetDir, name)
		
		// If file already fully downloaded from previous session
		if info, err := os.Stat(localPath); err == nil {
			fileProgressList[i] = FileProgress{
				FileName:     name,
				BytesWritten: info.Size(),
				TotalBytes:   info.Size(),
				Percentage:   100.0,
				Status:       "complete",
			}
		} else {
			fileProgressList[i] = FileProgress{
				FileName: name,
				Status:   "pending",
			}
		}
	}

	// Helper to calculate totals and emit event to frontend
	emitState := func(status string, errMsg string) {
		var folderBytesWritten int64
		var folderTotalBytes int64
		completedCount := 0

		for _, f := range fileProgressList {
			folderBytesWritten += f.BytesWritten
			folderTotalBytes += f.TotalBytes
			if f.Status == "complete" {
				completedCount++
			}
		}

		var overallPct float64
		if folderTotalBytes > 0 {
			overallPct = (float64(folderBytesWritten) / float64(folderTotalBytes)) * 100
		} else if len(asset.Files) > 0 {
			overallPct = (float64(completedCount) / float64(len(asset.Files))) * 100
		}

		progress := DownloadProgress{
			AssetID:     	asset.ID,
			SourceName:  	asset.SourceName,
			DisplayName: 	asset.DisplayName,
			Source: 		asset,
			BytesWritten:	folderBytesWritten,
			TotalBytes:  	folderTotalBytes,
			Percentage:  	overallPct,
			Completed:   	completedCount,
			TotalFiles:  	len(asset.Files),
			Status:      	status,
			ErrorMessage:	errMsg,
			Files:       	fileProgressList,
		}

		wailsRuntime.EventsEmit(h.ctx, "remote:download_progress", progress)
	}

	// Initial emission (0% / Pending)
	emitState("downloading", "")

	// 3. Loop and download files
	for i, fileName := range asset.Files {
		// Stop if user triggered Cancel/Pause
		select {
		case <-ctx.Done():
			emitState("paused", "Download paused")
			return ctx.Err()
		default:
		}

		// Skip already completed files
		if fileProgressList[i].Status == "complete" {
			continue
		}

		downloadURL := fmt.Sprintf("%s/%s/%s",
			strings.TrimSuffix(asset.RemoteRoot, "/"),
			strings.Trim(asset.BaseURL, "/"),
			fileName)

		localPath := filepath.Join(localAssetDir, fileName)

		fileProgressList[i].Status = "downloading"
		emitState("downloading", "")

		err := h.performDownloadWithContext(ctx, downloadURL, localPath, func(written int64, total int64) {
			fileProgressList[i].BytesWritten = written
			fileProgressList[i].TotalBytes = total
			if total > 0 {
				fileProgressList[i].Percentage = (float64(written) / float64(total)) * 100
			}
			emitState("downloading", "")
		})

		if err != nil {
			if ctx.Err() != nil {
				emitState("paused", "")
				return ctx.Err()
			}
			fileProgressList[i].Status = "error"
			fileProgressList[i].ErrorMessage = err.Error()
			emitState("error", err.Error())
			return err
		}

		fileProgressList[i].Status = "complete"
		fileProgressList[i].Percentage = 100.0
		emitState("downloading", "")
	}

	// Final complete event
	emitState("complete", "")
	return nil
}

func (h *RemoteHandler) performDownloadWithContext(
	ctx context.Context,
	githubUrl string,
	dest string,
	onProgress func(written int64, total int64),
) error {
	finalUrl := h.convertToJsDelivr(githubUrl)

	req, err := http.NewRequestWithContext(ctx, "GET", finalUrl, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Motiv2D-Asset-Bridge")

	resp, err := h.client.Do(req)
	if err != nil {
		return fmt.Errorf("cdn connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("cdn error %d: check if repo is public", resp.StatusCode)
	}

	totalBytes := resp.ContentLength

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	var currentWritten int64
	pw := &ProgressWriter{
		Writer: out,
		OnProgress: func(n int) {
			currentWritten += int64(n)
			if onProgress != nil {
				onProgress(currentWritten, totalBytes)
			}
		},
	}

	_, err = io.Copy(pw, resp.Body)
	return err
}

func (h *RemoteHandler) performDownload(githubUrl string, dest string) error {
	//Convert GitHub Raw to jsDelivr CDN
	finalUrl := h.convertToJsDelivr(githubUrl)

	req, _ := http.NewRequest("GET", finalUrl, nil)
	req.Header.Set("User-Agent", "Motiv2D-Asset-Bridge")

	resp, err := h.client.Do(req)
	if err != nil {
		return fmt.Errorf("cdn connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("cdn error %d: check if repo is public", resp.StatusCode)
	}

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func (h *RemoteHandler) convertToJsDelivr(url string) string {

	if !strings.Contains(url, "raw.githubusercontent.com") {
		return url
	}

	path := strings.TrimPrefix(url, "https://raw.githubusercontent.com/")
	parts := strings.Split(path, "/")

	if len(parts) < 3 {
		return url
	}

	user := parts[0]
	repo := parts[1]
	branch := parts[2]
	filePath := strings.Join(parts[3:], "/")

	return fmt.Sprintf("https://cdn.jsdelivr.net/gh/%s/%s@%s/%s", user, repo, branch, filePath)
}

func (h *RemoteHandler) FinalizeAsset(sourceName string, assetID string) (common.SpineMetadata, error) {

	cacheDir, err := h.GetCachePath()
	if err != nil {
		return common.SpineMetadata{}, err
	}

	assetDir := filepath.Join(cacheDir, sourceName, assetID)

	entries, err := os.ReadDir(assetDir)
	if err != nil {
		return common.SpineMetadata{}, err
	}

	var filePaths []string
	for _, e := range entries {
		if !e.IsDir() {
			filePaths = append(filePaths, filepath.Join(assetDir, e.Name()))
		}
	}

	spineCommons := common.NewSpineCommon()
	metadataList := spineCommons.GroupFilesIntoAssets(filePaths)

	if len(metadataList) == 0 {
		return common.SpineMetadata{}, fmt.Errorf("no valid spine assets found in cache")
	}

	res := metadataList[0]
	res.IsRemote = true
	res.SourceName = sourceName
	res.ID = assetID

	return res, nil
}

func (h *RemoteHandler) RemoveAssetCache(sourceName string, assetID string) error {

	cacheDir, err := h.GetCachePath()
	if err != nil {
		return err
	}

	targetDir := filepath.Join(cacheDir, sourceName, assetID)

	if sourceName == "" || assetID == "" {

		wailsRuntime.EventsEmit(h.ctx, "link:log", map[string]string{
			"message": "Invalid paths provided: " + targetDir,
			"level":   "error",
		})

		return fmt.Errorf("invalid paths provided")

	}

	wailsRuntime.EventsEmit(h.ctx, "link:log", map[string]string{
		"message": "Removing Downloaded Asset: " + targetDir,
		"level":   "info",
	})

	return os.RemoveAll(targetDir)

}

func (h *RemoteHandler) RefreshSource(baseURL string, folderPaths []string) {
	rawKey := baseURL + strings.Join(folderPaths, "")
	hash := md5.Sum([]byte(rawKey))
	cacheKey := fmt.Sprintf("gh_cache_%x", hash)
	h.storage.DeleteCache(cacheKey)
}

func (h *RemoteHandler) ClearAllCache() error {

	cacheDir, err := h.GetCachePath()

	if err != nil {
		return err
	}

	err = os.RemoveAll(cacheDir)

	if err != nil {
		return err
	}

	return os.MkdirAll(cacheDir, 0755)
}

func (h *RemoteHandler) GetCacheSize() (string, error) {

	cacheDir, _ := h.GetCachePath()
	var size int64
	err := filepath.Walk(cacheDir, func(_ string, info os.FileInfo, err error) error {

		if err != nil {
			return err
		}

		if !info.IsDir() {
			size += info.Size()
		}

		return nil
	})

	return fmt.Sprintf("%.2f MB", float64(size)/1024/1024), err
}
