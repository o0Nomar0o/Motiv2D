<script lang="ts">
  import {
    characterLibrary,
    activeCharacter,
    rightPanelClp,
    characterSettings,
    isImportOpen,
  } from "../../stores/appStore";
  import { fade } from "svelte/transition";

  import iconGlobe from "../../assets/images/globe.svg";
  import iconTrash from "../../assets/images/trash.svg";

  import { RemoveAssetCache } from "../../../wailsjs/go/remote/RemoteHandler";

  let searchTerm = "";

  $: filteredCharacters = $characterLibrary.filter((char) =>
    char.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function selectCharacter(char: any) {
    activeCharacter.set(char);
    
  }

  let scrollTimeout: number;
  $: if ($activeCharacter && !$rightPanelClp) {
    clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      const container = document.querySelector(".scroll-content");
      const el = document.querySelector(
        `[data-char-id="${$activeCharacter.id}"]`
      ) as HTMLElement;

      if (el && container) {
        const cTop = container.scrollTop;
        const cBottom = cTop + container.clientHeight;
        const eTop = el.offsetTop - (container as HTMLElement).offsetTop;
        const eBottom = eTop + el.clientHeight;

        if (eTop < cTop || eBottom > cBottom) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }, 400);
  }

  export async function removeCharacter(e: MouseEvent, char: any) {
    e.stopPropagation();
    if (char.isRemote) {
      try {
        try {
          console.log(`Successfully deleted local cache for: ${char.id}`);

          await RemoveAssetCache(char.sourceName, char.id);
          console.log(`Successfully deleted local cache for: ${char.id}`);
        } catch (err) {
          console.error("Failed to delete physical files:", err);
        }
        console.log(`Cleaned up cache for ${char.id}`);
      } catch (err) {
        console.error("Failed to delete remote cache:", err);
      }
    }

    if ($activeCharacter?.id === char.id) {
      activeCharacter.set(null);
      
      const currentIndex = $characterLibrary.findIndex((c) => c.id === char.id);
      if ($characterLibrary.length > 1) {
        const nextTarget = $characterLibrary[currentIndex + 1] || $characterLibrary[currentIndex - 1];
        
        setTimeout(() => {
           activeCharacter.set(nextTarget);
        }, 10);
      }
    }

    characterLibrary.update((list) => list.filter((c) => c.id !== char.id));
    characterSettings.update((settings) => {
      const newSettings = { ...settings };
      delete newSettings[char.id];
      return newSettings;
    });
  }

  function getStatusColor(char: any) {
    if (char.missingPng?.length > 0) return "#ff4d4d";
    if (!char.hasAtlas || !char.hasSkel) return "#ffbb33";
    return "#00ff96";
  }

  //   function openRemoteSettings() {
  //     isImportOpen.set(true);
  //   }

  //Shortcuts export
  export function nextCharacter() {
    if ($characterLibrary.length === 0) return;
    const idx = $characterLibrary.findIndex(
      (c) => c.id === $activeCharacter?.id
    );
    activeCharacter.set(
      $characterLibrary[(idx + 1) % $characterLibrary.length]
    );
  }

  export function previousCharacter() {
    if ($characterLibrary.length === 0) return;
    const idx = $characterLibrary.findIndex(
      (c) => c.id === $activeCharacter?.id
    );
    activeCharacter.set(
      $characterLibrary[
        (idx - 1 + $characterLibrary.length) % $characterLibrary.length
      ]
    );
  }
</script>

