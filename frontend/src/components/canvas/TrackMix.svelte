<script lang="ts">
  import { slide } from "svelte/transition";
  import { onMount, onDestroy } from "svelte";
  import { characterSettings, activeCharacter, selectedTrackId } from "../../stores/appStore";
  import ChevronDown from "../../assets/images/chevron-down.svg";
  import ChevronLeft from "../../assets/images/chevron-left.svg";
  import PlayIcon from "../../assets/images/play.svg";
  import PauseIcon from "../../assets/images/pause.svg";

  export let player: any;
  export let focusedTrackId: number = 0;

  let isDraggingId: number | null = null;

  interface Track {
    id: number;
    name: string;
    alpha: number;
    speed: number;
    paused: boolean;
    expanded: boolean;
    progress: number;
  }

  // $: focusedTrackId = $selectedTrackId;

  let tracks: Track[] = [];

  function initTracks() {
    if (player && player._mixerState) {
      tracks = player._mixerState;
    } else {
      tracks = [
        {
          id: 0,
          name: "Base Track",
          alpha: 1,
          speed: 1,
          paused: false,
          expanded: false,
          progress: 0,
        },
      ];
      if (player) player._mixerState = tracks;
    }
  }

  // function syncWithSpine() {
  //   if (!player?.state) return;

  //   let changed = false;
  //   const newTracks = tracks.map((t) => {
  //     const entry = player.state.getCurrent(t.id);
  //     const currentName = entry?.animation?.name || "Empty";

  //     let currentProgress = 0;
  //     if (entry && entry.animation) {
  //       const duration = entry.animation.duration;
  //       currentProgress = duration > 0 ? (entry.trackTime % duration) / duration : 0;
  //     }

  //     if (entry) {
  //       entry.alpha = t.alpha;
  //       entry.timeScale = t.paused ? 0 : t.speed;

  //       if (t.id === 0 && player.skeleton) {
  //         player.skeleton.color.a = t.alpha;
  //       }
  //     }

  //     const shouldUpdateProgress = isDraggingId !== t.id;

  //     if (
  //       t.name !== currentName ||
  //       (shouldUpdateProgress && Math.abs(t.progress - currentProgress) > 0.01)
  //     ) {
  //       changed = true;
  //       return {
  //         ...t,
  //         name: currentName,
  //         progress: shouldUpdateProgress ? currentProgress : t.progress,
  //       };
  //     }
  //     return t;
  //   });

  //   if (changed) {
  //     tracks = newTracks;
  //     player._mixerState = tracks; // Persistent save
  //   }
  // }


  function syncWithSpine() {
    if (!player?.state || !player._mixerState) return;

    let changed = false;

    // 1. Get the latest source of truth from the player object
    const sourceTracks = player._mixerState as Track[];

    const newTracks = sourceTracks.map((sourceT, index) => {
      // Get the existing local track state if it exists
      const t = tracks[index] || sourceT;

      const entry = player.state.getCurrent(t.id);
      const currentName = entry?.animation?.name || "Empty";

      let currentProgress = 0;
      if (entry && entry.animation) {
        const duration = entry.animation.duration;
        currentProgress =
          duration > 0 ? (entry.trackTime % duration) / duration : 0;
      }

      // Sync timeScale to the paused state
      if (entry) {
        entry.alpha = t.alpha;
        entry.timeScale = sourceT.paused ? 0 : t.speed;
      }

      const shouldUpdateProgress = isDraggingId !== t.id;

      const pauseChanged = t.paused !== sourceT.paused;
      const nameChanged = t.name !== currentName;
      const progressChanged =
        shouldUpdateProgress && Math.abs(t.progress - currentProgress) > 0.01;

      if (pauseChanged || nameChanged || progressChanged) {
        changed = true;
        return {
          ...t,
          paused: sourceT.paused,
          name: currentName,
          progress: shouldUpdateProgress ? currentProgress : t.progress,
        };
      }
      return t;
    });

    if (changed) {
      tracks = newTracks;
    }
  }
  function saveMixerState() {
    if (!$activeCharacter) return;
    characterSettings.update((all) => ({
      ...all,
      [$activeCharacter.id]: {
        ...all[$activeCharacter.id],
        mixerTracks: tracks,
      },
    }));
  }

  let syncInterval: any;
  onMount(() => {
    initTracks();
    syncInterval = setInterval(syncWithSpine, 16);
  });

  onDestroy(() => {
    clearInterval(syncInterval);
  });

  $: if (player?.state && tracks) {
    syncWithSpine();
  }

  function addNewTrack() {
    const newId =
      tracks.length > 0 ? Math.max(...tracks.map((t) => t.id)) + 1 : 0;
    tracks = [
      ...tracks,
      {
        id: newId,
        name: "Empty",
        alpha: 1,
        speed: 1,
        paused: false,
        expanded: true,
        progress: 0,
      },
    ];
    // player._mixerState = tracks;
    // focusedTrackId = newId;
    player._mixerState = tracks;
    focusedTrackId = newId;
    saveMixerState();
  }

  function removeTrack(id: number) {
    if (id === 0) return;
    tracks = tracks.filter((t) => t.id !== id);
    player._mixerState = tracks;
    if (player?.state) player.state.setEmptyAnimation(id, 0);
    if (focusedTrackId === id) focusedTrackId = 0;
    saveMixerState();
  }

  function toggleTrackExpand(id: number) {
    tracks = tracks.map((t) =>
      t.id === id ? { ...t, expanded: !t.expanded } : t,
    );
    player._mixerState = tracks;
    focusedTrackId = id;
  }

  function focusTrack(id: number) {
    // tracks = tracks.map((t) =>
    //   t.id === id ? { ...t, expanded: !t.expanded } : t,
    // );
    // player._mixerState = tracks;
    focusedTrackId = id;
    // selectedTrackId.set(id);
  }

  function togglePause(id: number) {
    tracks = tracks.map((t) => (t.id === id ? { ...t, paused: !t.paused } : t));
    player._mixerState = tracks;
    saveMixerState();
  }

  function handleTimelineInput(id: number, e: Event) {
    const input = e.target as HTMLInputElement;
    const newProgress = parseFloat(input.value);

    if (player?.state) {
      const entry = player.state.getCurrent(id);
      if (entry && entry.animation) {
        entry.trackTime = newProgress * entry.animation.duration;
        tracks = tracks.map((t) =>
          t.id === id ? { ...t, progress: newProgress } : t,
        );
        player._mixerState = tracks;
      }
    }
  }

  // PMA Toggle Logic
  function togglePMA() {
    if (!player) return;
    player.isPMA = !player.isPMA;
    player = player;
  }
