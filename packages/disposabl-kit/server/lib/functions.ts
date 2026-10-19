import type { Platforms } from "./platforms";

/** Add API/MCP discovery metadata while preserving the native Convex function. */
export function withPlatforms<T extends object>(fn: T, platforms: Platforms) {
  return Object.assign(fn, { platforms });
}
