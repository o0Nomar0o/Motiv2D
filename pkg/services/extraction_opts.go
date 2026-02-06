package services

type ExtractionOptions struct {
    InputPath     string   `json:"inputPath"`
    OutputPath    string   `json:"outputPath"`
    ActivePreset  string   `json:"activePreset"` 
    
    Types         []string `json:"types"`        
    UnityVersion  string   `json:"unityVersion"`
    
    Regex         string   `json:"regex"`
    FilterByName  string   `json:"filterByName"`
    
    Decompress    bool     `json:"decompress"`
    MaxTasks      int      `json:"maxTasks"`
}