<script lang="ts">
  import {
    Quit,
    WindowMinimise,
    WindowMaximise,
  } from "../../../wailsjs/runtime/runtime";

  function quit() {
    Quit();
  }

  function maximize() {
    WindowMaximise();
  }

  function minimize() {
    WindowMinimise();
  }
</script>

<button class="win-btn close" on:click={quit}>
  <svg class="win-icon" viewBox="0 0 10 10"
    ><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" /></svg
  >
</button>

<div class="window-controls-win">
  <button class="win-btn" on:click={minimize}>
    <svg class="win-icon" viewBox="0 0 10 2"
      ><path d="M1 1H9" stroke="currentColor" /></svg
    >
  </button>

  <button class="win-btn" on:click={maximize}>
    <svg class="win-icon" viewBox="0 0 10 10"
      ><rect
        x="1.5"
        y="1.5"
        width="7"
        height="7"
        fill="none"
        stroke="currentColor"
      /></svg
    >
  </button>

</div>

<style>
  .window-controls-win {
    display: flex;
    gap: 4px;
    z-index: 9999;
  }

  .win-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px; 
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: all 0.2s ease;
  }

  .win-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .win-btn.close:hover {
    background: rgba(
      232,
      17,
      35,
      0.8
    ); /* Windows "Close Red" but with glass alpha */
    color: white;
    border-color: transparent;
  }

  .win-icon {
    width: 10px;
    height: 10px;
    fill: none;
    stroke-width: 1.2;
  }
</style>
