package common

import "motiv2d/pkg/common"

// type FileInfo struct {
// 	Name      		string 			`json:"name"`
// 	LocalPath 		string 			`json:"path"`
// 	URL       		string 			`json:"url"`
// }

type SpineMetadata struct {
	ID         			string     			`json:"id"`
	Version    			string     			`json:"version"`
	IsBinary   			bool       			`json:"isBinary"`
	SkelFile   			common.FileInfo   	`json:"skelFile"`
	AtlasFile  			common.FileInfo  	`json:"atlasFile"`
	PngFiles   			[]common.FileInfo 	`json:"pngFiles"`
	MissingPng 			[]string   			`json:"missingPng"`
	HasSkel    			bool       			`json:"hasSkel"`
	HasAtlas   			bool       			`json:"hasAtlas"`
	DefaultPMA 			bool       			`json:"defaultPMA"`
		
	IsMultiPart     	bool            	`json:"isMultiPart"`
	AdditionalParts 	[]SpineMetadata 	`json:"additionalParts"`

	IsRemote   			bool   	  			`json:"isRemote"`
	SourceURL  			string 	  			`json:"sourceUrl"`
	SourceName 			string 	  			`json:"sourceName"`
}
