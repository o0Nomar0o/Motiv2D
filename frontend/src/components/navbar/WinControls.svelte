<script lang="ts">
  import { onMount } from "svelte";
  import {
    Quit,
    WindowMinimise,
    WindowMaximise,
    WindowUnmaximise,
    WindowIsMaximised,
  } from "../../../wailsjs/runtime/runtime";

  import CloseIcn from "../../assets/images/cross.svg";
  import MaximizeIcn from "../../assets/images/maximize.svg";
  import RestoreIcn from "../../assets/images/restore-down.svg";

  let isMaximised = false;

  onMount(async () => {
    isMaximised = await WindowIsMaximised();
  });

  function quit() {
    Quit();
  }

  async function toggleMaximize() {
    isMaximised = await WindowIsMaximised();
    if (isMaximised) {
      WindowUnmaximise();
      isMaximised = false;
    } else {
      WindowMaximise();
      isMaximised = true;
    }
  }

  function minimize() {
    WindowMinimise();
  }
</script>

<div class="window-controls-win">
  <!-- Minimize Button -->
  <button class="win-btn" on:click={minimize} title="Minimize">
    <span class="win-dash"></span>
  </button>

  <!-- Maximize / Restore Button -->
  <button
    class="win-btn"
    on:click={toggleMaximize}
    title={isMaximised ? "Restore Down" : "Maximize"}
  >
    <div
      class="icon-mask win-icon"
      class:restore-size={isMaximised}
      style="--icon: url({isMaximised ? RestoreIcn : MaximizeIcn})"
    ></div>
  </button>

  <!-- Close Button -->
  <button class="win-btn close" on:click={quit} title="Close">
    <svg class="win-icon" viewBox="0 0 10 10">
      <path
        d="M1 1L9 9M9 1L1 9"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
      />
    </svg>
  </button>
</div>

<style>
  .window-controls-win {
    display: flex;
    z-index: 9999;
    padding-right: 8px;
    gap: 2.5px;
  }

  .win-btn {
    width: 34px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;

    /* background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0);
    border-radius: 6px; */

    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: all 0.2s ease;
    color: rgba(225, 225, 225, 0.77);

    background: rgba(10, 10, 10, 0.77);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 1px rgba(255, 255, 255, 0.05);
  }

  .win-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* .win-btn:hover .icon-mask,
  .win-btn:hover .win-dash {
    color: rgba(25, 25, 25, 0.77);
  } */

  .win-btn.close:hover {
    background: rgba(232, 17, 35, 0.8);
    color: white;
    border-color: transparent;
  }

  .win-dash {
    width: 9px;
    height: 1.2px;
    background: currentColor;
    display: block;
    border-radius: 1px;
  }

  .icon-mask {
    background-color: currentColor;
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
  }

  .win-icon {
    width: 11.5px;
    height: 11.5px;
  }

  .win-icon.restore-size {
    width: 13px;
    height: 13px;
  }
</style>
