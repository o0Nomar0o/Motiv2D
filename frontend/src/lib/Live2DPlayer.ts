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

    // Hook parameter overrides right before Cubism updates its internal frame logic
    internal.on("beforeModelUpdate", () => {
      if (!this.model) return;
      const c = (this.model.internalModel as any).coreModel;
      if (!c) return;

      Object.entries(this.parameterOverrides).forEach(([id, value]) => {
        const pIndex = c.getParameterIndex ? c.getParameterIndex(id) : (c._parameterIds?.indexOf(id) ?? -1);
        if (pIndex !== -1 && c.setParameterValueByIndex) {
          c.setParameterValueByIndex(pIndex, value);
        } else if (c.setParameterValueById) {
          c.setParameterValueById(id, value);
        }
      });
    });

    const drawableIds = internal.getDrawableIDs ? internal.getDrawableIDs() : (internal._drawableIds || []);
    const partIds = core?.getPartIds ? core.getPartIds() : (core?._partIds || []);
    const drawablePartIndices = core?.getDrawablePartIndices 
      ? core.getDrawablePartIndices() 
      : (internal.drawablePartIndices || core?._drawablePartIndices || []);

    drawableIds.forEach((id: string, index: number) => {
      this.drawableIndexMap.set(id, index);

      const pIndex = drawablePartIndices[index];
      if (pIndex !== undefined && pIndex !== -1 && partIds[pIndex]) {
        this.drawableToPartMap.set(id, partIds[pIndex]);
      } else {
        this.drawableToPartMap.set(id, "ORPHANS");
      }
    });

    this.app.stage.addChild(this.model);
    this.model.anchor.set(0.5, 0.5);

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

    this.camX = this.cameraManager.x;
    this.camY = this.cameraManager.y;
    this.camZoom = this.cameraManager.zoom;

    this.syncModelTransform();
    triggerLive2DRefresh();
  }

  private updateLoop = (delta: number) => {
    if (this.isDestroyed || !this.model) return;

    this.camX += this.cameraManager.x - this.camX;
    this.camY += this.cameraManager.y - this.camY;
    this.camZoom = this.cameraManager.zoom;
    this.syncModelTransform();

    const internal = this.model.internalModel as any;
    const core = internal.coreModel as any;

    if (internal.drawables) {
      this.drawableIndexMap.forEach((index, id) => {
        const mesh = internal.drawables[index];
        if (mesh) {
          mesh.visible = !this.hiddenDrawables.has(id);
        }
      });
    }

    if (this.highlightId) {
      this.highlightHue = (this.highlightHue + 2) % 360;
      const { r, g, b } = this.getRainbowRGB(this.highlightHue);
      const index = this.drawableIndexMap.get(this.highlightId);

      if (index !== undefined && index !== -1 && core.setDrawableMultiplyColor) {
        core.setDrawableMultiplyColor(index, r, g, b, 1.0);
      }
    }
  };

  public setPartVisibility(partId: string, visible: boolean) {
    if (!this.model) return;
    const internal = this.model.internalModel as any;
    const core = internal.coreModel;

    const partIds = core.getPartIds ? core.getPartIds() : (core._partIds || []);
    const pIndex = partIds.indexOf(partId);

    if (pIndex !== -1) {
      if (core.setPartOpacityByIndex) {
        core.setPartOpacityByIndex(pIndex, visible ? 1 : 0);
      } else if (core._partOpacities) {
        core._partOpacities[pIndex] = visible ? 1 : 0;
      }

      const dpi = core.getDrawablePartIndices 
        ? core.getDrawablePartIndices() 
        : (internal.drawablePartIndices || core._drawablePartIndices);

      const dIds = internal.getDrawableIDs ? internal.getDrawableIDs() : (internal._drawableIds || []);

      if (dpi) {
        dIds.forEach((id: string, i: number) => {
          if (dpi[i] === pIndex) {
            visible ? this.hiddenDrawables.delete(id) : this.hiddenDrawables.add(id);
          }
        });
      }
    }
  }

  //TO-DO
  public setZoom(zoom: number) {
    if (this.cameraManager) {
      this.cameraManager.zoom = zoom;
      // this.updateCamera();
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
      if (!this.model) return;

      const globalPoint = event.data.global;
      const internal = this.model.internalModel as any;
      const drawables = internal.drawables;

      if (!drawables || drawables.length === 0) return;

      let hitId: string | null = null;
      const drawableIds = internal.getDrawableIDs ? internal.getDrawableIDs() : Array.from(this.drawableIndexMap.keys());

      // Iterate backwards through drawables to respect draw order (front-to-back)
      for (let i = drawables.length - 1; i >= 0; i--) {
        const mesh = drawables[i];
        const id = drawableIds[i];

        // Skip hidden or non-renderable meshes
        if (!mesh || !mesh.visible || !mesh.renderable || this.hiddenDrawables.has(id)) {
          continue;
        }

        // Test if global mouse click falls within this specific mesh's global bounds
        const bounds = mesh.getBounds();
        if (bounds.contains(globalPoint.x, globalPoint.y)) {
          hitId = id;
          break; // Stop at topmost visible mesh
        }
      }

      if (hitId) {
        const parentPart = this.drawableToPartMap.get(hitId) || "No Part";
        console.log(`🎯 HIT: Mesh [${hitId}] | Folder [${parentPart}]`);
        this.startHighlightLoop(hitId);
        setTimeout(() => this.stopHighlightLoop(), 2000);
      } else {
        console.log("Missed! Try clicking directly on a visible mesh.");
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