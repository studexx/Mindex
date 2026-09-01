import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const distPath = join(process.cwd(), "dist");
const removableDirectoryNames = new Set([
  "mac",
  "mac-arm64",
  "win-unpacked",
]);

function shouldRemoveDirectory(name) {
  return removableDirectoryNames.has(name) || /-unpacked$/i.test(name);
}

let removed = 0;
let kept = 0;

try {
  for (const entry of readdirSync(distPath)) {
    const entryPath = join(distPath, entry);
    if (!statSync(entryPath).isDirectory()) {
      kept += 1;
      continue;
    }
    if (!shouldRemoveDirectory(entry)) {
      kept += 1;
      continue;
    }
    rmSync(entryPath, { force: true, recursive: true });
    removed += 1;
    console.log(`Removed intermediate Electron output: ${entryPath}`);
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log(`Electron dist prune complete. removed=${removed} kept=${kept}`);
