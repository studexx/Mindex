const crypto = require("node:crypto");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const zlib = require("node:zlib");

const DEFAULT_CACHE_VERSION = "mindex-keynote-import-v1";
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const SUPPORTED_EXTENSIONS = new Set([".key", ".keynote", ".ppt", ".pptx"]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function assertSupportedInput(inputPath) {
  const extension = path.extname(inputPath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw Object.assign(new Error(`Unsupported deck file extension: ${extension || "(none)"}`), {
      code: "unsupported-deck-extension",
    });
  }
  return extension;
}

function fingerprintFromSource({ fileName, size, mtimeMs, cacheVersion = DEFAULT_CACHE_VERSION }) {
  return crypto
    .createHash("sha256")
    .update(String(cacheVersion))
    .update("\0")
    .update(String(fileName || ""))
    .update("\0")
    .update(String(size || 0))
    .update("\0")
    .update(String(Math.floor(Number(mtimeMs || 0) / 1000)))
    .digest("hex")
    .slice(0, 16);
}

function fileUrl(filePath) {
  const absolute = path.resolve(filePath);
  const normalized = absolute.split(path.sep).map(encodeURIComponent).join("/");
  return `file://${normalized.startsWith("/") ? "" : "/"}${normalized}`;
}

function manifestSlideUrl(stagePath, options = {}) {
  if (options.urlBase) return `${String(options.urlBase).replace(/\/$/, "")}/${path.basename(stagePath)}`;
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : null;
  if (repoRoot) {
    const relative = path.relative(repoRoot, stagePath);
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      return relative.split(path.sep).join("/");
    }
  }
  return fileUrl(stagePath);
}

function parsePngChunks(buffer) {
  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("Not a PNG file.");
  }
  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error("Invalid PNG chunk length.");
    chunks.push({ type, data: buffer.subarray(dataStart, dataEnd) });
    offset = dataEnd + 4;
    if (type === "IEND") break;
  }
  return chunks;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function bytesPerPixel(colorType) {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  return 0;
}

