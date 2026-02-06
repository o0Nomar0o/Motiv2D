package remote

import (
	"encoding/json"
	"fmt"
	"io"
	"motiv2d/pkg/spine-services/common"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// func (h *RemoteHandler) CheckSourceHealth(url string) bool {
// 	resp, err := h.client.Head(url)

// 	if err != nil || resp.StatusCode >= 400 {
// 		resp, err = h.client.Get(url)
// 		if err != nil || resp.StatusCode >= 400 {
// 			return false
// 		}
// 	}
// 	defer resp.Body.Close()
// 	return true
// }

func (h *RemoteHandler) CheckSourceHealth(url string) bool {

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := h.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 400
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

	var assets []RemoteAsset
	var err error

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

func (h *RemoteHandler) DownloadRemoteAsset(asset RemoteAsset) error {

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
		return fmt.Errorf("invalid paths provided")
	}

	return os.RemoveAll(targetDir)
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
