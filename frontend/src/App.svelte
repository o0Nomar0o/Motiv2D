<script lang="ts">
  //Components Import
  import TestData from "./components/AlphaBuild/TestData.svelte";
  import Extractor from "./components/extraction/Dashboard.svelte";
  import Viewer from "./components/navbar/SpineMenu.svelte";
  import SenPanel from "./components/navbar/SecondaryPanel.svelte";
  import Sidebar from "./components/extraction/Sidebar.svelte";
  import SpineCanvas from "./components/canvas/SpineCanvas.svelte";
  import AnimationSidebar from "./components/canvas/AnimationSidebar.svelte";
  import CharacterSidebar from "./components/canvas/CharacterSidebar.svelte";
  import SettingsModal from "./components/modals/SettingsModal.svelte";
  import ImportModal from "./components/modals/ImportModal.svelte";
  import About from "./components/modals/About.svelte";
  import WinControls from "./components/navbar/WinControls.svelte";
  import Landing from "./components/AlphaBuild/Landing.svelte";
  import RemoteSettings from "./components/modals/RemoteSettings.svelte";
  import UpdateModal from "./components/modals/UpdaterModal.svelte";

  //Store Import
  import {
    activeCharacter,
    spineUpdateSignal,
    currentView,
    isSettingsOpen,
    isImportOpen,
    leftPanelClp,
    rightPanelClp,
    configStore,
    isSelectSlot,
    initRemotes,
    remoteSources,
  } from "./stores/appStore";

  //Wails & Svelte Import
  import { EventsOn } from "../wailsjs/runtime/runtime";
  import { Platform } from "../wailsjs/go/main/App";
  import { onMount, onDestroy } from "svelte";

  let platform: "darwin" | "windows" | "linux" = "windows";

  Platform().then((p) => {
    platform = p as any;
  });

  $: isSpineMode = $currentView === "SPINE";
  $: isDashboardMode = $currentView === "DASHBOARD";

  let sidebarCollapsed = false;
  let ready = false;
  let currentMainView = false;
  let currentSubView = "dashboard";
  let canvasComponent: SpineCanvas;
  let viewerRef: Viewer;
  let rightSidebarRef: SenPanel;
  let animSidebarRef: AnimationSidebar;
  let charSidebarRef: CharacterSidebar;

  let updateInfo: any = null;

  let showAbout = false;
  function handleCloseAbout() {
    showAbout = false;
  }

  let showUpdate = false;
  function handleCloseUpdate() {
    showUpdate = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    const activeElem = document.activeElement;
    if (
      activeElem instanceof HTMLInputElement ||
      activeElem instanceof HTMLTextAreaElement
    )
      return;

    const config = $configStore;
    if (!config || !config.shortcuts) return;

    const actionMap: Record<string, () => void> = {
      media_action: () => canvasComponent?.toggleActiveTrackPause(),
      toggle_left: () => viewerRef?.collapse_toggle(),
      toggle_pma: () => animSidebarRef?.togglePMA(),
      import_local: () => viewerRef?.handleLoadFolder(),
      import: () => viewerRef?.openImport(),
      settings: () => viewerRef?.openSettings(),
      toggle_right: () => rightSidebarRef?.collapse_toggle(),
      center: () => canvasComponent?.centerCharacter(),
      next_asset: () => charSidebarRef?.nextCharacter(),
      previous_asset: () => charSidebarRef?.previousCharacter(),
      next_slot: () => animSidebarRef?.nextAnimation(),
      previous_slot: () => animSidebarRef?.previousAnimation(),
      slot_picker: () => animSidebarRef?.togglePicker(),
    };

    const triggeredShortcut = config.shortcuts.find((s: any) => {
      const keyMatch =
        e.key.toUpperCase() === s.key.toUpperCase() ||
        e.code.toUpperCase() === s.key.toUpperCase();
      const altMatch = e.altKey === s.modifiers.includes("ALT");
      const ctrlMatch =
        (e.ctrlKey || e.metaKey) === s.modifiers.includes("CTRL");
      return keyMatch && altMatch && ctrlMatch;
    });

    if (triggeredShortcut && actionMap[triggeredShortcut.id]) {
      e.preventDefault();
      actionMap[triggeredShortcut.id]();
    }
  }

  onMount(async () => {
    if ($remoteSources.length === 0) {
      await initRemotes();
    }
  });

  onMount(() => {
    //Keyboard Listeners
    window.addEventListener("keydown", handleKeyDown);

    //Wails Event Listeners
    const unoffAbout = EventsOn("open_about_modal", () => (showAbout = true));
    const unoffUpdate = EventsOn("open_update_modal", (data) => {
      updateInfo = data;
      showUpdate = true;
    });

    (async () => {
      if ($remoteSources.length === 0) {
        await initRemotes();
      }
    })();

    //Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      if (unoffAbout) unoffAbout();
      if (unoffUpdate) unoffUpdate();
    };
  });
