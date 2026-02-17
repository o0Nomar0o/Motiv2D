package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Shortcut struct {
	ID        	string  	`json:"id"`
	Label     	string  	`json:"label"`
	Modifiers 	[]string	`json:"modifiers"`
	Key       	string  	`json:"key"`
}

type Config struct {
	DLLPath    	string     	`json:"dllPath"`
	Decompress 	bool       	`json:"decompress"`
	MaxTasks   	int        	`json:"maxTasks"`
	Shortcuts  	[]Shortcut 	`json:"shortcuts"`
}

func (s *CLIService) GetConfigPath() (string, error) {

	configDir, err := os.UserConfigDir()

	if err != nil {
		return "", fmt.Errorf("could not find user config directory: %w", err)
	}

	appFolder := filepath.Join(configDir, "AssetStudioGo")

	if _, err := os.Stat(appFolder); os.IsNotExist(err) {
		if err := os.MkdirAll(appFolder, 0755); err != nil {
			return "", fmt.Errorf("failed to create config folder: %w", err)
		}
	}

	return filepath.Join(appFolder, "settings.json"), nil
}

func (s *CLIService) LoadConfig() (*Config, error) {

	configPath, err := s.GetConfigPath()
	data, err := os.ReadFile(configPath)

	if err != nil {
		return nil, err
	}

	var cfg Config
	err = json.Unmarshal(data, &cfg)

	return &cfg, err
}

func (s *CLIService) SaveConfig(cfg Config) error {

	configPath, err := s.GetConfigPath()

	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "")

	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0644)
}

func GetDefaultShortcuts() []Shortcut {
	return []Shortcut{
		{ID: "toggle_left",		Label: "Collapse/Expand Left",			Modifiers: []string{},		Key: ";"},
		{ID: "toggle_right",	Label: "Collapse/Expand Right",			Modifiers: []string{},		Key: "'"},
		{ID: "toggle_pma",		Label: "Toggle PMA",					Modifiers: []string{"ALT"}, Key: "R"},
		{ID: "import",			Label: "Import Asset",					Modifiers: []string{"CTRL"},Key: "I"},
		{ID: "import_local",	Label: "Import Local Asset",			Modifiers: []string{},	 	Key: "I"},
		{ID: "center",			Label: "Center Character",				Modifiers: []string{},	 	Key: "C"},
		{ID: "slot_picker", 	Label: "Slot Picker",					Modifiers: []string{},	 	Key: "S"},
		{ID: "next_asset", 		Label: "Next Asset",					Modifiers: []string{},	 	Key: "."},
		{ID: "previous_asset",	Label: "Previous Asset",				Modifiers: []string{},	 	Key: ","},
		{ID: "next_slot",		Label: "Next Slot/Item",				Modifiers: []string{},	 	Key: "ArrowDown"},
		{ID: "previous_slot",	Label: "Previous Slot/Item",			Modifiers: []string{},	 	Key: "ArrowUp"},
		{ID: "media_action",	Label: "Play/Pause",					Modifiers: []string{},	 	Key: "Space"},
		{ID: "settings",		Label: "Open Settings",					Modifiers: []string{"CTRL"},Key: "S"},
		{ID: "r_assets",		Label: "Remove/Delete Assets (WIP)",	Modifiers: []string{"ALT"}, Key: "W"},
	}
}

func (s *CLIService) ResetShortcuts() (*Config, error) {
	cfg, err := s.LoadConfig()
	if err != nil { return nil, err }

	cfg.Shortcuts = GetDefaultShortcuts()
	err = s.SaveConfig(*cfg)
	return cfg, err
}