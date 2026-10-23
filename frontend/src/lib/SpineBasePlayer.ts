import { CameraManager } from "./CameraManager";
import type { CharacterSessionState } from "../stores/appStore";
import { triggerSpineRefresh } from "../stores/appStore";

export class SpineBasePlayer {
  protected assetManager: any;
  protected sceneRenderer: any;
  public skeleton: any;
  public state: any;
  protected requestId: number = 0;
  protected lastFrameTime = performance.now();
  protected isDestroyed = false;
  public isPMA = false;
  public cameraManager: CameraManager;
  protected savedSettings: CharacterSessionState | null = null;
  protected gl: WebGLRenderingContext | WebGL2RenderingContext;
  public onReady?: () => void;

  // Rotation states
  protected modelRotation: number = 0; // Root bone rotation
  protected vertexRotation: number = 0; // Vertex rotation
  protected rotationPivot = { x: 0, y: 0 }; // Pivot in skeleton
  protected pivotInitialized = false;

  protected highlightSlotName: string | null = null;
  protected highlightHue: number = 0;
  protected hiddenSlots = new Set<string>();

  constructor(
    protected spine: any,
    protected canvas: HTMLCanvasElement,
    protected onCameraChange?: () => void,
  ) {
    const managedGl = new spine.ManagedWebGLRenderingContext(canvas, {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });

    this.gl = managedGl.gl;
    this.assetManager = new spine.AssetManager(managedGl);
    this.sceneRenderer = new spine.SceneRenderer(canvas, managedGl);
    this.cameraManager = new CameraManager(canvas);

    this.cameraManager.setupInteractions(() => {
      this.updateCamera();
      if (this.onCameraChange) this.onCameraChange();
    });
  }

  load(asset: any, settings?: CharacterSessionState) {
    this.savedSettings = settings || null;
    const atlasUrl = decodeURIComponent(asset.atlasFile.url);
    const skelUrl = decodeURIComponent(asset.skelFile.url);
    if (this.assetManager.downloader) {
      this.assetManager.downloader.pathPrefix = "";
    }

    this.assetManager.loadText(atlasUrl);
    if (asset.isBinary) this.assetManager.loadBinary(skelUrl);
    else this.assetManager.loadJson(skelUrl);

    return new Promise<void>((resolve) => {
      this.onReady = () => resolve();

      const checkMetadata = () => {
        if (this.isDestroyed) return;
        if (this.assetManager.isLoadingComplete()) {
          const atlasText = this.assetManager.get(atlasUrl);
          this.isPMA =
            atlasText.includes("pma: true") || atlasText.includes("pma:true");

          this.assetManager.loadTextureAtlas(atlasUrl, (atlas: any) => {
            if (!atlas || !atlas.pages) return;
            for (const page of atlas.pages) {
              page.texture.setFilters(
                this.spine.TextureFilter.MipMapLinearLinear,
                this.spine.TextureFilter.Linear,
              );
            }
          });

          this.waitForTextures(asset, atlasUrl, skelUrl);
        } else {
          this.requestId = requestAnimationFrame(checkMetadata);
        }
      };
      checkMetadata();
    });
  }

  protected waitForTextures(asset: any, atlasKey: string, skelKey: string) {
    if (this.isDestroyed) return;
    if (this.assetManager.isLoadingComplete()) {
      this.setup(asset, atlasKey, skelKey);
    } else {
      this.requestId = requestAnimationFrame(() =>
        this.waitForTextures(asset, atlasKey, skelKey),
      );
    }
  }

  protected setup(asset: any, atlasKey: string, skelKey: string) {
    const atlas = this.assetManager.get(atlasKey);
    const data = this.assetManager.get(skelKey);
    const atlasLoader = new this.spine.AtlasAttachmentLoader(atlas);

    let skeletonData;
    if (asset.isBinary) {
      const binary = new this.spine.SkeletonBinary(atlasLoader);
      skeletonData = binary.readSkeletonData(data);
    } else {
      const json = new this.spine.SkeletonJson(atlasLoader);
      skeletonData = json.readSkeletonData(data);
    }

    this.skeleton = new this.spine.Skeleton(skeletonData);

    this.state = new this.spine.AnimationState(
      new this.spine.AnimationStateData(skeletonData),
    );

    if (
      this.savedSettings &&
      typeof (this.savedSettings as any).model_rotation === "number"
    ) {
      this.setRotation((this.savedSettings as any).model_rotation);
    }

    if (
      this.savedSettings &&
      typeof (this.savedSettings as any).camera_rotation === "number"
    ) {
      this.setCanvasRotation((this.savedSettings as any).camera_rotation);
    }

    this.skeleton.setToSetupPose();

    if (
      this.savedSettings &&
      (this.savedSettings.camX !== 0 || this.savedSettings.zoom !== 1)
    ) {
      this.cameraManager.x = this.savedSettings.camX;
      this.cameraManager.y = this.savedSettings.camY;
      this.cameraManager.zoom = this.savedSettings.zoom;
    }

    if (this.onReady) this.onReady();
    triggerSpineRefresh();
    this.updateCamera();
    this.render();
  }

