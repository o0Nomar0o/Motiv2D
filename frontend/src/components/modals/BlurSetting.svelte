<script lang="ts">
  import { backgroundBlur, blurType } from "../../stores/appStore";

  const types = [
    { id: "none", label: "NONE" },
    { id: "gaussian", label: "GAUSSIAN" },
    { id: "frosted", label: "FROSTED" },
    { id: "pixel", label: "PIXEL" },
  ];
</script>

<div class="blur-pill-container" class:is-none={$blurType === 'none'}>
  <div class="pill-section combo-box">
    <select bind:value={$blurType} class="clean-select" style:width={$blurType === 'none' ? '40px' : '75px'}>
      {#each types as type}
        <option value={type.id}>{type.label}</option>
      {/each}
    </select>
    <span class="chevron">▼</span>
  </div>

  <div class="fluid-content">
    <div class="divider"></div>

    <div class="pill-section slider-group">
      <input
        type="range"
        min="0"
        max="120"
        step="1"
        bind:value={$backgroundBlur}
        class="precision-slider"
      />
      <span class="value-display">
        {$backgroundBlur}<span class="unit">PX</span>
      </span>
    </div>
  </div>
</div>

<style>
  .blur-pill-container {
    display: inline-flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    padding: 0 14px;
    height: 34px;
    gap: 0;
    overflow: hidden;
    transition: max-width 0.8s cubic-bezier(0.16, 1, 0.3, 1), 
                padding 0.8s cubic-bezier(0.16, 1, 0.3, 1);

    max-width: 500px;
    white-space: nowrap;
  }

  .blur-pill-container.is-none {
    max-width: 40px; 
    padding-right: 10px;
  }

  .fluid-content {
    display: flex;
    align-items: center;
    transition: opacity 0.5s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 1;
    transform: translateX(0);
  }

  .is-none .fluid-content {
    opacity: 0;
    transform: translateX(-20px);
    pointer-events: none;
  }

  .pill-section {
    display: flex;
    align-items: center;
    position: relative;
    height: 100%;
  }

  .combo-box {
    flex-shrink: 0;
    transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .divider {
    width: 1px;
    height: 14px;
    background: rgba(255, 255, 255, 0.15);
    margin: 0 14px;
    flex-shrink: 0;
  }

  /* Dropdown Styling */
  .clean-select {
    appearance: none;
    background: transparent;
    border: none;
    color: #fff;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    cursor: pointer;
    padding-right: 12px;
    outline: none;
    transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .clean-select option {
    background: #111;
    color: #fff;
  }

  .chevron {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 7px;
    pointer-events: none;
    opacity: 0.3;
  }

  /* Slider Styling */
  .precision-slider {
    -webkit-appearance: none;
    width: 100px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    outline: none;
    cursor: pointer;
  }

  .precision-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow:
      inset 0 1px 1px rgba(255, 255, 255, 0.8),
      inset 0 -2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.16, 0, 0.3, 1);
  }

  .precision-slider:active::-webkit-slider-thumb {
    width: 22px;
    height: 12px;
    border-radius: 6px;
    background: #ffffff;
  }

  .value-display {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: #fff;
    min-width: 42px;
    text-align: right;
    margin-left: 8px;
  }

  .unit {
    font-size: 8px;
    opacity: 0.4;
    margin-left: 2px;
  }
</style>