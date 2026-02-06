<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { CurrentPlatform } from "../../../wailsjs/go/main/App";
  import { BrowserOpenURL } from "../../../wailsjs/runtime/runtime";

  const dispatch = createEventDispatcher();
  const close = () => dispatch("close");

  let osInfo = "Detecting system";

  onMount(async () => {
    const p = await CurrentPlatform();
    osInfo = p.replace("_", " / ").toUpperCase();
  });

  const links = [
    { label: "REPOSITORY", url: "https://github.com/o0Nomar0o" },
    {
      label: "LICENSE",
      url: "https://github.com/your-username/motiv-2d/blob/main/LICENSE",
    },
  ];

  function openLink(url) {
    if (url && url !== "#") {
      BrowserOpenURL(url);
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->

<div class="backdrop" on:click={close} transition:fade={{ duration: 150 }}>
  <div
    class="modal st-gl"
    on:click|stopPropagation
    transition:fly={{ y: 10, duration: 300 }}
  >
    <div class="container" />

    <header>
      <h1 class="title">MOTIV.2D</h1>
      <p class="subtitle">OPEN SOURCE SOFTWARE</p>
    </header>

    <div class="content">
      <section class="meta-grid">
        <div class="entry">
          <span class="label">VERSION</span>
          <span class="value">1.0.0-ALPHA</span>
        </div>
        <div class="entry">
          <span class="label">PLATFORM</span>
          <span class="value">{osInfo}</span>
        </div>
        <div class="entry">
          <span class="label">BUILD</span>
          <span class="value">2026.02.03</span>
        </div>
        <div class="entry">
          <span class="label">LICENSE</span>
          <span class="value">MIT</span>
        </div>
      </section>

      <section class="links">
        {#each links as link}
          <button class="link-item" on:click={() => openLink(link.url)}>
            {link.label}
            <span class="arrow">→</span>
          </button>
        {/each}
      </section>
    </div>

    <footer>
      <button class="close-trigger" on:click={close}>DISMISS</button>
      <p class="copyright">BY NOMAR</p>
    </footer>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    width: 380px;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0;
    position: relative;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
    border-radius: 1.25em;
  }

  .container {
    height: 30px;
    width: 100%;
  }

  header {
    padding: 0 32px 24px 32px;
    text-align: left;
  }

  .title {
    font-family: "Rail", sans-serif;
    font-size: 24px;
    letter-spacing: -0.02em;
    margin: 0;
    color: #fff;
  }

  .subtitle {
    font-family: "MarklMono", monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
    margin: 4px 0 0 0;
    letter-spacing: 0.1em;
  }

  .content {
    padding: 0 32px;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 24px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .entry {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-family: "MarklMono", monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.3);
  }

  .value {
    font-family: "MarklMono", monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
  }

  .links {
    padding: 24px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .link-item {
    background: none;
    border: none;
    padding: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    font-family: "MarklMono", monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: color 0.2s;
  }

  .link-item:hover {
    color: var(--accent, #00ffcc);
  }

  .link-item {
    display: flex;
    justify-content: space-between;
    font-family: "MarklMono", monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    transition: color 0.2s;
  }

  .link-item:hover {
    color: var(--accent, #00ffcc);
  }

  .arrow {
    opacity: 0;
    transition:
      transform 0.2s,
      opacity 0.2s;
  }

  .link-item:hover .arrow {
    opacity: 1;
    transform: translateX(4px);
  }

  footer {
    padding: 24px 32px 32px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .close-trigger {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #fff;
    font-family: "MarklMono", monospace;
    font-size: 10px;
    padding: 6px 16px;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 1.4em;
  }

  .close-trigger:hover {
    background: #fff;
    color: #000;
  }

  .copyright {
    font-family: "MarklMono", monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.2);
    margin: 0;
  }
</style>
