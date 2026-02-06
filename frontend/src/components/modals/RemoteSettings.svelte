<script lang="ts">
  import { onMount } from "svelte";
  import iconPlus from "../../assets/images/plus.svg";
  import iconGlobe from "../../assets/images/globe.svg";
  import iconTrash from "../../assets/images/trash.svg";
  import iconBack from "../../assets/images/chevron-left.svg";
  import iconEdit from "../../assets/images/edit.svg";
  import iconCross from "../../assets/images/cross.svg";
  import iconCheck from "../../assets/images/check.svg";

  import {
    remoteSources,
    initRemotes,
    saveRemoteSource,
    deleteRemoteSource,
    type RemoteSource,
  } from "../../stores/appStore";

  let isCreating = false;
  let editingId: string | null = null; 
  let deletingId: string | null = null;

  let tempName = "";
  let tempUrl = "";
  let tempMetadataUrl = "";
  let discoveryMode: "manual" | "auto" = "manual";
  let folderPaths = [];
  let mappingRules = [];

  let useJsDelivr = false; 
  let githubBranch = "main"; 

  onMount(() => {
    initRemotes();
  });

  $: isGithub = tempUrl.toLowerCase().includes("github.com");
  $: activeToggleIdx = discoveryMode === "manual" ? 0 : 1;

  function convertToRaw(url: string) {
    if (!url) return "";
    if (
      !url.includes("github.com") ||
      url.includes("raw.githubusercontent.com")
    )
      return url;

    // Convert https://github.com/user/repo/blob/main/file.json
    // to https://raw.githubusercontent.com/user/repo/main/file.json
    return url
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/");
  }

  function deriveEndpoints(inputUrl: string, useCdn: boolean, branch: string) {
    const cleanUrl = inputUrl.endsWith("/") ? inputUrl.slice(0, -1) : inputUrl;

    // Regex to find user/repo from "https://github.com/user/repo"
    const ghMatch = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);

    if (ghMatch) {
      const [_, owner, repo] = ghMatch;

      // 1. API URL (For Go to find the files)
      const api = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

      // 2. Remote Root (For the App to download files)
      let root = "";
      if (useCdn) {
        root = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/`;
      } else {
        root = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
      }

      return { api, root };
    }

    // Fallback for non-GitHub URLs (Manual Mode)
    return { api: inputUrl, root: inputUrl };
  }

  const addPath = () => (folderPaths = [...folderPaths, ""]);
  const removePath = (i: number) =>
    (folderPaths = folderPaths.filter((_, idx) => idx !== i));

  const addMapping = () =>
    (mappingRules = [
      ...mappingRules,
      { id: Date.now().toString(), label: "", key: "" },
    ]);
  const removeMapping = (id: string) =>
    (mappingRules = mappingRules.filter((r) => r.id !== id));

  function toggleCreate() {
    isCreating = !isCreating;
    if (!isCreating) resetForm();
  }

  function resetForm() {
    editingId = null;
    tempName = "";
    tempUrl = "";
    folderPaths = [];
    mappingRules = [{}];
    discoveryMode = "manual";
    useJsDelivr = false;
    githubBranch = "main";
    tempMetadataUrl = "";
  }

  function editRemote(source: RemoteSource) {

    editingId = source.id;
    tempName = source.name;
    tempMetadataUrl = source.metadataUrl;

    if (source.baseUrl.includes("api.github.com/repos")) {
      const match = source.baseUrl.match(/repos\/([^\/]+)\/([^\/]+)/);
      if (match) tempUrl = `https://github.com/${match[1]}/${match[2]}`;
    } else {
      tempUrl = source.baseUrl;
    }

    useJsDelivr = source.remoteRoot.includes("jsdelivr");

    discoveryMode = source.mode;

    folderPaths =
      source.folderPaths && source.folderPaths.length > 0
        ? source.folderPaths
        : [];

    mappingRules =
      source.mappingRules && source.mappingRules.length > 0
        ? source.mappingRules
        : [];

    isCreating = true;

  }

  async function handleSave() {

    const { api, root } = deriveEndpoints(tempUrl, useJsDelivr, githubBranch);

    const finalMetadataUrl = convertToRaw(tempMetadataUrl);

    const newSource: RemoteSource = {
      id: editingId || crypto.randomUUID(),
      name: tempName,
      active: true,
      mode: discoveryMode,

      baseUrl: api,
      remoteRoot: root,

      metadataUrl: finalMetadataUrl,
      folderPaths: folderPaths.filter((p) => p.trim() !== ""),
      mappingRules: mappingRules,
      lastUpdated: Date.now(),
    };

    await saveRemoteSource(newSource);
    toggleCreate();
  }

  async function handleDelete(id: string) {
    try {
      await deleteRemoteSource(id);
      deletingId = null;
    } catch (err) {
      console.error("Delete failed", err);
    }
  }