<aside class="sidebar-container liquid-glass" class:collapsed={$rightPanelClp}>
  <div class="vertical-layout-wrapper">
    <div class="config-wrap">
      <div class="section-header-row">
        <div class="label-group">
          <span class="section-label">Library</span>
          <!-- <button class="remote-trigger" on:click={openRemoteSettings} title="Remote Sources">
            <div class="icon-mask globe-icon" style="--icon: url({iconGlobe})"></div>
            <span>Remote</span>
          </button> -->
        </div>
        <div class="pma-toggle active">
          {filteredCharacters.length} ASSETS
        </div>
      </div>

      <div class="search-box">
        <input
          type="text"
          class="mono-text search-input"
          placeholder="SEARCH ASSETS..."
          bind:value={searchTerm}
        />
      </div>
    </div>

    <div class="main-content-wrapper">
      <div class="scroll-content custom-scrollbar">
        <div class="list-stack">
          {#each filteredCharacters as char (char.id)}
            <div class="item-container" class:is-remote={char.isRemote}>
              <button
                data-char-id={char.id}
                class="anim-item"
                class:active={$activeCharacter?.id === char.id}
                on:click={() => selectCharacter(char)}
              >
                <div
                  class="indicator"
                  style="background: {char.isRemote
                    ? '#00a2ff'
                    : getStatusColor(char)}; 
                         box-shadow: 0 0 8px {char.isRemote
                    ? '#00a2ff'
                    : getStatusColor(char)};"
                ></div>

                <div class="char-info">
                  <span class="char-id">{char.id}</span>
                  <div class="char-meta">
                    <span class="mono-text">v{char.version}</span>
                    <span class="type-tag" class:remote-blue={char.isRemote}>
                      {char.isBinary ? "SKEL" : "JSON"}
                    </span>
                  </div>
                </div>

                {#if char.isRemote}
                  <div
                    class="icon-mask remote-bg-icon"
                    style="--icon: url({iconGlobe})"
                  ></div>
                {/if}

                {#if char.missingPng?.length > 0}
                  <div class="error-icon" title="Missing Textures">!</div>
                {/if}
              </button>

              <button
                class="remove-btn"
                on:click={(e) => removeCharacter(e, char)}
                title={char.isRemote
                  ? "Delete Cached Remote Asset"
                  : "Remove Asset"}
              >
                <div
                  class="icon-mask trash-icon"
                  style="--icon: url({iconTrash})"
                ></div>
              </button>
            </div>
          {:else}
            <div class="empty-state mono-text" in:fade>NO ASSETS FOUND</div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</aside>

<style>
  .sidebar-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.5rem;
    color: white;
    user-select: none;
    pointer-events: auto;
    overflow: hidden;
    box-sizing: border-box;
    transition:
      transform 0.35s cubic-bezier(0.25, 1, 0.25, 1),
      opacity 0.4s ease;
  }

  .sidebar-container.collapsed {
    transform: translateX(360px);
    opacity: 0;
    pointer-events: none;
  }

  .liquid-glass {
    background: rgba(10, 10, 10, 0.5);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-radius: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .vertical-layout-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .label-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-label {
    font-family: "Rail", sans-serif;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Remote Trigger Button */
  .remote-trigger {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 2px 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .remote-trigger span {
    font-family: "MarklMono", monospace;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
  }

  .remote-trigger:hover {
    border-color: #00a2ff;
    background: rgba(0, 162, 255, 0.1);
  }
  .remote-trigger:hover span {
    color: #00a2ff;
  }

  .pma-toggle {
    background: rgba(0, 255, 150, 0.1);
    border: 1px solid rgba(0, 255, 150, 0.3);
    color: #00ff96;
    font-family: "MarklMono", monospace;
    font-size: 9px;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .search-box {
    margin-bottom: 1.25rem;
  }

  .search-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 12px;
    border-radius: 10px;
    color: white;
    outline: none;
    box-sizing: border-box;
  }
  .search-input:focus {
    border-color: #00ff96;
  }

  .main-content-wrapper {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;

    /* contain-intrinsic-size: 1px 150px; */
  }

  .scroll-content {
    flex: 1;
    overflow-y: auto;
    padding-right: 4px;
  }

  .list-stack {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .item-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .anim-item {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    padding-right: 44px;
    position: relative;
    overflow: hidden;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .anim-item.active {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: white;
    transform: translateX(4px);
  }

  .is-remote .anim-item {
    background: linear-gradient(
      90deg,
      rgba(0, 162, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
  }
  .remote-blue {
    color: #00a2ff !important;
  }

  .remote-bg-icon {
    position: absolute;
    right: 40px;
    width: 40px;
    height: 40px;
    color: rgba(0, 162, 255, 0.04);
    pointer-events: none;
  }

  .indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .char-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex: 1;
    overflow: hidden;
  }

  .char-id {
    font-family: "MarklMono", monospace;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    text-align: left;
  }

  .char-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    opacity: 0.5;
  }

  .type-tag {
    font-family: "Rail";
    font-size: 8px;
    font-weight: 900;
    color: #00ff96;
  }

  .error-icon {
    color: #ff4d4d;
    font-weight: bold;
    font-family: "Rail";
    font-size: 14px;
  }

  /* Icons */
  .icon-mask {
    display: block;
    mask-image: var(--icon);
    -webkit-mask-image: var(--icon);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    background-color: currentColor;
  }

  .globe-icon {
    width: 10px;
    height: 10px;
    color: rgba(255, 255, 255, 0.4);
  }
  .remote-trigger:hover .globe-icon {
    color: #00a2ff;
  }

  .trash-icon {
    width: 14px;
    height: 14px;
  }

  .remove-btn {
    position: absolute;
    right: 10px;
    background: rgba(255, 77, 77, 0.1);
    border: 1px solid rgba(255, 77, 77, 0.2);
    color: #ff4d4d;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 2;
  }

  .item-container:hover .remove-btn {
    opacity: 1;
  }
  .remove-btn:hover {
    background: #ff4d4d;
    color: white;
    transform: scale(1.05);
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }

  .mono-text {
    font-family: "MarklMono";
    font-size: 10px;
  }
  .empty-state {
    padding: 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.2);
  }
</style>
