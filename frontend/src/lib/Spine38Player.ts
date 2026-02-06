import type { CharacterSessionState } from "../stores/appStore";
import { CameraManager } from "./CameraManager";
import { triggerSpineRefresh } from "../stores/appStore";

export class Spine38Player {

  private assetManager: any;
  public skeleton: any;
  public state: any;
  private requestId: number = 0;
  private lastFrameTime = performance.now();
  private isDestroyed = false;
  public isPMA = false;

  private shader: any;
  private batcher: any;
  private skeletonRenderer: any;
  private mvp: any;
  public cameraManager: CameraManager;
  private savedSettings: CharacterSessionState | null = null;
  gl: WebGLRenderingContext | WebGL2RenderingContext;

  private highlightSlotName: string | null = null;
  private highlightHue: number = 0;
  private hiddenSlots = new Set<string>();
  public onReady?: () => void;

  constructor(
    private spine: any,
    private canvas: HTMLCanvasElement,
    private onCameraChange?: () => void,
  ) {
    const contextOptions = {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: true,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
    };

    const gl = (this.canvas.getContext("webgl", contextOptions) ||
      this.canvas.getContext(
        "experimental-webgl",
        contextOptions,
      )) as WebGLRenderingContext;

    if (!gl) {
      throw new Error(
        "Could not create WebGL context. Spine 3.8 requires WebGL support.",
      );
    }

    this.gl = gl;
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);

    this.assetManager = new spine.webgl.AssetManager(this.gl);
    this.mvp = new spine.webgl.Matrix4();
    this.shader = spine.webgl.Shader.newTwoColoredTextured(this.gl);
    this.batcher = new spine.webgl.PolygonBatcher(this.gl);
    this.skeletonRenderer = new spine.webgl.SkeletonRenderer(this.gl);

