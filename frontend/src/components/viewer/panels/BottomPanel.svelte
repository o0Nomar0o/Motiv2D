<script lang="ts">
  import SegmentedCtrl from "../../ui/SegmentedCtrl.svelte";
  import LogViewer from "../../ui/Log.svelte";
  import RotateDial from "../../ui/RotateDial.svelte";
  import ZoomControl from "../../ui/ZoomControl.svelte";
  import TrackMix from "../../ui/TrackMix.svelte";

  import {
    logHeight,
    bottomPanelClp,
    selectedTrackId,
    activeCharacter,
    characterSettings,
    isLive2D,
    activeLive2DCharacter,
    live2dUpdateSignal,
    spineUpdateSignal,
    renderKey,
    focusedTrackId,
  } from "../../../stores/appStore";

  import PanelOpenIcn from "../../../assets/images/bottom_panel_open.svg";
  import PanelCloseIcn from "../../../assets/images/bottom_panel_close.svg";
  import { onDestroy, onMount } from "svelte";

  const permanentOptions = [{ id: "LOGS", label: "Logs" }];
  export let spineTabs = [
    { id: "CANVAS", label: "Canvas" },
    { id: "TMIX", label: "Track Mix" },
  ];

  export let canvasComponent: any = null;
  let logComponent: any;
  let isResizing = false;

  $: allOptions = [
    ...permanentOptions,
    ...spineTabs.filter((tab) => !$isLive2D),
  ];

  let activeTab = "LOGS";
  $: if ($isLive2D && activeTab === "CANVAS") {
    activeTab = "LOGS";
  }

  // --- CONTROL STATES ---
  let canvasRotation = 0;
  let modelRotation = 0;
  let zoomLevel = 100;

  $: if ($activeCharacter && $characterSettings[$activeCharacter.id]) {
    const settings = $characterSettings[$activeCharacter.id];
    canvasRotation = Math.round(settings.camera_rotation || 0);
    modelRotation = Math.round(settings.model_rotation || 0);
    if (typeof settings.zoom === "number") {
      zoomLevel = Math.round(settings.zoom * 100);
    }
  }

  function handleCanvasRotationChange(normalized: number) {
    canvasRotation = normalized;

    if (canvasComponent) {
      if (typeof canvasComponent.handleCanvasRotationChange === "function") {
        canvasComponent.handleCanvasRotationChange(normalized);
      } else if (typeof canvasComponent.handleRotationChange === "function") {
        canvasComponent.handleRotationChange(normalized, "canvas");
      }
    } else if ((window as any).currentPlayer?.setCanvasRotation) {
      (window as any).currentPlayer.setCanvasRotation(normalized);
    }

    if ($activeCharacter) {
      characterSettings.update((all) => ({
        ...all,
        [$activeCharacter.id]: {
          ...all[$activeCharacter.id],
          camera_rotation: normalized,
        },
      }));
    }
  }

  function handleModelRotationChange(normalized: number) {
    modelRotation = normalized;

    if (canvasComponent) {
      if (typeof canvasComponent.handleModelRotationChange === "function") {
        canvasComponent.handleModelRotationChange(normalized);
      } else if (typeof canvasComponent.handleRotationChange === "function") {
        canvasComponent.handleRotationChange(normalized, "model");
      }
    } else if ((window as any).currentPlayer?.setRotation) {
      (window as any).currentPlayer.setRotation(normalized);
    }

    if ($activeCharacter) {
      characterSettings.update((all) => ({
        ...all,
        [$activeCharacter.id]: {
          ...all[$activeCharacter.id],
          model_rotation: normalized,
        },
      }));
    }
  }

  function handleZoomChange(newZoomPercent: number) {
    zoomLevel = newZoomPercent;

    if (canvasComponent) {
      if (typeof canvasComponent.handleZoomChange === "function") {
        canvasComponent.handleZoomChange(newZoomPercent);
      }
    }

    if ($activeCharacter) {
      characterSettings.update((all) => ({
        ...all,
        [$activeCharacter.id]: {
          ...all[$activeCharacter.id],
          zoom: newZoomPercent / 100,
        },
      }));
    }
  }

  let lastWindowHeight =
    typeof window !== "undefined" ? window.innerHeight : 800;

  function startResizing(event: MouseEvent) {
    if ($bottomPanelClp) return;
    isResizing = true;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "ns-resize";
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isResizing) return;
    const newHeight = window.innerHeight - event.clientY;
    const maxHeight = window.innerHeight * 0.935;
    if (newHeight > 100 && newHeight < maxHeight) {
      logHeight.set(newHeight);
    }
  }

  function stopResizing() {
    isResizing = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "default";
  }

  onMount(() => {
    function handleWindowResize() {
      const scaleFactor = window.innerHeight / lastWindowHeight;
      lastWindowHeight = window.innerHeight;

      logHeight.update((currentHeight) => {
        const scaledHeight = currentHeight * scaleFactor;
        const maxHeight = window.innerHeight * 0.9;
        return Math.min(Math.max(scaledHeight, 100), maxHeight);
      });
    }

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  });
</script>

