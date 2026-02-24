package common

import "motiv2d/pkg/common"

type Live2DMetadata struct {
	ID            	string     			`json:"id"`
	Version       	string     			`json:"version"`
	ModelJSONFile 	common.FileInfo   	`json:"modelJsonFile"`
	TextureFiles  	[]common.FileInfo 	`json:"textureFiles"`
	MocFile       	common.FileInfo   	`json:"mocFile"`
	IsRemote      	bool       			`json:"isRemote"`
	SourceName    	string     			`json:"sourceName"`
}

type Model3Json struct {
	Version        int    `json:"Version"`
	FileReferences struct {
		Moc      string   `json:"Moc"`
		Textures []string `json:"Textures"`
		Physics  string   `json:"Physics"`
		Motions  map[string][]struct {
			File string `json:"File"`
		} `json:"Motions"`
	} `json:"FileReferences"`
}

