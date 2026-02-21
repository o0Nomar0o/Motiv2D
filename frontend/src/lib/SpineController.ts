import { EventsEmit } from "../../wailsjs/runtime/runtime";

export async function loadSpineRuntime(version: string) {
  
  const supportedPrefixes = ["3.8", "4.0", "4.1"];
  const isSupported = supportedPrefixes.some((p) => version.startsWith(p));

  if (!isSupported) {
    EventsEmit("link:log", {
      message: `Spine version not supported: ${version}`,
      level: "error",
    });
    return null;
  }

  try {
    // version.startsWith("3.7") || version.startsWith("3.6") to be added later
    if (version.startsWith("3.8")) {
      const module = await import("./spine38/build/spine-webgl.js");

      const spine = module.spine || (window as any).spine;

      if (!spine) {
        console.error("Spine 3.8 object not found in module or window");
        return null;
      }
      return spine;
    }

    if (version.startsWith("4.0")) {
      const spine = await import("@esotericsoftware/spine-webgl-4.0");
      return spine;
    }

    if (version.startsWith("4.1")) {
      const spine = await import("@esotericsoftware/spine-webgl");
      return spine;
    }

    if (version.startsWith("4.2")) {
      const spine = await import("@esotericsoftware/spine-webgl-4.2");
      return spine;
    }
  } catch (err) {
    console.error("Failed to load Spine runtime:", err);
    return null;
  }
}
