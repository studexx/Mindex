import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = [
  "index.html",
  "app.js",
  "mindex.constants.js",
  "mindex.presenter.js",
  "styles.css",
  "styles.calendar.css",
  "styles.presenter-output.css",
  "favicon.ico",
  "manifest.webmanifest",
  "assets",
  "vendor",
  "electron",
  "package.json",
];
const largeFileThreshold = Number(process.env.MINDEX_PACKAGE_AUDIT_LARGE_MB || 25) * 1024 * 1024;

function walk(path, files = []) {
  let stats;
  try {
    stats = statSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return files;
    throw error;
  }
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) walk(join(path, entry), files);
  } else if (stats.isFile()) {
    files.push({ path, size: stats.size });
  }
  return files;
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const rootPath = process.cwd();
const files = roots.flatMap((entry) => walk(join(rootPath, entry)));
const total = files.reduce((sum, file) => sum + file.size, 0);
const byTopLevel = new Map();

for (const file of files) {
  const rel = relative(rootPath, file.path).split(/[\\/]+/).join("/");
  const topLevel = rel.split("/")[0] || rel;
  byTopLevel.set(topLevel, (byTopLevel.get(topLevel) || 0) + file.size);
}

console.log(`Electron package include audit: ${files.length} files, ${formatBytes(total)} total`);
console.log("Top-level package weight:");
for (const [name, size] of [...byTopLevel.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`- ${name}: ${formatBytes(size)}`);
}

const largeFiles = files
  .filter((file) => file.size >= largeFileThreshold)
  .sort((a, b) => b.size - a.size);

if (largeFiles.length) {
  console.log(`Large files >= ${formatBytes(largeFileThreshold)}:`);
  for (const file of largeFiles) {
    console.log(`- ${relative(rootPath, file.path).split(/[\\/]+/).join("/")}: ${formatBytes(file.size)}`);
  }
}
