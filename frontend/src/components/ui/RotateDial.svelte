<script lang="ts">
  import { createEventDispatcher, onDestroy } from "svelte";

  export let sublabel: string = "";
  export let value: number = 0; // 0 - 360
  export let label: string = "";
  export let unit: string = "deg";
  export let step: number = 1;
  export let min: number = 0;
  export let max: number = 360;
  export let snapAngle: number = 15; // Snapping interval in degrees

  const dispatch = createEventDispatcher<{ change: number }>();

  const PRESETS = [90, 180, 270];

  let dialElement: HTMLDivElement;
  let isDraggingDial = false;
  let isShiftHeld = false;
  let rawAngle = value;
  let lastMouseAngle: number | null = null;
  let animFrameId: number | null = null;

  $: if (!isDraggingDial) {
    const delta = ((((value - rawAngle) % 360) + 540) % 360) - 180;
    rawAngle += delta;
  }

  function emitValue(deg: number) {
    let normalized = Math.round(deg) % 360;
    if (normalized < 0) normalized += 360;

    value = normalized;
    dispatch("change", normalized);
  }

  function setPreset(presetDeg: number) {
    const delta = ((((presetDeg - rawAngle) % 360) + 540) % 360) - 180;
    rawAngle += delta;
    emitValue(rawAngle);
  }

  function calculateDeltaAngle(e: MouseEvent) {
    if (!dialElement) return;
    const rect = dialElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    let currentMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (currentMouseAngle < 0) currentMouseAngle += 360;

    if (lastMouseAngle !== null) {
      let delta = currentMouseAngle - lastMouseAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      rawAngle += delta;

      // Snap to nearest interval if Shift key is pressed
      isShiftHeld = e.shiftKey;
      if (e.shiftKey) {
        const snapped = Math.round(rawAngle / snapAngle) * snapAngle;
        emitValue(snapped);
      } else {
        emitValue(rawAngle);
      }
    }

    lastMouseAngle = currentMouseAngle;
  }

  function startDialDrag(e: MouseEvent) {
    isDraggingDial = true;
    isShiftHeld = e.shiftKey;

    const rect = dialElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    lastMouseAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (lastMouseAngle < 0) lastMouseAngle += 360;

    window.addEventListener("mousemove", onDialDrag, { passive: true });
    window.addEventListener("mouseup", stopDialDrag);
  }

  function onDialDrag(e: MouseEvent) {
    if (!isDraggingDial) return;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(() => calculateDeltaAngle(e));
  }

  function stopDialDrag() {
    isDraggingDial = false;
    isShiftHeld = false;
    lastMouseAngle = null;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    window.removeEventListener("mousemove", onDialDrag);
    window.removeEventListener("mouseup", stopDialDrag);
  }

  function handleInputChange(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      rawAngle = val;
      emitValue(val);
    }
  }

  function handleWheelRotation(e: WheelEvent) {
    e.preventDefault();
    // Use larger step when Shift is held on mouse wheel
    const stepAmount = e.shiftKey ? snapAngle : 5;
    const delta = e.deltaY < 0 ? stepAmount : -stepAmount;

    rawAngle = e.shiftKey
      ? Math.round((rawAngle + delta) / snapAngle) * snapAngle
      : rawAngle + delta;

    emitValue(rawAngle);
  }

  function handleReset() {
    setPreset(0);
  }

  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("mousemove", onDialDrag);
      window.removeEventListener("mouseup", stopDialDrag);
    }
  });
</script>