  protected updateCamera() {
    if (!this.skeleton) return;

    if (this.cameraManager.x === 0 && this.cameraManager.y === 0) {
      const offset = new this.spine.Vector2();
      const size = new this.spine.Vector2();
      this.skeleton.getBounds(offset, size, []);
      this.cameraManager.x = offset.x + size.x / 2;
      this.cameraManager.y = offset.y + size.y / 2;
      this.cameraManager.zoom =
        Math.max(
          size.x / this.canvas.clientWidth,
          size.y / this.canvas.clientHeight,
        ) * 1.2;
    }

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const cam = this.sceneRenderer.camera;

    cam.position.x = this.cameraManager.x;
    cam.position.y = this.cameraManager.y;
    cam.zoom = this.cameraManager.zoom;
    cam.viewportWidth = this.canvas.width;
    cam.viewportHeight = this.canvas.height;

    cam.update();
  }

  public setZoom(zoom: number) {
    if (this.cameraManager) {
      this.cameraManager.zoom = zoom;
      this.updateCamera();
    }
  }

  /**
   * Root Bone Rotation
   */
  // public setRotation(degrees: number) {
  //   this.modelRotation = degrees;
  //   if (this.skeleton && this.skeleton.getRootBone()) {
  //     this.skeleton.getRootBone().rotation = degrees;
  //     this.updateSkeletonWorld(0);
  //   }
  // }

  public setRotation(degrees: number) {
    this.modelRotation = ((-degrees % 360) + 360) % 360;

    if (this.skeleton && this.skeleton.getRootBone()) {
      const angle =
        this.modelRotation > 180
          ? this.modelRotation - 360
          : this.modelRotation;

      this.skeleton.getRootBone().rotation = angle;
      this.updateSkeletonWorld(0);
    }
  }

  public setCanvasRotation(degrees: number) {
    this.vertexRotation = degrees;
    this.ensureRotationPivot();
    if (this.skeleton) this.updateSkeletonWorld(0);
  }

  /**
   * Piviot Point for vertex rotation.
   */
  protected ensureRotationPivot() {
    if (!this.skeleton || this.pivotInitialized) return;
    const offset = new this.spine.Vector2();
    const size = new this.spine.Vector2();
    try {
      this.skeleton.getBounds(offset, size, []);
    } catch {
      return;
    }
    const cx = offset.x + size.x / 2;
    const cy = offset.y + size.y / 2;
    if (!isNaN(cx) && !isNaN(cy)) {
      this.rotationPivot.x = cx;
      this.rotationPivot.y = cy;
      this.pivotInitialized = true;
    }
  }

  public setRotationPivot(x?: number, y?: number) {
    if (x === undefined || y === undefined) {
      this.pivotInitialized = false;
      this.ensureRotationPivot();
    } else {
      this.rotationPivot.x = x;
      this.rotationPivot.y = y;
      this.pivotInitialized = true;
    }
    if (this.skeleton) this.updateSkeletonWorld(0);
  }

