import { get, writable } from "svelte/store";
import { remote, services } from "../../wailsjs/go/models";
import {
  LoadConfig,
  SaveConfig,
  ResetShortcuts,
} from "../../wailsjs/go/services/CLIService";
import {
  GetRemotes,
  SaveRemote,
  DeleteRemote,
} from "../../wailsjs/go/remote/RemoteHandler";

export const extractionOptions = writable<services.ExtractionOptions>({
  inputPath: "",
  outputPath: "",
  activePreset: "spine",
  types: ["Texture2D", "TextAsset"],
  regex: "",
  decompress: true,
  unityVersion: "",
  filterByName: "",
  maxTasks: 1,
});

export const taskList = writable([]);
export const consoleLogs = writable([]);
export const navState = writable(false);
export const leftPanelClp = writable(false);
export const rightPanelClp = writable(false);
export const bottomPanelClp = writable(false);
export const visibilityToggleSignal = writable(0);

export const currentView = writable<"DASHBOARD" | "SPINE">("DASHBOARD");
export const blurType = writable<"frosted" | "gaussian" | "pixel" | "none">(
  "none",
);
export const backgroundBlur = writable(100);
export const backgroundColor = writable<string>("#080708");
export const backgroundOpacity = writable(100);

export const mixerHeight = writable(300);
export const logHeight = writable(300);

export const setView = (view: "DASHBOARD" | "SPINE") => {
  currentView.set(view);
};