<div class="control-group">
  <!-- Card Header -->
  <div class="card-header">
    <div class="label-group">
      <span class="control-label">{label}</span>
      {#if isShiftHeld}
        <span class="snap-badge">SNAP 15°</span>
      {/if}
    </div>
    {#if sublabel}
      <span class="sublabel">{sublabel}</span>
    {/if}
  </div>

  <!-- Body Container -->
  <div class="dial-body">
    <!-- Dial Anchor (Fixed layout footprint) -->
    <div class="dial-anchor">
      <!-- Interactive Pop-Out 3D Dial Container -->
      <div
        class="dial-container"
        class:is-dragging={isDraggingDial}
        class:is-snapping={isShiftHeld}
        bind:this={dialElement}
        on:mousedown={startDialDrag}
        on:wheel={handleWheelRotation}
        role="slider"
        aria-valuenow={value}
        tabindex="0"
        title="Drag or Scroll to rotate. Hold Shift to snap to 15°"
      >
        <div class="dial-ring"></div>

        <!-- Rotating Knob Indicator -->
        <div class="dial-knob" style="transform: rotate({rawAngle}deg);">
          <div class="knob-dot"></div>
        </div>

        <span class="dial-center-text">{value}°</span>
      </div>
    </div>

    <!-- Inputs & Preset Quick Snaps -->
    <div class="controls-column">
      <div class="input-field">
        <input
          type="number"
          {value}
          on:change={handleInputChange}
          on:input={handleInputChange}
          {min}
          {max}
          {step}
        />
        <span class="unit">{unit}</span>
        <button class="reset-btn" title="Reset to 0°" on:click={handleReset}
          >↺</button
        >
      </div>

      <!-- Quick Preset Buttons -->
      <div class="presets-row">
        {#each PRESETS as preset}
          <button
            class="preset-pill"
            class:active={value === preset}
            on:click={() => setPreset(preset)}
          >
            {preset}°
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    user-select: none;
    width: 100%;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
  }

  .label-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .control-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.65);
    font-family: inherit;
  }

  .snap-badge {
    font-size: 8px;
    font-weight: 700;
    font-family: monospace;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--accent, #3b82f6);
    color: #fff;
    letter-spacing: 0.05em;
  }

  .sublabel {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.45);
    font-family: monospace;
    white-space: nowrap;
  }

  .dial-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
  }

  .dial-anchor {
    position: relative;
    width: 68px;
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }

  .dial-container {
    position: absolute;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    /* background: linear-gradient(145deg, rgba(35, 35, 40, 0.9), rgba(18, 18, 22, 0.9)); */
    background: rgba(35, 35, 40, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.12);
    /* box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      inset 0 1px 1px rgba(255, 255, 255, 0.12),
      inset 0 -2px 4px rgba(0, 0, 0, 0.6); */
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    transform-style: preserve-3d;
    transition:
      transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275),
      box-shadow 0.25s ease,
      border-color 0.2s ease;
  }

  .dial-container:hover {
    transform: scale(1.1) translateZ(10px);
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(18, 18, 22, 0.65);

    /* box-shadow:
      0 10px 24px rgba(0, 0, 0, 0.6),
      0 0 16px rgba(59, 130, 246, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.2); */
  }

  .dial-container.is-dragging {
    cursor: grabbing;
    z-index: 10;
    transform: scale(1.2) translateZ(20px);
    background: rgba(18, 18, 22, 0.9);
    border-color: var(--accent, #3b82f6);
    /* box-shadow:
      0 16px 32px rgba(0, 0, 0, 0.75),
      0 0 20px rgba(59, 130, 246, 0.35),
      inset 0 1px 2px rgba(255, 255, 255, 0.3); */
  }

  .dial-container.is-snapping {
    border-color: var(--accent, #3b82f6);
  }

  .dial-ring {
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    border: 1px dashed rgba(255, 255, 255, 0.15);
    pointer-events: none;
  }

  .dial-knob {
    position: absolute;
    inset: 0;
    pointer-events: none;
    transition: transform 0.15s cubic-bezier(0.2, 0, 0, 1);
  }

  .dial-container.is-dragging .dial-knob {
    transition: none !important;
  }

  .knob-dot {
    position: absolute;
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent, #3b82f6);
    box-shadow: 0 0 8px var(--accent, #3b82f6);
  }

  .dial-center-text {
    font-size: 11px;
    font-family: monospace;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    pointer-events: none;
  }

  .controls-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    align-items: flex-end;
  }

  .input-field {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 4px 8px;
    transition: border-color 0.15s ease;
  }

  .input-field:focus-within {
    border-color: var(--accent, #3b82f6);
  }

  .input-field input {
    width: 44px;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 12px;
    font-family: monospace;
    outline: none;
    text-align: right;
  }

  .input-field input::-webkit-outer-spin-button,
  .input-field input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .unit {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
    font-family: monospace;
  }

  .reset-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    font-size: 12px;
    padding: 0 2px;
    transition: color 0.15s ease;
  }

  .reset-btn:hover {
    color: var(--accent, #3b82f6);
  }

  .presets-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .preset-pill {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 10px;
    font-family: monospace;
    padding: 2px 6px;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .preset-pill:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .preset-pill.active {
    background: rgba(59, 130, 246, 0.15);
    border-color: var(--accent, #3b82f6);
    color: var(--accent, #3b82f6);
  }
</style>
