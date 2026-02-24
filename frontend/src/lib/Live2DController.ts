import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display";
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

    private deviceResolution = 1;

    constructor(app: PIXI.Application, canvas: HTMLCanvasElement) {
        this.app = app;
        this.canvas = canvas;

        this.deviceResolution = Math.max(1, window.devicePixelRatio || 1);

        this.app.renderer.resolution = this.deviceResolution;
        (this.app.renderer as any).autoDensity = true;

        if (this.app.renderer.plugins && this.app.renderer.plugins.interaction) {
            this.app.renderer.plugins.interaction.resolution = this.deviceResolution;
        }

        this.resizeRendererToCanvas();

        window.addEventListener("resize", this.onWindowResize);

        this.cameraManager = new CameraManager(canvas);
        this.cameraManager.setupInteractions(() => this.syncModelTransform());

        this.app.ticker.add(this.updateLoop);
    }

    public setMoveSpeed(speed: number) {
        this.moveSpeed = Math.max(0, speed);
    }
    public setZoomSpeed(speed: number) {
        this.zoomSpeed = Math.max(0, speed);
    }
    public getMoveSpeed() {
        return this.moveSpeed;
    }
    public getZoomSpeed() {
        return this.zoomSpeed;
    }

    public async load(modelUrl: string, settings?: Live2DSessionState) {
        if (this.isDestroyed) return;

        if (this.model) {
            try {
                this.app.stage.removeChild(this.model);
                this.model.destroy({
                    children: true,
                    texture: true,
                    baseTexture: true,
                });
            } catch (err) {
                console.warn("Error while destroying previous model:", err);
            }
            this.model = null;
        }

        const finalUrl = decodeURIComponent(modelUrl);

        this.model = await Live2DModel.from(finalUrl, {
            autoInteract: false,
        });

        this.model.textures.forEach((t) => {
            const base = t.baseTexture;
            if (!base) return;
            try {
                base.mipmap = PIXI.MIPMAP_MODES.ON;
            } catch (e) {
                //Catch something
            }
            base.scaleMode = PIXI.SCALE_MODES.LINEAR; 
            if ((base as any).anisotropicLevel !== undefined) {
                try {
                    (base as any).anisotropicLevel = 4;
                } catch (e) { }
            }
            base.update();
        });

        this.app.stage.addChild(this.model);
        this.model.anchor.set(0.5, 0.5);

        if (settings) {
            this.cameraManager.x = settings.camX;
            this.cameraManager.y = settings.camY;
            this.cameraManager.zoom = settings.zoom;

            this.hiddenDrawables.clear();
            Object.entries(settings.drawableVisibility).forEach(([id, visible]) => {
                if (!visible) this.hiddenDrawables.add(id);
            });

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
        // this.camZoom += this.cameraManager.zoom - this.camZoom;
        if (this.camZoom !== this.cameraManager.zoom) {
            this.camZoom = this.cameraManager.zoom;
        }

        this.syncModelTransform();

        const internal = this.model.internalModel;
        const core = internal.coreModel as any;

        const drawableIds = internal.getDrawableIDs;

        for (let i = 0; i < drawableIds.length; i++) {
            const id = drawableIds[i];
            if (this.hiddenDrawables.has(id)) {
                if (core && core.setDrawableOpacity) {
                    core.setDrawableOpacity(i, 0);
                } else {
                    // fallback to what?
                }
            } else {
                if (core && core.setDrawableOpacity) {
                    core.setDrawableOpacity(i, 1);
                }
            }
        }

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
            const index = internal.getDrawableIndex(this.highlightId);
            if (index !== -1 && core.setDrawableMultiplyColor) {
                core.setDrawableMultiplyColor(index, r, g, b, 1);
            }
        }

        this.maybeAdjustTextureFiltering();
    };

    public setDrawableVisibility(id: string, visible: boolean) {
        if (visible) {
            this.hiddenDrawables.delete(id);
            const index = this.model?.internalModel.getDrawableIndex(id);
            if (index !== undefined && index !== -1) {
                const core = this.model!.internalModel.coreModel as any;
                if (core && core.setDrawableOpacity)
                    core.setDrawableOpacity(index, 1.0);
            }
        } else {
            this.hiddenDrawables.add(id);
        }
    }

    public setParameter(id: string, value: number) {
        this.parameterOverrides[id] = value;
    }

    public playAnimation(name: string, index: number = 0) {
        if (!this.model) return;
        this.model.motion(name, index);
    }

    public setExpression(id: string) {
        if (!this.model) return;
        this.model.expression(id);
    }

    public startHighlight(id: string) {
        this.highlightId = id;
    }

    public stopHighlight() {
        if (this.model && this.highlightId) {
            const index = this.model.internalModel.getDrawableIndex(this.highlightId);
            if (index !== -1) {
                const core = this.model.internalModel.coreModel as any;
                if (core && core.setDrawableMultiplyColor) {
                    core.setDrawableMultiplyColor(index, 1, 1, 1, 1);
                }
            }
        }
        this.highlightId = null;
    }

    public syncModelTransform() {
        if (!this.model) return;

        const resolution = this.app.renderer.resolution || 1;

        const centerX = this.app.renderer.width / resolution / 2;
        const centerY = this.app.renderer.height / resolution / 2;

        const displayScale = 1 / this.camZoom;

        this.model.x = centerX - this.camX * displayScale;
        this.model.y = centerY + this.camY * displayScale;

        this.model.scale.set(displayScale);
    }

    private getRainbowRGB(hue: number): { r: number; g: number; b: number } {
        const h = hue / 60;
        const c = 1;
        const x = c * (1 - Math.abs((h % 2) - 1));
        let r = 0,
            g = 0,
            b = 0;
        if (h < 1) [r, g, b] = [c, x, 0];
        else if (h < 2) [r, g, b] = [x, c, 0];
        else if (h < 3) [r, g, b] = [0, c, x];
        else if (h < 4) [r, g, b] = [0, x, c];
        else if (h < 5) [r, g, b] = [x, 0, c];
        else[r, g, b] = [c, 0, x];
        return { r, g, b };
    }

    private maybeAdjustTextureFiltering() {
        if (!this.model) return;

        const resolution = this.app.renderer.resolution || 1;
        const cssWidth = this.app.renderer.width / resolution;
        const cssHeight = this.app.renderer.height / resolution;

        const onScreenScale = 1 / this.camZoom;

        const smallThreshold = 0.6;

        const useNearest = Math.abs(onScreenScale) < smallThreshold;

        this.model.textures.forEach((t) => {
            const base = t.baseTexture;
            if (!base) return;
            if (useNearest) {
                try {
                    base.mipmap = PIXI.MIPMAP_MODES.OFF;
                } catch (e) { }
                base.scaleMode = PIXI.SCALE_MODES.NEAREST;
            } else {
                try {
                    base.mipmap = PIXI.MIPMAP_MODES.ON;
                } catch (e) { }
                base.scaleMode = PIXI.SCALE_MODES.LINEAR;
            }
            base.update();
        });
    }

    private resizeRendererToCanvas = () => {
        const res = this.deviceResolution;
        const cssW =
            this.canvas.clientWidth || this.canvas.width || window.innerWidth;
        const cssH =
            this.canvas.clientHeight || this.canvas.height || window.innerHeight;

        this.app.view.style.width = `${cssW}px`;
        this.app.view.style.height = `${cssH}px`;

        this.app.renderer.resize(
            Math.max(1, Math.floor(cssW * res)),
            Math.max(1, Math.floor(cssH * res)),
        );

        if (this.app.renderer.plugins && this.app.renderer.plugins.interaction) {
            this.app.renderer.plugins.interaction.resolution = res;
        }
    };

    private onWindowResize = () => {
        const newRes = Math.max(1, window.devicePixelRatio || 1);
        if (newRes !== this.deviceResolution) {
            this.deviceResolution = newRes;
            this.app.renderer.resolution = newRes;
            if (this.app.renderer.plugins && this.app.renderer.plugins.interaction) {
                this.app.renderer.plugins.interaction.resolution = newRes;
            }
        }
        this.resizeRendererToCanvas();
        this.syncModelTransform();
    };

    public destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        this.app.ticker.remove(this.updateLoop);
        window.removeEventListener("resize", this.onWindowResize);

        if (this.model) {
            try {
                this.app.stage.removeChild(this.model);
                this.model.destroy({
                    children: true,
                    texture: true,
                    baseTexture: true,
                });
            } catch (err) {
                console.warn("Error destroying model during controller.destroy:", err);
            }
        }

        if (this.cameraManager) {
            try {
                this.cameraManager.dispose();
            } catch (e) { }
        }

        this.model = null;
        // this.app = null as any;
        // this.cameraManager = null as any;
        this.hiddenDrawables.clear();
        this.parameterOverrides = {};
    }
}