    this.cameraManager = new CameraManager(canvas);
    this.cameraManager.setupInteractions(() => {
      this.updateCamera();
      if (this.onCameraChange) this.onCameraChange();
    });
  }

  // async load(asset: any, settings?: CharacterSessionState) {
  // 
  //   this.savedSettings = settings || null;
  //   const atlasUrl = asset.atlasFile.url;
  //   const skelUrl = asset.skelFile.url;

  //   const decodedAtlasUrl = decodeURIComponent(atlasUrl);
  // 
  //   const directoryPath = decodedAtlasUrl.substring(
  //     0,
  //     decodedAtlasUrl.lastIndexOf("/") + 1,
  //   );

  //   this.assetManager.pathPrefix = "";
  // 
  //   if (asset.isBinary) this.assetManager.loadBinary(skelUrl);
  //   else this.assetManager.loadText(skelUrl);
  //   this.assetManager.loadText(atlasUrl);

  //   const checkMetadata = () => {
  // 
  //     if (this.isDestroyed) return;

  //     if (this.assetManager.isLoadingComplete()) {
  //       const atlasText = this.assetManager.get(atlasUrl);
  //       const skelRawData = this.assetManager.get(skelUrl);
  // 
  //       if (this.savedSettings && this.savedSettings.pma !== undefined) {
  //         this.isPMA = this.savedSettings.pma;
  //       } else {
  //         // Fallback to auto-detection only if no settings exist
  //         this.isPMA =
  //           atlasText.includes("pma:true") || atlasText.includes("pma: true");
  //       }
  // 
  //       const lines = atlasText.split(/\r\n|\r|\n/);
  //       let pngsToLoad = 0;
  // 
  //       for (let line of lines) {
  //         line = line.trim();
  //         if (line.toLowerCase().endsWith(".png")) {
  //           this.assetManager.loadTexture(directoryPath + line);
  //           pngsToLoad++;
  //         }
  //       }
  // 
  //       if (pngsToLoad === 0) {
  //         this.assetManager.loadTexture(atlasUrl.replace(".atlas", ".png"));
  //       }
  // 
  //       this.waitForTextures(asset, atlasText, skelRawData);
  //     } else {
  //       this.requestId = requestAnimationFrame(checkMetadata);
  //     }
  //   };
  //   checkMetadata();
  // }

  load(asset: any, settings?: CharacterSessionState) {

    this.savedSettings = settings || null;
    const atlasUrl = asset.atlasFile.url;
    const skelUrl = asset.skelFile.url;

    const decodedAtlasUrl = decodeURIComponent(atlasUrl);
    const directoryPath = decodedAtlasUrl.substring(
      0,
      decodedAtlasUrl.lastIndexOf("/") + 1,
    );

    this.assetManager.pathPrefix = "";

    if (asset.isBinary) this.assetManager.loadBinary(skelUrl);
    else this.assetManager.loadText(skelUrl);

    this.assetManager.loadText(atlasUrl);

    return new Promise<void>((resolve) => {
      this.onReady = () => resolve();

      const checkMetadata = () => {
        if (this.isDestroyed) return;
        if (this.assetManager.isLoadingComplete()) {
          const atlasText = this.assetManager.get(atlasUrl);
          const skelRawData = this.assetManager.get(skelUrl);

          if (this.savedSettings && this.savedSettings.pma !== undefined) {
            this.isPMA = this.savedSettings.pma;
          } else {
            this.isPMA =
              atlasText.includes("pma:true") || atlasText.includes("pma: true");
          }

          const lines = atlasText.split(/\r\n|\r|\n/);
          let pngsToLoad = 0;

          for (let line of lines) {
            line = line.trim();
            if (line.toLowerCase().endsWith(".png")) {
              this.assetManager.loadTexture(directoryPath + line);
              pngsToLoad++;
            }
          }

          if (pngsToLoad === 0) {
            this.assetManager.loadTexture(atlasUrl.replace(".atlas", ".png"));
          }

          this.waitForTextures(asset, atlasText, skelRawData);
        } else {
          this.requestId = requestAnimationFrame(checkMetadata);
        }
      };
      checkMetadata();
    });
  }

  private async waitForTextures(
    asset: any,
    atlasText: string,
    skelRawData: any,
  ) {
    const atlasUrl = asset.atlasFile.url;
    const decodedAtlasUrl = decodeURIComponent(atlasUrl);
    const directoryPath = decodedAtlasUrl.substring(
      0,
      decodedAtlasUrl.lastIndexOf("/") + 1,
    );

    const lines = atlasText.split(/\r\n|\r|\n/);
    const texturesToWait: string[] = [];
    for (let line of lines) {
      line = line.trim();
      if (line.toLowerCase().endsWith(".png")) {
        texturesToWait.push(directoryPath + line);
      }
    }

    const checkImagesReady = () => {
      if (this.isDestroyed) return;

      let allReady = true;
      for (const path of texturesToWait) {
        const tex = this.assetManager.get(path);
        if (!tex) {
          allReady = false;
          break;
        }

        const img = tex.getImage();
        if (!img || img.naturalWidth === 0) {
          allReady = false;
          break;
        }
      }

      if (allReady && this.assetManager.isLoadingComplete()) {
        this.setup(asset, atlasText, skelRawData);
      } else {
        this.requestId = requestAnimationFrame(checkImagesReady);
      }
    };

    checkImagesReady();
  }

  private setup(asset: any, atlasText: string, skelRawData: any) {

    try {
      const sizeMatch = atlasText.match(/size:\s*(\d+),\s*(\d+)/);
      const atlasExpectedWidth = sizeMatch ? parseInt(sizeMatch[1]) : 0;
      const atlasExpectedHeight = sizeMatch ? parseInt(sizeMatch[2]) : 0;

      console.log(
        `[Atlas Parser] Expected: ${atlasExpectedWidth}x${atlasExpectedHeight}`,
      );

      const atlas = new this.spine.TextureAtlas(atlasText, (path: string) => {
        let tex = this.assetManager.get(path);

        if (!tex) {
          const assets = this.assetManager.assets;
          const fileName = path.split("/").pop()?.toLowerCase();
          const key = Object.keys(assets).find((k: string) =>
            k.toLowerCase().endsWith(fileName || ""),
          );
          if (key) tex = assets[key];
        }

        if (tex) {
          const gl = this.gl;
          const img = tex.getImage();

          tex.width = img.naturalWidth || img.width;
          tex.height = img.naturalHeight || img.height;

          gl.bindTexture(gl.TEXTURE_2D, tex.texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

          tex.setFilters(
            this.spine.TextureFilter.Linear,
            this.spine.TextureFilter.Linear,
          );
        }
        return tex;
      });

      atlas.pages.forEach((page: any) => {
        let texture = page.rendererObject;

        if (!texture) {
          const assets = this.assetManager.assets;
          const pageName = page.name.split("/").pop()?.toLowerCase();
          const key = Object.keys(assets).find((k: string) =>
            k.toLowerCase().endsWith(pageName || ""),
          );

          if (key) {
            texture = assets[key];
            page.rendererObject = texture;
            page.texture = texture;
          }
        }

        if (texture) {
          const img = texture.getImage ? texture.getImage() : texture.image;

          if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
            const realWidth = img.naturalWidth;
            const realHeight = img.naturalHeight;

            if (page.width !== realWidth || page.height !== realHeight) {
              console.log(
                `[Spine Fix] Recalculating UVs: ${page.width}x${page.height} -> ${realWidth}x${realHeight}`,
              );

              page.width = realWidth;
              page.height = realHeight;

              if (page.regions) {
                for (const region of page.regions) {
                  region.u = region.x / realWidth;
                  region.v = region.y / realHeight;

                  if (region.rotate) {
                    region.u2 = (region.x + region.height) / realWidth;
                    region.v2 = (region.y + region.width) / realHeight;
                  } else {
                    region.u2 = (region.x + region.width) / realWidth;
                    region.v2 = (region.y + region.height) / realHeight;
                  }
                }
              }
            }
          }
        }
      });

      const atlasLoader = new this.spine.AtlasAttachmentLoader(atlas);

      const originalFindRegion = atlas.findRegion.bind(atlas);
      atlas.findRegion = (name: string) => {
        let region = originalFindRegion(name);
        if (!region && name) region = originalFindRegion(name.trim());
        return region;
      };

      let skeletonData;
      let isActuallyJson = false;
      if (skelRawData instanceof ArrayBuffer) {
        const uint8 = new Uint8Array(skelRawData);
        if (uint8[0] === 123) isActuallyJson = true;
      } else if (typeof skelRawData === "string") {
        isActuallyJson = true;
      }

      if (asset.isBinary && !isActuallyJson) {

        const binary = new this.spine.SkeletonBinary(atlasLoader);
        skeletonData = binary.readSkeletonData(new Uint8Array(skelRawData));

      } else {

        const jsonParser = new this.spine.SkeletonJson(atlasLoader);

        let jsonText =
          skelRawData instanceof ArrayBuffer
            ? new TextDecoder().decode(skelRawData)
            : skelRawData;

        try {
          const jsonObj = JSON.parse(jsonText);

          if (jsonObj.skeleton) {

            if (
              jsonObj.skeleton.spine &&
              jsonObj.skeleton.spine.startsWith("3.7")
            ) {
              console.log(
                `[Spine Player] Patching version ${jsonObj.skeleton.spine} -> 3.8.99`,
              );
              jsonObj.skeleton.spine = "3.8.99";
            }

            if (jsonObj.skeleton.images) {
              console.log(
                `[Spine Player] Stripping image path: "${jsonObj.skeleton.images}" -> ""`,
              );
              jsonObj.skeleton.images = "";
            }
          }

          skeletonData = jsonParser.readSkeletonData(jsonObj);
        } catch (e) {
          console.warn(
            "[Spine Player] JSON Patching failed, falling back to standard string load:",
            e,
          );
          skeletonData = jsonParser.readSkeletonData(jsonText);
        }
      }

      this.skeleton = new this.spine.Skeleton(skeletonData);
      this.state = new this.spine.AnimationState(
        new this.spine.AnimationStateData(skeletonData),
      );

      this.skeleton.setToSetupPose();

      if (
        this.savedSettings &&
        (this.savedSettings.camX !== 0 || this.savedSettings.zoom !== 1)
      ) {
        this.cameraManager.x = this.savedSettings.camX;
        this.cameraManager.y = this.savedSettings.camY;
        this.cameraManager.zoom = this.savedSettings.zoom;
      } else {
        this.centerSkeleton();
      }

      if (this.onReady) this.onReady();
      triggerSpineRefresh();
      this.updateCamera();
      this.render();
    } catch (err) {
      console.error("[Spine 3.8] Critical Setup Error:", err);
    }
  }

  private forceNonPowerOfTwo(
    img: HTMLImageElement,
  ): HTMLCanvasElement | HTMLImageElement {
    const isPotW = (img.naturalWidth & (img.naturalWidth - 1)) === 0;
    const isPotH = (img.naturalHeight & (img.naturalHeight - 1)) === 0;

    if (isPotW && isPotH && img.naturalWidth >= 2048) {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight - 1;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas;
      }
    }
    return img;
  }

  public getAllSlotsAt(canvasX: number, canvasY: number): any[] {
    if (!this.skeleton || !this.mvp) return [];

    const rect = this.canvas.getBoundingClientRect();
    const x = ((canvasX - rect.left) / rect.width) * 2 - 1;
    const y = (1 - (canvasY - rect.top) / rect.height) * 2 - 1;

    const invMVP = new this.spine.webgl.Matrix4();
    invMVP.set(this.mvp.values);
    invMVP.invert();

    const worldX =
      x * invMVP.values[0] + y * invMVP.values[4] + invMVP.values[12];
    const worldY =
      x * invMVP.values[1] + y * invMVP.values[5] + invMVP.values[13];

    const hits: any[] = [];
    const drawOrder = this.skeleton.drawOrder;

    for (let i = drawOrder.length - 1; i >= 0; i--) {
      const slot = drawOrder[i];
      const attachment = slot.getAttachment();
      if (!attachment || slot.color.a === 0) continue;

      let worldVertices: Float32Array;

      if (attachment instanceof this.spine.RegionAttachment) {
        worldVertices = new Float32Array(8);
        attachment.computeWorldVertices(slot.bone, worldVertices, 0, 2);
      } else if (attachment instanceof this.spine.MeshAttachment) {
        worldVertices = new Float32Array(attachment.worldVerticesLength);
        attachment.computeWorldVertices(
          slot,
          0,
          attachment.worldVerticesLength,
          worldVertices,
          0,
          2,
        );
      } else {
        continue;
      }

      if (this.isPointInPoly(worldX, worldY, worldVertices)) {
        hits.push(slot);
      }
    }
    return hits;
  }

  private isPointInPoly(px: number, py: number, verts: Float32Array): boolean {

    let hit = false;

    for (let i = 0, j = verts.length - 2; i < verts.length; i += 2) {
      if (
        verts[i + 1] > py !== verts[j + 1] > py &&
        px <
          ((verts[j] - verts[i]) * (py - verts[i + 1])) /
            (verts[j + 1] - verts[i + 1]) +
            verts[i]
      ) {
        hit = !hit;
      }
      j = i;
    }
    return hit;
  }

  public getSlotAt(canvasX: number, canvasY: number): any | null {
    const hits = this.getAllSlotsAt(canvasX, canvasY);
    return hits.length > 0 ? hits[0] : null;
  }

  private updateCamera() {

    if (!this.skeleton) return;

    const Vector2 = this.spine.webgl?.Vector2 || this.spine.Vector2;
    const offset = new Vector2();
    const size = new Vector2();
    this.skeleton.getBounds(offset, size, []);

    if (this.cameraManager.x === 0 && this.cameraManager.y === 0) {
      this.cameraManager.x = offset.x + size.x / 2;
      this.cameraManager.y = offset.y + size.y / 2;
      const zoom =
        Math.max(
          size.x / (this.canvas.width || 1),
          size.y / (this.canvas.height || 1),
        ) * 1.2;
      this.cameraManager.zoom = isFinite(zoom) && zoom > 0 ? zoom : 1.0;
    }

    const canvasAR = this.canvas.width / this.canvas.height;
    const viewHeight = this.canvas.height * this.cameraManager.zoom;
    const viewWidth = viewHeight * canvasAR;

    this.mvp.ortho2d(
      this.cameraManager.x - viewWidth / 2,
      this.cameraManager.y - viewHeight / 2,
      viewWidth,
      viewHeight,
    );

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  public playAnimation(trackIndex: number, name: string, loop: boolean) {
    if (!this.state) return;
    try {
      this.state.setAnimation(trackIndex, name, loop);
    } catch (e) {
      console.error(`Animation ${name} not found in 3.8 skeleton`);
    }
  }

  public setSlotVisibility(slotName: string, visible: boolean) {

    if (visible) {
      this.hiddenSlots.delete(slotName);

      if (this.skeleton) {
        const slot = this.skeleton.findSlot(slotName);
        if (slot) slot.color.a = 1;
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

  private applyHighlightLoop() {
    if (!this.highlightSlotName || !this.skeleton) return;
    const slot = this.skeleton.findSlot(this.highlightSlotName);
    if (!slot) return;

    this.highlightHue = (this.highlightHue + 2) % 360;
    const { r, g, b } = this.hslToRgb(this.highlightHue / 360, 1, 0.5);
    slot.color.r = r;
    slot.color.g = g;
    slot.color.b = b;
    slot.color.a = 1;
  }

  private hslToRgb(h: number, s: number, l: number) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r, g, b };
  }

  private render = () => {
    if (this.isDestroyed || !this.state) return;

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

    if (this.state) {
      this.state.update(delta);
      this.state.apply(this.skeleton);
    }

    if (this.hiddenSlots.size > 0) {
      this.hiddenSlots.forEach((slotName) => {
        const slot = this.skeleton.findSlot(slotName);
        if (slot) {
          slot.color.a = 0;
        }
      });
    }

    this.applyHighlightLoop();

    this.skeleton.updateWorldTransform();

    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.enable(this.gl.BLEND);

    if (this.isPMA) {
      this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    } else {
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    //Draw
    this.shader.bind();
    this.shader.setUniformi(this.spine.webgl.Shader.SAMPLER, 0);
    this.shader.setUniform4x4f(
      this.spine.webgl.Shader.MVP_MATRIX,
      this.mvp.values,
    );

    this.batcher.begin(this.shader);
    this.skeletonRenderer.premultipliedAlpha = this.isPMA;
    this.skeletonRenderer.draw(this.batcher, this.skeleton);
    this.batcher.end();

    this.shader.unbind();

    this.requestId = requestAnimationFrame(this.render);
  };
  public centerSkeleton() {
    if (!this.skeleton) return;

    //Calculate bounds
    let offset = new this.spine.Vector2();
    let size = new this.spine.Vector2();
    this.skeleton.getBounds(offset, size, []);

    //Update Camera coordinates
    this.cameraManager.x = offset.x + size.x / 2;
    this.cameraManager.y = offset.y + size.y / 2;

    //Calculate zoom level
    const zoomX = size.x / this.canvas.width;
    const zoomY = size.y / this.canvas.height;
    this.cameraManager.zoom = Math.max(zoomX, zoomY) * 1.2;

    this.updateCamera();
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.requestId);
    
    if (this.shader) this.shader.dispose();
    if (this.batcher) this.batcher.dispose();
    if (this.assetManager) this.assetManager.dispose();
  }

}
