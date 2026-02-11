<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    activeCharacter,
    getSettingsFor,
    characterSettings,
    spineUpdateSignal,
    isSelectSlot,
    selectedSlotName,
  } from "../../stores/appStore";
  import { loadSpineRuntime } from "../../lib/SpineController";
  import { Spine38Player } from "../../lib/Spine38Player";
  import { Spine4xPlayer } from "../../lib/Spine4xPlayer";

  let canvas: HTMLCanvasElement;
  let currentPlayer: Spine38Player | Spine4xPlayer | null = null;
  let currentLoadId = 0;
  let lastLoadedId = "";
  let canvasReady = false;

  let canvas4x: HTMLCanvasElement;
  let canvas38: HTMLCanvasElement;
  let activeVersion: "3.8" | "4.x" | null = null;

  $: if (
    $activeCharacter &&
    (canvas4x || canvas38) &&
    $activeCharacter.id !== lastLoadedId
  ) {
    lastLoadedId = $activeCharacter.id;
    initPlayer($activeCharacter);
  }

  function handleCameraUpdate() {
    if (!currentPlayer || !$activeCharacter) return;

    characterSettings.update((all) => ({
      ...all,
      [$activeCharacter.id]: {
        ...all[$activeCharacter.id],
        camX: currentPlayer!.cameraManager.x,
        camY: currentPlayer!.cameraManager.y,
        zoom: currentPlayer!.cameraManager.zoom,
      },
    }));
  }

  async function initPlayer(asset: any) {
    const loadId = ++currentLoadId;
    const versionStr = String(asset.version);
    const isV3 = versionStr.includes("3.8");

    if (currentPlayer) {
      currentPlayer.destroy();
      currentPlayer = null;
    }

    const spine = await loadSpineRuntime(asset.version);
    if (loadId !== currentLoadId || !spine) return;

    activeVersion = isV3 ? "3.8" : "4.x";

    setTimeout(async () => {
      if (loadId !== currentLoadId) return;

      if (isV3) {
        if (!canvas38) return;
        currentPlayer = new Spine38Player(spine, canvas38, handleCameraUpdate);
      } else {
        if (!canvas4x) return;
        currentPlayer = new Spine4xPlayer(spine, canvas4x, handleCameraUpdate);
      }

      const settings = getSettingsFor(asset.id, asset);
      currentPlayer.isPMA = settings.pma;

      //Load
      await currentPlayer.load(asset, settings);

      //Restore Skin
      if (settings.currentSkin && settings.currentSkin !== "default") {
        currentPlayer.skeleton.setSkinByName(settings.currentSkin);
        currentPlayer.skeleton.setSlotsToSetupPose();
      }

      //Restore Visibility
      if (settings.slotVisibility) {
        Object.entries(settings.slotVisibility).forEach(
          ([slotName, isVisible]) => {
            currentPlayer.setSlotVisibility(slotName, isVisible);
          }
        );
      }

      //Restore Animations
      if (settings.tracks) {
        Object.entries(settings.tracks).forEach(([trackId, data]) => {
          currentPlayer.playAnimation(
            parseInt(trackId),
            data.animation,
            data.loop
          );
        });
      }

      //Restore Mixer State
      if (settings.mixerTracks && settings.mixerTracks.length > 0) {
        (currentPlayer as any)._mixerState = settings.mixerTracks;

        settings.mixerTracks.forEach((t: any) => {
          if (currentPlayer.state) {
            const entry = currentPlayer.state.getCurrent(t.id);
            if (entry) {
              entry.alpha = t.alpha;
              entry.timeScale = t.paused ? 0 : t.speed;
            }
          }
        });
      }

      (window as any).currentPlayer = currentPlayer;
      spineUpdateSignal.update((n) => n + 1);
    }, 0);
  }
  
  onDestroy(() => {
    if (currentPlayer) currentPlayer.destroy();
    // Cleanup both canvases
    if (canvas4x) {
      canvas4x.width = 0;
      canvas4x.height = 0;
    }
    if (canvas38) {
      canvas38.width = 0;
      canvas38.height = 0;
    }
  });

  export function getPlayer() {
    return currentPlayer;
  }

  $: if (!$activeCharacter && currentPlayer) {
    //Kill the renderer when character is removed
    currentPlayer.destroy();
    currentPlayer = null;
    (window as any).currentPlayer = null;

    lastLoadedId = "";

    // Clear the WebGL buffers
    if (canvas4x) {
      const gl = canvas4x.getContext("webgl2") || canvas4x.getContext("webgl");
      gl?.clear(gl.COLOR_BUFFER_BIT);
    }
    if (canvas38) {
      const gl = canvas38.getContext("webgl");
      gl?.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  //Shortcuts export
  export function toggleActiveTrackPause() {
    if (!currentPlayer || !(currentPlayer as any)._mixerState) return;

    const mixer = (currentPlayer as any)._mixerState;
    const track = mixer.find((t: any) => t.id === 0);

    if (track) {
      track.paused = !track.paused;

      (currentPlayer as any)._mixerState = [...mixer];

      if (currentPlayer.state) {
        const entry = currentPlayer.state.getCurrent(track.id);
        if (entry) {
          entry.timeScale = track.paused ? 0 : track.speed;
        }
      }
      saveCurrentMixerState();
    }
  }

  export function centerCharacter() {
    if (currentPlayer) {
      currentPlayer.centerSkeleton();
    }
  }

  function saveCurrentMixerState() {
    if (!$activeCharacter || !currentPlayer) return;
    const mixer = (currentPlayer as any)._mixerState;

    characterSettings.update((all) => ({
      ...all,
      [$activeCharacter.id]: {
        ...all[$activeCharacter.id],
        mixerTracks: mixer,
      },
    }));
  }

  //Slot Picker 
  let highlightTimer: ReturnType<typeof setTimeout>;

  function handleCanvasClick(e: MouseEvent) {
    if (!$isSelectSlot) return;
    if (!currentPlayer) return;

    const slot = (currentPlayer as any).getSlotAt(e.clientX, e.clientY);

    if (highlightTimer) clearTimeout(highlightTimer);

    if (slot) {
      console.log("Clicked Slot:", slot.data.name);

      currentPlayer.stopHighlightLoop();
      currentPlayer.startHighlightLoop(slot.data.name);
      selectedSlotName.set(slot.data.name);

      highlightTimer = setTimeout(() => {
        currentPlayer?.stopHighlightLoop();
      }, 5000);
    } else {
      currentPlayer.stopHighlightLoop();
    }
  }

</script>

<div class="canvas-container">
  <canvas
    bind:this={canvas4x}
    class:hidden={activeVersion !== "4.x"}
    on:mousedown={handleCanvasClick}
    style:cursor={$isSelectSlot ? "crosshair" : "default"}
  ></canvas>

  <canvas
    bind:this={canvas38}
    class:hidden={activeVersion !== "3.8"}
    on:mousedown={handleCanvasClick}
    style:cursor={$isSelectSlot ? "crosshair" : "default"}
  ></canvas>
</div>

<style>
  .canvas-container {
    position: absolute;
    inset: 0;
    /* background-color: aliceblue; */
  }
  canvas {
    width: 100%;
    height: 100%;
  }
  .hidden {
    display: none !important;
  }
</style>
