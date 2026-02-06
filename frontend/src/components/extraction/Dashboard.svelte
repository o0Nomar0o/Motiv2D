<script lang="ts">
  import PathCard from "./PathCard.svelte";
  import PresetGallery from "./PresetGallery.svelte";
  import TypeGallery from "./TypeGallery.svelte";
  import InFolder from "../../assets/images/in-folder.svg";
  import OutFolder from "../../assets/images/out-folder.svg";
  import RegexBuilder from "./RegexBuilder.svelte";
  import { extractionOptions } from "../../stores/appStore"
  import { BuildCLICommand } from "../../../wailsjs/go/services/CLIService";
  import { AnalyzeFolder } from "../../../wailsjs/go/services/CLIService";
  import { QueueTasks } from "../../../wailsjs/go/services/CLIService";
  import { services } from "../../../wailsjs/go/models";


  // let inputPath = "";
  // let outputPath = "";

  // let activePreset = "spine";

  // let options: services.ExtractionOptions = {
  //   inputPath: "",
  //   outputPath: "",
  //   activePreset: "spine",
  //   types: [] as string[],
  //   // mode: "",
  //   regex: "",
  //   decompress: true,

  //   unityVersion: "2021.3.39f1",
  //   filterByName: "",
  //   maxTasks: 1,
  // };

  $: {
    if ($extractionOptions.activePreset === "spine") {
      $extractionOptions.types = ["Texture2D", "TextAsset"];
      // options.mode = "";
    } else if ($extractionOptions.activePreset === "live2d") {
      $extractionOptions.types = [];
      // options.mode = "live2d";
    } else if ($extractionOptions.activePreset === "custom") {
      // options.mode = "";
    }

  }

  async function start() {

    const summary = await AnalyzeFolder($extractionOptions.inputPath);
    console.log("Found:", summary);

    await QueueTasks($extractionOptions);

    alert(`Started extracting ${summary.fileCount} files!`);
  }
</script>

<div class="page-wrapper">
  <header class="typo-header">
    <h1>Asset<span>Studio</span></h1>
  </header>

  <main>
    <section class="path-section">
      <PathCard
        label="Source Path"
        bind:value={$extractionOptions.inputPath}
        icon={InFolder}
        isExport={false}
      />
      <PathCard
        label="Export Destination"
        bind:value={$extractionOptions.outputPath}
        icon={OutFolder}
        isExport={true}
      />
    </section>

    <section class="config-grid">
      <div class="config-wrap">
        <div class="config-header">
          <h2 class="section-label no-margin">Extraction Mode</h2>
          <div class="preset-adjuster">
            <PresetGallery bind:activePreset={$extractionOptions.activePreset} />
          </div>
        </div>

        <div class="config-body">
          <TypeGallery bind:options={$extractionOptions} activePreset={$extractionOptions.activePreset} />
        </div>
      </div>

      <div class="config-wrap">
        <RegexBuilder on:change={(e) => ($extractionOptions.regex = e.detail)} />
      </div>
    </section>
  </main>

  <footer class="action-bar">
    <button class="primary-btn" on:click={start}>
      Execute Extraction
      <span class="cmd-hint">⌘ + Enter</span>
    </button>
  </footer>
</div>

<style>
  .config-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
  }

  .config-wrap {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 28px;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 24px;
    backdrop-filter: blur(20px);
  }

  .config-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    padding-bottom: 20px;
  }

  .no-margin {
    margin-bottom: 0 !important;
  }

  .preset-adjuster {
    width: 280px;
  }

  .config-body {
    width: 100%;
  }

  .page-wrapper {
    padding-right: 10px;
    max-width: 79vw;
    margin: 0 auto;

  }

  h1 {
    /* font-size: 1.2rem; */
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 2rem;
    text-transform: uppercase;
  }

  h1 span {
    color: var(--accent);
  }

  .typo-header {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    z-index: 0;
  }

  .section-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
  }

  .action-bar {
    bottom: 2rem;
    display: flex;
    justify-content: center;
    margin-top: 4rem;
  }

  .primary-btn {
    background: var(--accent);
    color: white;
    border: none;
    padding: 1rem 3rem;
    border-radius: 100px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 20px 40px rgba(0, 122, 255, 0.3);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .primary-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 25px 50px rgba(0, 122, 255, 0.4);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes cyberReveal {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
      clip-path: inset(0 0 100% 0); 
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      clip-path: inset(0 0 0% 0);
    }
  }

  @keyframes fluidDepth {
    0% {
      opacity: 0;
      filter: blur(15px);
      transform: scale(0.9) translateY(30px);
    }
    100% {
      opacity: 1;
      filter: blur(0);
      transform: scale(1) translateY(0);
    }
  }

  .page-wrapper > *:nth-child(1) {
    animation-delay: 0.1s;
  }
  .page-wrapper > *:nth-child(2) {
    animation-delay: 0.15s;
  }
  .page-wrapper > *:nth-child(3) {
    animation-delay: 0.2s;
  }
  .page-wrapper > *:nth-child(4) {
    animation-delay: 0.25s;
  }

  @keyframes entryItem {
    from {
      opacity: 0;
      transform: translateX(-15px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