</script>

<header class="tab-header">
  <div class="title-row">
    {#if isCreating}
      <button class="back-trigger" on:click={toggleCreate}>
        <div class="icon-mask title-icon" style="--icon: url({iconBack})"></div>
      </button>
    {:else}
      <div class="icon-mask title-icon" style="--icon: url({iconGlobe})"></div>
    {/if}
    <h1 class="railway">
      {isCreating
        ? editingId
          ? "Edit Source"
          : "New Remote Source"
        : "Remote Assets"}
    </h1>
  </div>
  <p>
    {isCreating
      ? "Configure your asset discovery endpoint."
      : "Configure external asset sources and endpoints."}
  </p>
</header>

<div class="content-area custom-scrollbar">
  {#if !isCreating}
    <div class="card-grid">
      {#each $remoteSources as remote (remote.id)}
        <div class="remote-card">
          <div class="card-body">
            <span class="card-name">{remote.name}</span>
            <div class="status-indicator">
              <span class="dot" class:active={remote.active}></span>
              <span class="status-text">
                {remote.active ? "Active" : "Inactive"} | {remote.mode}
              </span>
            </div>
          </div>
          <div class="card-controls">
            <button class="action-icon" on:click={() => editRemote(remote)}>
              <div class="icon-mask sm" style="--icon: url({iconEdit})"></div>
            </button>

            <div
              class="delete-morph-container"
              class:active={deletingId === remote.id}
            >
              {#if deletingId === remote.id}
                <button
                  class="pill-btn check"
                  on:click={() => handleDelete(remote.id)}
                >
                  <div
                    class="icon-mask sm"
                    style="--icon: url({iconCheck})"
                  ></div>
                </button>
                <div class="pill-divider"></div>
                <button
                  class="pill-btn cross"
                  on:click={() => (deletingId = null)}
                >
                  <div
                    class="icon-mask sm"
                    style="--icon: url({iconCross})"
                  ></div>
                </button>
              {:else}
                <button
                  class="action-icon delete"
                  on:click={() => (deletingId = remote.id)}
                >
                  <div
                    class="icon-mask sm"
                    style="--icon: url({iconTrash})"
                  ></div>
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}

      <button class="add-card-btn" on:click={toggleCreate}>
        <div class="icon-mask lg" style="--icon: url({iconPlus})"></div>
        <span class="railway add-label">ADD SOURCE</span>
      </button>
    </div>
  {:else}
    <div class="creation-ui">
      <div class="ct-row">
        <div class="input-block">
          <span class="tiny-tag">Display Name</span>
          <input
            type="text"
            class="text-input"
            bind:value={tempName}
            placeholder="e.g. Brown Dust 2"
          />
        </div>
      </div>

      <div class="ct-row">
        <div class="input-block">
          <span class="tiny-tag">Remote URL</span>
          <input
            type="text"
            class="text-input wide-url"
            bind:value={tempUrl}
            placeholder="https://github.com/User/Repo"
          />
        </div>
      </div>

      <div class="ct-row">
        <div class="input-block">
          <span class="tiny-tag">Manifest URL</span>
          <input
            type="text"
            class="text-input wide-url"
            bind:value={tempMetadataUrl}
            placeholder="https://github.com/User/Repo/blob/main/CharInfo.json"
          />
        </div>
      </div>

      {#if isGithub}
        <div class="github-options separate-box">
          <span class="section-label">CDN Optimization</span>

          <div class="cdn-row">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="cdn-option"
              class:selected={!useJsDelivr}
              on:click={() => (useJsDelivr = false)}
            >
              <span class="cdn-name">Raw GitHub</span>
              <span class="cdn-desc">Direct from source. Reliable.</span>
            </div>

            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
              class="cdn-option"
              class:selected={useJsDelivr}
              on:click={() => (useJsDelivr = true)}
            >
              <span class="cdn-name">jsDelivr</span>
              <span class="cdn-desc">High performance global CDN.</span>
            </div>
          </div>

          <div class="ct-row mini-row branch-input">
            <span class="tiny-tag">Branch</span>
            <input
              type="text"
              class="text-input"
              bind:value={githubBranch}
              placeholder="main"
            />
          </div>
        </div>
      {/if}

      <div class="toggle-section">
        <span class="section-label">Discovery Mode</span>
        <div class="segmented-control">
          <div class="thumb-container">
            <div
              class="slider-thumb"
              style="transform: translateX({activeToggleIdx *
                100}%); width: 50%;"
            ></div>
          </div>
          <button
            class="segment-btn"
            class:active={discoveryMode === "manual"}
            on:click={() => (discoveryMode = "manual")}
          >
            <span>Manual</span>
          </button>
          <button
            class="segment-btn"
            class:active={discoveryMode === "auto"}
            on:click={() => (discoveryMode = "auto")}
          >
            <span>Auto</span>
          </button>
        </div>
      </div>

      {#if discoveryMode === "manual"}
        <div class="logic-container">
          <div class="logic-group separate-box">
            <span class="section-label">Folder Paths</span>
            <div class="items-list">
              {#each folderPaths as path, i}
                <div class="ct-row mini-row">
                  <input
                    type="text"
                    class="text-input"
                    bind:value={folderPaths[i]}
                    placeholder="v3/Character"
                  />
                  {#if i > 0}
                    <button
                      class="remove-btn-small"
                      on:click={() => removePath(i)}>×</button
                    >
                  {/if}
                </div>
              {/each}
            </div>
            <button class="add-alt-btn" on:click={addPath}
              ><span>+</span> Add Folder Path</button
            >
          </div>

          <div class="logic-group separate-box">
            <span class="section-label">Mapping Rules</span>
            <div class="items-list">
              {#each mappingRules as rule, i (rule.id)}
                <div class="ct-row mapping-row">
                  <div class="map-input">
                    <span class="tiny-tag">Label Key</span>
                    <input
                      type="text"
                      class="text-input"
                      bind:value={rule.label}
                    />
                  </div>

                  <div class="chevron-connector">
                    <div
                      class="icon-mask sm rotated-chevron"
                      style="--icon: url({iconBack})"
                    ></div>
                  </div>

                  <div class="map-input">
                    <span class="tiny-tag">ID Key</span>
                    <input
                      type="text"
                      class="text-input"
                      bind:value={rule.key}
                    />
                  </div>

                  {#if mappingRules.length > 0}
                    <button
                      class="remove-btn-small"
                      on:click={() => removeMapping(rule.id)}>×</button
                    >
                  {/if}
                </div>
              {/each}
            </div>
            <button class="add-alt-btn" on:click={addMapping}
              ><span>+</span> Add Mapping Rule</button
            >
          </div>
        </div>
      {:else}
        <div class="info-notice">
          <span class="tiny-tag">System Message</span>
          <p class:warning={!isGithub}>
            {#if isGithub}
              {#if useJsDelivr}
                GitHub API mode active. Assets will be served via <b>jsDelivr</b
                > for maximum speed.
              {:else}
                GitHub API mode active. Crawling repository tree...
              {/if}
            {:else}
              Warning: Non-GitHub URL. Go will manually traverse folders. This
              will take longer.
            {/if}
          </p>
        </div>
      {/if}

      <div class="footer-actions">
        <button class="save-btn" on:click={handleSave}>
          {editingId ? "UPDATE SOURCE" : "SAVE SOURCE"}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .card-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .delete-morph-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    background: transparent;
    border-radius: 16px;
    border: 1px solid transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .delete-morph-container.active {
    min-width: 80px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .pill-btn {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    color: #888;
    transition:
      color 0.2s,
      background 0.2s;
  }

  .pill-btn.check:hover {
    color: #00ffcc;
    background: rgba(0, 255, 204, 0.05);
  }

  .pill-btn.cross:hover {
    color: #ff4d4d;
    background: rgba(255, 77, 77, 0.05);
  }

  .pill-divider {
    width: 1px;
    height: 14px;
    background: rgba(255, 255, 255, 0.1);
  }

  .action-icon {
    background: transparent;
    border: none;
    color: #666;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .action-icon:hover {
    color: #eee;
  }

  .action-icon.delete:hover {
    color: #ff4d4d;
  }

  /* Icon Mask helper */
  .icon-mask.sm {
    width: 16px;
    height: 16px;
  }

  /* Header */
  .tab-header {
    margin-bottom: 30px;
    min-height: 80px;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }
  .title-icon {
    width: 24px;
    height: 24px;
    background-color: #eee;
  }
  h1 {
    font-size: 24px;
    margin: 0;
  }
  .back-trigger {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    color: #eee;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
  }

  .ct-row {
    display: flex;
    gap: 20px;
    align-items: center;
    background: rgba(255, 255, 255, 0.02);
    padding: 10px 20px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    margin-bottom: 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ct-row:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
  }
  .ct-row:focus-within {
    border-color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }

  .input-block {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .tiny-tag {
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
    color: #888;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .text-input {
    background: transparent;
    border: none;
    color: white;
    outline: none;
    font-size: 14px;
    padding: 4px 0;
    width: 100%;
    font-weight: 500;
  }
  .wide-url {
    max-width: 450px;
  }

  .github-options {
    margin-bottom: 20px;
  }

  .cdn-row {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  .cdn-option {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cdn-option:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .cdn-option.selected {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .cdn-name {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
  }

  .cdn-desc {
    font-size: 10px;
    color: #888;
  }

  .branch-input {
    margin-top: 10px;
  }

  .toggle-section {
    margin: 10px 0 20px 0;
    width: 260px;
  }
  .section-label {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    display: block;
    margin-bottom: 8px;
  }

  .segmented-control {
    --pill-height: 33px;
    --pill-bg: rgba(0, 0, 0, 0.25);
    --pill-radius: 100px;
    --inner-padding: 3px;
    position: relative;
    display: flex;
    height: var(--pill-height);
    background: var(--pill-bg);
    border-radius: var(--pill-radius);
    padding: var(--inner-padding);
    backdrop-filter: blur(12px);
    overflow: hidden;
  }
  .thumb-container {
    position: absolute;
    top: 0;
    left: var(--inner-padding);
    right: var(--inner-padding);
    bottom: 0;
    display: flex;
    align-items: center;
    pointer-events: none;
    z-index: 1;
  }
  .slider-thumb {
    height: calc(var(--pill-height) - (var(--inner-padding) * 2));
    background: #fff;
    border-radius: var(--pill-radius);
    transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }
  .segment-btn {
    position: relative;
    flex: 1;
    height: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .segment-btn span {
    color: rgba(255, 255, 255, 0.45);
    font-size: 12px;
    font-weight: 700;
    transition: all 0.2s ease;
  }
  .segment-btn.active span {
    color: #000;
  }

  .tab-header p {
    font-size: 13px;
    color: #666;
    margin: 0;
  }

  .logic-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-top: 10px;
  }
  .separate-box {
    padding: 20px;
    background: rgba(255, 255, 255, 0.01);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.03);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .mini-row {
    padding: 8px 16px;
    border-radius: 14px;
    margin-bottom: 0;
  }
  .mapping-row {
    gap: 12px;
    margin-bottom: 0;
  }
  .map-input {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .chevron-connector {
    display: flex;
    align-items: center;
    opacity: 0.4;
  }
  .rotated-chevron {
    transform: rotate(180deg);
    background-color: #fff;
    width: 14px;
    height: 14px;
  }

  .add-alt-btn {
    background: transparent;
    border: 1px dashed rgba(255, 255, 255, 0.1);
    color: #888;
    padding: 10px;
    border-radius: 15px;
    cursor: pointer;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    transition: all 0.2s;
    width: fit-content;
    margin-top: 8px;
    width: 100%;
  }
  .add-alt-btn:hover {
    border-style: solid;
    border-color: #fff;
    color: #fff;
  }

  .remove-btn-small {
    background: rgba(255, 68, 68, 0.1);
    border: none;
    color: #ff5f5f;
    cursor: pointer;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s;
  }
  .remove-btn-small:hover {
    background: #ff4444;
    color: white;
  }

  .save-btn {
    background: #eee;
    color: #000;
    border: none;
    padding: 14px 40px;
    border-radius: 24px;
    font-weight: 800;
    cursor: pointer;
    margin-top: 20px;
  }

  .info-notice {
    margin-top: 10px;
    padding: 16px 20px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.05) 0%,
      rgba(255, 255, 255, 0.01) 100%
    );
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    position: relative;
    overflow: hidden;
  }
  .info-notice::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 14px;
  }
  .info-notice p {
    font-size: 13px;
    color: #ccc;
    margin: 6px 0 0 0;
    line-height: 1.5;
  }
  .info-notice p.warning {
    color: #ffb800;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
  .remote-card,
  .add-card-btn {
    border: 1px solid #333;
    border-radius: 20px;
    padding: 24px;
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: 0.2s;
  }
  .add-card-btn {
    border-style: dashed;
    background: transparent;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    color: #666;
    cursor: pointer;
  }
  .add-card-btn:hover {
    border-style: solid;
    border-color: #fff;
    color: #fff;
    background: rgba(255, 255, 255, 0.03);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: #ff4d4d;
    box-shadow: 0 0 10px rgba(255, 77, 77, 0.3);
  }
  .dot.active {
    background: #00ffcc;
    box-shadow: 0 0 10px rgba(0, 255, 204, 0.4);
  }

  .status-text {
    font-size: 10px;
    color: #888;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: inline-flex;
    align-items: center;
  }

  .icon-mask {
    display: inline-block;
    mask-image: var(--icon);
    -webkit-mask-image: var(--icon);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    background-color: currentColor;
  }
  .sm {
    width: 16px;
    height: 16px;
  }
  .lg {
    width: 32px;
    height: 32px;
  }
  .action-icon {
    background: transparent;
    border: none;
    color: #444;
    cursor: pointer;
    padding: 8px;
  }
  .action-icon:hover {
    color: #fff;
    transform: scale(1.1);
  }
  .action-icon.delete:hover {
    color: #ff4d4d;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
</style>
