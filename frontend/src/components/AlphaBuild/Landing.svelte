<script lang="ts">
  import { setView } from "../../stores/appStore";
  import { fly } from "svelte/transition";
  import Shell from "../modals/ChangelogModal.svelte";
  import changelogRaw from "../../assets/CHANGELOG.md?raw";
  let scrollY = 0;

  function parseChangelog(raw: string) {

    const blocks = raw.split(/\n---+\n/).filter((b) => b.trim().length > 0);

    return blocks
      .map((block) => {
        const titleMatch = block.match(/^#\s+(.*)\/(v.*)/m);

        const summaryMatch = block.match(
          /### (HIGHLIGHTS|SUMMARY)\n([\s\S]*?)(?=\n###|---|$)/
        );

        let task = "No summary available.";

        if (summaryMatch) {
          task = summaryMatch[2]
            .trim()
            .replace(/\*\*/g, "") 
            .replace(/`+/g, ""); 
        }

        return {
          date: titleMatch ? titleMatch[1].trim() : null,
          v: titleMatch ? titleMatch[2].trim() : null,
          task: task,
        };
      })
      .filter((item) => item.v !== null);
    }

  const updates = parseChangelog(changelogRaw);

  function handleLaunch() {
    setView("SPINE");
  }

  let isOpenLog = false;

  function openLog() {
    isOpenLog = true;
    console.log("OPENING");
  }

</script>

<svelte:window bind:scrollY />
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="app-frame">
  <div class="outer-border"></div>

  <main class="content-viewport">
    <section class="hero-section">
      <div class="top-meta mono" in:fly={{ y: -20, duration: 800 }}>
        <div class="meta-item">PROJECT: MOTIV.2D</div>
        <div class="meta-item">STATUS: ALPHA_STABLE</div>
        <div class="meta-item">BUILD: 2026.02</div>
      </div>

      <div class="title-block">
        <h1 class="giant-display">
          <span class="outline">MO</span>TIV<span class="dot">.</span><span class="accent-title">2d</span>
        </h1>
        <div class="sub-hero">
          <p class="elegant-text">
            <span class="italic">Spine2D</span> <br />
            <span class="italic dimmed">+ Live2D Cubism (Soon)</span>
          </p>
          <div class="hero-action">
            <button class="launch-pill" on:click={() => handleLaunch()}>
              LAUNCH VIEWER
              <span class="pill-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="module-section">
      <div class="section-label mono">SYSTEM_ARCHIVE / ROADMAP</div>

      <div class="bento-grid">
        <div class="bento-card large">
          <div class="card-header">
            <span class="mono">MOD_01</span>
            <span class="tag stable">v1.0 STABLE</span>
          </div>
          <h2>SPINE<br />VIEWER</h2>
          <p>Complete integration for Spine 3.8 to 4.1.</p>
        </div>

        <div class="bento-card">
          <div class="card-header">
            <span class="mono">MOD_02</span>
            <span class="tag wip">WIP</span>
          </div>
          <h3>EXTRACTION</h3>
          <p>AssetStudio CLI bridge. Safely extract game assets.</p>
        </div>

        <div class="bento-card">
          <div class="card-header">
            <span class="mono">MOD_03</span>
            <span class="tag upcoming">UPCOMING</span>
          </div>
          <h3>LIVE2D<br />VIEWER</h3>
          <p>Live2d Cubism support. Focused on AzurLane and GFL asset.</p>
        </div>
        <div class="bento-card large clickable" on:click={() => openLog()}>
          <div class="card-header">
            <span class="mono">LOGS</span>
            <span class="tag">RECENT</span>
          </div>
          <div class="changelog-list">
            {#each updates as update}
              <div class="log-entry">
                <div class="log-meta">
                  <span class="log-date">{update.date}</span>
                  <span class="log-v">{update.v}</span>
                </div>
                <span class="log-t" style="white-space: pre-line;">
                  {update.task}
                </span>
              </div>
            {/each}
          </div>

          <div class="card-footer mono">CLICK_TO_VIEW_FULL_ARCHIVE</div>
        </div>
      </div>
    </section>
  </main>
</div>
<Shell bind:isOpen={isOpenLog} />

<style>

  :global(body) {
    background-color: #030303;
    color: #ffffff;
    margin: 0;
    overflow-x: hidden;
  }

  .app-frame {
    padding: 65px 85px;
    min-height: 100vh;
    box-sizing: border-box;
    position: relative;
    overflow-y: auto;
  }

  .outer-border {
    position: fixed;
    inset: 30px;
    pointer-events: none;
    z-index: 100;
  }

  .mono {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    opacity: 0.5;
  }

  .top-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10vh;
  }

  .title-block {
    position: relative;
    margin-bottom: 20vh;
  }

  .giant-display {
    font-family: "Inter", sans-serif;
    font-size: 18vw;
    line-height: 0.8;
    margin: 0;
    font-weight: 900;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    padding-top: 100px;
  }

  .accent-title{
    color: var(--accent-2);
  }

  .outline {
    color: transparent;
    -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
  }

  .dot {
    color: var(--accent);
  }

  .sub-hero {
    margin-top: 2rem;
    margin-left: 20vw;
    max-width: 600px;
  }

  .elegant-text {
    font-family: "Bodoni Moda", serif;
    font-size: 2.5rem;
    line-height: 1.1;
    margin-bottom: 3rem;
  }

  .italic {
    font-family: "Rail";
    opacity: 0.7;
  }
  .dimmed {
    opacity: 0.4;
    font-size: 0.8em;
  }

  .launch-pill {
    background: transparent;
    border: 1px solid #fff;
    color: #fff;
    padding: 1.2rem 2.5rem;
    border-radius: 100px;
    font-family: "JetBrains Mono", monospace;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .launch-pill:hover {
    background: var(--accent);

    transform: scale(1.05);
    border-color: var(--accent);
  }

  /* Bento Grid */
  .section-label {
    margin-bottom: 2rem;
    display: block;
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .bento-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 40px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 300px;
    transition: background 0.4s ease;
    border-radius: 1.25rem;
  }

  .bento-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .clickable {
    cursor: pointer;
  }

  .large {
    grid-column: span 2;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tag {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 3px 10px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
  }

  .stable {
    color: #00ffaa;
    border: 1px solid #00ffaa33;
  }
  .wip {
    color: #ffcc00;
    border: 1px solid #ffcc0033;
  }

  .changelog-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 30px;
  }

  .log-entry {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 12px;
  }

  .log-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
  }

  .log-date {
    opacity: 0.4;
  }

  .log-entry {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .log-t {
    opacity: 0.7;
    font-size: 11px;
    line-height: 1.6;
  }

  .log-v {
    color: var(--accent, #00ffcc);
    font-weight: bold;
    letter-spacing: 0.05em;
  }

  .card-footer {
    margin-top: 20px;
    font-size: 9px;
    opacity: 0.3;
    text-align: right;
  }
  h2 {
    font-family: "Inter", sans-serif;
    font-size: 4rem;
    margin: 1rem 0;
    letter-spacing: -0.04em;
  }
  h3 {
    font-family: "Inter", sans-serif;
    font-size: 2rem;
    margin: 1rem 0;
  }

  p {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.5;
    margin: 0;
  }
</style>
