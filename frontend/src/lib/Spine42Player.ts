import { SpineBasePlayer } from "./SpineBasePlayer";

export class Spine42Player extends SpineBasePlayer {
  public physicsMode: "None" | "Update" | "Pose" | "Reset" = "Update";

  private getPhysicsMode(): number {
    const Physics = this.spine.Physics;
    switch (this.physicsMode) {
      case "None":
        return Physics.none;
      case "Reset":
        return Physics.reset;
      case "Pose":
        return Physics.pose;
      case "Update":
      default:
        return Physics.update;
    }
  }

  // protected override updateSkeletonWorld(delta: number) {
  //   if (this.skeleton) {
  //     this.skeleton.update(delta);
  //     this.skeleton.updateWorldTransform(this.getPhysicsMode());
  //   }
  // }

  protected override updateSkeletonWorld(delta: number) {
    if (!this.skeleton) return;

    if (this.vertexRotation !== 0) {
      this.skeleton.updateWorldTransform(this.getPhysicsMode());
      this.applyVertexRotation();
      return;
    }

    this.skeleton.update(delta);
    this.skeleton.updateWorldTransform(this.getPhysicsMode());
  }
}