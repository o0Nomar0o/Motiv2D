<script lang="ts">
  import { spring } from "svelte/motion";

  import { Platform } from "../../../wailsjs/go/main/App";

  import Viewer from "./ViewMode.svelte";
  
  import SettingsIcon from "../../assets/images/setting.svg";
  import AddItem from "../../assets/images/char-add.svg";
  import LeftCollapseOpen from "../../assets/images/left-panel-open.svg";
  import LeftCollapseClose from "../../assets/images/left-panel-close.svg";

  import {
    isSettingsOpen,
    currentView,
    characterLibrary,
    activeCharacter,
    navState,
    isImportOpen,
    leftPanelClp,
  } from "../../stores/appStore";

  import {
    SelectFolder,
    SelectFiles,
  } from "../../../wailsjs/go/common/SpineCommons";

  let isActive = false;
  let isCollapsed = false;

  let platform: "darwin" | "windows" | "linux" = "windows";

  Platform().then((p) => {
    platform = p as any;
  });

  const toggle = () => {
    isActive = !isActive;

    // if ($currentView === "DASHBOARD" && isActive) isActive = !isActive;

    // navState.set(isActive);
    // console.log("ACTIVE FROM TOGGLE: " + isActive);

    // // centerBlob.set(isActive ? distance : 0);
    // // centerBlobFar.set(isActive ? distance + subWidth + gap : 0);

    // settingBlob.set(isActive ? mainWidth + subWidth + gap * 2 : 60);
    // cameraBlob.set(isActive ? mainWidth + subWidth * 2 + gap * 3 : 50);
    // mainBlob.set(isActive ? subWidth + gap : 0);

    // settingBlobScale.set(isActive ? 1 : 0);
    // cameraBlobScale.set(isActive ? 1 : 0);
    // collapseBlobScale.set(isActive ? 1 : 0);

    // mainBlobScale.set(0);

    // setTimeout(() => mainBlobScale.set(1), 50);
  };

  export const collapse_toggle = () => {
    if ($currentView === "DASHBOARD") return;
    isCollapsed = !isCollapsed;
    leftPanelClp.set(isCollapsed);

    settingBlob.set(!isCollapsed ? mainWidth + subWidth + gap * 2 : 0);
    cameraBlob.set(!isCollapsed ? mainWidth + subWidth * 2 + gap * 3 : 0);
    mainBlob.set(!isCollapsed ? subWidth + gap : 0);

    settingBlobScale.set(!isCollapsed ? 1 : 0);
    cameraBlobScale.set(!isCollapsed ? 1 : 0);
    mainBlobScale.set(!isCollapsed ? 1 : 0);

    opacity.set(0);
    scale.set(0.5);
    rotate.set(isCollapsed ? 90 : -90);

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

  let main_x = 0;
  let height = 30;

  let mainWidth = 83;

  let subWidth = 30;
  let camWidth = 46;

  let gap = 12;

  let distance = mainWidth + gap;
  let roundness = height / 2;

  let goo_height = height;
  let goo_width = subWidth;

  let mainY = 0;
  let centerY = 0;
  let rightY = 0;

  export let active = false;

  $: {
    if ($currentView === "SPINE") {
      isActive = true;
    } else {
      isActive = false;
    }
    if ($currentView === "DASHBOARD" && isActive) isActive = !isActive;

    navState.set(isActive);
    console.log("ACTIVE FROM TOGGLE: " + isActive);

    // centerBlob.set(isActive ? distance : 0);
    // centerBlobFar.set(isActive ? distance + subWidth + gap : 0);

    settingBlob.set(isActive ? mainWidth + subWidth + gap * 2 : 60);
    cameraBlob.set(isActive ? mainWidth + subWidth * 2 + gap * 3 : 50);
    mainBlob.set(isActive ? subWidth + gap : 0);

    settingBlobScale.set(isActive ? 1 : 0);
    cameraBlobScale.set(isActive ? 1 : 0);
    collapseBlobScale.set(isActive ? 1 : 0);

    mainBlobScale.set(0);

    setTimeout(() => mainBlobScale.set(1), 50);
  }

  export async function handleLoadFolder() {
    try {
      const results = await SelectFolder();
      if (results && results.length > 0) {
        characterLibrary.update((existing) => {
          const newItems = results.filter(
            (r) => !existing.some((e) => e.id === r.id),
          );

          if (newItems.length > 0) {
            activeCharacter.set(newItems[0]);
          }

          return [...existing, ...newItems];
        });
      }
    } catch (err) {
      console.error("Failed to load folder:", err);
    }
  }

  export async function openImport() {
    if ($currentView === "DASHBOARD") return;
    isImportOpen.set(!$isImportOpen);
  }

  export async function openSettings() {
    if ($currentView === "DASHBOARD") return;
    isSettingsOpen.set(!$isSettingsOpen);
  }
</script>

<div class="toggle-container">
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
    class="toggle-circle-main st-gl"
    on:click={toggle}
    style="transform: scale({$mainBlobScale}); width: {mainWidth}px; height: {height}px; border-radius: {roundness}px; top: {mainY}px; left: {main_x +
      $mainBlob}px;"
  >
    <Viewer bind:activeViewMode={active} />
  </div>

  <!-- Right blob -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="toggle-circle right st-gl"
    style="width: {subWidth}px; height: {height}px; top: {rightY}px; left: 0; transform: translateX({$settingBlob}px) scale({$settingBlobScale}); border-radius: {roundness}px;"
    on:click={() => openSettings()}
  >
    <div class="icon-mask" style="--icon: url({SettingsIcon})"></div>
  </div>

  <!-- Right blob far -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="toggle-circle right-far st-gl"
    style="width: {camWidth}px; height: {height}px; top: {rightY}px; left: 0; transform: translateX({$cameraBlob}px) scale({$cameraBlobScale}); border-radius: {roundness}px;"
    on:click={() => openImport()}
  >
    <div class="icon-mask" style="--icon: url({AddItem})"></div>
  </div>
</div>

<style>
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
    margin-right: auto;
  }

  .toggle-container.darwin {
    margin-left: 75px;
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
    cursor: pointer;
  }

  .toggle-container.act .toggle-circle-main {
    /* background: rgba(255, 255, 255, 0.04); */
    background: rgba(10, 10, 10, 0.5);
  }

  .st-gl {
    /* background: rgba(255, 255, 255, 0.02); */
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

  .toggle-circle-main:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-0.5px);
  }

  .toggle-circle:hover {
    transform: scale(1.05);
  }
</style>
