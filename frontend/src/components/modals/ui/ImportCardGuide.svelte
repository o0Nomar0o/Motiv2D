<script lang="ts">
  import AddItem from "../../../assets/images/char-add.svg";
  import { isImportOpen } from "../../../stores/appStore";

  function openImportModal() {
    isImportOpen.set(true);
  }
</script>

<div class="import-guide-wrapper">
  <div class="import-guide-card st-gl">
    <!-- Clean Emblem Container -->
    <div class="icon-circle-wrapper">
      <div class="icon-circle st-gl">
        <div class="icon-mask" style="--icon: url({AddItem});"></div>
      </div>
    </div>

    <div class="guide-content">
      <h2>Get Started</h2>
      <p>Import <span class="guide-label">Spine</span> or <span class="guide-label">Live2D</span> model to initialize...</p>

      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="action-btn st-gl" on:click={openImportModal}>
        <div class="icon-mask" style="--icon: url({AddItem});"></div>
        <span>Open Import Manager</span>
      </div>
    </div>
  </div>
</div>

<style>
  /* Base icon mask matching Toolbar */
  .icon-mask {
    width: 24px !important;
    height: 24px !important;
    background-color: currentColor;
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
    transition: color 0.3s ease;
  }

  /* Toolbar Glass Base */
  .st-gl {
    background: rgba(12, 12, 12, 0.65);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 100px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);

    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }

  .import-guide-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 360px;
    padding: 28px;
    box-sizing: border-box;
  }

  .import-guide-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 38px 54px;
    max-width: 380px;
    width: 100%;
    border-radius: 2rem;
    box-sizing: border-box;

    animation: cardSnapIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes cardSnapIn {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .icon-circle-wrapper {
    margin-bottom: 18px;
  }

  .icon-circle {
    width: 58px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.85);
  }

  .guide-content h2 {
    font-family: "Rail", "Nunito", sans-serif;
    font-size: 24px;
    font-weight: 400;
    color: var(--accent);
    margin: 0 0 6px 0;
    letter-spacing: 0.03em;
  }

  .guide-content p {
    font-family: "Nunito", sans-serif;
    font-size: 15.5px;
    color: var(--text-muted, #888888);
    line-height: 1.55;
    margin: 0 0 24px 0;
    max-width: 290px;
  }

  .guide-label {
    font-weight: 700;
    color: var(--accent-2);
  }

  .action-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 22px;
    height: 38px;
    color: rgba(255, 255, 255, 0.85);
    font-family: "Nunito", sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    outline: none;

    transition:
      background 0.25s ease,
      border-color 0.25s ease,
      color 0.25s ease,
      box-shadow 0.25s ease,
      transform 0.15s ease;
  }

  .action-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.3),
      inset 0 0 10px rgba(255, 255, 255, 0.06);
    transform: scale(1.015);
  }

  .action-btn:active {
    transform: scale(0.985);
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
</style>