</script>

<div class="window-root {platform}">
  <div class="global-drag-handle">
    <div class="left-group">
      {#if platform !== "darwin"}
        <WinControls />
      {/if}
      <Viewer bind:active={currentMainView} bind:this={viewerRef} />
    </div>
    <SenPanel bind:this={rightSidebarRef} />
  </div>

  <div class="app-layout">
    <div
      class="canvas-side"
      class:hidden={!isSpineMode && !currentMainView}
      style="display: {isSpineMode || isDashboardMode ? 'block' : 'none'}"
    >
      <SpineCanvas bind:this={canvasComponent} />
    </div>

    {#if isDashboardMode}
      {#if ready}
        <aside
          class="sidebar"
          style="width: {sidebarCollapsed ? '65px' : '160px'}"
        >
          <Sidebar
            bind:isCollapsed={sidebarCollapsed}
            bind:activeView={currentSubView}
          />
        </aside>
        <main class="content">
          <div class="scroll-container">
            {#if currentSubView === "dashboard"}
              <Extractor />
            {:else if currentSubView === "tasks"}
              <TestData />
            {/if}
          </div>
        </main>
      {:else}
        <Landing />
      {/if}
    {/if}

    {#if isSpineMode && $activeCharacter}
      {#key $activeCharacter.id + $spineUpdateSignal}
        <div class="animation-panel">
          <AnimationSidebar
            bind:this={animSidebarRef}
            player={canvasComponent?.getPlayer()}
            characterMetadata={$activeCharacter}
          />
        </div>
      {/key}
      <div class="right-overlay">
        <CharacterSidebar bind:this={charSidebarRef} />
      </div>
    {/if}
  </div>
  <SettingsModal bind:isOpen={$isSettingsOpen} />
  <ImportModal bind:isOpen={$isImportOpen} />
  {#if showAbout}
    <About on:close={handleCloseAbout} />
  {/if}
  {#if showUpdate}
    <UpdateModal
      bind:isOpen={showUpdate}
      {updateInfo}
      on:close={handleCloseUpdate}
    />
  {/if}
</div>

<style>
  .hidden {
    display: none !important;
  }
  .animation-panel {
    position: fixed;
    left: 1rem;
    width: 305px;

    z-index: 100;
    pointer-events: none;
  }

  .right-overlay {
    position: absolute;
    top: 42px;
    height: calc(100vh - 1rem - 2px - 42px);
    width: 293px;
    z-index: 100;
    pointer-events: none;
  }

  .animation-panel {
    left: 1rem;
  }

  .right-overlay {
    right: 1rem;
  }

  :global(.right-overlay > *) {
    pointer-events: auto;
    margin-top: 0.5rem;
    height: 100%;
    box-sizing: border-box;
  }

  :global(.animation-panel > *) {
    pointer-events: auto;
  }

  :global(.animation-panel > .sidebar-container) {
    pointer-events: auto;
    margin-top: 0.5rem; 
    height: 100%;
    box-sizing: border-box;
  }

  :global(.right-overlay > *) {
    pointer-events: auto;
    height: 100%; 
    display: flex;
    flex-direction: column;
  }

  .canvas-side {
    flex: 1;
    position: relative;
    z-index: 1; 
  }

  .global-drag-handle {
    background-color: transparent;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 42px;
    --wails-draggable: drag;
    z-index: 9999;

    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 8px 0 16px;
    box-sizing: border-box;
    pointer-events: auto;
  }

  .left-group,
  .right-group {
    display: flex;
    align-items: center;
    width: 17px;
  }

  :global(.darwin) .left-group {
    padding-left: 72px;
  }

  .app-layout {
    display: flex;
    width: 100%;
    height: 100%;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    overscroll-behavior: none;
    overflow: hidden;
  }

  .window-root {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .sidebar,
  .scroll-container,
  .animation-panel,
  .right-overlay {
    top: 42px;
    height: calc(100vh - 1rem - 2px - 42px);
  }

  .sidebar {
    width: 160px;
    background: var(--bg-sidebar);
    margin: 0.5rem 0.5rem 0 1rem;
    border-radius: 1.35em;
    position: relative;
    box-sizing: border-box;
    overflow-y: scroll;
    overflow-x: hidden;
    overscroll-behavior: contain;

    background: rgba(255, 255, 255, 0.01);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);

    border-radius: 1.25rem;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar::-webkit-scrollbar {
    display: none;
  }

  .content {
    flex: 1;
    height: 100vh;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .scroll-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px 24px;

    margin: 0.5rem 1rem 0.5rem 0.5rem;
    border-radius: 1.35em;
    position: relative;
    box-sizing: border-box;

    overscroll-behavior: contain;

    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);

    border-radius: 1.25rem;

    border: 1px solid rgba(255, 255, 255, 0.1);
    border-top: 1px solid rgba(255, 255, 255, 0.2);

    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  }
</style>
