<script lang="ts">
  import { onMount } from "svelte";
  import { Platform } from "../../../wailsjs/go/main/App";
  import {
    isSettingsOpen,
    configStore,
    updateShortcutInStore,
    resetShortcutsAction,
    initConfig,
  } from "../../stores/appStore";
  import { CheckSourceHealth } from "../../../wailsjs/go/remote/RemoteHandler";

  import iconKeyboard from "../../assets/images/keyboard.svg";
  import iconPlus from "../../assets/images/plus.svg";
  import remoteAccess from "../../assets/images/globe.svg";
  import iconRecord from "../../assets/images/disc-3.svg";
  import iconViewport from "../../assets/images/viewport.svg";

  import iconControl from "../../assets/images/control.svg";
  import iconCommand from "../../assets/images/command.svg";
  import iconOption from "../../assets/images/option.svg";
  import RemoteSetting from "./RemoteSettings.svelte";
  import ColorPicker from "./ColorPicker.svelte";

  export let isOpen = false;
  let activeTab = "controls";
  let currentOS = "windows";

  let recordingId = null;
  let tempMods = [];
  let tempKey = "";

  onMount(async () => {
    currentOS = await Platform();
    if (!$configStore) await initConfig();
  });

  const getModIconPath = (mod) => {
    if (currentOS === "darwin") {
      if (mod === "CTRL") return iconControl;
      if (mod === "CMD") return iconCommand;
      if (mod === "ALT") return iconOption;
    }
    return null;
  };

  function startRecording(id) {
    recordingId = id;
    tempMods = [];
    tempKey = "";
  }

  function handleGlobalKeyDown(e) {
    if (!recordingId) return;
    e.preventDefault();

    if (e.key === "Escape") {
      recordingId = null;
      return;
    }

    if (e.key === "Enter" && tempKey) {
      updateShortcutInStore(recordingId, [...tempMods], tempKey);
      recordingId = null;
      return;
    }

    const mods = [];
    if (e.ctrlKey) mods.push("CTRL");
    if (e.shiftKey) mods.push("SHIFT");
    if (e.altKey) mods.push("ALT");
    if (e.metaKey) mods.push(currentOS === "darwin" ? "CMD" : "WIN");
    tempMods = mods;

    const isModifierOnly = ["Control", "Shift", "Alt", "Meta"].includes(e.key);

    if (!isModifierOnly) {
      tempKey =
        e.key.length === 1 ? e.key.toUpperCase() : e.code.replace("Key", "");
    }
  }

  function resetShortcuts(
    event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
  ) {
    throw new Error("Function not implemented.");
  }

</script>