</script>

<div class="track-mixer-container">
  <div class="mixer-header">
    <span class="section-label">Track Mixer</span>
    <button class="add-track-btn" on:click={addNewTrack}>+</button>
  </div>

  <div class="mixer-list custom-scrollbar">
    {#each tracks as track (track.id)}
      <div class="track-item" class:focused={focusedTrackId === track.id}>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="track-item-header"
          on:click={() => focusTrack(track.id)}
        >
          <div class="track-meta">
            <span class="track-number">T{track.id}</span>
            <span class="track-anim-name">{track.name}</span>
          </div>

          <div class="track-header-actions">
            {#if track.id > 0}
              <button
                class="delete-track-btn"
                on:click|stopPropagation={() => removeTrack(track.id)}
              >
                −
              </button>
            {/if}
            <div
              class="icon-mask chevron"
              style="--icon: url({track.expanded ? ChevronDown : ChevronLeft})"
              on:click={() => toggleTrackExpand(track.id)}
            ></div>
          </div>
        </div>

        {#if track.expanded}
          <div class="track-item-body" transition:slide={{ duration: 200 }}>
            <div class="mixer-row">
              <span class="row-label">Timeline</span>
              <div class="control-box">
                <div class="action-trigger">
                  <button
                    class="icon-btn"
                    on:click|stopPropagation={() => togglePause(track.id)}
                  >
                    <div
                      class="icon-mask"
                      style="--icon: url({track.paused ? PlayIcon : PauseIcon})"
                    ></div>
                  </button>
                </div>
                <div class="slider-wrapper">
                  <input
                    type="range"
                    class="elegant-slider"
                    on:change={saveMixerState}
                    min="0"
                    max="1"
                    step="0.001"
                    bind:value={track.progress}
                    on:mousedown={() => (isDraggingId = track.id)}
                    on:mouseup={() => (isDraggingId = null)}
                    on:input={(e) => handleTimelineInput(track.id, e)}
                  />
                </div>
              </div>
            </div>

            <div class="mixer-row">
              <span class="row-label">Speed</span>
              <div class="control-box">
                <div class="action-trigger"></div>
                <div class="slider-wrapper">
                  <input
                    type="range"
                    class="elegant-slider"
                    on:change={saveMixerState}
                    min="0"
                    max="2"
                    step="0.1"
                    bind:value={track.speed}
                  />
                  <div class="mid-tick"></div>
                </div>
              </div>
            </div>

            <div class="mixer-row">
              <span class="row-label">Alpha</span>
              <div class="control-box no-bg">
                <div class="action-trigger"></div>
                <div class="input-wrapper">
                  <input
                    type="number"
                    class="alpha-input-box"
                    min="0"
                    max="1"
                    step="0.1"
                    bind:value={track.alpha}
                  />
                  <span class="unit-hint">MIX RATIO (0-1)</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  /* ICON MASK SYSTEM */
  .icon-mask {
    width: 14px;
    height: 14px;
    background-color: rgba(255, 255, 255, 0.6);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-image: var(--icon);
    mask-image: var(--icon);
    transition: background-color 0.2s;
  }
  .focused .icon-mask {
    background-color: var(--accent);
  }
  .chevron {
    width: 15px;
    height: 15px;
    opacity: 0.8;
  }


  .track-mixer-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .mixer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-label {
    font-family: "Rail";
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .add-track-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mixer-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 4px;
  }

  .track-item {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    border: 1px solid transparent;
    margin-bottom: 8px;
  }
  .track-item.focused {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
  }

  .track-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    cursor: pointer;
  }
  .track-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .track-number {
    color: var(--accent);
    font-family: "Rail";
    font-weight: 900;
    font-size: 10px;
    width: 20px;
  }
  .track-anim-name {
    font-family: "MarklMono";
    font-size: 10px;
    opacity: 0.5;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .track-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .delete-track-btn {
    background: none;
    color: #ff4d4d;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 0 4px;
    opacity: 0.6;
  }
  .delete-track-btn:hover {
    opacity: 1;
  }

  .track-item-body {
    padding: 0 14px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* UNIFIED ROW ALIGNMENT */
  .mixer-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .row-label {
    font-family: "Rail";
    font-size: 8px;
    color: rgba(255, 255, 255, 0.2);
    text-transform: uppercase;
    width: 45px;
    flex-shrink: 0;
  }

  .control-box {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(0, 0, 0, 0.2);
    padding: 6px 12px;
    border-radius: 8px;
    min-width: 0;
  }
  .control-box.no-bg {
    background: none;
    padding-left: 0;
  }

  .action-trigger {
    width: 16px;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }
  .icon-btn:hover .icon-mask {
    background-color: white;
  }

  /* SLIDER SYSTEM */
  .slider-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    height: 12px;
  }

  .elegant-slider {
    -webkit-appearance: none;
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    outline: none;
    cursor: pointer;
    z-index: 2;
  }
  .elegant-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 2px;
    height: 12px;
    background: var(--accent);
  }

  .mid-tick {
    position: absolute;
    left: 50%;
    width: 1px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    z-index: 1;
    pointer-events: none;
  }

  /* INPUTS */
  .input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .alpha-input-box {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: var(--accent);
    font-family: "MarklMono";
    font-size: 10px;
    width: 40px;
    padding: 2px 4px;
    text-align: center;
    outline: none;
  }

  .unit-hint {
    font-size: 7px;
    color: rgba(255, 255, 255, 0.15);
    font-family: "Rail";
    font-weight: 700;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }
</style>
