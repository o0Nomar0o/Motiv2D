<script lang="ts">
  //Components Import
  import TestData from "./components/AlphaBuild/TestData.svelte";
  import Extractor from "./components/extraction/Dashboard.svelte";
  import MenuTools from "./components/navbar/Menu.svelte";
  import ToolPanel from "./components/navbar/ViewerToolbar.svelte";
  import Sidebar from "./components/extraction/Sidebar.svelte";
  import SpineCanvas from "./components/viewer/Canvas.svelte";
  import SpineSidebar from "./components/viewer/panels/SpineSidebar.svelte";
  import CharacterSidebar from "./components/viewer/panels/CharacterSidebar.svelte";
  import CubismSidebar from "./components/viewer/panels/CubismSidebar.svelte";
  import BottomPanel from "./components/viewer/panels/BottomPanel.svelte";
  import SettingsModal from "./components/modals/SettingsModal.svelte";
  import ImportModal from "./components/modals/ImportModal.svelte";
  import About from "./components/modals/About.svelte";
  import WinControls from "./components/navbar/WinControls.svelte";
  import Landing from "./components/AlphaBuild/Landing.svelte";
  import UpdateModal from "./components/modals/UpdaterModal.svelte";
  import ImportGuideCard from "./components/modals/ui/ImportCardGuide.svelte";
  import { EventsOn } from "../wailsjs/runtime/runtime";
  import { Platform } from "../wailsjs/go/main/App";
  import { onMount, onDestroy } from "svelte";
  import { CheckForUpdates } from "../wailsjs/go/update/UpdaterService";

  //Store Import
  import {
    activeCharacter,
    spineUpdateSignal,
    currentView,
    isSettingsOpen,
    isImportOpen,
    leftPanelClp,
    rightPanelClp,
    bottomPanelClp,
    configStore,
    isSelectSlot,
    initRemotes,
    remoteSources,
    visibilityToggleSignal,
    activeLive2DCharacter,
    live2dUpdateSignal,
    isLive2D,
    renderKey,
  } from "./stores/appStore";

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
  let viewerRef: MenuTools;
  let rightSidebarRef: ToolPanel;
  let animSidebarRef: SpineSidebar;
  let cubismSidebarRef: CubismSidebar;
  let charSidebarRef: CharacterSidebar;

  // $: leftMargin = $leftPanelClp ? "1rem" : "calc(1.5rem + 305px)";
  $: leftMargin = $bottomPanelClp
    ? "auto"
    : $leftPanelClp
      ? "1rem"
      : "calc(1.5rem + 305px)";
  $: rightMargin = $rightPanelClp ? "1rem" : "calc(1.5rem + 293px)";

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
      toggle_bottom: () => bottomPanelClp.set(!$bottomPanelClp),
      center: () => canvasComponent?.centerCharacter(),
      next_asset: () => charSidebarRef?.nextCharacter(),
      previous_asset: () => charSidebarRef?.previousCharacter(),
      next_slot: () => {
        if ($isLive2D) cubismSidebarRef?.nextAnimation();
        else animSidebarRef?.nextAnimation();
      },
      previous_slot: () => animSidebarRef?.previousAnimation(),
      slot_picker: () => animSidebarRef?.togglePicker(),
      toggle_visibility: () => {
        console.log("Visibility shortcut triggered");
        visibilityToggleSignal.update((n) => n + 1);
      },
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
    const unoffUpdate = EventsOn("open_update_modal", async () => {
      showUpdate = true;

      try {
        const result = await CheckForUpdates();

        updateInfo = {
          ...result.info,
          available: result.available,
        };
      } catch (err) {
        console.error("Failed to fetch updates:", err);
      }
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

  // $: activeAssetId = $activeCharacter?.id || $activeLive2DCharacter?.id || "none";

  // // Combine signals into one stable string
  // $: renderKey = `${activeAssetId}-${$spineUpdateSignal}-${$live2dUpdateSignal}`;
</script>

<div class="window-root {platform}">
  {#if $isSettingsOpen || $isImportOpen}
    <div class="global-drag-handle top-stack"></div>
  {/if}
  <div class="global-drag-handle">
    <div class="left-group">
      <MenuTools bind:active={currentMainView} bind:this={viewerRef} />
    </div>

    {#if platform !== "darwin"}
      <div class="right-group">
        <ToolPanel bind:this={rightSidebarRef} />

        <WinControls />
      </div>
    {:else}
      <ToolPanel bind:this={rightSidebarRef} />
    {/if}
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

    <!-- {#if isSpineMode && $activeCharacter  }
      {#key $activeCharacter.id + $spineUpdateSignal} -->
    <!-- {#if $currentView === "SPINE" && ( $activeCharacter || $activeLive2DCharacter)}
      {#key ($activeCharacter?.id || $activeLive2DCharacter?.id) + $spineUpdateSignal + $live2dUpdateSignal} -->
    {#if $currentView === "SPINE" && ($activeCharacter || $activeLive2DCharacter)}
      {#key $renderKey}
        <div class="animation-panel">
          {#if $isLive2D}
            <CubismSidebar
              player={canvasComponent?.getPlayer()}
              bind:this={cubismSidebarRef}
            />
          {:else}
            <SpineSidebar
              bind:this={animSidebarRef}
              player={canvasComponent?.getPlayer()}
              characterMetadata={$activeCharacter}
            />
          {/if}
        </div>
      {/key}
      <div class="right-overlay">
        <CharacterSidebar bind:this={charSidebarRef} />
      </div>
      <div
        class="bottom-overlay"
        style:left={leftMargin}
        style:right={rightMargin}
        style:width={$bottomPanelClp ? "48px" : "unset"}
      >
        <BottomPanel {canvasComponent} />
      </div>
    {/if}
  </div>
  {#if $currentView === "SPINE" && !($activeCharacter || $activeLive2DCharacter)}
    <div class="empty-guide-overlay">
      <ImportGuideCard />
    </div>
  {/if}
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
  <SettingsModal bind:isOpen={$isSettingsOpen} />
  <ImportModal bind:isOpen={$isImportOpen} />
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
  .global-drag-handle.top-stack {
    z-index: 99999;
  }

  .left-group,
  .right-group {
    display: flex;
    align-items: center;
    width: 17px;
    gap: 25px;
  }
  .right-group {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
    margin-right: 12px;
    flex-shrink: 0;
    white-space: nowrap;
    padding-right: 114px;
  }
  :global(.right-group .toggle-container) {
    flex-shrink: 0 !important;
    right: 185px;
  }

  :global(.right-group > *) {
    flex-shrink: 0;
    --wails-draggable: no-drag;
  }

  /* .left-group,
  .right-group {
    display: flex;
    align-items: center;
    gap: 8px;
    width: auto;
    min-width: 0;
    flex-shrink: 0;
    position: relative;
  } */

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

  .bottom-overlay {
    position: fixed;
    bottom: 0.6rem;
    z-index: 100;
    pointer-events: none;

    /* Ensure the overlay container itself is aligned right 
       so the child has a right-side anchor point */
    display: flex;
    justify-content: flex-end;

    /* Use the reactive margins we discussed earlier */
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  :global(.bottom-overlay > *) {
    pointer-events: auto;
    background: rgba(20, 20, 20, 0.4);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);

    border-radius: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 1px rgba(255, 255, 255, 0.1);

    overflow: hidden;
    height: 100%;
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

  .empty-guide-overlay {
    position: absolute;
    top: -55px;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    pointer-events: none;
  }
  :global(.empty-guide-overlay > *) {
    pointer-events: auto;
  }
</style>
