<script lang="ts">
  export let activePreset: string;

  const presets = [
    { id: 'spine', name: 'Spine2D' },
    { id: 'live2d', name: 'Live2D' },
    { id: 'custom', name: 'Custom' }
  ];

  $: activeIndex = presets.findIndex(p => p.id === activePreset);
</script>

<div class="segmented-control">
  <div class="thumb-container">
    <div 
      class="slider-thumb" 
      style="transform: translateX({activeIndex * 100}%);"
    ></div>
  </div>

  {#each presets as preset}
    <button 
      class="segment-btn" 
      class:active={activePreset === preset.id}
      on:click={() => activePreset = preset.id}
    >
      <span class="preset-name">{preset.name}</span>
    </button>
  {/each}
</div>

<style>

  .segmented-control {
    /* --- CONFIG --- */
    --pill-height: 33px;
    --pill-bg: rgba(0, 0, 0, 0.25);
    --pill-radius: 100px; 
    --inner-padding: 3px;
    --thumb-bg: var(--accent);
    /* -------------- */

    position: relative;
    display: flex;
    width: 100%; 
    height: var(--pill-height);
    background: var(--pill-bg);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05),
                inset 0 1px 2px rgba(0, 0, 0, 0.2);
    border-radius: var(--pill-radius);
    padding: var(--inner-padding);
    backdrop-filter: blur(12px);
    user-select: none;
    box-sizing: border-box; 
    overflow: hidden;
    
  }

  .thumb-container {
    position: absolute;
    top: 0;
    left: var(--inner-padding);
    right: var(--inner-padding);
    bottom: 0;
    display: flex;
    align-items: center;
    pointer-events: none;
    z-index: 1;
    

  }

  .slider-thumb {
    height: calc(var(--pill-height) - (var(--inner-padding) * 2 )); 
    width: calc(100% / 3); 
    
    background: var(--thumb-bg);
    border-radius: var(--pill-radius);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);

    background: color-mix(in srgb, var(--thumb-bg), transparent 5%);
     backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);

    border-radius: 1.25rem;

    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .segment-btn {
    position: relative;
    flex: 1;
    height: 100%;
    background: transparent;
    border: none;
    outline: none;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    
  }

  .segment-btn span {
    color: rgba(255, 255, 255, 0.45);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.01em;
    transition: all 0.2s ease;
    line-height: 1; 
  }

  .segment-btn.active span {
    color: #ffffff;
  }

  .segment-btn:active span {
    transform: scale(0.95);
  }
</style>