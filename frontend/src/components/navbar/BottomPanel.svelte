<script lang="ts">

  import SegmentedCtrl from "../elements/SegmentedCtrl.svelte";
  import LogViewer from "../elements/Log.svelte";
  import TrackMixer from "../canvas/TrackMix.svelte";
  import {
    logHeight,
    bottomPanelClp,
    selectedTrackId,
  } from "../../stores/appStore";

  import PanelOpenIcn from "../../assets/images/bottom_panel_open.svg";
  import PanelCloseIcn from "../../assets/images/bottom_panel_close.svg";

  const permanentOptions = [{ id: "LOGS", label: "Logs" }];

  export let dynamicTabs = [];

  let logComponent;
  let isResizing = false;
  
  $: allOptions = [...permanentOptions, ...dynamicTabs];
  let activeTab = "LOGS";

  function startResizing(event: MouseEvent) {
    if ($bottomPanelClp) return;
    isResizing = true;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'ns-resize';
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isResizing) return;
    const newHeight = window.innerHeight - event.clientY;
    if (newHeight > 100 && newHeight < window.innerHeight * 0.9) {
      logHeight.set(newHeight);
    }
  }

  function stopResizing() {
    isResizing = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  }
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
      <div class="tabs-container" >
        <SegmentedCtrl
          options={allOptions}
          bind:activeId={activeTab}
          width="fit-content"
        />
      </div>
    {/if}

    <button
      class="trigger-btn"
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
        {:else if activeTab === "MIXER"}
          {:else if activeTab === "ANIM"}
          <div class="timeline-view"></div>
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

  /* RESIZE HANDLE & INDICATOR */
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
    background: rgba(255, 255, 255, 0.4);
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
    padding: 0 16px;
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
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-mask {
    width: 18px;
    height: 18px;
    background-color: white;
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
    opacity: 0.7;
  }

  .panel-viewport {
    flex: 1;
    overflow-y: auto;
    padding: 0 24px 24px 24px;
  }

  .mono-label {
    font-family: "MarklMono", monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
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