<svelte:window on:keydown={handleGlobalKeyDown} />

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-overlay" on:click={() => isSettingsOpen.set(false)}>
    <div class="modal-shell st-gl" on:click|stopPropagation>
      <aside class="modal-sidebar">
        <div class="brand">SETTINGS</div>
        <div class="nav-group">
          <button
            class:active={activeTab === "viewport"}
            on:click={() => (activeTab = "viewport")}>Viewport</button
          >
          <button
            class:active={activeTab === "controls"}
            on:click={() => (activeTab = "controls")}>Controls</button
          >
          <button
            class:active={activeTab === "remote"}
            on:click={() => (activeTab = "remote")}>Remote</button
          >
        </div>
      </aside>

      <main class="modal-body">
        {#if activeTab === "viewport"}
          <header class="tab-header">
            <div class="title-row">
              <div
                class="icon-mask title-icon"
                style="--icon: url({iconViewport})"
              ></div>
              <h1>Viewport</h1>
            </div>
            <p>Customize your workspace appearance and rendering.</p>
          </header>
          <div class="content-area">
            <div class="setting-row">
              <label class="label">Background Theme</label>
            </div>
            <ColorPicker
              value={$configStore.viewportBg || "#121212"}
              on:change={(e) => {
                configStore.update((s) => ({ ...s, viewportBg: e.detail }));
              }}
            />
          </div>
        {/if}

        {#if activeTab === "controls"}
          <header class="tab-header">
            <div class="title-row">
              <div
                class="icon-mask title-icon"
                style="--icon: url({iconKeyboard})"
              ></div>
              <h1>Keyboard Shortcuts</h1>
              <button class="reset-btn" on:click={resetShortcuts}>
                Reset Shortcuts
              </button>
            </div>
            <p>
              Click a shortcut to rebind. Press <kbd>Enter</kbd> to save,
              <kbd>Esc</kbd> to cancel.
            </p>
          </header>

          <div class="shortcut-list">
            {#each $configStore.shortcuts as s}
              <div
                class="shortcut-row"
                class:recording={recordingId === s.id}
                on:click={() => startRecording(s.id)}
              >
                <span class="label">{s.label}</span>
                <div class="line-filler"></div>

                <div class="key-display">
                  {#if recordingId === s.id}
                    <div class="recording-state">
                      <div
                        class="icon-mask record-icon rotating"
                        style="--icon: url({iconRecord})"
                      ></div>
                      <div class="keys-captured">
                        {#each tempMods as m}
                          {#if getModIconPath(m)}
                            <div
                              class="icon-mask key-icon recording-mod"
                              style="--icon: url({getModIconPath(m)})"
                            ></div>
                          {:else}
                            <kbd>{m}</kbd>
                          {/if}
                          <div
                            class="icon-mask plus-icon"
                            style="--icon: url({iconPlus})"
                          ></div>
                        {/each}
                        {#if tempKey}<kbd class="prim">{tempKey}</kbd
                          >{:else}<span class="blink">...</span>{/if}
                      </div>
                    </div>
                  {:else}
                    <div class="static-keys">
                      {#each s.modifiers as mod}
                        {#if getModIconPath(mod)}
                          <div
                            class="icon-mask key-icon"
                            style="--icon: url({getModIconPath(mod)})"
                          ></div>
                        {:else}
                          <kbd>{mod}</kbd>
                        {/if}
                        <div
                          class="icon-mask plus-icon"
                          style="--icon: url({iconPlus})"
                        ></div>
                      {/each}
                      <kbd class="prim">{s.key}</kbd>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        {#if activeTab === "remote"}
          <RemoteSetting />
        {/if}
      </main>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    overflow: hidden;
  }
  .modal-shell {
    width: 900px;
    height: 530px;
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
    background: #1f1f1f;
    border-radius: 32px;
    padding: 40px;
    display: flex;
    flex-direction: column;
    color: #eee;
    overflow: hidden;
  }

  .brand {
    font-family: "Rail";
    font-size: 24px;
    letter-spacing: 2px;
    color: var(--accent);
    margin-bottom: 20px;
    padding-left: 20px;
  }

  .tab-header {
    margin-bottom: 30px;
    min-height: 80px;
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
    background-color: #eee;
  }
  h1 {
    font-size: 24px;
    margin: 0;
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
    transition: 0.2s;
    width: 100%;
    transition: all 0.2s;
    font-size: 12px;
  }
  .nav-group button.active {
    background-color: rgb(226, 226, 226, 0.03);
    color: var(--accent);
  }
  .nav-group button:hover {
    background-color: rgb(226, 226, 226, 0.03);
  }

  .shortcut-list,
  .content-area {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
  }

  .shortcut-row,
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .shortcut-row.recording {
    background: rgba(255, 0, 85, 0.05);
    border-color: rgba(255, 0, 85, 0.3);
  }

  .shortcut-list::-webkit-scrollbar {
    width: 4px;
  }

  .shortcut-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .shortcut-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }

  .shortcut-list::-webkit-scrollbar-thumb:hover {
    background: var(--accent);
  }

  .label {
    font-size: 14px;
    font-weight: 500;
    color: #999;
    min-width: 180px;
  }
  .line-filler {
    flex: 1;
    height: 1px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
    margin: 0 20px;
  }

  .static-keys,
  .keys-captured,
  .recording-state {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .recording-state {
    color: #ff0055;
    font-weight: 800;
    font-size: 11px;
  }

  kbd {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 2px 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: #fff;
    box-shadow: 0 2px 0 #000;
  }
  kbd.prim {
    color: #00ffcc;
    border-color: #00ffcc44;
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

  .key-icon {
    width: 18px;
    height: 18px;
    color: #888;
  }
  .recording-mod {
    color: #ff0055;
  }
  .plus-icon {
    width: 10px;
    height: 10px;
    color: #444;
    background-color: #444;
  } 
  .record-icon {
    width: 18px;
    height: 18px;
    background-color: #ff0055;
    margin-right: 10px;
  }
  .tab-header p {
    font-size: 13px;
    color: #666;
    margin: 0;
  }

  .rotating {
    animation: rotate 2s linear infinite;
  }
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .blink {
    animation: blink 1s ease-in-out infinite;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
  .reset-btn {
    margin-left: auto;
    background: rgba(255, 0, 0, 0.05);
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    padding: 4px 12px 4px 12px;
    border-radius: 8px;
    font-family: "Nunito";
    font-size: 12px;
    cursor: pointer;
    transition: 0.2s;
  }

  .reset-btn:hover {
    background: rgba(255, 0, 0, 0.1);
    color: var(--text-main);
  }

  .st-gl {
    background: rgba(35, 35, 35, 0.5);
    border-radius: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  .pill-input {
    background: #1a1a1a;
    border: 1px solid #333;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    outline: none;
    width: 180px;
  }
</style>
