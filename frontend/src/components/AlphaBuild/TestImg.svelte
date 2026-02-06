<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { characterLibrary } from "../../stores/appStore";

  const dispatch = createEventDispatcher();

  function selectAsset(asset) {
    dispatch("select", asset);
  }
</script>

<div class="container">
  <div class="asset-grid">
    {#each $characterLibrary as asset}
      <div
        class="asset-card"
        class:incomplete={!asset.hasSkel || !asset.hasAtlas}
      >
        <div class="card-header">
          <span class="version-tag">{asset.version || "Unknown"}</span>
          <h3>{asset.id}</h3>
        </div>

        <div class="preview-strip">
          {#each asset.pngFiles as png}
            <div class="img-wrapper">
              <!-- svelte-ignore a11y-missing-attribute -->
              <img
                src={png.url}
                on:error={() => console.error("Failed to load:", png.url)}
              />
            </div>
          {/each}
        </div>

        <div class="status-list">
          <div class="status-item">
            <span class={asset.hasSkel ? "text-success" : "text-danger"}>
              {asset.hasSkel ? "●" : "○"} Skeleton
            </span>
            {#if asset.hasSkel}<code>{asset.skelFile.url}</code>{/if}
          </div>

          <div class="status-item">
            <span class={asset.hasAtlas ? "text-success" : "text-danger"}>
              {asset.hasAtlas ? "●" : "○"} Atlas
            </span>
            {#if asset.hasAtlas}<code>{asset.atlasFile.url}</code>{/if}
          </div>
          <div class="status-item">
            <span class={asset.defaultPMA ? "text-success" : "text-danger"}>
              {asset.hasSkel ? "●" : "○"} PMA
            </span>
            {#if asset.hasSkel}<code>{asset.skelFile.url}</code>{/if}
          </div>
        </div>

        <div class="card-footer">
          {#if asset.hasSkel && asset.hasAtlas}
            <button class="view-btn" on:click={() => selectAsset(asset)}>
              Launch Viewer
            </button>
          {:else}
            <p class="warning">Missing required files</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .container {
    padding: 20px;
    background: #1a1a1a;
    min-height: 100%;
  }

  .asset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .asset-card {
    background: #2a2a2a;
    border-radius: 8px;
    border: 1px solid #444;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.2s;
    color: #eee;
  }

  .asset-card:hover {
    transform: translateY(-2px);
    border-color: #007bff;
  }
  .asset-card.incomplete {
    opacity: 0.7;
    border-style: dashed;
  }

  .card-header {
    padding: 15px;
    border-bottom: 1px solid #333;
    position: relative;
  }
  .card-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .version-tag {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #007bff;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .preview-strip {
    display: flex;
    gap: 5px;
    padding: 10px;
    background: #222;
    overflow-x: auto;
    min-height: 80px;
    align-items: center;
  }

  .img-wrapper img {
    height: 60px;
    width: auto;
    border: 1px solid #444;
    border-radius: 4px;
    background: repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 50% / 10px
      10px;
  }

  .status-list {
    padding: 15px;
    flex-grow: 1;
    font-size: 0.85rem;
  }
  .status-item {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
  }

  .card-footer {
    padding: 15px;
    background: #333;
  }

  .view-btn {
    width: 100%;
    padding: 10px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }
  .view-btn:hover {
    background: #0056b3;
  }

  .text-success {
    color: #2ecc71;
    margin-right: 5px;
  }
  .text-danger {
    color: #e74c3c;
    margin-right: 5px;
  }
  .warning {
    color: #f1c40f;
    font-size: 0.8rem;
    margin: 0;
    text-align: center;
  }
  code {
    background: #1a1a1a;
    color: #aaa;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
  }
</style>
