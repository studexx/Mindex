import { rmSync } from "node:fs";
import { join } from "node:path";

const distPath = join(process.cwd(), "dist");

rmSync(distPath, { force: true, recursive: true });
console.log(`Removed local Electron build output: ${distPath}`);
