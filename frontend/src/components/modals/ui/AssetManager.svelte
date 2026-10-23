<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EventsOn } from "../../../../wailsjs/runtime/runtime";
  import {
    DownloadRemoteAsset,
    PauseDownload,
    CancelDownload,
  } from "../../../../wailsjs/go/remote/RemoteHandler";

  let downloads: Record<string, any> = {};
  let expandedAssets = new Set<string>();
  let unlisten: () => void;

  onMount(() => {
    unlisten = EventsOn("remote:download_progress", (data: any) => {
      if (data.status === "canceled") {
        delete downloads[data.assetId];
        downloads = { ...downloads };
      } else {
        downloads[data.assetId] = data;
        downloads = { ...downloads };
      }
    });
  });

  onDestroy(() => {
    if (unlisten) unlisten();
  });

  function toggleExpand(assetId: string) {
    if (expandedAssets.has(assetId)) {
      expandedAssets.delete(assetId);
    } else {
      expandedAssets.add(assetId);
    }
    expandedAssets = expandedAssets;
  }

  function formatBytes(bytes: number = 0): string {
    if (!bytes || isNaN(bytes) || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // Pure File-Based Percentage Math (0% - 100%)
  function getFileBasedProgress(
    completed: number = 0,
    total: number = 0,
  ): number {
    if (!total || total <= 0) return 0;
    const pct = (completed / total) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }

  async function handlePause(assetId: string) {
    await PauseDownload(assetId);
  }

  async function handleResume(downloadItem: any) {
    const fileList = downloadItem.files?.map((f: any) => f.fileName) || [];

    await DownloadRemoteAsset({
      id: downloadItem.assetId,
      sourceName: downloadItem.sourceName,
      displayName: downloadItem.displayName || downloadItem.assetId,

      // Extract directly from the nested source object:
      sourceType: downloadItem.source?.mode || "",
      remoteRoot: downloadItem.source?.remoteRoot || "",
      baseUrl: downloadItem.source?.baseUrl || "",

      iconUrl: downloadItem.iconUrl || "",
      hasPreview: Boolean(downloadItem.hasPreview),
      files: fileList,
    });
  }

  async function handleCancel(sourceName: string, assetId: string) {
    if (confirm(`Cancel download and remove ${assetId}?`)) {
      await CancelDownload(sourceName, assetId);
    }
  }
</script>

<div class="asset-manager custom-scrollbar">
  {#if Object.keys(downloads).length === 0}
    <div class="empty-state">No active or cached downloads in memory.</div>
  {:else}
    <div class="download-list">
      {#each Object.values(downloads) as item (item.assetId)}
        {@const completedCount = item.completed || 0}
        {@const totalCount = item.totalFiles || item.files?.length || 0}
        {@const filePct = getFileBasedProgress(completedCount, totalCount)}

        <div class="asset-card" class:paused={item.status === "paused"}>
          <!-- PARENT FOLDER HEADER -->
          <div class="node-header" on:click={() => toggleExpand(item.assetId)}>
            <div class="node-title">
              <span class="chevron"
                >{expandedAssets.has(item.assetId) ? "▼" : "▶"}</span
              >
              <span class="folder-name">{item.displayName || item.assetId}</span
              >
              <span class="status-badge {item.status}">{item.status}</span>
            </div>

            <div class="node-metrics">
              <span class="file-counter">
                &lt;{completedCount}/{totalCount} files&gt;
              </span>
              <span class="pct">{filePct.toFixed(0)}%</span>
            </div>

            <div class="actions" on:click|stopPropagation>
              {#if item.status === "downloading"}
                <button
                  class="btn-ctrl pause"
                  on:click={() => handlePause(item.assetId)}
                >
                  ⏸ Pause
                </button>
              {:else if item.status === "paused"}
                <button
                  class="btn-ctrl resume"
                  on:click={() => handleResume(item)}
                >
                  ▶ Resume
                </button>
              {/if}

              <button
                class="btn-ctrl cancel"
                on:click={() => handleCancel(item.sourceName, item.assetId)}
              >
                ✕ Cancel
              </button>
            </div>
          </div>

          <!-- MAIN FILE-BASED PROGRESS BAR -->
          <div class="progress-track">
            <div
              class="progress-fill"
              class:is-paused={item.status === "paused"}
              style="width: {filePct}%"
            ></div>
          </div>

          <!-- CHILD FILES LIST -->
          {#if expandedAssets.has(item.assetId) && item.files?.length}
            <div class="file-children">
              {#each item.files as file (file.fileName)}
                {@const isDone = file.status === "complete"}
                <div class="file-row">
                  <div class="file-name">
                    <span class="file-icon">{isDone ? "✅" : "📄"}</span>
                    <span>{file.fileName}</span>
                  </div>

                  <div class="file-meta">
                    <span class="file-bytes">
                      {formatBytes(file.bytesWritten)} / {formatBytes(
                        file.totalBytes,
                      )}
                    </span>
                    <span class="file-status {file.status}">{file.status}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .asset-manager {
    height: 100%;
    overflow-y: auto;
    padding-right: 6px;
  }

  .empty-state {
    padding: 40px;
    text-align: center;
    color: #666;
    font-size: 13px;
  }

  .download-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .asset-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
    transition: border 0.2s;
  }

  .asset-card.paused {
    border-color: rgba(255, 170, 0, 0.3);
  }

  .node-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    cursor: pointer;
    user-select: none;
    gap: 12px;
  }

  .node-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: #fff;
    font-size: 13px;
  }

  .folder-name {
    color: #00a2ff;
  }

  .chevron {
    font-size: 10px;
    color: #666;
  }

  .status-badge {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 800;
  }
  .status-badge.downloading {
    background: rgba(0, 162, 255, 0.2);
    color: #00a2ff;
  }
  .status-badge.paused {
    background: rgba(255, 170, 0, 0.2);
    color: #ffaa00;
  }
  .status-badge.complete {
    background: rgba(0, 255, 150, 0.2);
    color: #00ff96;
  }
  .status-badge.error {
    background: rgba(255, 0, 0, 0.2);
    color: #ff4d4d;
  }

  .node-metrics {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: monospace;
    font-size: 11px;
    color: #aaa;
  }

  .pct {
    color: #00ff96;
    font-weight: bold;
    min-width: 35px;
    text-align: right;
  }

  .actions {
    display: flex;
    gap: 6px;
  }

  .btn-ctrl {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #ccc;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-ctrl:hover {
    background: #fff;
    color: #000;
  }
  .btn-ctrl.cancel:hover {
    background: #ff4d4d;
    color: #fff;
  }

  .progress-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    width: 100%;
  }

  .progress-fill {
    height: 100%;
    background: #00a2ff;
    transition: width 0.2s ease;
  }

  .progress-fill.is-paused {
    background: #ffaa00;
  }

  .file-children {
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 16px 12px 28px;
    border-top: 1px solid rgba(255, 255, 255, 0.03);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .file-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: #888;
    gap: 12px;
  }

  .file-name {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ddd;
    flex: 1;
  }

  .file-meta {
    display: flex;
    gap: 10px;
    font-family: monospace;
    font-size: 10px;
  }

  .file-status.complete {
    color: #00ff96;
  }
  .file-status.downloading {
    color: #00a2ff;
  }
  .file-status.error {
    color: #ff4d4d;
  }
</style>
