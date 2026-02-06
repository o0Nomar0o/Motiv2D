export class CameraManager {
  public zoom: number = 1.0;
  public x: number = 0;
  public y: number = 0;
  public isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private onUpdateCallback?: () => void;

  constructor(private canvas: HTMLCanvasElement) {}

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.05 : 0.95;
    this.zoom *= delta;
    this.onUpdateCallback?.();
  };

  private handleMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const sensitivity = 1.25;
    const dx = (e.clientX - this.lastMouseX) * this.zoom * sensitivity;
    const dy = (e.clientY - this.lastMouseY) * this.zoom * sensitivity;

    this.x -= dx;
    this.y += dy;

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.onUpdateCallback?.();
  };

  private handleMouseUp = () => {
    this.isDragging = false;
  };

  public reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1.0;
  }

  public setupInteractions(onUpdate: () => void) {
    this.onUpdateCallback = onUpdate;

    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
  }

  public dispose() {
    console.log("[CameraManager] Hard-removing window listeners to kill context");

    this.canvas.removeEventListener("wheel", this.handleWheel);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);

    this.onUpdateCallback = undefined;
    (this as any).canvas = null; 
  }

  public setPosition(x: number, y: number, zoom: number) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }
}
