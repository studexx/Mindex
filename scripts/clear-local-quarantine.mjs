import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const appPath = process.argv[2] || join(process.cwd(), "dist", "mac-arm64", "Mindex.app");

if (process.platform !== "darwin") {
  console.log("Skipping quarantine cleanup outside macOS.");
  process.exit(0);
}

if (!existsSync(appPath)) {
  console.error(`Local app bundle was not found: ${appPath}`);
  process.exit(1);
}

const result = spawnSync("/usr/bin/xattr", ["-dr", "com.apple.quarantine", appPath], {
  encoding: "utf8",
});

if (result.error) {
  console.error(`Could not run xattr: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  const message = `${result.stderr || result.stdout || ""}`.trim();
  if (message && !/No such xattr/i.test(message)) {
    console.error(message);
    process.exit(result.status || 1);
  }
}

console.log(`Cleared macOS quarantine metadata for local test app: ${appPath}`);
