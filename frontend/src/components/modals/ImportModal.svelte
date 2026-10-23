<script lang="ts">
  import {
    isImportOpen,
    remoteSources,
    characterLibrary,
    activeCharacter,
    activeLive2DCharacter,
    isLive2D,
    importAssetServerHeight,
  } from "../../stores/appStore";
  import { fade, fly } from "svelte/transition";
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";

  // Assets
  import iconGlobe from "../../assets/images/globe.svg";
  import iconPlus from "../../assets/images/plus.svg";
  import iconFolder from "../../assets/images/in-folder.svg";
  import iconUpload from "../../assets/images/out-folder.svg";
  import cross from "../../assets/images/cross.svg";

  import RemoteSetting from "./ui/RemoteSettings.svelte";
  import RemoteGallery from "./ui/RemoteGallery.svelte";
  import AssetManager from "./ui/AssetManager.svelte";

  // Wails Binding
  import {
    SelectFolder,
    ImportFromDialog,
    ImportFromCache,
  } from "../../../wailsjs/go/common/SpineCommons";
  import {
    CheckSourceHealth,
    GetCachePath,
  } from "../../../wailsjs/go/remote/RemoteHandler";
  import { EventsOn } from "../../../wailsjs/runtime/runtime";
  import { ImportFromDialog as ImportLive2DFromDialog } from "../../../wailsjs/go/common/CubismCommons";
  import { Platform } from "../../../wailsjs/go/main/App";

  export let isOpen = false;
  let platform: "darwin" | "windows" | "linux" = "windows";
  Platform().then((p) => {
    platform = p as any;
  });

  // let activeTab = "browser";
  let activeTab: "browser" | "sources" | "manage_asset" = "browser";
  let selectedSource: any = null;
  let healthMap: Record<string, boolean> = {};

  $: displaySources = $remoteSources;

  function close() {
    isImportOpen.set(false);
    selectedSource = null;
  }

  function handleBack() {
    selectedSource = null;
  }

  $: if (activeTab !== "browser") selectedSource = null;

  async function checkAllHealth() {
    for (const src of displaySources) {
      try {
        const isHealthy = await CheckSourceHealth(src.baseUrl);
        healthMap[src.id] = isHealthy;
      } catch (e) {
        healthMap[src.id] = false;
      }
    }
    healthMap = healthMap;
  }

  $: if (isOpen && displaySources.length > 0) {
    checkAllHealth();
  }

  function autoSelectIfEmpty(asset: any, isL2D: boolean) {
    const currentSpine = get(activeCharacter);
    const currentL2D = get(activeLive2DCharacter);

    if (!currentSpine && !currentL2D) {
      if (isL2D) {
        isLive2D.set(true);
        activeLive2DCharacter.set(asset);
      } else {
        isLive2D.set(false);
        activeCharacter.set(asset);
      }
    }
  }

  onMount(() => {
    //Live2D Import Listener
    const unlistenLive2D = EventsOn("live2d_discovered", (asset) => {
      const l2dAsset = { ...asset, isLive2D: true };

      characterLibrary.update((existing) => {
        if (existing.some((e) => e.id === l2dAsset.id)) return existing;
        return [...existing, l2dAsset];
      });

      autoSelectIfEmpty(l2dAsset, true);
    });

    //Spine Import Listener
    const unlistenSpine = EventsOn("asset_discovered", (asset) => {
      const spineAsset = { ...asset, isLive2D: false };

      characterLibrary.update((existing) => {
        if (existing.some((e) => e.id === spineAsset.id)) return existing;
        return [...existing, spineAsset];
      });

      autoSelectIfEmpty(spineAsset, false);
    });

    return () => {
      unlistenLive2D();
      unlistenSpine();
    };
  });

  async function handleLocalImport() {
    try {
      const results = await SelectFolder();
      if (results && results.length > 0) {
        characterLibrary.update((existing) => {
          // Filter out duplicates and mark as Spine
          const newItems = results
            .filter((r) => !existing.some((e) => e.id === r.id))
            .map((r) => ({ ...r, isLive2D: false }));

          if (newItems.length > 0) {
            autoSelectIfEmpty(newItems[0], false);
          }
          return [...existing, ...newItems];
        });
        close();
      }
    } catch (err) {
      console.error("Failed to load folder:", err);
    }
  }

  let isScanning = false;

  async function handleRecursiveLocalImport() {
    try {
      isScanning = true;
      await ImportFromDialog();
      close();
    } catch (err) {
      console.error("Recursive scan failed:", err);
    } finally {
      isScanning = false;
    }
  }

  async function handleCacheLocalImport() {
    try {
      isScanning = true;
      let cachePath = await GetCachePath();
      await ImportFromCache(cachePath);
      close();
    } catch (err) {
      console.error("Cache import failed:", err);
    } finally {
      isScanning = false;
    }
  }

  async function handleLive2DImport() {
    try {
      isScanning = true;
      await ImportLive2DFromDialog();
      close();
    } catch (err) {
      console.error("Live2D import failed:", err);
    } finally {
      isScanning = false;
    }
  }

  let isResizing = false;
  let contentAreaEl: HTMLElement;
  let localContainerEl: HTMLElement;

  function setInitialHeight() {
    if (!contentAreaEl || !localContainerEl) return;
    const contentHeight = contentAreaEl.getBoundingClientRect().height;
    const localHeight = localContainerEl.scrollHeight;

    const initialRemoteHeight = Math.max(80, contentHeight - localHeight - 35);
    importAssetServerHeight.set(initialRemoteHeight);
  }

  $: if (isOpen && activeTab === "browser" && !selectedSource) {
    setTimeout(setInitialHeight, 50);
  }

  let lastMouseY = 0;

  function startResizing(e: MouseEvent) {
    isResizing = true;
    lastMouseY = e.clientY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isResizing || !contentAreaEl || !localContainerEl) return;

    const deltaY = lastMouseY - e.clientY;
    lastMouseY = e.clientY;

    if (deltaY === 0) return;

    const contentRect = contentAreaEl.getBoundingClientRect();
    const localFullHeight = localContainerEl.scrollHeight;

    const minRemoteHeight = Math.max(
      80,
      contentRect.height - localFullHeight - 35 - 5,
    );
    const maxRemoteHeight = Math.max(minRemoteHeight, contentRect.height - 50);

    const currentHeight = get(importAssetServerHeight);
    const newHeight = currentHeight + deltaY;

    const clampedHeight = Math.max(
      minRemoteHeight,
      Math.min(newHeight, maxRemoteHeight),
    );

    importAssetServerHeight.set(clampedHeight);
  }

  function stopResizing() {
    isResizing = false;
  }
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={stopResizing} />

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-overlay" on:click={close}>
    <div
      class="modal-shell st-gl"
      class:macos={platform === "darwin"}
      on:click|stopPropagation
    >
      <button
        class="close-btn"
        type="button"
        aria-label="Close settings"
        title="Close settings"
        on:click={() => isImportOpen.set(false)}
      >
        <span
          class="icon-mask close-icon"
          style="--icon: url({cross})"
          aria-hidden="true"
        ></span>
      </button>

      <aside class="modal-sidebar">
        <div class="brand">IMPORT</div>
        <div class="nav-group">
          <button
            class:active={activeTab === "browser"}
            on:click={() => (activeTab = "browser")}>Asset Browser</button
          >
          <button
            class:active={activeTab === "sources"}
            on:click={() => (activeTab = "sources")}>Configure Sources</button
          >
          <button
            class:active={activeTab === "manage_asset"}
            on:click={() => (activeTab = "manage_asset")}>Manage Asset</button
          >
        </div>

        <!-- <div class="sidebar-footer">
          <div class="stat-pill">
            <span class="label">ACTIVE REMOTES</span>
            <span class="value"
              >{$remoteSources.filter((s) => s.active).length}</span
            >
          </div>
        </div> -->
      </aside>

      <main class="modal-body" class:windows={platform === "windows"}>
        {#if activeTab === "browser"}
          <header class="tab-header">
            {#if selectedSource}
              <button class="back-btn" on:click={handleBack}>
                ← Back to Repositories
              </button>
            {/if}

            <div class="title-row">
              <div
                class="icon-mask title-icon"
                style="--icon: url({selectedSource ? iconGlobe : iconPlus})"
              ></div>
              <h1>{selectedSource ? selectedSource.name : "Asset Browser"}</h1>
            </div>
            <p>
              {selectedSource
                ? `Browsing files from ${selectedSource.name}`
                : "Select local folders or browse remote repositories."}
            </p>
          </header>

          <div class="content-area" bind:this={contentAreaEl}>
            {#if !selectedSource}
              <div in:fade={{ duration: 200 }} class="browser-layout">
                <div
                  class="local-import-container"
                  bind:this={localContainerEl}
                >
                  <button
                    class="minimal-import-row"
                    on:click={handleLocalImport}
                  >
                    <div
                      class="icon-mask md folder-icon"
                      style="--icon: url({iconFolder})"
                    ></div>
                    <span class="label">Quick Import</span>
                    <div class="line-filler"></div>
                    <div class="action-zone">
                      <span class="mono-hint"
                        >LOCAL IMPORT FROM ROOT FOLDER</span
                      >
                      <div
                        class="icon-mask sm arrow-icon"
                        style="--icon: url({iconUpload})"
                      ></div>
                    </div>
                  </button>

                  <button
                    class="minimal-import-row"
                    on:click={handleRecursiveLocalImport}
                  >
                    <div
                      class="icon-mask md folder-icon"
                      style="--icon: url({iconFolder})"
                    ></div>
                    <span class="label">Bulk Import</span>
                    <div class="line-filler"></div>
                    <div class="action-zone">
                      <span class="mono-hint">SCANS ALL SUBFOLDERS</span>
                      <div
                        class="icon-mask sm arrow-icon"
                        style="--icon: url({iconUpload})"
                      ></div>
                    </div>
                  </button>

                  <!-- TEMPORARY -->
                  <button
                    class="minimal-import-row"
                    on:click={handleLive2DImport}
                  >
                    <div
                      class="icon-mask md folder-icon"
                      style="--icon: url({iconFolder})"
                    ></div>
                    <span class="label">Import Live2D</span>
                    <div class="line-filler"></div>
                    <div class="action-zone">
                      <span class="mono-hint">SCAN FOR .MODEL3.JSON FILES</span>
                      <div
                        class="icon-mask sm arrow-icon"
                        style="--icon: url({iconUpload})"
                      ></div>
                    </div>
                  </button>
                  <!-- END -->

                  <button
                    class="minimal-import-row"
                    on:click={handleCacheLocalImport}
                  >
                    <div
                      class="icon-mask md folder-icon"
                      style="--icon: url({iconFolder})"
                    ></div>
                    <span class="label">Cache Folders</span>
                    <div class="line-filler"></div>
                    <div class="action-zone">
                      <span class="mono-hint">IMPORT ALL CACHE FOLDER</span>
                      <div
                        class="icon-mask sm arrow-icon"
                        style="--icon: url({iconUpload})"
                      ></div>
                    </div>
                  </button>
                </div>

                <div
                  class="divider v-resizer"
                  class:resizing={isResizing}
                  on:mousedown|preventDefault={startResizing}
                >
                  <span>REMOTE REPOSITORIES</span>
                </div>

                <div
                  class="sources-list"
                  style="height: {$importAssetServerHeight}px"
                >
                  {#key $remoteSources.length}
                    {#each displaySources as src (src.id)}
                      <button
                        class="source-card"
                        on:click={() => (selectedSource = src)}
                        in:fade={{ duration: 200 }}
                      >
                        <div
                          class="health-dot"
                          class:online={healthMap[src.id] === true}
                          class:offline={healthMap[src.id] === false}
                        ></div>
                        <div class="source-info">
                          <span class="source-name">{src.name}</span>
                        </div>
                        <div class="source-chevron">→</div>
                      </button>
                    {:else}
                      <div class="empty-state">
                        No sources found in configuration.
                      </div>
                    {/each}
                  {/key}
                </div>
              </div>
            {:else}
              <div
                class="remote-gallery-container"
                in:fly={{ y: 20, duration: 400 }}
              >
                <RemoteGallery
                  source={selectedSource}
                  on:importSuccess={close}
                />
              </div>
            {/if}
          </div>
        {/if}

        {#if activeTab === "sources"}
          <RemoteSetting />
        {/if}

        {#if activeTab === "manage_asset"}
          <header class="tab-header">
            <div class="title-row">
              <h1>Active Downloads</h1>
            </div>
            <p>
              Monitor download progress, file structures, pause, and cancel
              tasks.
            </p>
          </header>

          <div class="content-area">
            <AssetManager />
          </div>
        {/if}
      </main>
    </div>
  </div>
{/if}

<style>
  .health-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #444;
    margin-right: 15px;
  }
  .health-dot.online {
    background: #00ff96;
    box-shadow: 0 0 8px rgba(0, 255, 150, 0.5);
  }
  .health-dot.offline {
    background: #ff4d4d;
    box-shadow: 0 0 8px rgba(255, 77, 77, 0.5);
  }
  .tab-header {
    margin-bottom: 25px;
  }
  .back-btn {
    background: none;
    border: none;
    color: #00a2ff;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    cursor: pointer;
    margin-bottom: 12px;
    padding: 0;
    opacity: 0.8;
  }
  .back-btn:hover {
    opacity: 1;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }
  .title-icon {
    width: 24px;
    height: 24px;
    background-color: #00a2ff;
  }
  h1 {
    font-size: 24px;
    margin: 0;
    font-weight: 700;
  }
  .tab-header p {
    font-size: 13px;
    color: #666;
    margin: 0;
  }
  /* .sources-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  } */
  .browser-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    user-select: none;
  }

  .sources-list {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  }
  .content-area > div {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .source-card {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 16px 20px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
  }
  .source-card:hover {
    background: rgba(0, 162, 255, 0.05);
    border-color: rgba(0, 162, 255, 0.2);
  }
  .source-icon-box {
    font-size: 20px;
    margin-right: 16px;
    opacity: 0.5;
  }
  .source-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .source-name {
    font-weight: 700;
    font-size: 14px;
    color: #fff;
  }
  .source-url {
    font-size: 10px;
    color: #444;
    margin-top: 2px;
  }
  .source-chevron {
    color: #333;
    margin-left: 10px;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  /* TO DO: Customizable Size */
  .modal-shell {
    position: relative;

    width: 900px;
    height: 620px;
    display: flex;
    border-radius: 40px;
    padding: 10px;
  }
  .modal-sidebar {
    width: 220px;
    display: flex;
    flex-direction: column;
    padding: 30px 15px;
    gap: 16px;
  }
  .modal-body {
    flex: 1;
    background: #0f0f0f;
    border-radius: 32px;
    padding: 40px;
    display: flex;
    flex-direction: column;
    color: #eee;
    overflow: hidden;
    position: relative;
  }

  .modal-body.windows {
    -webkit-mask-image: radial-gradient(
      circle 20px at calc(100% - 14px) 14px,
      transparent 100%,
      black 100%
    );

    mask-image: radial-gradient(
      circle 20px at calc(100% - 14px) 14px,
      transparent 100%,
      black 100%
    );
  }

  .brand {
    font-family: "Rail";
    font-size: 24px;
    letter-spacing: 2px;
    margin-bottom: 20px;
    padding-left: 20px;
    color: #00a2ff;
  }

  .nav-group button {
    background: transparent;
    border: none;
    color: #666;
    padding: 16px 20px;
    border-radius: 20px;
    text-align: left;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 8px;
    width: 100%;
    font-size: 12px;
    transition: all 0.2s;
  }
  .nav-group button.active {
    background-color: rgba(0, 162, 255, 0.1);
    color: #00a2ff;
  }
  .nav-group button:hover:not(.active) {
    background-color: rgba(255, 255, 255, 0.03);
  }

  .tab-header {
    margin-bottom: 25px;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }
  .title-icon {
    width: 24px;
    height: 24px;
    background-color: #00a2ff;
  }
  h1 {
    font-size: 24px;
    margin: 0;
    font-weight: 700;
  }
  .tab-header p {
    font-size: 13px;
    color: #666;
    margin: 0;
  }

  /* .local-import-container {
    margin-bottom: 24px;

    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  } */

  .local-import-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    margin-bottom: 0;
  }
  .minimal-import-row {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 14px 20px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .minimal-import-row:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .folder-icon {
    width: 20px;
    height: 20px;
    color: #444;
    margin-right: 16px;
    transition: color 0.2s;
  }
  .minimal-import-row:hover .folder-icon {
    color: #00ff96;
    filter: drop-shadow(0 0 5px rgba(0, 255, 150, 0.4));
  }

  .label {
    font-size: 14px;
    font-weight: 500;
    color: #999;
  }

  .line-filler {
    flex: 1;
    height: 1px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
    margin: 0 20px;
  }

  .action-zone {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .mono-hint {
    font-family: "MarklMono";
    font-size: 9px;
    color: #444;
    letter-spacing: 1px;
  }
  .arrow-icon {
    width: 14px;
    height: 14px;
    color: #333;
    transition:
      transform 0.2s,
      color 0.2s;
  }

  .minimal-import-row:hover .arrow-icon {
    color: #00ff96;
    transform: translateX(3px);
  }
  .minimal-import-row:hover .mono-hint {
    color: #666;
  }

  .divider {
    display: flex;
    align-items: center;
    margin: 15px 0 20px 0;
    opacity: 0.2;
    cursor: ns-resize;
    user-select: none;
    /* Smoothly animate opacity changes */
  }

  .divider span {
    font-family: "MarklMono";
    font-size: 9px;
    letter-spacing: 2px;
    color: #fff;
    white-space: nowrap;
    margin-right: 15px;
  }

  .divider::after {
    content: "";
    height: 1px;
    background: #fff;
    width: 100%;
  }

  .divider:hover,
  .divider.resizing {
    opacity: 1;
  }

  .divider:hover span,
  .divider.resizing span {
    color: var(--accent);
  }

  .divider:hover::after,
  .divider.resizing::after {
    background: var(--accent);
  }

  /* .v-resizer {
    height: 6px;
    margin: 4px 0;
    cursor: ns-resize;
    border-radius: 10px;
    flex-shrink: 0;
    transition: background 0.2s;
  } */

  .v-resizer {
    height: 24px;
    margin: 8px 0;
    cursor: ns-resize;
    flex-shrink: 0;
    user-select: none;
  }

  .content-area {
    flex: 1;

    padding-right: 8px;
    min-height: 0;
  }
  .remote-gallery-container {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .content-area::-webkit-scrollbar {
    width: 4px;
  }

  .content-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .content-area::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }

  .content-area::-webkit-scrollbar-thumb:hover {
    background: var(--accent);
  }

  /* FOOTER */
  .sidebar-footer {
    margin-top: auto;
    padding: 20px;
  }
  .stat-pill {
    background: rgba(0, 162, 255, 0.05);
    border: 1px solid rgba(0, 162, 255, 0.1);
    padding: 8px 12px;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .stat-pill .label {
    font-size: 9px;
    font-weight: 800;
    color: #00a2ff;
    opacity: 0.6;
  }
  .stat-pill .value {
    font-family: "MarklMono";
    font-size: 12px;
    color: #fff;
  }

  .icon-mask {
    display: inline-block;
    mask-image: var(--icon);
    -webkit-mask-image: var(--icon);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    background-color: currentColor;
  }
  .lg {
    width: 48px;
    height: 48px;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    opacity: 0.2;
  }
  .mono {
    font-family: "MarklMono";
    font-size: 10px;
    letter-spacing: 1px;
    text-align: center;
  }

  .st-gl {
    background: rgba(35, 35, 35, 0.5);
    border-radius: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .modal-shell.macos .close-btn {
    left: 6px;
    right: auto;
    background: rgba(35, 35, 35, 0);
  }

  /* Close button - Elegant & Professional */
  .close-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 10;

    display: grid;
    place-items: center;

    width: 32px;
    height: 32px;
    padding: 0;

    appearance: none;
    -webkit-appearance: none;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 50%;

    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.5);

    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    transition:
      background 200ms cubic-bezier(0.16, 1, 0.3, 1),
      border-color 200ms cubic-bezier(0.16, 1, 0.3, 1),
      color 200ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .close-icon {
    display: block;
    flex: none;

    width: 14px;
    height: 14px;

    background-color: currentColor;
    transform: rotate(0deg);
    transform-origin: center;

    transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .close-btn:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.16);
    transform: translateY(-1px) scale(1.04);
  }

  .close-btn:hover .close-icon {
    transform: rotate(90deg);
  }
  .close-btn:active {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(0) scale(0.96);
    transition-duration: 100ms;
  }

  .close-btn:active .close-icon {
    transform: rotate(90deg) scale(0.95);
    transition-duration: 100ms;
  }

  .close-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    .close-btn,
    .close-icon {
      transition: none;
    }
  }
</style>
