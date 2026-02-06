<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { createEventDispatcher } from "svelte";

  export let isOpen = false;
  export let title = "MODAL";
  export let activeTab = "";
  export let tabs: { id: string; label: string }[] = [];
  
  export let width = "900px";
  export let height = "600px";
  export let bodyBackground = "#0f0f0f";
  export let accentColor = "#00a2ff";

  const dispatch = createEventDispatcher();

  function close() {
    dispatch("close");
    isOpen = false;
  }

  
  function setTab(id: string) {
    dispatch("tabChange", id);
  }
</script>

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->

  <div class="modal-overlay" on:click={close} transition:fade={{ duration: 150 }}>
    <div 
      class="modal-shell st-gl" 
      style="width: {width}; height: {height}; --accent: {accentColor};"
      on:click|stopPropagation 
      in:fly={{ y: 20, duration: 300 }}
    >
      <aside class="modal-sidebar">
        <div class="brand" style="color: {accentColor};">{title}</div>
        <div class="nav-group">
          {#each tabs as tab}
            <button
              class:active={activeTab === tab.id}
              on:click={() => setTab(tab.id)}
            >
              {tab.label}
            </button>
          {/each}
        </div>
        
        <slot name="sidebar-footer" />
      </aside>

      <main class="modal-body" style="background: {bodyBackground};">
        <slot /> 
      </main>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .modal-shell {
    display: flex;
    border-radius: 1.25em;
    padding: 10px;
  }

  .st-gl {
    background: rgba(35, 35, 35, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .modal-sidebar {
    width: 220px;
    display: flex;
    flex-direction: column;
    padding: 30px 15px;
    gap: 16px;
  }

  .modal-body {
    flex: 1;
    border-radius: 32px;
    padding: 40px;
    display: flex;
    flex-direction: column;
    color: #eee;
    overflow: hidden;
    position: relative;
  }

  .brand {
    font-family: "Rail";
    font-size: 24px;
    letter-spacing: 2px;
    margin-bottom: 20px;
    padding-left: 20px;
  }

  .nav-group button {
    background: transparent;
    border: none;
    color: #666;
    padding: 16px 20px;
    border-radius: 20px;
    text-align: left;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 8px;
    width: 100%;
    font-size: 12px;
    transition: all 0.2s;
  }

  .nav-group button.active {
    background-color: rgba(255, 255, 255, 0.03);
    color: var(--accent);
  }

  .modal-body::-webkit-scrollbar { width: 4px; }
  .modal-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
  .modal-body::-webkit-scrollbar-thumb:hover { background: var(--accent); }
</style>