<section
  class="bottom-panel glass-morph"
  class:is-circle={$bottomPanelClp}
  class:resizing={isResizing}
  style="--p-height: {$logHeight}px"
>
  {#if !$bottomPanelClp}
    <div class="resize-handle" on:mousedown={startResizing}>
      <div class="drag-indicator"></div>
    </div>
  {/if}

  <header class="panel-header" class:centered={$bottomPanelClp}>
    {#if !$bottomPanelClp}
      <div class="tabs-container">
        <SegmentedCtrl
          options={allOptions}
          bind:activeId={activeTab}
          width="fit-content"
        />
      </div>
    {/if}

    <button
      class="trigger-btn"
      class:expanded={!$bottomPanelClp}
      on:click={() => ($bottomPanelClp = !$bottomPanelClp)}
      aria-label="Toggle Panel"
    >
      <div
        class="icon-mask"
        style:--icon="url({$bottomPanelClp ? PanelOpenIcn : PanelCloseIcn})"
      ></div>
    </button>
  </header>

  {#if !$bottomPanelClp}
    <div class="panel-viewport custom-scrollbar">
      <div class="content-wrapper">
        {#if activeTab === "LOGS"}
          <div class="mono-label">
            <LogViewer bind:this={logComponent} />
          </div>
        {:else if activeTab === "CANVAS"}
          <div class="canvas-controls">
            <!-- Responsive Uniform Grid Layout Sections -->
            <div class="control-sections">
              
              <!-- SECTION 1: Rotation Controls (2-Cell Grid) -->
              <div class="section-block">
                <span class="section-title">Rotation Controls</span>
                <div class="rotation-grid">
                  <div class="grid-cell">
                    <RotateDial
                      label="Canvas"
                      sublabel="Post-Process"
                      bind:value={canvasRotation}
                      on:change={(e) => handleCanvasRotationChange(e.detail)}
                    />
                  </div>
                  <div class="grid-cell">
                    <RotateDial
                      label="Model Bone"
                      sublabel="Root Bone"
                      bind:value={modelRotation}
                      on:change={(e) => handleModelRotationChange(e.detail)}
                    />
                  </div>
                </div>
              </div>

              <!-- SECTION 2: Viewport Scale / Zoom -->
              <div class="section-block">
                <span class="section-title">Viewport Scale</span>
                <div class="zoom-card">
                  <ZoomControl
                    label="Zoom"
                    sublabel="Scale"
                    bind:value={zoomLevel}
                    on:change={(e) => handleZoomChange(e.detail)}
                  />
                </div>
              </div>

            </div>
          </div>
        {:else if activeTab === "TMIX"}
          {#key $renderKey}
            <TrackMix player={canvasComponent.getPlayer()} />
          {/key}
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .bottom-panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: var(--p-height);
    transform-origin: bottom right;
    margin-left: auto;
    overflow: hidden;
    position: relative;
    transition:
      width 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      height 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      border-radius 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.4s ease;
    transform: translateZ(0);
  }

  .bottom-panel.resizing {
    transition: none !important;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 14px;
    cursor: ns-resize;
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .drag-indicator {
    width: 32px;
    height: 4px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 100px;
    transition:
      width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
      height 0.3s ease,
      background 0.3s ease,
      box-shadow 0.3s ease;
  }

  .resize-handle:hover .drag-indicator,
  .resizing .drag-indicator {
    width: 60px;
    height: 5px;
    background: var(--accent);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
  }

  .glass-morph {
    background: rgba(10, 10, 10, 0.5);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 1.25rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }

  .bottom-panel.is-circle {
    width: 30px;
    height: 30px;
    background: rgba(10, 10, 10, 0.5);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 100px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 1px rgba(255, 255, 255, 0.05);
    cursor: pointer;
    margin-right: 1px;
  }

  .panel-header {
    height: 48px;
    min-height: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    transition: height 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .bottom-panel.is-circle .panel-header {
    height: 30px;
    padding: 0;
    justify-content: center;
  }

  .trigger-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
  }

  .trigger-btn.expanded {
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }

  .icon-mask {
    width: 18px;
    height: 18px;
    background-color: white;
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
  }

  .panel-viewport {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 16px 16px;
  }

  .canvas-controls {
    padding-top: 4px;
  }

  .control-sections {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }

  .section-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: fit-content;
  }

  .section-title {
    font-family: "MarklMono", monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .rotation-grid {
    display: inline-flex;
    flex-direction: row;
    background: rgba(27, 26, 26, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
  }

  .grid-cell {
    position: relative;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    transition: background 0.2s ease;
  }

  .grid-cell:last-child {
    border-right: none;
  }

  .grid-cell:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  /* Separate Zoom Card Block */
  .zoom-card {
    position: relative;
    padding: 12px 16px;
    background: rgba(27, 26, 26, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .zoom-card:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  .mono-label {
    font-family: "MarklMono", monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    letter-spacing: 0.12em;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
  }
</style>