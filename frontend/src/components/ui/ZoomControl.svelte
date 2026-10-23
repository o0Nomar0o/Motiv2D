<script lang="ts">
  import { createEventDispatcher, onDestroy } from "svelte";

  export let value: number = 100; // Zoom percentage
  export let label: string = "Zoom";
  export let sublabel: string = "";
  export let step: number = 1;
  export let min: number = 5;
  export let max: number = 2000;

  const dispatch = createEventDispatcher<{ change: number }>();
  const PRESETS = [50, 100, 200];

  let isDragging = false;
  let isShiftHeld = false;
  let startX = 0;
  let stickOffset = 0;
  let animFrameId: number | null = null;

  function emitValue(newValue: number) {
    const cleaned = Math.max(
      min,
      Math.min(max, Math.round(newValue * 10) / 10),
    );
    value = cleaned;
    dispatch("change", cleaned);
  }

  function setPreset(presetVal: number) {
    emitValue(presetVal);
  }

  // --- STEP BUTTON CLICK (INCREMENT / DECREMENT) ---
  function handleStepClick(amount: number, e: MouseEvent) {
    e.stopPropagation(); // Prevent triggering drag/container events
    const multiplier = e.shiftKey ? 0.2 : 5;
    emitValue(value + amount * multiplier);
  }

  // --- VELOCITY JOYSTICK LOOP ---
  function updateZoomVelocity() {
    if (!isDragging) return;

    const sensitivity = isShiftHeld ? 0.015 : 0.08;
    const velocity = stickOffset * Math.abs(stickOffset) * sensitivity;

    if (Math.abs(velocity) > 0.001) {
      emitValue(value + velocity);
    }

    animFrameId = requestAnimationFrame(updateZoomVelocity);
  }

  function startJoystickDrag(e: MouseEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    isShiftHeld = e.shiftKey;
    startX = e.clientX;
    stickOffset = 0;

    window.addEventListener("mousemove", onJoystickDrag, { passive: true });
    window.addEventListener("mouseup", stopJoystickDrag);

    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(updateZoomVelocity);
  }

  function onJoystickDrag(e: MouseEvent) {
    if (!isDragging) return;
    isShiftHeld = e.shiftKey;

    const dx = e.clientX - startX;
    stickOffset = Math.max(-32, Math.min(32, dx));
  }

  function stopJoystickDrag() {
    isDragging = false;
    isShiftHeld = false;
    stickOffset = 0;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    window.removeEventListener("mousemove", onJoystickDrag);
    window.removeEventListener("mouseup", stopJoystickDrag);
  }

  function handleInputChange(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      emitValue(val);
    }
  }

  function handleWheelZoom(e: WheelEvent) {
    e.preventDefault();
    const multiplier = e.shiftKey ? 2 : 10;
    const delta = e.deltaY < 0 ? multiplier : -multiplier;
    emitValue(value + delta);
  }

  function handleReset() {
    emitValue(100);
  }

  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("mousemove", onJoystickDrag);
      window.removeEventListener("mouseup", stopJoystickDrag);
    }
    if (animFrameId) cancelAnimationFrame(animFrameId);
  });
</script>

<div class="control-group">
  <!-- Card Header -->
  <div class="card-header">
    <div class="label-group">
      <span class="control-label">{label}</span>
      {#if isShiftHeld}
        <span class="snap-badge">FINE</span>
      {/if}
    </div>
    {#if sublabel}
      <span class="sublabel">{sublabel}</span>
    {/if}
  </div>

  <!-- Body Container -->
  <div class="dial-body">
    <!-- Joystick Anchor Container -->
    <div class="dial-anchor">
      <div
        class="joystick-container"
        class:is-dragging={isDragging}
        class:is-snapping={isShiftHeld}
        on:mousedown={startJoystickDrag}
        on:wheel={handleWheelZoom}
        role="slider"
        aria-valuenow={value}
        tabindex="0"
        title="Drag left/right to zoom continuously. Click - or + to step by 1%. Hold Shift for fine precision."
      >
        <!-- Clickable Terminal Buttons -->
        <button
          type="button"
          class="terminal-btn minus"
          on:click={(e) => handleStepClick(-step, e)}
          title="Decrease zoom by 1%">-</button
        >

        <button
          type="button"
          class="terminal-btn plus"
          on:click={(e) => handleStepClick(step, e)}
          title="Increase zoom by 1%">+</button
        >

        <!-- Movable Joystick Knob -->
        <div
          class="joystick-knob"
          style="transform: translateX({stickOffset}px);"
        >
          <div class="knob-dot"></div>
        </div>
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
        <span class="unit">%</span>
        <button class="reset-btn" title="Reset to 100%" on:click={handleReset}
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
            {preset}%
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
    width: 96px;
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }

  .joystick-container {
    position: absolute;
    width: 96px;
    height: 52px;
    border-radius: 26px;
    background: rgba(35, 35, 40, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.12);
    cursor: ew-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    transform-style: preserve-3d;
    transition:
      transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275),
      background-color 0.2s ease,
      border-color 0.2s ease;
  }

  .joystick-container:hover {
    transform: scale(1.05) translateZ(10px);
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(18, 18, 22, 0.65);
  }

  .joystick-container.is-dragging {
    cursor: ew-resize;
    z-index: 10;
    transform: scale(1.1) translateZ(20px);
    background: rgba(18, 18, 22, 0.9);
    border-color: var(--accent, #3b82f6);
  }

  .joystick-container.is-snapping {
    border-color: var(--accent, #3b82f6);
  }


  .terminal-btn.minus {
    left: 4px;
  }

  .terminal-btn.plus {
    right: 4px;
  }

  .terminal-btn:hover {
    color: #fff;
    transform: scale(1.15);
  }

  .terminal-btn:active {
    transform: scale(0.95);
  }

  .joystick-container.is-dragging .terminal-btn {
    color: var(--accent, #3b82f6);
  }

  .terminal-btn {
    position: absolute;
    background: transparent;
    border: none;
    font-size: 13px;
    font-weight: 700;
    font-family: monospace;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 6px 10px;
    z-index: 1; /* Lower layer */
    transition: color 0.15s ease;
  }

  .joystick-knob {
    position: absolute;
    width: 32px;
    height: 32px;
    border-radius: 50%;

    background: rgba(45, 45, 55, 0.35);

    border-top: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);

    backdrop-filter: blur(8px) saturate(180%);
    -webkit-backdrop-filter: blur(8px) saturate(180%);

    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 2;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .joystick-container.is-dragging .joystick-knob {
    transition: none !important;
    
    background: rgba(45, 45, 55, 0.5);
    z-index: 2;
  }

  .knob-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent, #3b82f6);
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
    width: 48px;
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
