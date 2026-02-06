<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";

  export let value = "#0EA5E9";
  const dispatch = createEventDispatcher();

  // Internal State
  let h = 200, s = 100, v = 91;
  let r = 14, g = 165, b = 233;
  let hexInput = value;
  let vault: string[] = ["#E11D48", "#10B981", "#0EA5E9"]; // Your "AppStore"

  // Immediate Syncing
  function syncAll(from: 'hsv' | 'rgb' | 'hex') {
    if (from === 'hsv') {
      const s_n = s / 100, v_n = v / 100;
      const f = (n: number) => {
        let k = (n + h / 60) % 6;
        return v_n - v_n * s_n * Math.max(0, Math.min(k, 4 - k, 1));
      };
      r = Math.round(f(5) * 255);
      g = Math.round(f(3) * 255);
      b = Math.round(f(1) * 255);
    }
    
    const toHex = (c: number) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
    value = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    hexInput = value;
    dispatch("change", value);
  }

  function rgbToHsv() {
    let r_n = r / 255, g_n = g / 255, b_n = b / 255;
    let max = Math.max(r_n, g_n, b_n), min = Math.min(r_n, g_n, b_n);
    let d = max - min;
    v = max * 100;
    s = max === 0 ? 0 : (d / max) * 100;
    if (max === min) h = 0;
    else {
      if (max === r_n) h = (g_n - b_n) / d + (g_n < b_n ? 6 : 0);
      else if (max === g_n) h = (b_n - r_n) / d + 2;
      else if (max === b_n) h = (r_n - g_n) / d + 4;
      h *= 60;
    }
  }

  // Vault Actions
  function saveToVault() {
    if (!vault.includes(value)) {
      vault = [value, ...vault].slice(0, 12);
    }
  }

  function loadFromVault(color: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    if (result) {
      r = parseInt(result[1], 16);
      g = parseInt(result[2], 16);
      b = parseInt(result[3], 16);
      rgbToHsv();
      syncAll('rgb');
    }
  }

  function handlePaletteMove(e: PointerEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    s = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    v = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
    syncAll('hsv');
  }

  function handleHueMove(e: PointerEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
    syncAll('hsv');
  }
</script>

<div class="studio-container">
  <div class="picker-core">
    <div class="sv-box" style:--h="hsl({h}, 100%, 50%)" on:pointerdown={handlePaletteMove} on:pointermove={(e) => e.buttons && handlePaletteMove(e)}>
      <div class="sv-grad"></div>
      <div class="sv-cursor" style:left="{s}%" style:top="{100 - v}%"></div>
    </div>

    <div class="hue-slider" on:pointerdown={handleHueMove} on:pointermove={(e) => e.buttons && handleHueMove(e)}>
      <div class="hue-cursor" style:left="{(h/360)*100}%"></div>
    </div>
  </div>

  <div class="value-bar">
    <div class="input-cell hex">
      <span class="label">#</span>
      <input type="text" value={hexInput.replace('#','')} on:input={(e) => {
        let raw = e.currentTarget.value.toUpperCase();
        if (raw.length === 6) loadFromVault('#' + raw);
      }} />
    </div>
    <div class="rgb-group">
      {#each [['R', r], ['G', g], ['B', b]] as [label, val], i}
        <div class="input-cell">
          <span class="label">{label}</span>
          <input type="number" value={val} on:input={(e) => {
            let n = parseInt(e.currentTarget.value) || 0;
            if (i === 0) r = n; else if (i === 1) g = n; else b = n;
            rgbToHsv();
            syncAll('rgb');
          }} />
        </div>
      {/each}
    </div>
    <button class="add-btn" on:click={saveToVault}>＋</button>
  </div>

  <div class="vault-grid">
    {#each vault as color}
      <button 
        class="vault-item" 
        style:--c={color} 
        on:click={() => loadFromVault(color)}
      ></button>
    {/each}
    {#if vault.length === 0}
      <div class="empty-msg">VAULT EMPTY</div>
    {/if}
  </div>
</div>

<style>
  .studio-container {
    background: #0a0a0a;
    width: 320px;
    padding: 16px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* Core Picker */
  .sv-box {
    height: 160px;
    background: var(--h);
    border-radius: 8px;
    position: relative;
    cursor: crosshair;
    overflow: hidden;
  }
  .sv-grad {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, #fff, transparent), linear-gradient(to top, #000, transparent);
  }
  .sv-cursor {
    position: absolute;
    width: 10px; height: 10px;
    border: 2px solid #fff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .hue-slider {
    height: 8px;
    margin-top: 12px;
    border-radius: 4px;
    background: linear-gradient(to right, red, #ff0, lime, aqua, blue, fuchsia, red);
    position: relative;
    cursor: pointer;
  }
  .hue-cursor {
    position: absolute;
    top: 50%; transform: translate(-50%, -50%);
    width: 4px; height: 14px;
    background: #fff;
    border-radius: 2px;
  }

  /* Value Inputs */
  .value-bar {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .input-cell {
    background: #1a1a1a;
    border-radius: 6px;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
  }
  .label { font-size: 9px; color: #444; font-weight: 900; }
  input {
    background: transparent; border: none; color: #fff;
    font-family: monospace; font-size: 11px; width: 100%; outline: none;
  }
  .rgb-group { display: flex; gap: 4px; flex: 2; }

  .add-btn {
    background: #222; border: none; color: #fff;
    width: 28px; height: 28px; border-radius: 6px;
    cursor: pointer; transition: 0.2s;
  }
  .add-btn:hover { background: #333; }

  /* Vault */
  .vault-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid #1a1a1a;
  }
  .vault-item {
    aspect-ratio: 1;
    background: var(--c);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.1s;
  }
  .vault-item:active { transform: scale(0.9); }
  .empty-msg { grid-column: span 6; font-size: 8px; color: #333; text-align: center; }

  input::-webkit-inner-spin-button { display: none; }
</style>