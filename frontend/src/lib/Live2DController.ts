import * as PIXI from "pixi.js";
import { Live2DModel, MotionPriority } from "pixi-live2d-display";
import { CameraManager } from "./CameraManager";
import {
  triggerLive2DRefresh,
  type Live2DSessionState,
} from "../stores/appStore";

export class Live2DController {
  public model: Live2DModel | null = null;
  public cameraManager: CameraManager;
  public drawableToPartMap: Map<string, string> = new Map();
  public hiddenDrawables = new Set<string>();

  private app: PIXI.Application;
  private canvas: HTMLCanvasElement;
  private isDestroyed = false;
  private deviceResolution = 1;

  private camX = 0;
  private camY = 0;
  private camZoom = 1;

  private highlightId: string | null = null;
  private highlightHue: number = 0;
  private parameterOverrides: Record<string, number> = {};
  private drawableIndexMap: Map<string, number> = new Map();

  constructor(app: PIXI.Application, canvas: HTMLCanvasElement) {
    (Live2DModel as any).registerTicker(PIXI.Ticker);
    this.app = app;
    this.canvas = canvas;
    this.deviceResolution = Math.max(1, window.devicePixelRatio || 1);

    this.app.renderer.resolution = this.deviceResolution;
    (this.app.renderer as any).autoDensity = true;

    PIXI.settings.ROUND_PIXELS = true;
    if ((PIXI.settings as any).PRECISION_FRAGMENT) {
      (PIXI.settings as any).PRECISION_FRAGMENT = "highp";
    }

    this.resizeRendererToCanvas();
    window.addEventListener("resize", this.onWindowResize);

    this.cameraManager = new CameraManager(canvas);
    this.cameraManager.setupInteractions(() => this.syncModelTransform());

    this.app.ticker.add(this.updateLoop);
  }

  public async load(modelUrl: string, settings?: Live2DSessionState) {
    if (this.isDestroyed) return;

    if (this.model) {
      try {
        this.app.stage.removeChild(this.model);
        this.model.destroy({ children: true, texture: true, baseTexture: true });
      } catch (err) {}
      this.model = null;
      this.drawableIndexMap.clear();
      this.drawableToPartMap.clear();
    }

    const finalUrl = decodeURIComponent(modelUrl);
    this.model = await Live2DModel.from(finalUrl, { autoInteract: false });

    // Texture optimization
    this.model.textures.forEach((t) => {
      const base = t.baseTexture;
      if (!base) return;
      base.mipmap = PIXI.MIPMAP_MODES.ON;
      base.scaleMode = PIXI.SCALE_MODES.LINEAR;
      if ((base as any).anisotropicLevel !== undefined) {
        (base as any).anisotropicLevel = 16;
      }
      base.update();
    });

    const internal = this.model.internalModel as any;
    const core = internal.coreModel;

    // 1. Safe Mapping Logic (Fixes the undefined crash)
    const drawableIds = internal.getDrawableIDs() || [];
    const partIds = core?._partIds || [];
    const drawablePartIndices = internal.drawablePartIndices || core?._drawablePartIndices || [];

    drawableIds.forEach((id: string, index: number) => {
      this.drawableIndexMap.set(id, index);

      // Safe bounds check before array access
      const pIndex = drawablePartIndices[index];
      if (pIndex !== undefined && pIndex !== -1 && partIds[pIndex]) {
        this.drawableToPartMap.set(id, partIds[pIndex]);
      } else {
        this.drawableToPartMap.set(id, "ORPHANS");
      }
    });

    this.app.stage.addChild(this.model);
    this.model.anchor.set(0.5, 0.5);

    // Load Session Settings
    if (settings) {
      this.cameraManager.x = settings.camX;
      this.cameraManager.y = settings.camY;
      this.cameraManager.zoom = settings.zoom;
      this.hiddenDrawables = new Set(
        Object.entries(settings.drawableVisibility || {})
          .filter(([_, visible]) => !visible)
          .map(([id]) => id),
      );
      this.parameterOverrides = { ...settings.parameters };
    }

     const internals = this.model.internalModel as any;
    const cores = internals.coreModel;
    
    // We search every known location for the Part Index array
    const drawablePartIndicess = 
      internals.drawablePartIndices || 
      cores._drawablePartIndices || 
      (cores.getDrawablePartIndices ? cores.getDrawablePartIndices() : null) ||
      cores.drawablePartIndices;

    console.log("🔍 PROBE: drawablePartIndices found?", !!drawablePartIndicess);
    if (drawablePartIndicess) {
      console.log("🔍 PROBE: Array length:", drawablePartIndicess.length);
      console.log("🔍 PROBE: Sample (first 5):", Array.from(drawablePartIndicess).slice(0, 5));
    }

 
    
    this.camX = this.cameraManager.x;
    this.camY = this.cameraManager.y;
    this.camZoom = this.cameraManager.zoom;

    this.syncModelTransform();
    triggerLive2DRefresh();
  }

