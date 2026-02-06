<script lang="ts">
  import { onMount, tick } from "svelte";
  import snarkdown from "snarkdown";
  import ModalShell from "./ModalShell.svelte";
  import changelogRaw from "../../assets/CHANGELOG.md?raw";

  export let isOpen = false;

  const sections = changelogRaw
    .split(/\n(?=#\s)/) 
    .map((block) => {
      const titleMatch = block.match(/^#\s+(.*)\/(v.*)/m);
      if (!titleMatch) return null;

      const version = titleMatch[2].trim();
      
      let cleanBody = block
        .replace(/\n---\n/g, '\n<div class="hr-spacer"></div>\n')
        .split('\n')
        .map(line => {
          let processed = line.replace(/^\s*\d+\.\s+/, '- ');
          const indentMatch = processed.match(/^(\s+)-/);
          if (indentMatch) {
            const spaceCount = indentMatch[1].length;
            return "    ".repeat(spaceCount) + processed.trimStart();
          }
          return processed;
        })
        .join('\n');

      return {
        id: version.replace(/[^a-zA-Z0-9]/g, ""),
        label: version,
        sublabel: titleMatch[1].trim(),
        html: snarkdown(cleanBody),
      };
    })
    .filter((s) => s !== null);

  let activeTab = sections[0]?.id;
  let scrollContainer: HTMLElement;
  let isManualScrolling = false; 

  onMount(async () => {
    await tick();
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrolling) return; 

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeTab = entry.target.id;
          }
        });
      },
      { 
        root: scrollContainer, 
        threshold: 0, 
        rootMargin: "-10% 0px -80% 0px" 
      }
    );

    const elements = document.querySelectorAll(".section-block");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  });

  async function handleTabChange(e: CustomEvent) {
    const targetId = e.detail;
    const targetElement = document.getElementById(targetId);
    
    if (targetElement && scrollContainer) {
      isManualScrolling = true;
      activeTab = targetId; 

      scrollContainer.scrollTo({
        top: targetElement.offsetTop - 20,
        behavior: "smooth"
      });

      setTimeout(() => { isManualScrolling = false; }, 800);
    }
  }
</script>

<ModalShell
  {isOpen}
  title="ARCHIVE"
  {activeTab}
  tabs={sections.map((s) => ({ id: s.id, label: s.label }))}
  on:close={() => (isOpen = false)}
  on:tabChange={handleTabChange}
  accentColor="#007aff"
>
  <div class="scroll-viewport" bind:this={scrollContainer}>
    {#each sections as section}
      <section class="section-block" id={section.id}>
        <div class="version-meta">
          <span class="v-date mono">{section.sublabel}</span>
          <span class="v-badge">{section.label}</span>
        </div>
        <div class="markdown-content">
          {@html section.html}
        </div>
      </section>
    {/each}
    
  </div>
</ModalShell>

<style>
  .scroll-viewport {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 40px 0 10px;
    scroll-behavior: smooth;
    mask-image: linear-gradient(to bottom, transparent, black 5%, black 95%, transparent);
  }


  .section-block {
    margin-bottom: 120px;
    padding-top: 20px;
    scroll-margin-top: 20px;
  }

  .version-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 10px;
  }

  .v-date { font-size: 11px; opacity: 0.4; letter-spacing: 2px; color: #fff; }
  .v-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--accent);
    background: rgba(0, 255, 204, 0.1);
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid rgba(0, 255, 204, 0.2);
  }

  .markdown-content {
    font-family: "Inter", -apple-system, sans-serif;
    font-size: 15px;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.85);
    word-break: normal;
    overflow-wrap: break-word;
    white-space: normal;
  }

  .markdown-content :global(h1) { display: none; }

  .markdown-content :global(h3) {
    font-size: 18px;
    font-weight: 800;
    color: #fff;
    margin: 50px 0 20px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-left: 3px solid var(--accent);
    padding-left: 15px;
    margin-left: -5px;
  }

  .markdown-content :global(h4) {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin: 35px 0 15px 0;
    padding: 0;
    display: block;
  }

  .markdown-content :global(ul) {
    list-style: none;
    padding-left: 1.5rem;
    margin: 12px 0;
  }

  .markdown-content :global(ul ul) {
    padding-left: 2rem;
    margin-top: 6px;
  }

  .markdown-content :global(li) {
    margin-bottom: 12px;
    position: relative;
    max-width: 100%;
  }

  .markdown-content :global(ul > li::before) {
    content: "—";
    position: absolute;
    left: -1.2rem;
    color: var(--accent);
    opacity: 0.7;
  }

  .markdown-content :global(ul ul > li::before) {
    content: "•";
    font-size: 18px;
    top: -2px;
    left: -1.2rem;
    color: var(--accent);
  }

  .markdown-content :global(ul ul ul > li::before) {
    content: "◦";
    font-size: 16px;
    top: -1px;
    left: -1.2rem;
    color: rgba(255, 255, 255, 0.3);
  }

  .markdown-content :global(em) {
    font-style: italic;
    color: rgba(0, 255, 204, 0.8);
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
  }

  .markdown-content :global(strong) {
    color: #fff;
    font-weight: 800;
  }
  
  .markdown-content :global(code) {
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "JetBrains Mono", monospace;
    color: #ff8500;
    font-size: 0.9em;
    white-space: pre-wrap;
    word-break: normal;
  }

  .markdown-content :global(pre code) {
   margin-left: 20px;
  }

  .markdown-content :global(.hr-spacer) {
    height: 1px;
    background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 100%);
    margin: 60px 0;
  }

  .markdown-content :global(blockquote) {
    margin: 30px 0;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border-left: 3px solid var(--accent);
    border-radius: 0 8px 8px 0;
    font-size: 14px;
    font-style: italic;
  }
</style>