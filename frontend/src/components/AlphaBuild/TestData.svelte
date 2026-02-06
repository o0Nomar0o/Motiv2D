<script lang="ts">
  import { Greet } from "../../../wailsjs/go/main/App.js";

  let resultData = "";
  const items: number[] = Array.from({ length: 101 }, (_, i) => i);

  function handleClick(id: number) {
    Greet(id + "").then((result) => (resultData = result));
  }
</script>

<div class="test-container">
  {#each items as item}
    <button class="test-item" on:click={() => handleClick(item)}>
      Item #{item}
    </button>
  {/each}
</div>
<div class="result" id="result">{resultData}</div>

<style>
  .test-container {
    padding: 10px;
    display: flex;
    flex-direction: column;
  }

  .test-item {
    padding: 15px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    color: var(--text-main);
    font-family: monospace;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s;
  }

  .test-item:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--accent); 
  }
</style>
