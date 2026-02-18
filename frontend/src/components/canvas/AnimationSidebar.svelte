<script lang="ts">
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { tick } from "svelte";
  import {
    activeCharacter,
    characterSettings,
    leftPanelClp,
    spineUpdateSignal,
    isSelectSlot,
    selectedSlotName,
    mixerHeight,
    selectedTrackId,
  } from "../../stores/appStore";

  import VisibilityOn from "../../assets/images/visibility-on.svg";
  import VisibilityOff from "../../assets/images/visibility-off.svg";
  import VisibilityPreview from "../../assets/images/visibility-preview.svg";
  //   import CenterCamera from "../../assets/images/center-person.svg";
  import CenterCamera from "../../assets/images/origin.svg";

  import TrackMix from "./TrackMix.svelte";

  let focusedTrackId = 0;
  // let mixerHeight = 300;
  
  $: selectedTrackId.set(focusedTrackId);

  function playAnimation(name: string) {
    if (!player) return;
    const trackId = focusedTrackId;

    player.playAnimation(trackId, name, true);

    currentAnimName = name;
    
    characterSettings.update((all) => ({
      ...all,
      [$activeCharacter.id]: {
        ...all[$activeCharacter.id],
        tracks: {
          ...all[$activeCharacter.id].tracks,
          [trackId]: { animation: name, loop: true },
        },
      },
    }));
  }

  let isResizing = false;
  function startResizing() {
    isResizing = true;
  }
  function handleMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    $mixerHeight = window.innerHeight - e.clientY - 40;
  }
  function stopResizing() {
    isResizing = false;
  }

  export let player: any;
  export let characterMetadata: any;

  let animations: string[] = [];
  let slots: any[] = [];
  let skins: string[] = [];
  let activeTab: "animations" | "slots" = "animations";
  let highlightedSlot: string | null = null;
  let currentAnimName: string = "";
  let groupedSlots: { [key: string]: any[] } = {};
  let scrollContainer: HTMLElement;

  $: if ($spineUpdateSignal || player || $activeCharacter?.id) {
    if (player?.skeleton) refreshData();
  }

  $: activeTabIndex = activeTab === "animations" ? 0 : 1;

  function refreshData() {
    if (!player?.skeleton?.data) return;

    const savedSlots =
      $characterSettings[$activeCharacter.id]?.slotVisibility || {};

    const rawSlots = player.skeleton.slots
      .map((s: any) => {
        const slotName = s.data.name;

        let isVisible = true;

        if (savedSlots[slotName] !== undefined) {
          isVisible = savedSlots[slotName];
        } else {
          isVisible = s.color.a > 0 && s.getAttachment() !== null;
        }

        return {
          name: slotName,
          visible: isVisible,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    animations = player.skeleton.data.animations.map((a: any) => a.name);
    skins = player.skeleton.data.skins.map((s: any) => s.name);

    const tempGroups: { [key: string]: any[] } = {};
    const MAX_ITEMS = 15;

    rawSlots.forEach((slot) => {
      const parts = slot.name.split("_");
      let baseName =
        parts.length > 1
          ? parts[0].toUpperCase()
          : slot.name.charAt(0).toUpperCase();

      if (!tempGroups[baseName]) tempGroups[baseName] = [];
      tempGroups[baseName].push(slot);
    });

    const finalGroups: { [key: string]: any[] } = {};

    Object.entries(tempGroups).forEach(([key, items]) => {
      if (items.length <= MAX_ITEMS) {
        finalGroups[key] = items;
      } else {
        for (let i = 0; i < items.length; i += MAX_ITEMS) {
          const chunk = items.slice(i, i + MAX_ITEMS);
          const chunkIndex = Math.floor(i / MAX_ITEMS) + 1;
          finalGroups[`${key}-${chunkIndex}`] = chunk;
        }
      }
    });

    slots = rawSlots;
    groupedSlots = finalGroups;

    currentAnimName = player.state?.getCurrent(0)?.animation?.name || "";
  }

  function selectSkin(skinName: string) {
    if (!player?.skeleton) return;
    player.skeleton.setSkinByName(skinName);
    player.skeleton.setSlotsToSetupPose();
    refreshData();
  }

  function handleVisibilityChange(slotName: string, isChecked: boolean) {
    player.setSlotVisibility(slotName, isChecked);
    player.stopHighlightLoop();

    characterSettings.update((all) => {
      const charId = $activeCharacter.id;
      const currentSlots = all[charId]?.slotVisibility || {};

      return {
        ...all,
        [charId]: {
          ...all[charId],
          slotVisibility: { ...currentSlots, [slotName]: isChecked },
        },
      };
    });

    slots = slots.map((s) =>
      s.name === slotName ? { ...s, visible: isChecked } : s,
    );

    for (const group in groupedSlots) {
      const item = groupedSlots[group].find((s) => s.name === slotName);
      if (item) {
        item.visible = isChecked;
        break;
      }
    }

    groupedSlots = { ...groupedSlots };
  }

  function toggleHighlight(name: string) {
    player.stopHighlightLoop();

    if (highlightedSlot === name) {
      highlightedSlot = null;
    } else {
      highlightedSlot = name;
      player.startHighlightLoop(name);
    }

    slots = [...slots];
  }

  async function scrollToGroup(slotName: string) {
    if (activeTab !== "slots") {
      activeTab = "slots";
      await tick();
    }

    const parts = slotName.split("_");
    const baseGroupName =
      parts.length > 1
        ? parts[0].toUpperCase()
        : slotName.charAt(0).toUpperCase();

    await tick();

    const el =
      document.querySelector(`[data-slot-name="${slotName}"]`) ||
      document.querySelector(`[data-group-anchor="${baseGroupName}"]`);

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      el.classList.add("flash-highlight");
      setTimeout(() => el.classList.remove("flash-highlight"), 1500);
    }
  }

  $: savedPma = $characterSettings[$activeCharacter?.id]?.pma;

  $: if (player && savedPma !== undefined) {
    player.isPMA = savedPma;
    player = player;
  }
  export function togglePMA() {
    if (!player || !$activeCharacter) return;

    const newState = !player.isPMA;
    player.isPMA = newState;

    characterSettings.update((all) => ({
      ...all,
      [$activeCharacter.id]: {
        ...all[$activeCharacter.id],
        pma: newState,
      },
    }));

    player = player;
  }
  function toggleGroupVisibility(group: string, visible: boolean) {
    const items = groupedSlots[group];
    const charId = $activeCharacter.id;

    characterSettings.update((all) => {
      const currentSlots = all[charId]?.slotVisibility || {};
      const updatedSlots = { ...currentSlots };

      items.forEach((slot) => {
        player.setSlotVisibility(slot.name, visible);
        updatedSlots[slot.name] = visible;
        slot.visible = visible;
      });

      return {
        ...all,
        [charId]: {
          ...all[charId],
          slotVisibility: updatedSlots,
        },
      };
    });

    groupedSlots = { ...groupedSlots };
  }

  function isGroupVisible(group: string): boolean {
    const items = groupedSlots[group];
    if (!items || items.length === 0) return false;
    return items.some((s) => s.visible);
  }

  let searchQuery = "";

  $: filteredSlots = slots.filter((slot) => {
    if (!searchQuery) return true;

    const terms = searchQuery
      .toLowerCase()
      .split("||")
      .map((t) => t.trim())
      .filter((t) => t !== "");

    return terms.some((term) => slot.name.toLowerCase().includes(term));
  });

  $: filteredAnimations = animations.filter((anim) => {
    if (!searchQuery) return true;
    const terms = searchQuery
      .toLowerCase()
      .split("||")
      .map((t) => t.trim())
      .filter((t) => t !== "");
    return terms.some((term) => anim.toLowerCase().includes(term));
  });

  $: if (activeTab) searchQuery = "";

  //Shortcuts export
  export function nextAnimation() {
    console.log("Shortcut triggered: Next", {
      current: currentAnimName,
      total: animations.length,
    });

    if (animations.length === 0) return;

    let currentIndex = animations.indexOf(currentAnimName);

    const nextIndex = (currentIndex + 1) % animations.length;
    const targetAnim = animations[nextIndex];

    if (targetAnim) {
      playAnimation(targetAnim);
      scrollToAnimation(targetAnim);
    }
  }

  export function previousAnimation() {
    console.log("Shortcut triggered: Next", {
      current: currentAnimName,
      total: animations.length,
    });

    if (animations.length === 0) return;

    let currentIndex = animations.indexOf(currentAnimName);
    if (currentIndex === -1) currentIndex = 0;

    const prevIndex =
      (currentIndex - 1 + animations.length) % animations.length;
    const targetAnim = animations[prevIndex];

    if (targetAnim) {
      playAnimation(targetAnim);
      scrollToAnimation(targetAnim);
    }
  }

  function scrollToAnimation(name: string) {
    const el = document.querySelector(`[data-anim="${name}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function toggleAllFilteredSlots() {
    if (filteredSlots.length === 0) return;

    const targetVisible = !filteredSlots[0].visible;

    filteredSlots.forEach((slot) => {
      handleVisibilityChange(slot.name, targetVisible);
    });
  }

  $: if ($selectedSlotName && activeTab === "slots") {
    const targetName = $selectedSlotName;
    selectedSlotName.set(null);

    if (searchQuery) {
      const terms = searchQuery
        .toLowerCase()
        .split("||")
        .map((t) => t.trim());
      const isVisibleInSearch = terms.some((term) =>
        targetName.toLowerCase().includes(term),
      );
      if (!isVisibleInSearch) searchQuery = "";
    }

    setTimeout(() => {
      const container = scrollContainer;
      if (!container) return;

      const el = container.querySelector(
        `[data-slot-name="${targetName}"]`,
      ) as HTMLElement;

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        el.classList.add("flash-highlight");
        setTimeout(() => el.classList.remove("flash-highlight"), 1500);
      }
    }, 150);
  }

  export function togglePicker() {
    player.stopHighlightLoop();
    isSelectSlot.update((n) => !n);
    if ($isSelectSlot) {
      activeTab = "slots";
    }
  }

  $: if ($isSelectSlot) {
    activeTab = "slots";
  }
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={stopResizing} />

<div
  class="sidebar-container liquid-glass"
  class:collapsed={$leftPanelClp}
  on:mousedown|stopPropagation
>
  <section class="config-wrap">
    <div class="section-header-row glass-header">
      <h3 class="section-label">Skeleton Settings</h3>

      <div class="header-actions">
        <button
          class="pma-pill"
          class:active={player?.isPMA}
          on:click={() => togglePMA()}
          title="Premultiplied Alpha"
        >
          <span class="status-dot"></span>
          <span class="mono-text">PMA</span>
        </button>

        <div class="action-divider"></div>

        <div class="tool-group">
          <button
            class="icon-tool-btn"
            on:click={() => player.centerSkeleton()}
            title="Center View"
          >
            <div class="icon-mask" style="--icon: url({CenterCamera})"></div>
          </button>
        </div>
      </div>
    </div>
    {#if skins.length > 1}
      <div class="skin-section" in:fly={{ y: -10, duration: 300 }}>
        <h4 class="tiny-label">OUTFITS</h4>
        <div class="skin-grid custom-scrollbar-horizontal">
          {#each skins as skin}
            <button
              class="skin-btn"
              class:active={player?.skeleton?.skin?.name === skin}
              on:click={() => selectSkin(skin)}
            >
              {skin}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <div class="segmented-control">
    <div class="thumb-container">
      <div
        class="slider-thumb"
        style="transform: translateX({activeTabIndex * 100}%);"
      ></div>
    </div>
    <button
      class="segment-btn"
      class:active={activeTab === "animations"}
      on:click={() => (activeTab = "animations")}
    >
      <span>Animations</span>
    </button>
    <button
      class="segment-btn"
      class:active={activeTab === "slots"}
      on:click={() => (activeTab = "slots")}
    >
      <span>Slots</span>
    </button>
  </div>

  <div class="vertical-layout-wrapper">
    <div class="search-container">
      <div class="input-wrapper">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search {activeTab}..."
          class="search-input"
        />
        {#if searchQuery}
          <button class="clear-search" on:click={() => (searchQuery = "")}
            >×</button
          >
        {/if}
      </div>
      {#if activeTab == "slots"}
        <button
          class="picker-btn"
          class:active={$isSelectSlot}
          on:click={togglePicker}
          title="Inspect Slot (S)"
        >
          <div class="icon-mask" style="--icon: url({VisibilityPreview})"></div>
        </button>
      {/if}
    </div>

    <div class="main-content-wrapper">
      {#if activeTab === "slots" && !searchQuery}
        <div class="index-navigator" in:fly={{ x: -10, duration: 300 }}>
          {#each Object.keys(groupedSlots) as group}
            <button
              class="index-item"
              tabindex="-1"
              type="button"
              on:mousedown|preventDefault
              on:click|preventDefault|stopPropagation={() =>
                scrollToGroup(group)}
            >
              {group.slice(0, 3)}
            </button>
          {/each}
        </div>
      {/if}

      <div class="scroll-content custom-scrollbar" bind:this={scrollContainer}>
        {#if activeTab === "animations"}
          <div
            class="list-stack"
            in:fly={{ y: 10, duration: 400, easing: cubicOut }}
          >
            {#each filteredAnimations as anim}
              <button
                class="anim-item"
                class:active={currentAnimName === anim}
                data-anim={anim}
                on:click|stopPropagation={() => playAnimation(anim)}
              >
                <div class="indicator"></div>
                <span>{anim}</span>
              </button>
            {/each}
          </div>
        {:else}
          <div
            class="list-stack"
            in:fly={{ y: 10, duration: 400, easing: cubicOut }}
          >
            {#if searchQuery}
              <div class="search-results-header">
                <span class="results-count"
                  >{filteredSlots.length} results for "{searchQuery}"</span
                >
                <button
                  class="bulk-toggle-btn"
                  on:click|preventDefault|stopPropagation={toggleAllFilteredSlots}
                  title="Toggle all visible results"
                >
                  <div
                    class="icon-mask"
                    style="--icon: url({VisibilityOn}); background-color: var(--accent);"
                  ></div>
                </button>
              </div>

              {#each filteredSlots as slot (slot.name)}
                <div
                  class="slot-item"
                  data-slot-name={slot.name}
                  class:highlighted={highlightedSlot === slot.name}
                >
                  <button
                    class="eye-btn"
                    on:click|preventDefault|stopPropagation={() =>
                      toggleHighlight(slot.name)}
                  >
                    <div
                      class="icon-mask {highlightedSlot === slot.name
                        ? 'active-red'
                        : 'active-gray'}"
                      style="--icon: url({VisibilityPreview})"
                    ></div>
                  </button>
                  <button
                    class="visibility-toggle"
                    on:click|preventDefault|stopPropagation={() =>
                      handleVisibilityChange(slot.name, !slot.visible)}
                  >
                    <div
                      class="icon-mask"
                      style="--icon: url({slot.visible
                        ? VisibilityOn
                        : VisibilityOff}); background-color: {slot.visible
                        ? 'rgba(255,255,255,0.8)'
                        : 'rgba(255,255,255,0.2)'};"
                    ></div>
                  </button>
                  <span class="mono-text">{slot.name}</span>
                </div>
              {/each}
            {:else}
              {#each Object.entries(groupedSlots) as [group, items]}
                <div class="group-container" data-group={group}>
                  <div class="group-header">
                    <span class="group-line"></span>
                    <span class="group-label" data-group-anchor={group}
                      >{group}</span
                    >
                    <button
                      class="visibility-toggle mini"
                      on:click|preventDefault|stopPropagation={() => {
                        const currentlyVisible = isGroupVisible(group);
                        toggleGroupVisibility(group, !currentlyVisible);
                      }}
                    >
                      <div
                        class="icon-mask"
                        style="--icon: url({isGroupVisible(group)
                          ? VisibilityOn
                          : VisibilityOff}); background-color: {isGroupVisible(
                          group,
                        )
                          ? 'rgba(255,255,255,0.6)'
                          : 'rgba(255,255,255,0.2)'};"
                      ></div>
                    </button>
                  </div>
                  <div class="group-items">
                    {#each items as slot (slot.name)}
                      <div
                        class="slot-item"
                        data-slot-name={slot.name}
                        class:highlighted={highlightedSlot === slot.name}
                      >
                        <div class="tree-branch"></div>
                        <button
                          class="eye-btn"
                          on:click|preventDefault|stopPropagation={() =>
                            toggleHighlight(slot.name)}
                        >
                          <div
                            class="icon-mask {highlightedSlot === slot.name
                              ? 'active-red'
                              : 'active-gray'}"
                            style="--icon: url({VisibilityPreview})"
                          ></div>
                        </button>
                        <button
                          class="visibility-toggle"
                          on:click|preventDefault|stopPropagation={() =>
                            handleVisibilityChange(slot.name, !slot.visible)}
                        >
                          <div
                            class="icon-mask"
                            style="--icon: url({slot.visible
                              ? VisibilityOn
                              : VisibilityOff}); background-color: {slot.visible
                              ? 'rgba(255,255,255,0.8)'
                              : 'rgba(255,255,255,0.2)'};"
                          ></div>
                        </button>
                        <span class="mono-text">{slot.name}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    </div>

    {#if activeTab === "animations"}
      <div
        class="v-resizer"
        class:resizing={isResizing}
        on:mousedown|preventDefault={startResizing}
      ></div>

      <div class="mixer-section" style="height: {$mixerHeight}px">
        <TrackMix {player} bind:focusedTrackId />
      </div>
    {/if}
  </div>
</div>

<style>
  .search-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 1rem;
    flex-shrink: 0;
    height: 36px;
  }

  .input-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .picker-btn {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 2px;
    border: 1px solid rgba(255, 255, 255, 0.05);

    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    position: relative;
    overflow: hidden;
  }

  .picker-btn:hover {
    background: rgba(11, 11, 11, 0.07);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .picker-btn.active {
    background: rgba(181, 181, 181, 0.06);
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow:
      inset 0 0 8px rgba(255, 255, 255, 0.05),
      0 4px 15px rgba(0, 0, 0, 0.2);
  }

  .picker-btn .icon-mask {
    width: 16px !important;
    height: 16px !important;
    background-color: rgba(255, 255, 255, 0.4);
    transition: all 0.3s ease;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  .picker-btn.active .icon-mask {
    background-color: #ffffff;
    transform: scale(1.1);
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
  }

  .picker-btn::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent,
      rgba(255, 255, 255, 0.03),
      transparent
    );
    transform: rotate(45deg);
    pointer-events: none;
  }
  .toggle-lbl {
    font-family: "FliegeReg";
  }
  .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .pma-toggle {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.4);
    font-family: "MarklMono", monospace;
    font-size: 9px;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pma-toggle.active {
    background: rgba(0, 255, 150, 0.1);
    border-color: rgba(0, 255, 150, 0.3);
    color: #00ff96;
  }

  .pma-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .vertical-layout-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .search-results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 4px;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .results-count {
    font-size: 9px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.3);
    font-family: "MarklMono", monospace;
  }

  .bulk-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .bulk-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--accent);
  }

  .bulk-toggle-btn .icon-mask {
    width: 14px !important;
    height: 14px !important;
  }

  .search-input {
    width: 100%;
    box-sizing: border-box;

    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 8px 12px;
    padding-right: 30px;
    color: white;
    font-family: "MarklMono", monospace;
    font-size: 11px;
    outline: none;

    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .search-input:focus {
    border-color: var(--accent);
    background: rgba(0, 0, 0, 0.3);
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.2);
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 1px;
  }

  .clear-search {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-search:hover {
    color: var(--accent);
  }

  .v-resizer {
    height: 6px;
    margin: 4px 0;
    cursor: ns-resize;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .v-resizer:hover,
  .v-resizer.resizing {
    background: var(--accent);
  }

  .mixer-section {
    flex-shrink: 0;
    overflow: hidden;
  }
  .sidebar-container.collapsed {
    transform: translateX(-360px);
    opacity: 0;
    pointer-events: none;
  }

  .sidebar-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.25rem;
    color: white;
    user-select: none;
    pointer-events: auto;

    overflow: hidden;
    transition:
      transform 0.35s cubic-bezier(0.25, 1, 0.25, 1),
      opacity 0.4s ease;
  }

  .liquid-glass {
    background: rgba(10, 10, 10, 0.5);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-radius: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  /* WRAPPERS */
  .main-content-wrapper {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
    gap: 4px;
  }

  .index-navigator {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 22px;
    border-radius: 100px;
    padding: 10px 0;
    margin: 10px 0;
    border-width: 1px 0 1px 0;
    border-style: solid;
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);

    max-height: 80%;
    overflow-y: auto;
    overflow-x: hidden;
    flex-shrink: 1;
    gap: 12px;

    -webkit-overflow-scrolling: touch;

    user-select: none;
    height: fit-content;
    align-self: flex-start;
  }

  .index-navigator::-webkit-scrollbar {
    display: none;
  }
  .index-navigator::-webkit-scrollbar-thumb {
    display: none;
  }

  .index-item {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.3);
    font-family: "Rail", sans-serif;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    text-align: center;
    flex-shrink: 0;
    width: 32px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-align: center;
  }

  .index-item:hover {
    color: var(--accent);
    transform: scale(1.1);
  }

  .section-label {
    font-family: "Rail", sans-serif;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.75rem;
  }

  .center-btn {
    width: 24px;
    height: 18px;

    display: flex;
    align-items: center;
    justify-content: center;

    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    border-width: 1px;

    border-style: solid;

    cursor: pointer;
    transition: all 0.2s ease;
  }

  .center-btn .icon-mask {
    background-color: rgba(255, 255, 255, 0.65);
  }

  .center-btn:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.1);
    border-width: 1px 0 1px 0;
  }

  .center-btn:hover .icon-mask {
    background-color: white;
  }

  .center-btn:active {
    transform: translateY(1px);
    background: rgba(255, 255, 255, 0.15);
  }

  .config-wrap {
    margin-bottom: 1.5rem;
    flex-shrink: 0;
  }
  .skin-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .skin-btn {
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 11px;
    font-family: "MarklMono", monospace;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .skin-btn.active {
    background: var(--accent);
    color: white;
  }

  /* SEGMENTED CONTROL */
  .segmented-control {
    --pill-height: 34px;
    --inner-padding: 3px;
    position: relative;
    display: flex;
    width: 100%;
    height: var(--pill-height);
    background: rgba(0, 0, 0, 0.2);
    border-radius: 100px;
    padding: var(--inner-padding);
    margin-bottom: 1.25rem;
    flex-shrink: 0;
    /* border-width: 1px 0 1px 0;
    border-style: solid;
    border-color: rgba(255, 255, 255, 0.1); */
  }

  .thumb-container {
    position: absolute;
    top: 0;
    left: var(--inner-padding);
    right: var(--inner-padding);
    bottom: 0;
    display: flex;
    align-items: center;
    z-index: 1;
  }

  .slider-thumb {
    height: calc(var(--pill-height) - (var(--inner-padding) * 2));
    width: 50%;
    background: var(--accent);
    border-radius: 100px;
    transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .segment-btn {
    flex: 1;
    background: transparent;
    border: none;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .segment-btn span {
    color: rgba(255, 255, 255, 0.4);
    font-size: 11px;
    font-weight: 700;
    font-family: "Rail";
  }
  .segment-btn.active span {
    color: white;
  }

  .group-container {
    margin-bottom: 0.5rem;
    scroll-margin-top: 0px;
  }
  .group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    margin-left: 4px;
  }
  .group-label {
    font-family: "Rail";
    font-size: 10px;
    color: var(--accent);
    font-weight: 900;
  }
  .group-line {
    width: 12px;
    height: 1px;
    background: var(--accent);
    opacity: 0.3;
  }
  .group-items {
    margin-left: 8px;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    padding-left: 4px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tree-branch {
    width: 8px;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin-right: -4px;
    flex-shrink: 0;
  }

  .scroll-content {
    flex: 1;
    overflow-y: auto;
    padding-right: 4px;
    overflow-x: hidden;
    position: relative;
    scroll-behavior: smooth;
    overscroll-behavior: contain;
    will-change: scroll-position;
  }
  .list-stack {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .anim-item {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.6);
    font-family: "MarklMono", monospace;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .anim-item.active {
    background: rgba(255, 255, 255, 0.06);
    color: white;
    transform: translateX(4px);
  }

  .indicator {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    margin-right: 12px;
  }
  .active .indicator {
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }

  .slot-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    transition: all 0.2s;
    border: 1px solid transparent;
  }
  .slot-item.highlighted {
    background: rgba(255, 77, 77, 0.08);
    border-color: rgba(255, 77, 77, 0.2);
  }

  /* MASK ICONS */
  .icon-mask {
    width: 18px !important;
    height: 18px !important;
    background-color: rgba(255, 255, 255, 0.5);
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
    transition: background-color 0.2s;
  }
  .icon-mask.active-red {
    background-color: #ff4d4d;
  }

  .eye-btn,
  .visibility-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
  }
  .mono-text {
    font-family: "MarklMono";
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }
  /* .picker-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .picker-btn.active {
    background: rgba(0, 255, 150, 0.2);
    border-color: #00ff96;
  }

  .picker-btn.active .icon-mask {
    background-color: #00ff96;
  }

  .picker-btn.active span {
    color: #00ff96;
  } */

  :global(.flash-highlight) {
    animation: flash-border 1.5s ease-out;
  }

  @keyframes flash-border {
    0% {
      background: rgba(0, 255, 150, 0.3);
      border-color: #00ff96;
      transform: scale(1.02);
    }
    100% {
      background: rgba(255, 255, 255, 0.03);
      border-color: transparent;
      transform: scale(1);
    }
  }
  .glass-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .section-label {
    margin: 0;
    font-family: "Rail", sans-serif;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pma-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 10px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pma-pill .status-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
  }

  .pma-pill.active {
    border-color: rgba(0, 255, 150, 0.4);
    background: rgba(0, 255, 150, 0.05);
  }

  .pma-pill.active .status-dot {
    background: #00ff96;
    box-shadow: 0 0 6px #00ff96;
  }

  .pma-pill.active .mono-text {
    color: #00ff96;
  }

  .tool-group {
    display: flex;
    border-radius: 8px;

    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.2);
  }

  .icon-tool-btn {
    width: 28px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-tool-btn:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .icon-tool-btn.active {
    background: var(--accent);
  }

  .icon-tool-btn.active .icon-mask {
    background-color: white;
  }

  .action-divider {
    width: 1px;
    height: 14px;
    background: rgba(255, 255, 255, 0.1);
  }

  .icon-mask {
    width: 14px !important;
    height: 14px !important;
    background-color: rgba(255, 255, 255, 0.4);
  }
  .skin-section {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .tiny-label {
    font-family: "Rail";
    font-size: 8px;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 6px;
    letter-spacing: 0.1em;
  }

  .skin-grid {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 4px;
    mask-image: linear-gradient(to right, black 85%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
  }

  .skin-btn {
    flex-shrink: 0;
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.5);
    font-family: "MarklMono";
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .skin-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .skin-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
    box-shadow: 0 0 10px rgba(0, 162, 255, 0.3);
  }

  /* Custom horizontal scrollbar for the skin grid */
  .custom-scrollbar-horizontal::-webkit-scrollbar {
    height: 2px;
  }
  .custom-scrollbar-horizontal::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
  }
</style>