  protected applyVertexRotation() {
    if (!this.skeleton) return;
    this.ensureRotationPivot();
    if (!this.pivotInitialized) return;

    const rad = (-this.vertexRotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const px = this.rotationPivot.x;
    const py = this.rotationPivot.y;

    const bones = this.skeleton.bones;

    for (let i = 0; i < bones.length; i++) {
      const b = bones[i];

      // Rotate the bone's world position around the pivot.
      const dx = b.worldX - px;
      const dy = b.worldY - py;

      const worldX = px + dx * cos - dy * sin;
      const worldY = py + dx * sin + dy * cos;

      // Rotate the world transform's basis vectors.
      const a = b.a;
      const bb = b.b;
      const c = b.c;
      const d = b.d;

      b.a = cos * a - sin * c;
      b.c = cos * c + sin * a;
      b.b = cos * bb - sin * d;
      b.d = cos * d + sin * bb;

      b.worldX = worldX;
      b.worldY = worldY;
    }
  }

  public getSlotAt(canvasX: number, canvasY: number): any | null {
    if (!this.skeleton || !this.sceneRenderer) return null;

    const cam = this.sceneRenderer.camera;
    const rect = this.canvas.getBoundingClientRect();

    const x = ((canvasX - rect.left) / rect.width) * 2 - 1;
    const y = (1 - (canvasY - rect.top) / rect.height) * 2 - 1;

    const invPV =
      cam.inverseProjectionView.val || cam.inverseProjectionView.values;
    if (!invPV) return null;

    const worldX = x * invPV[0] + y * invPV[4] + invPV[12];
    const worldY = x * invPV[1] + y * invPV[5] + invPV[13];

    const drawOrder = this.skeleton.drawOrder;

    for (let i = drawOrder.length - 1; i >= 0; i--) {
      const slot = drawOrder[i];
      if (!slot.bone.active || slot.color.a === 0) continue;

      const attachment = slot.getAttachment();
      if (!attachment) continue;

      const worldVerticesLength = (attachment as any).worldVerticesLength ?? 8;
      const worldVertices = new Float32Array(worldVerticesLength);

      if (attachment instanceof this.spine.RegionAttachment) {
        attachment.computeWorldVertices(slot, worldVertices, 0, 2);
      } else if (attachment instanceof this.spine.MeshAttachment) {
        attachment.computeWorldVertices(
          slot,
          0,
          worldVerticesLength,
          worldVertices,
          0,
          2,
        );
      } else {
        continue;
      }

      if (this.isPointInPoly(worldX, worldY, worldVertices)) {
        return slot;
      }
    }

    return null;
  }

  protected isPointInPoly(x: number, y: number, vert: Float32Array): boolean {
    let inside = false;
    for (let i = 0, j = vert.length - 2; i < vert.length; i += 2) {
      const xi = vert[i],
        yi = vert[i + 1];
      const xj = vert[j],
        yj = vert[j + 1];

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
      j = i;
    }
    return inside;
  }

  protected render = () => {
    if (this.isDestroyed || !this.skeleton) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const physicalWidth = Math.floor(
      this.canvas.clientWidth * devicePixelRatio,
    );
    const physicalHeight = Math.floor(
      this.canvas.clientHeight * devicePixelRatio,
    );

    if (
      this.canvas.width !== physicalWidth ||
      this.canvas.height !== physicalHeight
    ) {
      this.canvas.width = physicalWidth;
      this.canvas.height = physicalHeight;
    }

    this.updateCamera();

    const now = performance.now();
    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    this.state.update(delta);
    this.state.apply(this.skeleton);

    if (this.modelRotation !== 0 && this.skeleton.getRootBone()) {
      this.skeleton.getRootBone().rotation = this.modelRotation;
    }

    this.hiddenSlots.forEach((slotName) => {
      const slot = this.skeleton.findSlot(slotName);
      if (slot) {
        slot.color.a = 0;
        slot.color.r = 0;
        slot.color.g = 0;
        slot.color.b = 0;
      }
    });

    this.applyHighlightLoop();

    this.updateSkeletonWorld(delta);

    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.sceneRenderer.begin();
    this.sceneRenderer.drawSkeleton(this.skeleton, this.isPMA);
    this.sceneRenderer.end();

    this.requestId = requestAnimationFrame(this.render);
  };

  protected updateSkeletonWorld(delta: number) {
    this.skeleton.updateWorldTransform();
    if (this.vertexRotation !== 0) {
      this.applyVertexRotation();
    }
  }

  protected applyHighlightLoop() {
    if (!this.highlightSlotName || !this.skeleton) return;
    const slot = this.skeleton.findSlot(this.highlightSlotName);
    if (!slot) return;
    this.highlightHue = (this.highlightHue + 2) % 360;
    const f = (n: number, k = (n + this.highlightHue / 60) % 6) =>
      1 - Math.max(Math.min(k, 4 - k, 1), 0);
    slot.color.r = f(5);
    slot.color.g = f(3);
    slot.color.b = f(1);
    slot.color.a = 1;
  }

  public setSlotVisibility(slotName: string, visible: boolean) {
    if (visible) {
      this.hiddenSlots.delete(slotName);
      if (this.skeleton) {
        const slot = this.skeleton.findSlot(slotName);
        if (slot) {
          slot.color.a = 1;
          slot.color.r = 1;
          slot.color.g = 1;
          slot.color.b = 1;
        }
      }
    } else {
      this.hiddenSlots.add(slotName);
    }
  }

  public startHighlightLoop(slotName: string) {
    this.highlightSlotName = slotName;
  }

  public stopHighlightLoop() {
    if (this.highlightSlotName) {
      const slot = this.skeleton.findSlot(this.highlightSlotName);
      if (slot) {
        slot.color.r = slot.color.g = slot.color.b = 1;
      }
    }
    this.highlightSlotName = null;
  }

  public playAnimation(trackIndex: number, name: string, loop: boolean) {
    try {
      if (!this.skeleton) return;
      this.skeleton.setSlotsToSetupPose();
      this.state.setAnimation(trackIndex, name, loop);
    } catch (e) {
      console.error(`Animation ${name} not found`);
    }
  }

  public centerSkeleton() {
    if (!this.skeleton) return;

    let offset = new this.spine.Vector2();
    let size = new this.spine.Vector2();
    this.skeleton.getBounds(offset, size, []);

    this.cameraManager.x = offset.x + size.x / 2;
    this.cameraManager.y = offset.y + size.y / 2;

    const zoomX = size.x / this.canvas.width;
    const zoomY = size.y / this.canvas.height;
    this.cameraManager.zoom = Math.max(zoomX, zoomY) * 1.2;

    this.updateCamera();
  }

  destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.requestId);
    if (this.cameraManager) this.cameraManager.dispose();
    if (this.sceneRenderer) this.sceneRenderer.dispose();
    if (this.assetManager) this.assetManager.dispose();
    this.gl = null as any;
    this.skeleton = null;
    this.state = null;
  }
}
