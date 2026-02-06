package remote

type RemoteAsset struct {
	ID          string   `json:"id"`
    SourceName  string   `json:"sourceName"`
	DisplayName string   `json:"displayName"`
	SourceType  string   `json:"sourceType"`
    RemoteRoot  string   `json:"remoteRoot"`
	BaseURL     string   `json:"baseUrl"`
	IconURL     string   `json:"iconUrl"`
	Files       []string `json:"files"`
	HasPreview  bool     `json:"hasPreview"`

	HasSkel     bool     `json:"-"` 
	HasAtlas    bool     `json:"-"`
	PngCount    int      `json:"-"`
}

type RemoteSource struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Active       bool          `json:"active"`
	BaseURL      string        `json:"baseUrl"`
	RemoteRoot   string        `json:"remoteRoot"`
	MetadataURL  string        `json:"metadataUrl"`
	DiscoveryMode string       `json:"mode"`          
	FolderPaths   []string     `json:"folderPaths"`
	MappingRules  []MappingRule `json:"mappingRules"`
	LastUpdated   int64        `json:"lastUpdated"`
}

type MappingRule struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Key   string `json:"key"`
}