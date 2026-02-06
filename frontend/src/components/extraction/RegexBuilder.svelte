<script lang="ts">

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  interface DigitGroup {
    min: number;
    max: number;
  }

  interface FilterTerm {
    id: number;
    text: string;
    digitGroups: DigitGroup[];
    searchMode: "contains" | "starts";
  }

  let filters: FilterTerm[] = [
    { id: Date.now(), text: "", digitGroups: [], searchMode: "contains" },
  ];

  $: {
    const pattern = filters
      .filter((f) => f.text.trim() !== "" || f.digitGroups.length > 0)
      .map((f) => {
        let base = escapeRegExp(f.text);

        // Append all digit groups: e.g. [0-9]+[1-5]+
        f.digitGroups.forEach((group) => {
          base += `[${group.min}-${group.max}]+`;
        });

        // Wrap based on search mode
        return f.searchMode === "starts" ? `${base}.*` : `.*${base}.*`;
      })
      .join("|");

    const finalRegex = filters.length > 1 ? `(${pattern})` : pattern;
    dispatch("change", finalRegex);
  }

  function addFilter() {
    filters = [
      ...filters,
      { id: Date.now(), text: "", digitGroups: [], searchMode: "contains" },
    ];
  }

  function removeFilter(id: number) {
    filters = filters.filter((f) => f.id !== id);
  }

  function addDigitGroup(index: number) {
    filters[index].digitGroups = [
      ...filters[index].digitGroups,
      { min: 0, max: 9 },
    ];
    filters = filters;
  }

  function removeDigitGroup(filterIdx: number, groupIdx: number) {
    filters[filterIdx].digitGroups = filters[filterIdx].digitGroups.filter(
      (_, i) => i !== groupIdx
    );
    filters = filters;
  }

  function toggleMode(index: number) {
    filters[index].searchMode =
      filters[index].searchMode === "contains" ? "starts" : "contains";
    filters = filters;
  }

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

</script>
<div class="filter-builder">
  <h2 class="section-label">Regex Filtering</h2>

  {#each filters as filter, i (filter.id)}
    <div class="filter-row">
      <div class="input-block">
        <span class="tiny-tag">Target Pattern</span>
        <input
          type="text"
          bind:value={filter.text}
          placeholder="e.g. Character_ID"
          class="text-input"
        />
      </div>

      <div class="controls">
        <div class="groups-wrapper">
          {#each filter.digitGroups as group, gIdx}
            <div class="digit-picker active">
              <div class="range-inputs">
                <input type="number" bind:value={group.min} min="0" max="9" />
                <span class="sep">/</span>
                <input type="number" bind:value={group.max} min="0" max="9" />
              </div>
              <button class="clear-digit" on:click={() => removeDigitGroup(i, gIdx)}>×</button>
            </div>
          {/each}
        </div>

        <button class="add-digit-btn" on:click={() => addDigitGroup(i)}>
          <span>+</span> DIGITS
        </button>

        <button class="mode-toggle" class:active={filter.searchMode === 'starts'} on:click={() => toggleMode(i)}>
          {filter.searchMode === "contains" ? "Contains" : "Starts"}
        </button>

        {#if filters.length > 1}
          <button class="remove-btn" on:click={() => removeFilter(filter.id)} title="Remove Rule">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        {/if}
      </div>
    </div>
  {/each}

  <button class="add-btn" on:click={addFilter}>
    <span>+</span> Add Alternative Rule
  </button>
</div>
<style>
  .filter-builder {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
  }

  .filter-row {
    display: flex;
    gap: 20px;
    align-items: center;
    background: rgba(255, 255, 255, 0.02);
    padding: 12px 20px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .filter-row:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
  }

  .filter-row:focus-within {
    border-color: var(--accent);
    background: rgba(0, 122, 255, 0.05);
    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
  }

  .input-block {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 120px; /* Prevents text input from disappearing */
  }

  .tiny-tag {
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    opacity: 0.5;
  }

  .text-input {
    background: transparent;
    border: none;
    color: white;
    outline: none;
    font-size: 14px;
    font-weight: 500;
    padding: 2px 0;
  }

  .controls {
    display: flex;
    gap: 12px;
    align-items: center;
    min-width: 0; /* Important for the overflow scroll to work */
  }

  .groups-wrapper {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 2px;
    scrollbar-width: none; /* Firefox */
  }

  .groups-wrapper::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }

  /* Liquid Glass Digit Picker */
  .digit-picker {
    display: flex;
    align-items: center;
    flex-shrink: 0; /* Prevents squishing */
    
    /* Liquid Glass styling */
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(var(--accent-rgb), 0.3);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
    
    padding: 4px 8px 4px 12px; /* Less padding on right for tighter delete button */
    border-radius: 100px;
    gap: 4px; /* Tightened internal gap */
    transition: all 0.2s ease;
  }

  .range-inputs {
    display: flex;
    align-items: center;
    font-family: monospace;
    font-weight: bold;
  }

  .range-inputs input {
    width: 20px; /* Adjusted for readability vs space */
    background: transparent;
    border: none;
    color: var(--accent);
    text-align: center;
    padding: 0;
    outline: none;
    font-size: 13px; /* Slightly larger for easier reading */
  }

  .sep {
    opacity: 0.4;
    margin: 0 1px;
    font-size: 12px;
    color: var(--accent);
  }

 .clear-digit {
    background: rgba(255, 68, 68, 0.1);
    border: none;
    color: #ff5f5f;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px; /* Slightly smaller to feel integrated */
    height: 16px;
    border-radius: 50%;
    font-size: 9px;
    font-weight: 900;
    line-height: 1;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.8;
    margin-left: 2px; /* Tightened spacing to the numbers */
  }

  .clear-digit:hover {
    background: #ff4444;
    color: white;
    opacity: 1;
    transform: scale(1.1);
  }

  /* Action Buttons */
  .add-digit-btn, .mode-toggle {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-muted);
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .add-digit-btn:hover, .mode-toggle:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
  }

  .mode-toggle.active {
    background: var(--accent);
    color: white;
    border-color: transparent;
  }

  
  .add-btn {
    background: transparent;
    border: 1px dashed rgba(255, 255, 255, 0.1);
    color: var(--text-muted);
    padding: 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.2s;
    margin-top: 8px;
  }

  .add-btn:hover {
    border-style: solid;
    border-color: var(--accent);
    color: white;
  }

  .remove-btn {
    background: rgba(255, 68, 68, 0.1);
    border: none;
    color: #ff4444;
    cursor: pointer;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .remove-btn:hover {
    background: #ff4444;
    color: white;
  }
</style>