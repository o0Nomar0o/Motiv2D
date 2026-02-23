// import * as PIXI from "pixi.js";
// import { Live2DModel } from "pixi-live2d-display/cubism4";
// import { CameraManager } from "./CameraManager";
// import {
//   triggerLive2DRefresh,
//   type Live2DSessionState,
// } from "../stores/appStore";

// export class Live2DController {
//   public model: Live2DModel | null = null;
//   public cameraManager: CameraManager;
//   private app: PIXI.Application;

//   private highlightId: string | null = null;
//   private highlightHue: number = 0;
//   private hiddenDrawables = new Set<string>();

//   constructor(app: PIXI.Application, canvas: HTMLCanvasElement) {
//     this.app = app;
//     this.cameraManager = new CameraManager(canvas);

//     this.cameraManager.setupInteractions(() => {
//       this.syncModelTransform();
//     });

//     this.app.ticker.add(this.updateLoop);
//   }

//   public async load(modelUrl: string, settings?: Live2DSessionState) {
//     if (this.model) {
//       this.app.stage.removeChild(this.model);
//       this.model.destroy();
//     }

//     this.model = await Live2DModel.from(modelUrl, {
//       autoInteract: false,
//     });

//     this.app.stage.addChild(this.model);
//     this.model.anchor.set(0.5, 0.5);

//     if (settings) {
//       this.cameraManager.x = settings.camX;
//       this.cameraManager.y = settings.camY;
//       this.cameraManager.zoom = settings.zoom;
//       Object.entries(settings.drawableVisibility).forEach(([id, visible]) => {
//         if (!visible) this.hiddenDrawables.add(id);
//       });
//     }

//     this.syncModelTransform();
//     triggerLive2DRefresh();
//   }

//   private updateLoop = () => {
//     if (!this.model) return;

//     // 1. Visibility Sync
//     this.hiddenDrawables.forEach((id) => {
//       const index = this.model!.internalModel.getDrawableIndex(id);
//       if (index !== -1) {
//         (this.model!.internalModel.coreModel as any).setDrawableOpacity(index, 0);
//       }
//     });

//     // 2. Highlight Logic
//     if (this.highlightId) {
//       this.highlightHue = (this.highlightHue + 2) % 360;
//       const { r, g, b } = this.getRainbowRGB(this.highlightHue);
//       const index = this.model.internalModel.getDrawableIndex(this.highlightId);
//       if (index !== -1) {
//         (this.model.internalModel.coreModel as any).setDrawableMultiplyColor(index, r, g, b, 1);
//       }
//     }
//   };

//   private getRainbowRGB(hue: number): {r: number, g: number, b: number} {
//     const h = hue / 60;
//     const c = 1; 
//     const x = c * (1 - Math.abs((h % 2) - 1));
//     let r = 0, g = 0, b = 0;

//     if (h < 1) [r, g, b] = [c, x, 0];
//     else if (h < 2) [r, g, b] = [x, c, 0];
//     else if (h < 3) [r, g, b] = [0, c, x];
//     else if (h < 4) [r, g, b] = [0, x, c];
//     else if (h < 5) [r, g, b] = [x, 0, c];
//     else [r, g, b] = [c, 0, x];

//     return { r, g, b };
//   }

//   public syncModelTransform() {
//     if (!this.model) return;
//     this.model.x = this.cameraManager.x;
//     this.model.y = this.cameraManager.y;
//     this.model.scale.set(this.cameraManager.zoom);
//   }

//   public setPartVisibility(id: string, visible: boolean) {
//     if (visible) {
//       this.hiddenDrawables.delete(id);
//       const index = this.model?.internalModel.getDrawableIndex(id);
//       if (index !== undefined && index !== -1) {
//         // FIX: Set to 1.0 to show, not 0
//         (this.model!.internalModel.coreModel as any).setDrawableOpacity(index, 1.0);
//       }
//     } else {
//       this.hiddenDrawables.add(id);
//     }
//   }

//   public startHighlight(id: string) {
//     this.highlightId = id;
//   }

//   public stopHighlight() {
//     if (this.model && this.highlightId) {
//       const index = this.model.internalModel.getDrawableIndex(this.highlightId);
//       if (index !== -1) {
//         // FIX: Added 'as any' cast here
//         (this.model.internalModel.coreModel as any).setDrawableMultiplyColor(index, 1, 1, 1, 1);
//       }
//     }
//     this.highlightId = null;
//   }

//   public destroy() {
//     this.app.ticker.remove(this.updateLoop);
//     if (this.model) this.model.destroy();
//     this.cameraManager.dispose();
//   }
// }