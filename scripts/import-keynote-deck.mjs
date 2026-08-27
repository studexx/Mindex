#!/usr/bin/env node
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const require = createRequire(import.meta.url);
const {
  analyzePngBlankLike,
  fingerprintFromSource,
  importKeynoteDeck,
  normalizeExportedPngs,
} = require("../electron/keynote-importer.js");

function usage() {
  return `Usage:
  node scripts/import-keynote-deck.mjs --input <deck.key|deck.pptx> [--output-dir <dir>] [--force]
  node scripts/import-keynote-deck.mjs --self-test

Options:
  --input <path>        Keynote or PowerPoint file to export through Keynote.
  --output-dir <dir>   Cache directory. Defaults to assets/imported-decks.
  --repo-root <dir>    Root used to make manifest URLs relative. Defaults to cwd.
  --url-base <url>     Optional URL prefix for generated stage URLs.
  --cache-version <v>  Cache rule version for fingerprinting.
  --timeout-ms <n>     Keynote export timeout. Defaults to 1800000.
  --force              Re-export even if a valid manifest already exists.
  --keep-temp          Keep temporary copied deck and raw export directory.
`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--self-test") parsed.selfTest = true;
    else if (arg === "--force") parsed.force = true;
    else if (arg === "--keep-temp") parsed.keepTemp = true;
    else if (arg === "--input") parsed.inputPath = argv[++index];
    else if (arg === "--output-dir") parsed.outputDir = argv[++index];
    else if (arg === "--repo-root") parsed.repoRoot = argv[++index];
    else if (arg === "--url-base") parsed.urlBase = argv[++index];
    else if (arg === "--cache-version") parsed.cacheVersion = argv[++index];
    else if (arg === "--timeout-ms") parsed.timeoutMs = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function makeTestPng(width, height, pixelFor) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = [0];
    for (let x = 0; x < width; x += 1) row.push(...pixelFor(x, y));
    rows.push(Buffer.from(row));
  }
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function assertSelfTest(condition, message) {
  if (!condition) throw new Error(`Self-test failed: ${message}`);
}

async function runSelfTest() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mindex-keynote-import-test-"));
  try {
    const rawDir = path.join(tempRoot, "raw");
    const stageDir = path.join(tempRoot, "stages");
    await fs.mkdir(rawDir, { recursive: true });
    await fs.writeFile(path.join(rawDir, "Deck 002.png"), makeTestPng(2, 2, (x, y) => (x === y ? [0, 0, 0, 255] : [255, 255, 255, 255])));
    await fs.writeFile(path.join(rawDir, "Deck 001.png"), makeTestPng(2, 2, () => [12, 12, 12, 255]));

    const blank = await analyzePngBlankLike(path.join(rawDir, "Deck 001.png"));
    const mixed = await analyzePngBlankLike(path.join(rawDir, "Deck 002.png"));
    await assertSelfTest(blank.blankLike === true, "single-color PNG is marked blank-like");
    await assertSelfTest(mixed.blankLike === false, "multi-color PNG is not marked blank-like");

    const slides = await normalizeExportedPngs(rawDir, stageDir, { repoRoot: tempRoot });
    await assertSelfTest(slides.length === 2, "normalizes every exported PNG");
    await assertSelfTest(slides[0].path === "stage-001.png", "renames first stage predictably");
    await assertSelfTest(slides[0].blankLike === true, "preserves blank marker in manifest slide");
    await assertSelfTest(slides[1].blankLike === false, "preserves nonblank marker in manifest slide");

    const fingerprintA = fingerprintFromSource({ fileName: "sermon.key", size: 123, mtimeMs: 456000, cacheVersion: "v1" });
    const fingerprintB = fingerprintFromSource({ fileName: "sermon.key", size: 123, mtimeMs: 456999, cacheVersion: "v1" });
    await assertSelfTest(fingerprintA === fingerprintB, "fingerprint ignores sub-second mtime churn");

    return { ok: true, slides: slides.length, fingerprint: fingerprintA };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  if (args.selfTest) {
    process.stdout.write(`${JSON.stringify(await runSelfTest(), null, 2)}\n`);
    return;
  }
  if (!args.inputPath) {
    process.stderr.write(usage());
    process.exitCode = 2;
    return;
  }
  const result = await importKeynoteDeck(args);
  process.stdout.write(`${JSON.stringify({
    ok: result.ok,
    cached: result.cached,
    manifestPath: result.manifestPath,
    manifest: result.manifest,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error?.message || error}\n`);
  process.exitCode = 1;
});
