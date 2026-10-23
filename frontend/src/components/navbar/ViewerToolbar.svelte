<script lang="ts">
  import { spring } from "svelte/motion";
  import { currentView, navState, rightPanelClp } from "../../stores/appStore";
  import { Platform } from "../../../wailsjs/go/main/App";

  import MemAnalyzer from "./MemoryMonitor.svelte";
  import SettingsIcon from "../../assets/images/setting.svg";
  import AddItem from "../../assets/images/char-add.svg";
  import LeftCollapseOpen from "../../assets/images/right-panel-open.svg";
  import LeftCollapseClose from "../../assets/images/right-panel-close.svg";


  let platform: "darwin" | "windows" | "linux" = "windows";

  Platform().then((p) => {
    platform = p as any;
  });

  let isActive = false;
  let isCollapsed = false;

  const toggle = () => {
    // settingBlob.set(isActive ? mainWidth + subWidth + gap * 2 : 60);
    // cameraBlob.set(isActive ? mainWidth + subWidth * 2 + gap * 3 : 50);
    mainBlob.set(isActive ? -subWidth - gap : 0);
    collapseBlob.set(isActive ? 173 : 0);

    // settingBlobScale.set(isActive ? 1 : 0);
    // cameraBlobScale.set(isActive ? 1 : 0);
    collapseBlobScale.set(isActive ? 1 : 0);

    mainBlobScale.set(0);

    setTimeout(() => mainBlobScale.set(1), 50);
  };

  $: if ($navState !== isActive) {
    isActive = $navState;
    toggle();

    if (isCollapsed) {
      isCollapsed = !isCollapsed
      rightPanelClp.set(isCollapsed)
    }
  }

  export const collapse_toggle = () => {
    if ($currentView === "DASHBOARD") return;
    isCollapsed = !isCollapsed;
    rightPanelClp.set(isCollapsed)

    // settingBlob.set(!isCollapsed ? mainWidth + subWidth + gap * 2 : 0);
    // cameraBlob.set(!isCollapsed ? mainWidth + subWidth * 2 + gap * 3 : 0);

    mainBlob.set(!isCollapsed ? -subWidth - gap : 80);

    // settingBlobScale.set(!isCollapsed ? 1 : 0);
    // cameraBlobScale.set(!isCollapsed ? 1 : 0);

    mainBlobScale.set(!isCollapsed ? 1 : 0);

    opacity.set(0);
    scale.set(0.5);
    rotate.set(isCollapsed ? 90 : -90);

    // Animate in new icon after small delay
    setTimeout(() => {
      rotate.set(0);
      scale.set(1);
      opacity.set(1);
    }, 50);
  };

  // const centerBlob = spring(0, { stiffness: 0.18, damping: 0.8 });
  // const centerBlobFar = spring(0, { stiffness: 0.17, damping: 0.8 });
  let stiff = 0.35;
  let damp = 0.85;

  const settingBlob = spring(0, { stiffness: 0.18, damping: 0.8 });
  const cameraBlob = spring(0, { stiffness: 0.17, damping: 0.8 });
  const collapseBlob = spring(0, { stiffness: 0.17, damping: 0.8 });

  const mainBlob = spring(0, { stiffness: stiff, damping: damp });

  const settingBlobScale = spring(0, { stiffness: stiff, damping: damp });
  const cameraBlobScale = spring(0, { stiffness: stiff, damping: damp });
  const collapseBlobScale = spring(0, { stiffness: stiff, damping: damp });

  const mainBlobScale = spring(1, { stiffness: 0.55, damping: damp });

  const scale = spring(1, { stiffness: 0.35, damping: 0.75 });
  const rotate = spring(0, { stiffness: 0.35, damping: 0.7 });
  const opacity = spring(1, { stiffness: 0.35, damping: 0.75 });

  let main_x = -45;
  let height = 30;

  let mainWidth = 83;

  let subWidth = 30;
  let camWidth = 46;

  let gap = 12;

  let distance = mainWidth + gap;
  let roundness = height / 2;

  let goo_height = height;
  let goo_width = subWidth;

  // Correct Y positions
  let mainY = 0;
  let centerY = 0;
  let rightY = 0;

  // export let assets: any[] = [];

  // Viewer.svelte
  async function handleLoadFolder() {}
</script>

<div class="toggle-container {isActive ? ' act' : ''}">
  <!-- Main goo -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="toggle-circle right st-gl"
    style="width: {subWidth}px; height: {height}px; top: {rightY}px; left: 0; transform: translateX({$collapseBlob}px) scale({$collapseBlobScale}); border-radius: {roundness}px;"
    on:click={() => collapse_toggle()}
  >
    <div
      class="icon-mask"
      style="
    --icon: url({isCollapsed ? LeftCollapseOpen : LeftCollapseClose});
    transform: rotate({$rotate}deg) scale({$scale});
    opacity: {$opacity};
    transition: transform 0.2s, opacity 0.2s;
  "
    ></div>
  </div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="toggle-circle-main"
    style="transform: scale({$mainBlobScale}); border-radius: {roundness}px; top: {mainY}px; left: {main_x +
      $mainBlob}px;"
  >
    <MemAnalyzer />
  </div>

  <!-- Right blob -->
  <div
    class="toggle-circle right st-gl"
    style="width: {subWidth}px; height: {height}px; top: {rightY}px; left: 0; transform: translateX({$settingBlob}px) scale({$settingBlobScale}); border-radius: {roundness}px;"
  >
    <div class="icon-mask" style="--icon: url({SettingsIcon})"></div>
  </div>

  <!-- Right blob far -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="toggle-circle right-far st-gl"
    style="width: {camWidth}px; height: {height}px; top: {rightY}px; left: 0; transform: translateX({$cameraBlob}px) scale({$cameraBlobScale}); border-radius: {roundness}px;"
    on:click={() => handleLoadFolder()}
  >
    <div class="icon-mask" style="--icon: url({AddItem})"></div>
  </div>
</div>

<style>
  /* .icon-mask img {
    width: 18px !important;
    height: 18px !important;
    background-color: currentColor;
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
  } */
  .icon-mask {
    width: 18px !important;
    height: 18px !important;
    background-color: currentColor;
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
  }
  .toggle-container {
    position: relative;
    width: 100%;
    max-width: 214px;
    height: 30px;
    /* margin-right: auto; */
    /* margin-left: 75px; */
  }

  .toggle-circle,
  .toggle-circle-main {
    position: absolute;
    cursor: pointer;
    transition:
      transform 0.1s,
      opacity 0.2s,
      background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* .toggle-container.act .toggle-circle-main {
    background: rgba(255, 255, 255, 0.04);
  } */

  /* Liquid glass styling */
  .st-gl {
      background: rgba(10, 10, 10, 0.5);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 100px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 1px rgba(255, 255, 255, 0.05);
  }

  /* .toggle-circle.center {
    pointer-events: none;
  } */

  /* Hover effects */
  /* .toggle-circle-main:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-0.5px);
  } */

  .toggle-circle:hover {
    transform: scale(1.05);
  }
</style>
