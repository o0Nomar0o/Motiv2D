import { EventsEmit } from "../../wailsjs/runtime/runtime";

let lastLoadedVersion: string | null = null;

export async function loadSpineRuntime(version: string) {
  if (version === lastLoadedVersion) {
    return null; 
  }

  //3.7, 4.2 to be supported in the future
  const supportedPrefixes = ["3.8", "4.0", "4.1"]; 
  const isSupported = supportedPrefixes.some(p => version.startsWith(p));

  if (!isSupported) {
    EventsEmit("link:log", {
      message: `Spine version not supported: ${version}`,
      level: "error",
    });
    return null;
  }

  try {
    let spine: any = null;

    if (version.startsWith("3.8")) {
      const module = await import("./spine38/build/spine-webgl.js");
      spine = module.spine || (window as any).spine;
      
      if (!spine) {
        throw new Error("Spine 3.8 object not found in module or window");
      }
    } 
    else if (version.startsWith("4.0")) {
      spine = await import("@esotericsoftware/spine-webgl-4.0");
    } 
    else if (version.startsWith("4.1")) {
      spine = await import("@esotericsoftware/spine-webgl");
    }

    if (spine) {
      lastLoadedVersion = version; 
      
      EventsEmit("link:log", {
        message: `Spine Runtime: ${version}`,
        level: "info",
      });
      
      return spine;
    }

  } catch (err: any) {
    console.error("Failed to load Spine runtime:", err);
    
    EventsEmit("link:log", {
      message: `CRITICAL: Failed to load Spine ${version}: ${err.message}`,
      level: "error",
    });
    
    return null;
  }
}