  private updateLoop = (delta: number) => {
    if (this.isDestroyed || !this.model) return;

    // 1. Standard Camera Logic
    this.camX += this.cameraManager.x - this.camX;
    this.camY += this.cameraManager.y - this.camY;
    this.camZoom = this.cameraManager.zoom;
    this.syncModelTransform();

    const internal = this.model.internalModel as any;
    const core = internal.coreModel as any;

    // 2. Parameter Overrides
    Object.entries(this.parameterOverrides).forEach(([id, value]) => {
      if (core.setParameterValueById) {
        core.setParameterValueById(id, value);
      } else if (core.setParamValue) {
        core.setParamValue(id, value);
      }
    });

    // 3. Native PIXI Visibility Override
    if (internal.drawables) {
      this.drawableIndexMap.forEach((index, id) => {
        const mesh = internal.drawables[index];
        if (mesh) {
          mesh.visible = !this.hiddenDrawables.has(id);
        }
      });
    }

    // 4. Rainbow Highlighting
    if (this.highlightId) {
      this.highlightHue = (this.highlightHue + 2) % 360;
      const { r, g, b } = this.getRainbowRGB(this.highlightHue);
      const index = this.drawableIndexMap.get(this.highlightId);

      if (index !== undefined && index !== -1 && core.setDrawableMultiplyColor) {
        core.setDrawableMultiplyColor(index, r, g, b, 1.0);
      }
    }
  };

  /**
   * Toggles visibility for an entire Part (folder)
   * Safely checks indices to prevent crashes
   */
  public setPartVisibility(partId: string, visible: boolean) {
    if (!this.model) return;
    const internal = this.model.internalModel as any;
    const core = internal.coreModel;
    const partIds = core?._partIds || [];
    const pIndex = partIds.indexOf(partId);

    if (pIndex !== -1) {
      // 1. This part definitely works (the folder hides)
      if (core._partOpacities) core._partOpacities[pIndex] = visible ? 1 : 0;

      // 2. Detective fix for Drawables
      const dpi = internal.drawablePartIndices || core._drawablePartIndices || 
                  (core.getDrawablePartIndices ? core.getDrawablePartIndices() : null);
      
      const dIds = internal.getDrawableIDs() || [];

      if (dpi) {
        dIds.forEach((id: string, i: number) => {
          if (dpi[i] === pIndex) {
            visible ? this.hiddenDrawables.delete(id) : this.hiddenDrawables.add(id);
          }
        });
      } else {
        console.error("❌ Critical: Could not find drawablePartIndices. Individual mesh sync failed.");
      }
    }
  }

  public setDrawableVisibility(id: string, visible: boolean) {
    if (visible) {
      this.hiddenDrawables.delete(id);
    } else {
      this.hiddenDrawables.add(id);
    }
  }

