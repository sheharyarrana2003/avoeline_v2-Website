/**
 * Allow importing `server-only` modules under node:test / smoke scripts.
 * Loaded via: node --import ./scripts/stub-server-only.mjs
 */
import Module from "node:module";

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.apply(this, arguments);
};
