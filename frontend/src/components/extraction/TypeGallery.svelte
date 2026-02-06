<script lang="ts">
  import LockIcon from "../../assets/images/lock.svg";
  import LockOpenIcon from "../../assets/images/lock-open.svg";

  export let options: any;
  export let activePreset: string;

  const availableTypes = [
    { id: "Texture2D", label: "Texture2D" },
    { id: "TextAsset", label: "TextAsset" },
    { id: "AudioClip", label: "Audio" },
    { id: "Mesh", label: "3D Meshes" },
  ];

  function toggleType(id: string) {
    if (activePreset !== "custom") return;

    let newTypes;
    if (options.types.includes(id)) {
      newTypes = options.types.filter((t) => t !== id);
    } else {
      newTypes = [...options.types, id];
    }

    options = { ...options, types: newTypes };
  }

  $: isLocked = activePreset !== "custom";
</script>

<div class="type-section" class:is-locked={isLocked}>
  <div class="chip-grid">
    {#each availableTypes as type}
      <button 
        class="chip" 
        class:selected={options.types.includes(type.id)}
        class:readonly={isLocked}
        on:click={() => toggleType(type.id)}
      >
        {type.label}
      </button>
    {/each}

    <div class="spacer"></div>

    <div class="lock-indicator" class:locked={isLocked}>
       <img src={isLocked ? LockIcon : LockOpenIcon} alt="lock status" />
    </div>
  </div>
</div>

<style>
  .type-section {
    width: 100%;
  }

  .chip-grid {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  .spacer {
    flex-grow: 1;
  }

  .lock-indicator {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 1px solid transparent;
    flex-shrink: 0;
  }

  .lock-indicator img {
    width: 16px;
    height: 16px;
  }

  .lock-indicator:not(.locked) {
    background: rgba(0, 122, 255, 0.1); 
    border-color: rgba(0, 122, 255, 0.2);
  }

  .lock-indicator:not(.locked) img {
    filter: invert(48%) sepia(89%) saturate(2476%) hue-rotate(190deg) brightness(101%) contrast(101%);
  }

  .lock-indicator.locked {
    background: rgba(255, 69, 58, 0.1);
    border-color: rgba(255, 69, 58, 0.2);
  }

  .lock-indicator.locked img {
    filter: invert(43%) sepia(94%) saturate(1352%) hue-rotate(325deg) brightness(103%) contrast(101%);
  }

  .chip {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-muted);
    height: 38px;
    padding: 0 18px;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    white-space: nowrap; 

    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .chip:hover{
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);

    background: rgba(255, 255, 255, 0.06);
    color:whitesmoke;
  }

  .chip.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
    
  }

  .chip.readonly {
    cursor: not-allowed;
  }

  .is-locked .chip:not(.selected) {
    opacity: 0.2;
    filter: grayscale(1);
  }
</style>