  public setupHitTest() {
    if (!this.model) return;

    this.model.interactive = true;
    this.model.on("pointerdown", (event: any) => {
      const globalPoint = event.data.global;
      const children = this.model!.children;
      let hitId: string | null = null;

      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i] as any;
        if (child.visible && child.renderable && child.containsPoint(globalPoint)) {
          hitId = child.name;
          break;
        }
      }

      if (hitId) {
        const parentPart = this.drawableToPartMap.get(hitId) || "No Part";
        console.log(`🎯 HIT: Mesh [${hitId}] | Folder [${parentPart}]`);
        this.startHighlightLoop(hitId);
        setTimeout(() => this.stopHighlightLoop(), 2000);
      } else {
        console.log("Missed! Try clicking exactly on a line or color.");
      }
    });
  }

  public async runVisualProbe() {
    const ids = Array.from(this.drawableIndexMap.keys());
    console.log(`🚀 Starting Fast Scan of ${ids.length} drawables...`);

    for (let i = 20; i < ids.length; i++) {
      const id = ids[i];
      if (i % 10 === 0) console.log(`Scanning index: ${i}...`);
      
      this.startHighlightLoop(id);
      await new Promise((r) => setTimeout(r, 200));
      this.stopHighlightLoop();
    }
  }

  public resizeRendererToCanvas = () => {
    const res = this.deviceResolution;
    const cssW = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const cssH = Math.max(1, this.canvas.clientHeight || window.innerHeight);

    this.app.view.style.width = `${cssW}px`;
    this.app.view.style.height = `${cssH}px`;
    this.app.renderer.resize(cssW, cssH);
    (this.app.renderer as any).autoDensity = true;

    if (this.app.renderer.plugins && this.app.renderer.plugins.interaction) {
      this.app.renderer.plugins.interaction.resolution = res;
    }
  };

  private onWindowResize = () => {
    const newRes = Math.max(1, window.devicePixelRatio || 1);
    if (newRes !== this.deviceResolution) {
      this.deviceResolution = newRes;
      this.app.renderer.resolution = newRes;
    }
    this.resizeRendererToCanvas();
    this.syncModelTransform();
    this.app.render();
  };

  public syncModelTransform() {
    if (!this.model) return;
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;
    const displayScale = 1 / this.camZoom;

    this.model.x = centerX - this.camX * displayScale;
    this.model.y = centerY + this.camY * displayScale;
    this.model.scale.set(displayScale);
  }

  public setParameter(id: string, value: number) {
    this.parameterOverrides[id] = value;
  }

  public playAnimation(name: string, index: number = 0) {
    if (!this.model) return;
    this.model.motion(name, index, MotionPriority.FORCE);
  }

  public setExpression(id: string) {
    if (!this.model) return;
    this.model.expression(id);
  }

  public startHighlightLoop(id: string) {
    this.highlightId = id;
  }

  public stopHighlightLoop() {
    if (this.model && this.highlightId) {
      const index = this.drawableIndexMap.get(this.highlightId);
      const core = this.model.internalModel.coreModel as any;
      if (index !== undefined && index !== -1 && core.setDrawableMultiplyColor) {
        core.setDrawableMultiplyColor(index, 1, 1, 1, 1);
      }
    }
    this.highlightId = null;
  }

  private getRainbowRGB(hue: number): { r: number; g: number; b: number } {
    const h = hue / 60;
    const c = 1;
    const x = c * (1 - Math.abs((h % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (h < 1) [r, g, b] = [c, x, 0];
    else if (h < 2) [r, g, b] = [x, c, 0];
    else if (h < 3) [r, g, b] = [0, c, x];
    else if (h < 4) [r, g, b] = [0, x, c];
    else if (h < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return { r, g, b };
  }

  public destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.app.ticker.remove(this.updateLoop);
    window.removeEventListener("resize", this.onWindowResize);
    if (this.model) {
      try {
        this.app.stage.removeChild(this.model);
        this.model.destroy({ children: true, texture: true, baseTexture: true });
      } catch (err) {}
    }
    if (this.cameraManager) {
      try {
        this.cameraManager.dispose();
      } catch (e) {}
    }
    this.model = null;
    this.hiddenDrawables.clear();
    this.drawableIndexMap.clear();
    this.drawableToPartMap.clear();
    this.parameterOverrides = {};
  }
}