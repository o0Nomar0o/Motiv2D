<script lang="ts">
  import HomeIcn from "../../assets/images/home-board.svg";
  import SpineIcn from "../../assets/images/2d-viewer.svg";
  import { currentView, setView } from "../../stores/appStore";

  export let activeViewMode: boolean = $currentView === 'SPINE';

  $: activeViewMode = $currentView === 'SPINE';

  const toggle = () => {
    const nextView = $currentView === 'DASHBOARD' ? 'SPINE' : 'DASHBOARD';
    setView(nextView);
  };
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="segmented-control" on:click={toggle}>
  <div class="thumb-container">
    <div
      class="slider-thumb"
      style="transform: translateX({activeViewMode ? 100 : 0}%);"
    ></div>
  </div>

  <!-- Labels -->
  <button class="segment-btn">
    <span class:active={!activeViewMode}
      ><div class="icon-mask" style="--icon: url({HomeIcn})"></div></span
    >
  </button>

  <button class="segment-btn">
    <span class:active={activeViewMode}>
      <div class="icon-mask" style="--icon: url({SpineIcn})"></div>
    </span>
  </button>
</div>

<style>
  .segmented-control {
    --pill-height: 30px;
    --pill-bg: rgba(0, 0, 0, 0.25);
    --pill-radius: 100px;
    --inner-padding: 3px;
    --thumb-bg: var(--accent, #0078d4);

    position: relative;
    display: flex;
    width: 100%;
    height: var(--pill-height);
    user-select: none;
    overflow: hidden;
    cursor: pointer;
    
    
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
    height: calc(var(--pill-height) - (var(--inner-padding) * 2));
    width: 50%;
    background: var(--thumb-bg);
    
    border-radius: var(--pill-radius);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px) saturate(180%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .segment-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    outline: none;
    z-index: 2;
    cursor: pointer;
  }

  .segment-btn span {
    color: rgba(255, 255, 255, 0.45);
    font-size: 12px;
    font-weight: 700;
    transition: all 0.2s ease;
  }

  .segment-btn span.active {
    color: #ffffff;
  }

  .segment-btn:active span {
    transform: scale(0.95);
  }
  .icon-mask {
    width: 18px !important;
    height: 18px !important;
    background-color: currentColor;
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
  }
</style>
