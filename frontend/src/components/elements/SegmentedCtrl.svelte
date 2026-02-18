<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let options: { id: string; label: string }[] = [];
  export let activeId: string = "";
  export let width: string = "fit-content"; 

  $: activeIndex = options.findIndex((opt) => opt.id === opt.id && opt.id === activeId);
  // Thumb width is always 1/N of the container
  $: thumbWidth = options.length > 0 ? 100 / options.length : 0;

  const select = (id: string) => {
    activeId = id;
    dispatch("change", id);
  };
</script>

<div class="segmented-control liquid-glass" style:width style="--cols: {options.length}">
  <div class="thumb-track">
    <div
      class="slider-thumb"
      style:width="{thumbWidth}%"
      style:transform="translateX({activeIndex * 100}%)"
    ></div>
  </div>

  {#each options as option}
    <button
      class="segment-btn"
      class:active={activeId === option.id}
      on:click={() => select(option.id)}
    >
      <span class="label-text">{option.label}</span>
    </button>
  {/each}
</div>

<style>
  .segmented-control {
    --ctrl-height: 28px;
    --inner-padding: 3px;

    position: relative;
    display: grid;
    /* FORCE equal columns so the slider math is always 100% accurate */
    grid-template-columns: repeat(var(--cols), 1fr); 
    align-items: center;
    height: var(--ctrl-height);
    padding: var(--inner-padding);
    background: rgba(255, 255, 255, 0.03);
    
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .thumb-track {
    position: absolute;
    inset: var(--inner-padding);
    pointer-events: none;
    z-index: 1;
  }

  .slider-thumb {
    height: 100%;
    background: var(--accent);
    border-radius: 16px;
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.2),
      inset 0 1px 1px rgba(255, 255, 255, 0.2);
    
    /* Liquid animation */
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
  }

  .segment-btn {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    outline: none;
    z-index: 2;
    cursor: pointer;
    padding: 0 12px;
    white-space: nowrap;
  }

  .label-text {
    font-family: "Rail", monospace; /* Typography focused */
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.4);
    transition: color 0.3s ease;
  }

  .segment-btn.active .label-text {
    color: #fff;
  }

  .segment-btn:hover:not(.active) .label-text {
    color: rgba(255, 255, 255, 0.8);
  }
</style>