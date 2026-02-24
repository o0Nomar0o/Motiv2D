export namespace common {
	
	export class FileInfo {
	    name: string;
	    path: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.url = source["url"];
	    }
	}
	export class Live2DMetadata {
	    id: string;
	    version: string;
	    modelJsonFile: FileInfo;
	    textureFiles: FileInfo[];
	    mocFile: FileInfo;
	    isRemote: boolean;
	    sourceName: string;
	
	    static createFrom(source: any = {}) {
	        return new Live2DMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.version = source["version"];
	        this.modelJsonFile = this.convertValues(source["modelJsonFile"], FileInfo);
	        this.textureFiles = this.convertValues(source["textureFiles"], FileInfo);
	        this.mocFile = this.convertValues(source["mocFile"], FileInfo);
	        this.isRemote = source["isRemote"];
	        this.sourceName = source["sourceName"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SpineMetadata {
	    id: string;
	    version: string;
	    isBinary: boolean;
	    skelFile: FileInfo;
	    atlasFile: FileInfo;
	    pngFiles: FileInfo[];
	    missingPng: string[];
	    hasSkel: boolean;
	    hasAtlas: boolean;
	    defaultPMA: boolean;
	    isMultiPart: boolean;
	    additionalParts: SpineMetadata[];
	    isRemote: boolean;
	    sourceUrl: string;
	    sourceName: string;
	
	    static createFrom(source: any = {}) {
	        return new SpineMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.version = source["version"];
	        this.isBinary = source["isBinary"];
	        this.skelFile = this.convertValues(source["skelFile"], FileInfo);
	        this.atlasFile = this.convertValues(source["atlasFile"], FileInfo);
	        this.pngFiles = this.convertValues(source["pngFiles"], FileInfo);
	        this.missingPng = source["missingPng"];
	        this.hasSkel = source["hasSkel"];
	        this.hasAtlas = source["hasAtlas"];
	        this.defaultPMA = source["defaultPMA"];
	        this.isMultiPart = source["isMultiPart"];
	        this.additionalParts = this.convertValues(source["additionalParts"], SpineMetadata);
	        this.isRemote = source["isRemote"];
	        this.sourceUrl = source["sourceUrl"];
	        this.sourceName = source["sourceName"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace monitors {
	
	export class MemoryStats {
	    alloc: number;
	    mainRss: number;
	    childrenRss: number;
	    total: number;
	    workerCount: number;
	
	    static createFrom(source: any = {}) {
	        return new MemoryStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.alloc = source["alloc"];
	        this.mainRss = source["mainRss"];
	        this.childrenRss = source["childrenRss"];
	        this.total = source["total"];
	        this.workerCount = source["workerCount"];
	    }
	}

}

export namespace remote {
	
	export class MappingRule {
	    id: string;
	    label: string;
	    key: string;
	
	    static createFrom(source: any = {}) {
	        return new MappingRule(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.key = source["key"];
	    }
	}
	export class RemoteAsset {
	    id: string;
	    sourceName: string;
	    displayName: string;
	    sourceType: string;
	    remoteRoot: string;
	    baseUrl: string;
	    iconUrl: string;
	    files: string[];
	    hasPreview: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RemoteAsset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sourceName = source["sourceName"];
	        this.displayName = source["displayName"];
	        this.sourceType = source["sourceType"];
	        this.remoteRoot = source["remoteRoot"];
	        this.baseUrl = source["baseUrl"];
	        this.iconUrl = source["iconUrl"];
	        this.files = source["files"];
	        this.hasPreview = source["hasPreview"];
	    }
	}
	export class RemoteSource {
	    id: string;
	    name: string;
	    active: boolean;
	    baseUrl: string;
	    remoteRoot: string;
	    metadataUrl: string;
	    mode: string;
	    folderPaths: string[];
	    mappingRules: MappingRule[];
	    lastUpdated: number;
	
	    static createFrom(source: any = {}) {
	        return new RemoteSource(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.active = source["active"];
	        this.baseUrl = source["baseUrl"];
	        this.remoteRoot = source["remoteRoot"];
	        this.metadataUrl = source["metadataUrl"];
	        this.mode = source["mode"];
	        this.folderPaths = source["folderPaths"];
	        this.mappingRules = this.convertValues(source["mappingRules"], MappingRule);
	        this.lastUpdated = source["lastUpdated"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace services {
	
	export class Shortcut {
	    id: string;
	    label: string;
	    modifiers: string[];
	    key: string;
	
	    static createFrom(source: any = {}) {
	        return new Shortcut(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.modifiers = source["modifiers"];
	        this.key = source["key"];
	    }
	}
	export class Config {
	    dllPath: string;
	    decompress: boolean;
	    maxTasks: number;
	    shortcuts: Shortcut[];
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.dllPath = source["dllPath"];
	        this.decompress = source["decompress"];
	        this.maxTasks = source["maxTasks"];
	        this.shortcuts = this.convertValues(source["shortcuts"], Shortcut);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ExtractionOptions {
	    inputPath: string;
	    outputPath: string;
	    activePreset: string;
	    types: string[];
	    unityVersion: string;
	    regex: string;
	    filterByName: string;
	    decompress: boolean;
	    maxTasks: number;
	
	    static createFrom(source: any = {}) {
	        return new ExtractionOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.inputPath = source["inputPath"];
	        this.outputPath = source["outputPath"];
	        this.activePreset = source["activePreset"];
	        this.types = source["types"];
	        this.unityVersion = source["unityVersion"];
	        this.regex = source["regex"];
	        this.filterByName = source["filterByName"];
	        this.decompress = source["decompress"];
	        this.maxTasks = source["maxTasks"];
	    }
	}
	export class FolderSummary {
	    folderCount: number;
	    fileCount: number;
	    totalSize: string;
	
	    static createFrom(source: any = {}) {
	        return new FolderSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.folderCount = source["folderCount"];
	        this.fileCount = source["fileCount"];
	        this.totalSize = source["totalSize"];
	    }
	}

}

export namespace update {
	
	export class MetadataLink {
	    label: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new MetadataLink(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.url = source["url"];
	    }
	}
	export class AppMetadata {
	    appName: string;
	    semVer: string;
	    displayVersion: string;
	    buildDate: string;
	    license: string;
	    author: string;
	    links: MetadataLink[];
	
	    static createFrom(source: any = {}) {
	        return new AppMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.appName = source["appName"];
	        this.semVer = source["semVer"];
	        this.displayVersion = source["displayVersion"];
	        this.buildDate = source["buildDate"];
	        this.license = source["license"];
	        this.author = source["author"];
	        this.links = this.convertValues(source["links"], MetadataLink);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UpdateInfo {
	    version: string;
	    url: string;
	    changelog: string;
	    checksum: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.url = source["url"];
	        this.changelog = source["changelog"];
	        this.checksum = source["checksum"];
	    }
	}
	export class CheckUpdateResponse {
	    available: boolean;
	    info: UpdateInfo;
	
	    static createFrom(source: any = {}) {
	        return new CheckUpdateResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.info = this.convertValues(source["info"], UpdateInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

