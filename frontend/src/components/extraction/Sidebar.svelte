<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import SettingsIcon from "../../assets/images/setting.svg";
  import TerminalIcon from "../../assets/images/terminal.svg";
  import TaskIcon from "../../assets/images/task.svg";
  import DashboardIcon from "../../assets/images/dashboard.svg";

  // Arrow assets
  import ArrowMin from "../../assets/images/arrow-min.svg";
  import ArrowMax from "../../assets/images/arrow-max.svg";

  export let activeView = "dashboard";
  export let isCollapsed = false;

  const dispatch = createEventDispatcher();

  const topNav = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: DashboardIcon,
      index: "01",
      class: "icon-grid",
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: TaskIcon,
      index: "02",
      class: "icon-tray",
    },
    {
      id: "terminal",
      label: "Console",
      icon: TerminalIcon,
      index: "03",
      class: "icon-terminal",
    },
  ];

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    dispatch("collapse", isCollapsed);
  }

  function setView(id: string) {
    activeView = id;
  }
</script>

<div class="app-sidebar" class:collapsed={isCollapsed}>
  <div class="top-stack">
    <div class="brand-meta">
      {#if !isCollapsed}
        <h1 class="tiny-tag">SYSTEM</h1>
      {/if}

      <button class="collapse-btn" on:click={toggleCollapse}>
        <div class="arrow-container">
          <div
            class="icon-mask arrow-icon min"
            class:visible={!isCollapsed}
            style="--icon: url({ArrowMin})"
          ></div>
          <div
            class="icon-mask arrow-icon max"
            class:visible={isCollapsed}
            style="--icon: url({ArrowMax})"
          ></div>
        </div>
      </button>
    </div>

    {#each topNav as item}
      <button
        class="nav-btn"
        class:active={activeView === item.id}
        on:click={() => setView(item.id)}
      >
        <div class="icon-container {item.class}">
          <div class="icon-mask" style="--icon: url({item.icon})"></div>
        </div>

        <div class="label-group" class:hidden={isCollapsed}>
          <span class="index">{item.index}</span>
          <span class="label-text">{item.label}</span>
        </div>
      </button>
    {/each}
  </div>

  <div class="bottom-stack">
    <button
      class="nav-btn settings-btn"
      class:active={activeView === "settings"}
      on:click={() => setView("settings")}
    >
      <div class="icon-container icon-gear">
        <div class="icon-mask" style="--icon: url({SettingsIcon})"></div>
      </div>
      <div class="label-group" class:hidden={isCollapsed}>
        <span class="index">04</span>
        <span class="label-text">Settings</span>
      </div>
    </button>
  </div>
</div>

<style>
  :root {
    --accent-complement: #ff9500;
  }

  .app-sidebar {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0 15px;
    transition: width 0.3s ease;
    box-sizing: border-box; 
  }

  .app-sidebar.collapsed {
    padding-left: 0;
    padding-right: 0;
  }

  .brand-meta {
    padding: 24px 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-left: 10px;
    padding-right: 10px;
    box-sizing: border-box;
  }

  .collapsed .brand-meta {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
    width: 100%;
  }

  .collapse-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
  }

  .arrow-container {
    position: relative;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .arrow-icon {
    position: absolute;
    width: 14px !important;
    height: 14px !important;
    opacity: 0;
    transform: scale(0.5) rotate(-45deg);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    filter: drop-shadow(0 0 8px currentColor);
  }

  .arrow-icon.visible {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }

  .arrow-icon.min {
    color: var(--accent);
  }
  .arrow-icon.max {
    color: var(--accent-complement);
  }

  .label-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    white-space: nowrap;
    transition:
      opacity 0.1s ease,
      transform 0.1s ease;
    flex: 1;
  }

  .label-group.hidden {
    opacity: 0;
    transform: translateX(-10px);
    pointer-events: none;
    display: none;
    position: absolute;
  }

  .nav-btn {
    margin-top: 14px;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    background: transparent;
    border: none;
    padding: 12px 10px;
    margin-bottom: 4px;
    border-radius: 12px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.4);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
  }

  .collapsed .nav-btn {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
    gap: 0;
  }

  .icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    margin: 0;
  }

  .icon-mask {
    width: 18px !important;
    height: 18px !important;
    background-color: currentColor;
    mask: var(--icon) no-repeat center / contain;
    -webkit-mask: var(--icon) no-repeat center / contain;
  }

  .nav-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.03);
  }
  .app-sidebar.collapsed {
    padding: 0 8px;
  }
  .collapsed .nav-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.03);
  }
  .nav-btn.active {
    color: var(--accent);
    background: rgba(var(--accent-rgb), 0.08);
  }

  .top-stack {
    display: flex;
    flex-direction: column;
    width: 100%;
    align-items: stretch;
  }
  .bottom-stack {
    padding-bottom: 20px;
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .settings-btn:hover .icon-gear {
    animation: gear-spin 4s linear infinite;
  }
  @keyframes gear-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .nav-btn:hover .icon-tray {
    animation: tray-lift 0.5s ease-in-out infinite alternate;
  }
  @keyframes tray-lift {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-3px);
    }
  }

  .nav-btn:hover .icon-grid {
    animation: grid-pulse 1.5s ease-in-out infinite;
  }
  @keyframes grid-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .icon-terminal::after {
    content: "";
    position: absolute;
    bottom: 2px;
    right: -2px;
    width: 4px;
    height: 1px;
    background: currentColor;
    opacity: 0;
  }
  .nav-btn:hover .icon-terminal::after {
    animation: blink 0.8s step-end infinite;
  }
  @keyframes blink {
    50% {
      opacity: 1;
    }
  }

  .index {
    font-size: 7px;
    font-weight: 900;
    opacity: 0.4;
    margin-bottom: 2px;
  }
  .label-text {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tiny-tag {
    margin: 0;
    padding: 0;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0.2em;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1;
    display: inline-block;
  }
</style>
