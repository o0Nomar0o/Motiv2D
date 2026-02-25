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
    private app: PIXI.Application;
    private canvas: HTMLCanvasElement;
    private isDestroyed = false;

    private camX = 0;
    private camY = 0;
    private camZoom = 1;

    private moveSpeed = 1.0;
    private zoomSpeed = 1.0;

    private highlightId: string | null = null;
    private highlightHue: number = 0;
    private hiddenDrawables = new Set<string>();
    private parameterOverrides: Record<string, number> = {};

    private drawableIndexMap: Map<string, number> = new Map();
    private deviceResolution = 1;

    constructor(app: PIXI.Application, canvas: HTMLCanvasElement) {
        (Live2DModel as any).registerTicker(PIXI.Ticker);
        this.app = app;
        this.canvas = canvas;

        this.deviceResolution = Math.max(1, window.devicePixelRatio || 1);
        
        this.app.renderer.resolution = this.deviceResolution;
        (this.app.renderer as any).autoDensity = true;

        PIXI.settings.ROUND_PIXELS = true; 
        if ((PIXI.settings as any).PRECISION_FRAGMENT) {
            (PIXI.settings as any).PRECISION_FRAGMENT = 'highp';
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
        }

        const finalUrl = decodeURIComponent(modelUrl);

        this.model = await Live2DModel.from(finalUrl, { autoInteract: false });

        this.model.textures.forEach((t) => {
            const base = t.baseTexture;
            if (!base) return;
            base.mipmap = PIXI.MIPMAP_MODES.ON;
            base.scaleMode = PIXI.SCALE_MODES.LINEAR; 
            if ((base as any).anisotropicLevel!== undefined) {
                (base as any).anisotropicLevel = 16; 
            }
            base.update();
        });

        const internal = this.model.internalModel;
        const drawableIDs = internal.getDrawableIDs();
        drawableIDs.forEach((id) => {
            this.drawableIndexMap.set(id, internal.getDrawableIndex(id));
        });

        this.model.internalModel.on('beforeModelUpdate', () => {
            if (!this.model) return;
            const core = this.model.internalModel.coreModel as any;
            
            this.hiddenDrawables.forEach(id => {
                const index = this.drawableIndexMap.get(id);
                if (index!== undefined && index!== -1 && core.setDrawableOpacity) {
                    core.setDrawableOpacity(index, 0.0);
                }
            });
        });

        this.app.stage.addChild(this.model);
        this.model.anchor.set(0.5, 0.5);

        if (settings) {
            this.cameraManager.x = settings.camX;
            this.cameraManager.y = settings.camY;
            this.cameraManager.zoom = settings.zoom;
            this.hiddenDrawables = new Set(Object.entries(settings.drawableVisibility || {})
               .filter(([_, visible]) =>!visible)
               .map(([id]) => id));
            this.parameterOverrides = {...settings.parameters };
        }

        this.camX = this.cameraManager.x;
        this.camY = this.cameraManager.y;
        this.camZoom = this.cameraManager.zoom;

        this.syncModelTransform();
        triggerLive2DRefresh();
    }

    private updateLoop = (delta: number) => {
        if (this.isDestroyed ||!this.model) return;

        this.camX += (this.cameraManager.x - this.camX);
        this.camY += (this.cameraManager.y - this.camY);
        this.camZoom = this.cameraManager.zoom;

        this.syncModelTransform();

        const core = this.model.internalModel.coreModel as any;

        Object.entries(this.parameterOverrides).forEach(([id, value]) => {
            if (core.setParameterValueById) {
                core.setParameterValueById(id, value);
            } else if (core.setParamValue) {
                core.setParamValue(id, value);
            }
        });

        if (this.highlightId) {
            this.highlightHue = (this.highlightHue + 2) % 360;
            const { r, g, b } = this.getRainbowRGB(this.highlightHue);
            const index = this.drawableIndexMap.get(this.highlightId);
            if (index!== undefined && index!== -1 && core.setDrawableMultiplyColor) {
                core.setDrawableMultiplyColor(index, r, g, b, 1);
            }
        }
    };

    public setDrawableVisibility(id: string, visible: boolean) {
        if (visible) {
            this.hiddenDrawables.delete(id);
            const index = this.drawableIndexMap.get(id);
            const core = this.model?.internalModel.coreModel as any;
            if (index!== undefined && index!== -1 && core?.setDrawableOpacity) {
                core.setDrawableOpacity(index, 1.0);
            }
        } else {
            this.hiddenDrawables.add(id);
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
        if (newRes!== this.deviceResolution) {
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
            if (index!== undefined && index!== -1 && core.setDrawableMultiplyColor) {
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
            try { this.cameraManager.dispose(); } catch (e) {}
        }
        this.model = null;
        this.hiddenDrawables.clear();
        this.drawableIndexMap.clear();
        this.parameterOverrides = {};
    }
}