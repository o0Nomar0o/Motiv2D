<script lang="ts">
  import { backgroundColor } from "../../stores/appStore";

  let colorInput: HTMLInputElement;

  interface ExtendedWindow extends Window {
    EyeDropper?: new () => {
      open: () => Promise<{ sRGBHex: string }>;
    };
  }

  async function handlePick(event: MouseEvent) {

    if (event.target === colorInput) return;

    const _window = window as unknown as ExtendedWindow;

    if (_window.EyeDropper) {
      try {
        const eyeDropper = new _window.EyeDropper();
        const result = await eyeDropper.open();
        if (result.sRGBHex) {
          $backgroundColor = result.sRGBHex;
          return;
        }
      } catch (e) { /* ignore cancel */ }
    }

    colorInput.click();
  }
</script>

<div class="color-setting">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="glass-jewel-container" on:click={handlePick}>
    <div class="color-inner" style="background: {$backgroundColor}">
       <div class="refraction-glare"></div>
    </div>
    
    <input 
      type="color" 
      bind:this={colorInput} 
      bind:value={$backgroundColor} 
      on:click|stopPropagation 
      class="hidden-native-input"
    />
  </div>
</div>

<style>
  .color-setting {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    width: 40px;
  }

  .glass-jewel-container {
    cursor: pointer;
    position: relative;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .glass-jewel-container:hover {
    transform: scale(1.15);
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.1);
  }

  .color-inner {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    position: relative;
    overflow: hidden;
    box-shadow: inset 0 1px 4px rgba(0,0,0,0.5);
  }

  .refraction-glare {
    position: absolute;
    top: 5%;
    left: 15%;
    width: 35%;
    height: 20%;
    background: rgba(255, 255, 255, 0.3);
    filter: blur(1px);
    border-radius: 50%;
    transform: rotate(-15deg);
    pointer-events: none;
  }

  .hidden-native-input {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    
    /* Changed: must be interactable but invisible */
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
    border: none;
    padding: 0;
    margin: 0;
    /* Remove pointer-events: none; so it can actually be clicked */
  }
</style>