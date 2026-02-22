<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade, fly } from "svelte/transition";
  import {
    FetchRemoteAssets,
    DownloadRemoteAsset,
    FinalizeAsset,
    RefreshSource,
  } from "../../../wailsjs/go/remote/RemoteHandler";
  import {
    characterLibrary,
    activeCharacter,
    remoteSources,
  } from "../../stores/appStore";

  import iconUser from "../../assets/images/user.svg";
  import iconDownload from "../../assets/images/download.svg";
  import iconCheck from "../../assets/images/check.svg";
  import iconGrid from "../../assets/images/grid.svg";
  import iconList from "../../assets/images/list.svg";
  import iconRefresh from "../../assets/images/refresh.svg";
  import { CheckSourceHealth } from "../../../wailsjs/go/remote/RemoteHandler";

  export let source = null;
  const dispatch = createEventDispatcher();

  let assets = [];
  let displayedAssets = [];
  let loading = false;
  let statusMap = {};
  let searchQuery = "";
  let viewMode: "grid" | "list" = "grid";
  let selectedIds = new Set<string>();

  $: sourceName = source?.name || "Repository";

  function toggleSelect(id: string) {
    if (statusMap[id] !== "idle") return;
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    selectedIds = selectedIds;
  }

  async function handleBatchImport() {
    const ids = [...selectedIds];
    selectedIds.clear();
    selectedIds = selectedIds;

    const tasks = ids.map((id) => {
      const asset = assets.find((a) => a.id === id);
      if (asset && statusMap[id] === "idle") {
        return handleAction(asset);
      }
      return Promise.resolve();
    });

    await Promise.all(tasks);
  }

  // >500 assets cause lag
  // async function loadGallery() {
  //   if (!source?.baseUrl) return;
  //   loading = true;
  //   selectedIds.clear();
  //   selectedIds = selectedIds;

  //   try {
  //     const results = await FetchRemoteAssets(
  //       source.id,
  //       source.name,
  //       source.baseUrl,
  //       source.metadataUrl,
  //       source.remoteRoot,
  //       source.mode,
  //       source.folderPaths,
  //       source.mappingRules,
  //     );

  //     assets = Array.isArray(results) ? results : [];
  //     statusMap = Object.fromEntries(assets.map((a) => [a.id, "idle"]));
  //   } catch (err) {
  //     console.error("Gallery Load Error:", err);
  //     assets = [];
  //   } finally {
  //     loading = false;
  //   }
  // }

  // $: filteredAssets = assets.filter((a) => {
  //   const t = searchQuery.toLowerCase().trim();
  //   return (
  //     !t ||
  //     a.displayName?.toLowerCase().includes(t) ||
  //     a.id?.toLowerCase().includes(t)
  //   );
  // });
  //
  
  async function loadGallery() {
    if (!source?.baseUrl) return;
    
    loading = true;
    assets = [];
    displayedAssets = [];
    selectedIds.clear();
    selectedIds = selectedIds;

    try {

      const results = await FetchRemoteAssets(
        source.id, source.name, source.baseUrl, source.metadataUrl,
        source.remoteRoot, source.mode, source.folderPaths, source.mappingRules
      );

      const rawAssets = Array.isArray(results) ? results : [];
      
      const newStatus = {};
      for (let i = 0; i < rawAssets.length; i++) {
        newStatus[rawAssets[i].id] = "idle";
      }
      statusMap = newStatus;
      assets = rawAssets;

      displayedAssets = assets.slice(0, 30);
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          displayedAssets = assets; 
        }, 50);
      });

    } catch (err) {
      console.error("Gallery Load Error:", err);
    } finally {
      loading = false;
    }
  }

  $: filteredAssets = (searchQuery ? assets : displayedAssets).filter((a) => {
    const t = searchQuery.toLowerCase().trim();
    return !t || a.displayName?.toLowerCase().includes(t) || a.id?.toLowerCase().includes(t);
  });
  
  $: if (source) loadGallery();

  async function handleAction(asset) {
    if (
      statusMap[asset.id] === "downloading" ||
      statusMap[asset.id] === "ready"
    )
      return;

    statusMap[asset.id] = "downloading";
    statusMap = statusMap;

    try {
      await DownloadRemoteAsset({
        ...asset,
        sourceName: source.name,
        remoteRoot: source.remoteRoot,
      });

      const local = await FinalizeAsset(source.name, asset.id);

      characterLibrary.update((x) =>
        x.some((e) => e.id === local.id) ? x : [...x, local],
      );
      activeCharacter.set(local);

      statusMap[asset.id] = "ready";
      statusMap = statusMap;
      dispatch("importSuccess", local);
    } catch (err) {
      console.error("Action Error:", err);
      statusMap[asset.id] = "idle";
      statusMap = statusMap;
    }
  }

  async function handleRefresh() {
    if (!source?.baseUrl) return;
    loading = true;
    try {
      await RefreshSource(source.baseUrl, source.folderPaths);
      await loadGallery();

      console.log(`Cache cleared and gallery refreshed for: ${source.name}`);
    } catch (err) {
      console.error("Refresh Error:", err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="gallery-wrapper">
  <header class="gallery-toolbar">
    <div class="search-area glass-inset">
      <div class="icon-mask sm" style="--icon:url({iconUser});opacity:.3"></div>
      <input
        bind:value={searchQuery}
        placeholder="Filter {sourceName}..."
        spellcheck="false"
      />
    </div>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="segmented-control"
      on:click={() => (viewMode = viewMode === "grid" ? "list" : "grid")}
    >
      <div class="thumb-track">
        <div
          class="thumb"
          style="transform:translateX({viewMode === 'list' ? '100%' : '0%'})"
        ></div>
      </div>
      <button class="mode-btn" class:active={viewMode === "grid"}>
        <div class="icon-mask" style="--icon:url({iconGrid})"></div>
      </button>
      <button class="mode-btn" class:active={viewMode === "list"}>
        <div class="icon-mask" style="--icon:url({iconList})"></div>
      </button>
    </div>

    <div class="gallery-control">
      <button
        class="refresh-btn"
        data-tooltip="Refresh Gallery"
        on:click={handleRefresh}
      >
        <div class="icon-mask" style="--icon:url({iconRefresh})"></div>
      </button>
    </div>
  </header>

  <main class="viewport custom-scrollbar">
    {#if loading}
      <div class="loading-state" in:fade>
        <div class="spinner"></div>
        <p>Fetching Assets</p>
      </div>
    {:else}
      <div class="asset-display {viewMode}">
        {#each filteredAssets as asset (asset.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="asset-card"
            class:is-selected={selectedIds.has(asset.id)}
            class:is-downloading={statusMap[asset.id] === "downloading"}
            on:click={() => toggleSelect(asset.id)}
          >
            <div class="indicator">
              <div class="checkbox" class:checked={selectedIds.has(asset.id)}>
                {#if selectedIds.has(asset.id)}
                  <div
                    class="icon-mask"
                    style="--icon:url({iconCheck}); background: #000;"
                  ></div>
                {/if}
              </div>
            </div>

            <div class="preview-box">
              <div class="icon-mask" style="--icon:url({iconUser})"></div>
            </div>

            <div class="meta">
              <span class="title">{asset.displayName || asset.id}</span>
              <span class="id-tag">{asset.id}</span>
            </div>

            <div class="action-zone">
              <button
                class="btn-action"
                class:is-ready={statusMap[asset.id] === "ready"}
                disabled={statusMap[asset.id] !== "idle"}
                on:click|stopPropagation={() => handleAction(asset)}
              >
                {#if statusMap[asset.id] === "downloading"}
                  <div class="loading-spinner-small"></div>
                {:else}
                  <div
                    class="icon-mask sm"
                    style="--icon:url({statusMap[asset.id] === 'ready'
                      ? iconCheck
                      : iconDownload})"
                  ></div>
                {/if}
                <span
                  >{statusMap[asset.id] === "ready"
                    ? "READY"
                    : statusMap[asset.id] === "downloading"
                      ? "..."
                      : "IMPORT"}</span
                >
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>
  {#if selectedIds.size > 0}
    <footer class="sticky-footer" transition:fly={{ y: 40, duration: 300 }}>
      <div class="batch-bar glass-strong">
        <div class="batch-count">
          <span class="num">{selectedIds.size}</span>
          <span class="txt">SELECTED</span>
        </div>
        <div class="line-spacer"></div>
        <button class="btn-batch" on:click={handleBatchImport}>
          IMPORT SELECTED
        </button>
      </div>
    </footer>
  {/if}
</div>

<style>
  .gallery-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .gallery-toolbar {
    flex-shrink: 0;
    display: flex;
    align-items: stretch;
    gap: 16px;
    padding-bottom: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .search-area {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 14px;
    height: 38px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .search-area input {
    flex: 1;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 13px;
    padding-left: 10px;
    outline: none;
  }

  .segmented-control {
    width: 84px;
    height: 30px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    position: relative;
    display: flex;
    padding: 4px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .gallery-control {
    width: 30px;
    height: 30px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 1rem;
    position: relative;
    display: flex;
    padding: 4px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .viewport {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 30px 0 120px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .asset-display {
    width: 100%;
    margin: 0 auto;
  }

  .asset-display.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 24px;
    place-items: center;
  }

  .asset-display.list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 800px;
  }

  .asset-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    transition:
      background 0.2s,
      border 0.2s;
    position: relative;
    cursor: pointer;
    width: 100%;
    box-sizing: border-box;

    content-visibility: auto;
    contain-intrinsic-size: 160px 230px;
  }

  .asset-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .asset-card.is-selected {
    background: rgba(0, 255, 150, 0.03);
    border-color: rgba(0, 255, 150, 0.25) !important;
  }

  .grid .asset-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px 16px;
    max-width: 220px;
    min-height: 230px;
  }

  .list .asset-card {
    display: flex;
    align-items: center;
    padding: 12px 24px;
  }

  .preview-box {
    width: 88px;
    height: 88px;
    background: #000;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #222;
    margin-bottom: 12px;
  }
  .list .preview-box {
    width: 36px;
    height: 36px;
    margin-bottom: 0;
    margin-right: 16px;
  }

  .indicator {
    position: absolute;
    top: 12px;
    right: 12px;
  }
  .list .indicator {
    position: static;
    margin-right: 16px;
    order: -1;
  }

  .meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .title {
    font-size: 13.5px;
    font-weight: 700;
    color: #fff;
    line-height: 1.4;
    word-break: break-word;
    padding: 0 4px;
  }

  .id-tag {
    font-family: "MarklMono", monospace;
    font-size: 9px;
    color: #444;
    margin-top: 6px;
    text-transform: uppercase;
  }

  .btn-action {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #888;
    padding: 8px 16px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 900;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 3px 0 #000;
  }

  .btn-action:hover:not(:disabled) {
    background: #fff;
    color: #000;
    border-color: #fff;
  }
  .btn-action.is-ready {
    background: transparent;
    color: #00ffcc;
    border-color: rgba(0, 255, 204, 0.2);
    box-shadow: none;
    pointer-events: none;
  }

  .loading-spinner-small {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(0, 162, 255, 0.2);
    border-top-color: #00a2ff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .sticky-footer {
    position: sticky;
    bottom: 30px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sticky-footer.floating .batch-bar {
    background: rgba(10, 10, 10, 0.95);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
    border-color: rgba(0, 162, 255, 0.5);
  }

  .batch-bar {
    pointer-events: auto;
    width: 100%;
    max-width: 500px;
    background: rgba(10, 10, 10, 0.39);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 162, 255, 0.3);
    padding: 10px 10px 10px 24px;
    border-radius: 20px;
    display: flex;
    align-items: center;
  }

  .batch-count {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .batch-count .num {
    background: #00a2ff;
    color: #000;
    padding: 2px 8px;
    border-radius: 6px;
    font-weight: 900;
    font-size: 12px;
  }
  .batch-count .txt {
    font-size: 10px;
    font-weight: 800;
    color: #00a2ff;
    letter-spacing: 1px;
  }

  .btn-batch {
    background: #00a2ff;
    color: #000;
    border: none;
    padding: 12px 24px;
    border-radius: 14px;
    font-weight: 900;
    font-size: 11px;
    cursor: pointer;
  }

  .line-spacer {
    flex: 1;
    height: 1px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
    margin: 0 20px;
  }
  .thumb-track {
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    bottom: 6px;
    display: flex;
  }
  .thumb {
    width: 50%;
    height: 100%;
    background: #00a2ff;
    border-radius: 8px;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .mode-btn {
    flex: 1;
    z-index: 2;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.2);
    cursor: pointer;
  }
  .mode-btn.active {
    color: #fff;
  }

  .refresh-btn {
    flex: 1;
    z-index: 2;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.2);
    cursor: pointer;
    color: #fff;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .refresh-btn:hover {
    color: color-mix(in srgb, var(--accent), transparent 10%);
  }

  .refresh-btn:hover .icon-mask {
    animation: spin 1s linear infinite;
    transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: translateX(0) translateY(0);
  }

  .gallery-control:hover {
    background-color: color-mix(in srgb, var(--accent), transparent 86%);
  }

  .icon-mask {
    transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    will-change: transform;
    display: inline-block;
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
    background-color: currentColor;
    width: 16px;
    height: 16px;
  }
  .checkbox {
    width: 18px;
    height: 18px;
    border-radius: 6px;
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .checkbox.checked {
    background: #00ff96;
    border-color: #00ff96;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.05);
    border-top-color: #00a2ff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }
  .loading-state {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0.4;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
