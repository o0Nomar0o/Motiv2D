<script lang="ts">
  import { SelectFolder, SelectExportFolder } from "../../../wailsjs/go/services/CLIService";
  
  export let label: string;
  export let value: string;
  export let icon: any;
  export let isExport: boolean = false; 

  async function handleBrowse() {
    let selected: string;
    
    if (isExport) {
      selected = await SelectExportFolder();
    } else {
      selected = await SelectFolder();
    }
    
    if (selected) value = selected;
  }
</script>

<div class="path-card" class:has-value={value}>
  <div class="icon-section">
    {#if typeof icon === 'string'}
      <img src={icon} alt="" class="svg-icon" />
    {:else}
      <svelte:component this={icon} />
    {/if}
  </div>

  <div class="content-section">
    <label for="path-input">{label}</label>
    <div class="input-wrapper">
      <input 
        id="path-input"
        type="text" 
        bind:value 
        placeholder="Drag folder here or browse..." 
        spellcheck="false"
      />
    </div>
  </div>

  <button class="browse-trigger" on:click={handleBrowse} aria-label="Open File Browser">
    <span>Browse</span>
  </button>
</div>

<style>
  .path-card {
    --card-bg: rgba(255, 255, 255, 0.03);
    --card-border: rgba(255, 255, 255, 0.08);
    
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 12px 12px 20px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 28px;
    backdrop-filter: blur(10px);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    margin-bottom: 16px;
    
  }

  .path-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .path-card:focus-within {
    border-color: var(--accent);
    background: rgba(0, 122, 255, 0.05);
    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
  }

  .icon-section {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .svg-icon {
    width: 22px;
    height: 22px;
    opacity: 0.7;
    filter: brightness(0) invert(1);
  }

  .content-section {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent); 
    opacity: 0.9;
  }

  .input-wrapper {
    overflow: hidden;
  }

  input {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--text-main);
    font-size: 13px;
    font-family: 'Inter', -apple-system, sans-serif;
    outline: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  input::placeholder {
    color: var(--text-muted);
    font-weight: 400;
  }

  .browse-trigger {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-main);
    padding: 8px 16px;
    border-radius: 2rem;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .browse-trigger:hover {
    background: var(--text-main);
    color: var(--bg-window);
    transform: scale(1.05);
  }

  .browse-trigger:active {
    transform: scale(0.95);
  }

  .has-value .icon-section {
    color: var(--accent);
    background: rgba(0, 122, 255, 0.15);
  }
</style>