export function getRgba(hex: string, opacity: number): string {
  const cleanHex = hex.replace("#", "");

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

export interface FileInfo {
  name: string;
  path: string;
  url: string;
}

export const spineState = writable({
  selectedSkel: null,
  selectedAtlas: null,
  images: [],
  zoom: 1,
  currentAnimation: "",
});

export interface SpineMetadata {
  id: string;
  version: string;
  skelFile: { url: string };
  atlasFile: { url: string };
  pngFiles: Array<{ url: string }>;
  isBinary: boolean;
  missingPng: string[];
  hasSkel: boolean;
  hasAtlas: boolean;
  defaultPMA: boolean;

  isMultiPart: boolean;
  additionalParts?: SpineMetadata[];

  isRemote?: boolean;
  sourceName?: string;
  sourceUrl?: string;
}

export interface MappingRule {
  id: string;
  label: string;
  key: string;
}

export interface RemoteSource {
  id: string;
  name: string;
  active: boolean;
  baseUrl: string;
  remoteRoot: string;
  metadataUrl: string;
  mode: "auto" | "manual";
  folderPaths: string[];
  mappingRules: MappingRule[];
  lastUpdated: number;
}

export const remoteSources = writable<RemoteSource[]>([]);

export const initRemotes = async () => {
  try {
    const data = await GetRemotes();

    if (!data) {
      remoteSources.set([]);
      return;
    }

    const uiData: RemoteSource[] = data.map((d) => ({
      id: d.id,
      name: d.name,
      active: d.active,
      baseUrl: d.baseUrl,
      remoteRoot: d.remoteRoot,
      metadataUrl: d.metadataUrl,
      mode: d.mode as "auto" | "manual",
      folderPaths: d.folderPaths,
      mappingRules: d.mappingRules
        ? d.mappingRules.map((m) => ({
            id: m.id,
            label: m.label,
            key: m.key,
          }))
        : [],
      lastUpdated: d.lastUpdated,
    }));

    remoteSources.set(uiData);
  } catch (err) {
    console.error("Failed to load remotes:", err);
  }
};

export const saveRemoteSource = async (source: RemoteSource) => {
  try {
    const payload = new remote.RemoteSource({
      id: source.id,
      name: source.name,
      active: source.active,
      baseUrl: source.baseUrl,
      remoteRoot: source.remoteRoot,
      metadataUrl: source.metadataUrl,
      mode: source.mode,
      folderPaths: source.folderPaths,
      mappingRules: source.mappingRules.map((m) => new remote.MappingRule(m)),
      lastUpdated: Date.now(),
    });
    await SaveRemote(payload);

    await initRemotes();
  } catch (err) {
    console.error("Failed to save remote source:", err);
    throw err;
  }
};

export const deleteRemoteSource = async (id: string) => {
  try {
    await DeleteRemote(id);
    await initRemotes();
  } catch (err) {
    console.error("Failed to delete remote source:", err);
  }
};

export const characterLibrary = writable<SpineMetadata[]>([]);
export const activeCharacter = writable<SpineMetadata | null>(null);

export const spineUpdateSignal = writable(0);

export function triggerSpineRefresh() {
  spineUpdateSignal.update((n) => n + 1);
}

export const selectedTrackId = writable<number>(0);

export const isSettingsOpen = writable(false);
export const isImportOpen = writable(false);
export const isSelectSlot = writable(false);
export const selectedSlotName = writable<string | null>(null);

export const configStore = writable<any>(null);

export const initConfig = async () => {
  try {
    const cfg = await LoadConfig();
    configStore.set(cfg);
  } catch (err) {
    console.error("Load failed:", err);
  }
};

export const updateShortcutInStore = async (
  id: string,
  modifiers: string[],
  key: string,
) => {
  configStore.update((cfg) => {
    if (!cfg) return cfg;
    const updatedShortcuts = cfg.shortcuts.map((s: any) =>
      s.id === id ? { ...s, modifiers, key } : s,
    );
    const updatedCfg = { ...cfg, shortcuts: updatedShortcuts };
    SaveConfig(updatedCfg);
    return updatedCfg;
  });
};

export const resetShortcutsAction = async () => {
  try {
    const updatedCfg = await ResetShortcuts();
    configStore.set(updatedCfg);
  } catch (err) {
    console.error("Reset failed:", err);
  }
};

export const characterSettings = writable<
  Record<string, CharacterSessionState>
>({});

export interface CharacterSessionState {
  id: string;
  pma: boolean;
  camX: number;
  camY: number;
  zoom: number;
  currentAnimation: string;
  currentSkin: string;
  slotVisibility: Record<string, boolean>;
  tracks: Record<number, { animation: string; loop: boolean }>;
  mixerTracks: any[];
}

export function getSettingsFor(
  id: string,
  metadata: any,
): CharacterSessionState {
  const current = get(characterSettings);

  const defaults: CharacterSessionState = {
    id,
    pma: metadata.defaultPMA ?? true,
    camX: 0,
    camY: 0,
    zoom: 1,
    currentAnimation: "",
    currentSkin: "default",
    slotVisibility: {},
    tracks: {},
    mixerTracks: [],
  };

  if (current[id]) {
    const existing = current[id];
    return {
      ...defaults,
      ...existing,
      slotVisibility: existing.slotVisibility || defaults.slotVisibility,
      tracks: existing.tracks || defaults.tracks,
      mixerTracks: existing.mixerTracks || defaults.mixerTracks,
    };
  }

  characterSettings.update((s) => ({ ...s, [id]: defaults }));
  return defaults;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  type: "SYSTEM" | "ASSET_GROUP";
  level: "info" | "warn" | "error" | "debug";
  label: string;
  rootPath?: string;
  children: string[];
  expanded: boolean;
}

const MAX_LOGS = 150;

function createLogStore() {
  const { subscribe, set, update } = writable<LogEntry[]>([]);

  return {
    subscribe,
    set,
    update,
    clear: () => set([]),

    addLog: (message: string, level: LogEntry["level"] = "info") => {
      update((logs) => {
        const timestamp = new Date().toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const assetRegex =
          /(?:WAILS ASSET REQUEST|Removing Downloaded Asset): (.*\/([^\/]+\/[^\/]+)\/([^\/]+))$/;
        const match = message.match(assetRegex);

        if (match) {
          const fullPath = match[1];
          const folderGroup = match[2];
          const fileName = match[3];
          const isRemoval = message.includes("Removing");

          const existing = logs.find(
            (l) => l.label === folderGroup && l.type === "ASSET_GROUP",
          );

          if (existing) {
            const fileEntry = isRemoval ? `[-] ${fileName}` : fileName;
            if (!existing.children.includes(fileEntry)) {
              existing.children = [...existing.children, fileEntry];
            }
            return logs;
          }

          logs.push({
            id: Date.now() + Math.random(),
            timestamp,
            type: "ASSET_GROUP",
            level: isRemoval ? "warn" : "info",
            label: folderGroup,
            rootPath: fullPath.replace(fileName, ""),
            children: [isRemoval ? `[-] ${fileName}` : fileName],
            expanded: false,
          });
        } else {
          logs.push({
            id: Date.now() + Math.random(),
            timestamp,
            type: "SYSTEM",
            level,
            label: message,
            children: [],
            expanded: false,
          });
        }
        return logs.length > MAX_LOGS ? logs.slice(-MAX_LOGS) : logs;
      });
    },
  };
}

export const logStore = createLogStore();

export function generateShareCode(data: RemoteSource | RemoteSource[]): string {
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  const compressed = items.map((r) => {
    const match = r.baseUrl.match(
      /repos\/([^\/]+\/[^\/]+)\/git\/trees\/([^\?]+)/,
    );
    const path = match ? `${match[1]}/${match[2]}` : r.baseUrl;

    return {
      n: r.name,
      p: path,
      m: r.mode === "auto" ? 0 : 1,
      f: r.folderPaths,
      u: r.metadataUrl ? r.metadataUrl : undefined,
    };
  });

  const json = JSON.stringify(isArray ? compressed : compressed[0]);
  return (
    "M2D:" +
    btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  );
}

export function decodeShareCode(code: string): RemoteSource[] {
  if (!code.startsWith("M2D:")) return [];

  try {
    const base64 = code.split(":")[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64));
    const items = Array.isArray(decoded) ? decoded : [decoded];

    return items.map((p) => {
      const parts = p.p.split("/");
      const repoPath = `${parts[0]}/${parts[1]}`;
      const branch = parts[2];

      return {
        id: crypto.randomUUID(),
        name: p.n,
        active: true,
        baseUrl: `https://api.github.com/repos/${repoPath}/git/trees/${branch}?recursive=1`,
        remoteRoot: `https://raw.githubusercontent.com/${repoPath}/${branch}/`,
        metadataUrl: p.u || "",
        mode: p.m === 0 ? "auto" : "manual",
        folderPaths: p.f || [],
        mappingRules: [],
        lastUpdated: Date.now(),
      };
    });
  } catch (e) {
    console.error("Failed to decode share code:", e);
    return [];
  }
}

