<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import ChevronDown from "../../assets/images/chevron-down.svg";
  import ChevronLeft from "../../assets/images/chevron-left.svg";
  import { EventsOn } from "../../../wailsjs/runtime/runtime";
  import { logStore } from "../../stores/appStore";

  let viewport: HTMLElement;
  let autoScroll = true; // Useful to disable if user scrolls up manually

  // Improved Scroll Logic
  async function scrollToBottom(force = false) {
    await tick();
    if (viewport && (autoScroll || force)) {
      // Use instant assignment for better reliability during high-frequency logs
      viewport.scrollTop = viewport.scrollHeight;
    }
  }

  // Reactive trigger for ANY store change
  // We track the length specifically to trigger on new items
  $: $logStore.length, scrollToBottom();

  // Handle incoming events from Go
  function handleNewLog(message: string, level: any = "info") {
    logStore.addLog(message, level);
    // The reactive statement above will handle the scroll
  }

  function toggleExpand(id: number) {
    logStore.update((currentLogs) => {
      return currentLogs.map((l) =>
        l.id === id && l.type === "ASSET_GROUP"
          ? { ...l, expanded: !l.expanded }
          : l,
      );
    });
    // We scroll again because expanding a card changes the container height
    scrollToBottom(true);
  }

  let unlisten: () => void;

  onMount(() => {
    scrollToBottom(true);
    unlisten = EventsOn("link:log", (data: any) => {
      if (data && data.message) {
        handleNewLog(data.message, data.level || "info");
      }
    });
  });

  onDestroy(() => {
    if (unlisten) unlisten();
  });
</script>

<div class="log-container">
  <div class="log-header">
    <div class="status-box">
      <div class="pulse-dot"></div>
      <span class="mono">LISTENING_FOR_ASSETS</span>
    </div>
    <button class="glass-red-btn" on:click={() => logStore.clear()}>
      CLEAR SESSION</button>
  </div>

  <div class="log-viewport custom-scrollbar" bind:this={viewport}>
    {#each $logStore as log (log.id)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="log-card {log.type.toLowerCase()}"
        class:is-expanded={log.expanded}
        on:click={() => toggleExpand(log.id)}
      >
        <div class="log-main">
          <span class="timestamp">{log.timestamp}</span>
          <div class="gutter-line"></div>

          <div class="content-area">
            {#if log.type === "ASSET_GROUP"}
              <span class="dir-tag">DIR</span>
            {/if}
            <span class="label-text">{log.label}</span>
            {#if log.type === "ASSET_GROUP" && !log.expanded}
              <span class="file-count">{log.children?.length} assets</span>
            {/if}
          </div>

          {#if log.type === "ASSET_GROUP"}
            <div
              class="chevron-icon"
              style="--icon: url({log.expanded ? ChevronDown : ChevronLeft})"
            ></div>
          {/if}
        </div>

        {#if log.expanded && log.children}
          <div class="expansion-area">
            <div class="path-display">
              <span class="tiny-label">SOURCE_ROOT</span>
              <code>{log.rootPath}</code>
            </div>

            <div class="file-grid">
              {#each log.children as file}
                <div class="file-row" title={file}>
                  <div class="file-dot"></div>
                  <span class="file-name">{file}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .log-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 0.8rem;
    overflow: hidden;
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 4px;
  }

  .status-box {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    opacity: 0.4;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: #10b981;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
  }

  .glass-red-btn {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
    font-size: 0.6rem;
    font-weight: bold;
    padding: 4px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: 0.2s;
  }

  .glass-red-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
  }

  .log-viewport {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .log-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    transition:
      background 0.2s,
      border 0.2s;
  }

  .log-card.asset_group {
    cursor: pointer;
  }
  .log-card.asset_group:hover {
    background: rgba(255, 255, 255, 0.04);
  }
  .log-card.is-expanded {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .log-main {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
  }

  .timestamp {
    font-family: monospace;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.2);
    width: 65px;
    flex-shrink: 0;
  }

  .gutter-line {
    width: 1px;
    height: 1.2rem;
    background: rgba(255, 255, 255, 0.06);
    margin: 0 1.25rem;
  }

  .content-area {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0; /* Important for ellipsis */
  }

  .dir-tag {
    font-size: 0.5rem;
    font-weight: 900;
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.15);
    padding: 2px 5px;
    border-radius: 4px;
  }

  .label-text {
    font-family: "MarklMono", monospace;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.75);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .system .label-text {
    color: rgba(255, 255, 255, 0.35);
    font-style: italic;
  }

  .file-count {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.03);
    padding: 1px 8px;
    border-radius: 10px;
  }

  /* Expanded View Styling */
  .expansion-area {
    padding: 0 1rem 1rem 5.7rem; /* Align perfectly after gutter line */
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .path-display {
    background: rgba(0, 0, 0, 0.25);
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.03);
  }

  .tiny-label {
    display: block;
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.15);
    margin-bottom: 4px;
    letter-spacing: 0.05em;
  }
  .path-display code {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
    word-break: break-all;
    opacity: 0.8;
  }

  .file-grid {
    display: grid;
    grid-template-columns: 1fr 1fr; /* Strict 2 columns */
    gap: 0.6rem 1.5rem;
  }

  .file-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .file-dot {
    width: 3px;
    height: 3px;
    background: #60a5fa;
    border-radius: 50%;
    opacity: 0.4;
    flex-shrink: 0;
  }

  .file-name {
    font-size: 0.7rem;
    color: #60a5fa;
    font-family: "MarklMono", monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; /* Fix for overlapping long file names */
  }

  .chevron-icon {
    width: 14px;
    height: 14px;
    background-color: rgba(255, 255, 255, 0.3);
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
    margin-left: 1rem;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
</style>
