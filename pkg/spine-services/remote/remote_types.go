package remote

type RemoteAsset struct {
	ID          		string   			`json:"id"`
    SourceName  		string   			`json:"sourceName"`
	DisplayName 		string   			`json:"displayName"`
	SourceType  		string   			`json:"sourceType"`
    RemoteRoot  		string   			`json:"remoteRoot"`
	BaseURL     		string   			`json:"baseUrl"`
	IconURL     		string   			`json:"iconUrl"`
	Files       		[]string 			`json:"files"`
	HasPreview  		bool     			`json:"hasPreview"`

	HasSkel		    	bool     			`json:"-"` 
	HasAtlas    		bool     			`json:"-"`
	PngCount    		int      			`json:"-"`
}

type RemoteSource struct {
	ID            		string       		`json:"id"`
	Name          		string       		`json:"name"`
	Active        		bool         		`json:"active"`
	BaseURL       		string       		`json:"baseUrl"`
	RemoteRoot    		string       		`json:"remoteRoot"`
	MetadataURL   		string       		`json:"metadataUrl"`
	DiscoveryMode 		string       		`json:"mode"`          
	FolderPaths   		[]string     		`json:"folderPaths"`
	MappingRules  		[]MappingRule		`json:"mappingRules"`
	LastUpdated   		int64        		`json:"lastUpdated"`
}

type MappingRule struct {
	ID    				string 				`json:"id"`
	Label 				string 				`json:"label"`
	Key   				string 				`json:"key"`
}

// Individual File Status 
type FileProgress struct {
	FileName     		string  			`json:"fileName"`
	BytesWritten 		int64   			`json:"bytesWritten"`
	TotalBytes   		int64   			`json:"totalBytes"`
	Percentage   		float64 			`json:"percentage"`
	Status       		string  			`json:"status"` // "pending" | "downloading" | "complete" | "error"
	ErrorMessage 		string  			`json:"errorMessage,omitempty"`
}

// Parent Folder Status
type DownloadProgress struct {
	AssetID      		string         		`json:"assetId"`
	SourceName   		string         		`json:"sourceName"`
	DisplayName  		string         		`json:"displayName"`

	Source     		 	RemoteAsset  		`json:"source"`

	BytesWritten 		int64          		`json:"bytesWritten"`
	TotalBytes   		int64          		`json:"totalBytes"`
	Percentage   		float64        		`json:"percentage"` 

	Completed    		int            		`json:"completed"`
	TotalFiles   		int            		`json:"totalFiles"`

	Status       		string         		`json:"status"`	// "downloading" | "paused" | "canceled" | "error" | "complete"
	ErrorMessage 		string         		`json:"errorMessage,omitempty"`

	Files        		[]FileProgress 		`json:"files"`
}