// Live2D Metadata

export const isLive2D = writable(false);

export interface Live2DMetadata {
  id: string;
  version: string;
  modelJsonFile: FileInfo;
  textureFiles: FileInfo[];
  mocFile: FileInfo;
  isRemote?: boolean;
  sourceName?: string;
}

export interface Live2DSessionState {
  id: string;
  camX: number;
  camY: number;
  zoom: number;
  currentAnimation: string;
  currentExpression: string;
  drawableVisibility: Record<string, boolean>; 
  parameters: Record<string, number>;
}

// Stores
export const activeSidebarTab = writable<"animations" | "slots">("animations");
export const live2dLibrary = writable<Live2DMetadata[]>([]);
export const activeLive2DCharacter = writable<Live2DMetadata | null>(null);
export const live2dSettings = writable<Record<string, Live2DSessionState>>({});
export const live2dUpdateSignal = writable(0);

export function triggerLive2DRefresh() {
  live2dUpdateSignal.update((n) => n + 1);
}

export function getLive2DSettingsFor(
  id: string,
  metadata: Live2DMetadata
): Live2DSessionState {
  const current = get(live2dSettings);

  const defaults: Live2DSessionState = {
    id,
    camX: 0.5,
    camY: 0.5,
    zoom: 1,
    currentAnimation: "",
    currentExpression: "",
    drawableVisibility: {},
    parameters: {},
  };

  if (current[id]) {
    return { ...defaults, ...current[id] };
  }

  live2dSettings.update((s) => ({ ...s, [id]: defaults }));
  return defaults;
}