package remote

import (
	"encoding/gob"
	"encoding/json"
	"os"
	"path/filepath"
)

type ConfigManager struct {
	AppDir       string
	SettingsPath string
	CacheDir     string
}

func NewConfigManager() (*ConfigManager, error) {

	configDir, err := os.UserConfigDir()

	if err != nil {
		return nil, err
	}

	appPath := filepath.Join(configDir, "Motiv2d")
	settingsPath := filepath.Join(appPath, "remotes.json")
	cacheDir := filepath.Join(appPath, "cache")

	//Create App Directory
	if err := os.MkdirAll(appPath, 0755); err != nil {
		return nil, err
	}

	//Create Cache Directory
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return nil, err
	}

	//Create remotes.json if it doesn't exist
	if _, err := os.Stat(settingsPath); os.IsNotExist(err) {
		emptyList := []RemoteSource{}
		data, _ := json.MarshalIndent(emptyList, "", "  ")
		os.WriteFile(settingsPath, data, 0644)
	}

	return &ConfigManager{
		AppDir:       appPath,
		SettingsPath: settingsPath,
		CacheDir:     cacheDir,
	}, nil
}

func (c *ConfigManager) LoadRemotes() ([]RemoteSource, error) {
	data, err := os.ReadFile(c.SettingsPath)
	if err != nil {
		return nil, err
	}

	var remotes []RemoteSource
	if err := json.Unmarshal(data, &remotes); err != nil {
		return nil, err
	}
	return remotes, nil
}

func (c *ConfigManager) SaveRemotes(remotes []RemoteSource) error {
	data, err := json.MarshalIndent(remotes, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(c.SettingsPath, data, 0644)
}

func (c *ConfigManager) SaveCache(sourceID string, data interface{}) error {
	path := filepath.Join(c.CacheDir, sourceID+".bin")
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	return gob.NewEncoder(file).Encode(data)
}

func (c *ConfigManager) LoadCache(sourceID string, target interface{}) error {

	path := filepath.Join(c.CacheDir, sourceID+".bin")
	file, err := os.Open(path)

	if err != nil {
		return err
	}
	
	defer file.Close()

	return gob.NewDecoder(file).Decode(target)
}

func (c *ConfigManager) GetCacheFolder() string {
    return c.CacheDir
}

func (c *ConfigManager) DeleteCache(sourceID string) error {
	path := filepath.Join(c.CacheDir, sourceID+".bin")
	return os.Remove(path)
}