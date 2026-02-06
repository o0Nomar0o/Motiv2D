<script lang="ts">
  import { onMount } from 'svelte';
  import { GetMemoryStats } from '../../../wailsjs/go/monitors/RunAnalyze'; 
  import { monitors, services } from '../../../wailsjs/go/models';

  let stats: monitors.MemoryStats = { 
    alloc: 0, 
    mainRss: 0,     
    childrenRss: 0, 
    total: 0, 
    workerCount: 0 
};

  let jsDisplay: string | number = '...';

  async function updateStats() {
    try {

      const res = await GetMemoryStats();
      if (res) stats = res;

      const perf = performance as any;

      if (perf.measureUserAgentSpecificMemory) {
        const mem = await perf.measureUserAgentSpecificMemory();
        jsDisplay = Math.round(mem.bytes / 1024 / 1024);
      } 

      else if (perf.memory) {
        jsDisplay = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
      } 

      else {
        jsDisplay = '—'; 
      }

    } catch (err) {
      jsDisplay = '—';
    }
  }

  onMount(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  });
</script>

<div class="glass-pill">
  <div class="stat">
    <span class="label">APP</span>
    <span class="value">{stats.mainRss}</span>
    <span class="unit">MB</span>
  </div>

  <div class="pipe"></div>

  <div class="stat">
    <span class="label accent">GO</span>
    <span class="value">{stats.alloc}</span>
    <span class="unit">MB</span>
  </div>

  <div class="pipe"></div>

  <div class="stat">
    <span class="label accent">JS</span>
    <span class="value">{jsDisplay}</span>
    <span class="unit">MB</span>
  </div>
</div>

<style>
  .glass-pill {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 6px 18px;
    
      background: rgba(10, 10, 10, 0.5);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 100px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    
    box-shadow: 
      0 4px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 1px rgba(255, 255, 255, 0.05);
    
    user-select: none;
    pointer-events: auto;
  }

  .stat {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .label {
    font-size: 12px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.3);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .label.accent {
    color: var(--accent, #0078d4);
    opacity: 0.8;
  }

  .value {
    font-family: ui-monospace, 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    color: #ffffff;
    font-variant-numeric: tabular-nums; 
    letter-spacing: -0.02em;
  }

  .unit {
    font-size: 8px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.15);
  }

  .pipe {
    width: 1px;
    height: 12px;
    background: rgba(255, 255, 255, 0.08);
  }

  .glass-pill:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-0.5px);
  }
</style>