<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { EventsOn } from "../../../wailsjs/runtime/runtime";
  import { ProcessUpdate } from "../../../wailsjs/go/update/UpdaterService";

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let updateInfo: any = null;

  let updateStage: "idle" | "busy" | "complete" | "error" | "up-to-date" =
    "idle";
  let progress = 0;
  let errorMessage = "";

  $: if (isOpen) {
    if (updateInfo) {
      if (updateInfo.available === false) {
        updateStage = "up-to-date";
      } else if (
        updateStage === "up-to-date" &&
        updateInfo.available === true
      ) {
        updateStage = "idle";
      }
    }
  }

  $: isLocked = updateStage === "busy";

  const close = () => {
    if (isLocked) return;
    isOpen = false;
    dispatch("close");
    setTimeout(() => {
      updateStage = "idle";
      progress = 0;
      errorMessage = "";
    }, 400);
  };

  onMount(() => {
    const unoff = EventsOn("update_progress", (p: number) => {
      progress = Math.round(p);
      if (updateStage !== "busy") updateStage = "busy";
    });
    return unoff;
  });

  async function handleStartUpdate() {
    if (!updateInfo?.url) {
      errorMessage = "Update source missing";
      updateStage = "error";
      return;
    }

    updateStage = "busy";
    try {
      await ProcessUpdate(updateInfo);
      updateStage = "complete";
    } catch (e) {
      errorMessage = e.toString().replace("Error: ", "");
      updateStage = "error";
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="backdrop"
    on:click={close}
    class:zombie={isLocked}
    transition:fade={{ duration: 200 }}
  >
    <div
      class="modal st-gl"
      on:click|stopPropagation
      transition:fly={{ y: 15, duration: 400 }}
    >
      <div class="brand-tag">MOTIV.2D</div>

      <header>
        <h1 class="title">UPDATE</h1>
        <p
          class="subtitle"
          style:color={updateStage === "busy"
            ? "var(--accent)"
            : "var(--accent-2)"}
        >
          {#if updateStage === "up-to-date"}
            SYSTEM IS CURRENT
          {:else if updateStage === "busy"}
            PATCHING CORE FILES
          {:else}
            NEW BUILD DETECTED
          {/if}
        </p>
      </header>

      <div class="content">
        <section class="meta-grid">
          <div class="entry">
            <span class="label">VERSION</span>
            <span class="value">{updateInfo?.version || "---"}</span>
          </div>
          <div class="entry">
            <span class="label">HASH</span>
            <span class="value truncate">{updateInfo?.checksum || "N/A"}</span>
          </div>
        </section>

        <section class="notes-section">
          <span class="label">WHATS NEW</span>
          <div class="scroll-area">
            <p>
              {updateInfo?.changelog || "Optimization and stability patches."}
            </p>
          </div>
        </section>

        {#if isLocked || updateStage === "complete"}
          <section class="status-zone" in:fade>
            <div class="status-meta">
              <span class="mono-label">{updateStage.toUpperCase()}</span>
              <span class="mono-label">{progress}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style:width="{progress}%"></div>
            </div>
          </section>
        {/if}
      </div>

      <footer>
        {#if updateStage === "complete"}
          <div class="full-width">
            <p class="success-text mono-label">STAGED</p>
            <button
              class="action-btn restart"
              on:click={() => location.reload()}
            >
              RESTART
            </button>
          </div>
        {:else if updateStage === "error"}
          <div class="full-width">
            <p class="error-text mono-label">{errorMessage}</p>
            <button class="close-trigger" on:click={close}>DISMISS</button>
          </div>
        {:else if updateStage === "up-to-date"}
          <div class="full-width" style="justify-content: flex-end;">
            <button class="close-trigger" on:click={close}>CLOSE</button>
          </div>
        {:else}
          <button class="close-trigger" on:click={close} disabled={isLocked}>
            LATER
          </button>
          <button
            class="action-btn install"
            on:click={handleStartUpdate}
            disabled={isLocked}
          >
            {isLocked ? "PATCHING..." : "INSTALL"}
          </button>
        {/if}
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }
  .backdrop.zombie {
    cursor: wait;
  }

  .modal {
    width: 480px;
    background: #080808;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5em;
    position: relative;
    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6);
    padding: 40px 0 0 0;
  }

  .brand-tag {
    position: absolute;
    top: 32px;
    right: 40px;
    font-family: "MarklMono", monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.2);
    letter-spacing: 0.2em;
  }

  header {
    padding: 0 40px 32px 40px;
  }
  .title {
    font-family: "Rail", sans-serif;
    font-size: 28px;
    color: #fff;
    margin: 0;
  }
  .subtitle {
    font-family: "MarklMono", monospace;
    font-size: 9px;
    margin: 6px 0 0 0;
    letter-spacing: 0.1em;
  }

  .content {
    padding: 0 40px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    padding: 24px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .entry {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .label {
    font-family: "MarklMono", monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.3);
  }
  .value {
    font-family: "MarklMono", monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }
  .truncate {
    width: 160px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .notes-section {
    padding: 24px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
  .scroll-area {
    margin-top: 12px;
    max-height: 100px;
    overflow-y: auto;
    font-family: "MarklMono", monospace;
    font-size: 11px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.4);
  }

  .status-zone {
    padding-bottom: 32px;
  }
  .status-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .mono-label {
    font-family: "MarklMono", monospace;
    font-size: 9px;
  }

  .progress-track {
    height: 2px;
    background: rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.4s ease;
  }

  footer {
    padding: 32px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .full-width {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .action-btn {
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-family: "MarklMono", monospace;
    font-size: 10px;
    padding: 10px 24px;
    cursor: pointer;
    border-radius: 2em;
    transition: all 0.2s;
    background: transparent;
    color: #fff;
  }

  .action-btn.install:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .action-btn.restart {
    background: #fff;
    color: #000;
    border-color: #fff;
  }

  .close-trigger {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
    font-family: "MarklMono", monospace;
    font-size: 10px;
    padding: 8px 24px;
    cursor: pointer;
    border-radius: 2em;
    transition: all 0.2s ease;
  }

  .close-trigger:hover:not(:disabled) {
    background: #fff;
    color: #000;
    border-color: #fff;
  }

  button:disabled {
    opacity: 0.1;
    cursor: not-allowed;
  }
  .success-text {
    color: var(--accent);
  }
  .error-text {
    color: #ff4444;
  }
</style>
