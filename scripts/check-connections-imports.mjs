/**
 * C6 static check: Google provider modules must only be imported from
 * connections/server, connections/providers, or connections/__tests__.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const PROVIDER_IMPORT =
  /@\/src\/features\/connections\/providers\/google|features\/connections\/providers\/google|\.\.\/providers\/google|\.\/providers\/google/;

const ALLOWED_PREFIXES = [
  path.join(SRC, "features", "connections", "server") + path.sep,
  path.join(SRC, "features", "connections", "providers") + path.sep,
  path.join(SRC, "features", "connections", "__tests__") + path.sep,
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name.name)) {
      out.push(full);
    }
  }
  return out;
}

function isAllowed(file) {
  const norm = path.normalize(file);
  return ALLOWED_PREFIXES.some((p) => norm.startsWith(p));
}

const offenders = [];
for (const file of walk(SRC)) {
  if (isAllowed(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (PROVIDER_IMPORT.test(text)) {
    offenders.push(path.relative(ROOT, file).replace(/\\/g, "/"));
  }
}

if (offenders.length) {
  console.error(
    "C6 import boundary: Google providers imported outside connections/{server,providers,__tests__}:\n" +
      offenders.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log("C6 import boundary: ok");