function unfilterPngRows(raw, width, height, bpp) {
  const rowBytes = width * bpp;
  const pixels = Buffer.alloc(rowBytes * height);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = raw[sourceOffset];
    sourceOffset += 1;
    const rowStart = row * rowBytes;
    const previousRowStart = rowStart - rowBytes;
    for (let col = 0; col < rowBytes; col += 1) {
      const x = raw[sourceOffset + col];
      const left = col >= bpp ? pixels[rowStart + col - bpp] : 0;
      const up = row > 0 ? pixels[previousRowStart + col] : 0;
      const upLeft = row > 0 && col >= bpp ? pixels[previousRowStart + col - bpp] : 0;
      let value = x;
      if (filter === 1) value = x + left;
      else if (filter === 2) value = x + up;
      else if (filter === 3) value = x + Math.floor((left + up) / 2);
      else if (filter === 4) value = x + paethPredictor(left, up, upLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter: ${filter}`);
      pixels[rowStart + col] = value & 0xff;
    }
    sourceOffset += rowBytes;
  }
  return pixels;
}

function samplePngPixels(pixels, width, height, bpp) {
  const maxSamples = 4096;
  const step = Math.max(1, Math.floor((width * height) / maxSamples));
  const channels = bpp >= 3 ? 3 : 1;
  const first = [];
  let samples = 0;
  let maxDelta = 0;
  for (let index = 0; index < width * height; index += step) {
    const offset = index * bpp;
    if (!first.length) {
      for (let channel = 0; channel < channels; channel += 1) first.push(pixels[offset + channel]);
    }
    for (let channel = 0; channel < channels; channel += 1) {
      maxDelta = Math.max(maxDelta, Math.abs(pixels[offset + channel] - first[channel]));
    }
    samples += 1;
  }
  return { samples, maxDelta };
}

async function analyzePngBlankLike(filePath) {
  try {
    const buffer = await fsp.readFile(filePath);
    const chunks = parsePngChunks(buffer);
    const ihdr = chunks.find((chunk) => chunk.type === "IHDR")?.data;
    if (!ihdr) return { blankLike: null, reason: "missing-ihdr" };
    const width = ihdr.readUInt32BE(0);
    const height = ihdr.readUInt32BE(4);
    const bitDepth = ihdr[8];
    const colorType = ihdr[9];
    const interlace = ihdr[12];
    const bpp = bytesPerPixel(colorType);
    if (!width || !height || bitDepth !== 8 || !bpp || interlace !== 0) {
      return { blankLike: null, reason: "unsupported-png-format" };
    }
    const compressed = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data));
    const raw = zlib.inflateSync(compressed);
    const expected = (width * bpp + 1) * height;
    if (raw.length < expected) return { blankLike: null, reason: "truncated-png-data" };
    const pixels = unfilterPngRows(raw, width, height, bpp);
    const sample = samplePngPixels(pixels, width, height, bpp);
    return { blankLike: sample.maxDelta <= 2, sample };
  } catch (error) {
    return { blankLike: null, reason: error?.message || "png-analysis-failed" };
  }
}

async function pathExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findPngFiles(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findPngFiles(entryPath));
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".png") files.push(entryPath);
  }
  return files;
}

function naturalPngSort(a, b) {
  const ax = path.basename(a).match(/\d+/g)?.map(Number) || [];
  const bx = path.basename(b).match(/\d+/g)?.map(Number) || [];
  for (let index = 0; index < Math.max(ax.length, bx.length); index += 1) {
    const diff = (ax[index] || 0) - (bx[index] || 0);
    if (diff) return diff;
  }
  return path.basename(a).localeCompare(path.basename(b), "en");
}

async function normalizeExportedPngs(rawDirectory, stageDirectory, options = {}) {
  const rawFiles = (await findPngFiles(rawDirectory)).sort(naturalPngSort);
  if (!rawFiles.length) {
    throw Object.assign(new Error("Keynote did not export any PNG slide stages."), {
      code: "empty-keynote-export",
    });
  }
  await fsp.mkdir(stageDirectory, { recursive: true });
  const slides = [];
  for (let index = 0; index < rawFiles.length; index += 1) {
    const order = index + 1;
    const stageName = `stage-${String(order).padStart(3, "0")}.png`;
    const stagePath = path.join(stageDirectory, stageName);
    if (path.resolve(rawFiles[index]) !== path.resolve(stagePath)) {
      await fsp.copyFile(rawFiles[index], stagePath);
    }
    const analysis = await analyzePngBlankLike(stagePath);
    slides.push({
      order,
      name: `Stage ${order}`,
      path: stageName,
      url: manifestSlideUrl(stagePath, options),
      blankLike: analysis.blankLike,
      analysis: analysis.reason ? { reason: analysis.reason } : { sample: analysis.sample },
    });
  }
  return slides;
}

function escapeAppleScriptString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function keynoteExportScript(inputPath, outputPath, timeoutMs) {
  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  return `
with timeout of ${timeoutSeconds} seconds
  tell application id "com.apple.Keynote"
    set sourceFile to POSIX file "${escapeAppleScriptString(inputPath)}"
    set exportFolder to POSIX file "${escapeAppleScriptString(outputPath)}"
    set deckDocument to open sourceFile
    try
      export deckDocument to exportFolder as slide images with properties {image format:PNG, all stages:true, skipped slides:false}
      close deckDocument saving no
    on error errorMessage number errorNumber
      try
        close deckDocument saving no
      end try
      error errorMessage number errorNumber
    end try
  end tell
end timeout
`;
}

function runOsascript(script, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn("osascript", ["-e", script], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(Object.assign(new Error("Keynote export timed out."), { code: "keynote-export-timeout" }));
    }, timeoutMs + 5000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else {
        const message = (stderr || stdout || `osascript exited with code ${code}`).trim();
        const reason = message.includes("-1743") ? "automation-permission-denied" : "keynote-export-failed";
        reject(Object.assign(new Error(message), { code: reason }));
      }
    });
  });
}

async function copySourceToTemp(inputPath, tempRoot) {
  const tempInput = path.join(tempRoot, path.basename(inputPath));
  const stat = await fsp.stat(inputPath);
  if (stat.isDirectory()) await fsp.cp(inputPath, tempInput, { recursive: true });
  else await fsp.copyFile(inputPath, tempInput);
  return tempInput;
}

async function readManifestIfReady(manifestPath) {
  if (!await pathExists(manifestPath)) return null;
  const manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.slides) || !manifest.slides.length) return null;
  for (const slide of manifest.slides) {
    if (!slide?.path) return null;
    if (!await pathExists(path.join(path.dirname(manifestPath), slide.path))) return null;
  }
  return manifest;
}

async function importKeynoteDeck(options = {}) {
  if (!isObject(options)) throw new Error("importKeynoteDeck options must be an object.");
  const inputPath = path.resolve(String(options.inputPath || options.input || ""));
  if (!inputPath) throw new Error("inputPath is required.");
  const extension = assertSupportedInput(inputPath);
  const sourceStat = await fsp.stat(inputPath);
  const cacheVersion = String(options.cacheVersion || DEFAULT_CACHE_VERSION);
  const fingerprint = fingerprintFromSource({
    fileName: path.basename(inputPath),
    size: sourceStat.size,
    mtimeMs: sourceStat.mtimeMs,
    cacheVersion,
  });
  const outputRoot = path.resolve(String(options.outputDir || path.join(process.cwd(), "assets", "imported-decks")));
  const cacheDir = path.join(outputRoot, fingerprint);
  const manifestPath = path.join(cacheDir, "manifest.json");
  const warnings = [];
  if (!options.force) {
    const cached = await readManifestIfReady(manifestPath);
    if (cached) return { ok: true, cached: true, manifest: cached, manifestPath };
  }

  await fsp.mkdir(cacheDir, { recursive: true });
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "mindex-keynote-import-"));
  const rawExportDir = path.join(tempRoot, "export");
  await fsp.mkdir(rawExportDir, { recursive: true });
  try {
    const tempInput = await copySourceToTemp(inputPath, tempRoot);
    const timeoutMs = toPositiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS);
    await runOsascript(keynoteExportScript(tempInput, rawExportDir, timeoutMs), timeoutMs);
    const slides = await normalizeExportedPngs(rawExportDir, cacheDir, {
      repoRoot: options.repoRoot || process.cwd(),
      urlBase: options.urlBase,
    });
    if (slides.some((slide) => slide.blankLike === true)) {
      warnings.push("blank-like-stage-detected");
    }
    if (slides.some((slide) => slide.blankLike === null)) {
      warnings.push("blank-analysis-incomplete");
    }
    const manifest = {
      schema: "mindex.imported_deck.v1",
      kind: "imported_deck",
      name: path.basename(inputPath, extension),
      fingerprint,
      cacheVersion,
      createdAt: new Date().toISOString(),
      source: {
        name: path.basename(inputPath),
        extension,
        size: sourceStat.size,
        mtimeMs: sourceStat.mtimeMs,
      },
      manifestUrl: manifestSlideUrl(manifestPath, {
        repoRoot: options.repoRoot || process.cwd(),
        urlBase: options.urlBase ? String(options.urlBase).replace(/\/$/, "") : "",
      }),
      slides,
      warnings,
    };
    for (const slide of slides) {
      if (!await pathExists(path.join(cacheDir, slide.path))) {
        throw Object.assign(new Error(`Missing exported slide: ${slide.path}`), { code: "manifest-validation-failed" });
      }
    }
    await fsp.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return { ok: true, cached: false, manifest, manifestPath };
  } catch (error) {
    if (error?.code === "automation-permission-denied") {
      error.message = `${error.message}\nKeynote automation permission is required: System Settings > Privacy & Security > Automation.`;
    }
    throw error;
  } finally {
    if (!options.keepTemp) await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

module.exports = {
  DEFAULT_CACHE_VERSION,
  analyzePngBlankLike,
  fingerprintFromSource,
  importKeynoteDeck,
  normalizeExportedPngs,
};
