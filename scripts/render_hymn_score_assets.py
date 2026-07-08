#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_DIR = Path("/Users/parkjihun/Library/CloudStorage/OneDrive-Personal/02_Church/10_찬양")
DEFAULT_MANIFEST = ROOT / "assets/hymn-scores/manifest.json"
DEFAULT_CACHE_DIR = ROOT / ".cache/hymn-score-native"
OUTPUT_SIZE = (1152, 648)

RUNTIME_ROOT = Path("/Users/parkjihun/.cache/codex-runtimes/codex-primary-runtime/dependencies")
SOFFICE = RUNTIME_ROOT / "bin/soffice"
PDFTOPPM = RUNTIME_ROOT / "bin/pdftoppm"
LO_FRAMEWORKS = (
    RUNTIME_ROOT
    / "native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Frameworks"
)
POPLER_LIB = RUNTIME_ROOT / "native/poppler/poppler/lib"

LIBREOFFICE_BUNDLED_LIBS = {
    "liblcms2.2.dylib": POPLER_LIB / "liblcms2.2.dylib",
    "libfontconfig.1.dylib": POPLER_LIB / "libfontconfig.1.dylib",
    "libfreetype.6.dylib": POPLER_LIB / "libfreetype.6.dylib",
    "libz.1.dylib": POPLER_LIB / "libz.1.dylib",
    "libpng16.16.dylib": POPLER_LIB / "libpng16.16.dylib",
    "libintl.8.dylib": POPLER_LIB / "libintl.8.dylib",
}

LIBREOFFICE_INSTALL_NAME_FIXES = {
    "libvcllo.dylib": {
        "/opt/homebrew/opt/little-cms2/lib/liblcms2.2.dylib": "@loader_path/liblcms2.2.dylib",
        "/opt/homebrew/opt/fontconfig/lib/libfontconfig.1.dylib": "@loader_path/libfontconfig.1.dylib",
        "/opt/homebrew/opt/freetype/lib/libfreetype.6.dylib": "@loader_path/libfreetype.6.dylib",
    },
    "libcairo-lo.2.dylib": {
        "/opt/homebrew/opt/fontconfig/lib/libfontconfig.1.dylib": "@loader_path/libfontconfig.1.dylib",
        "/opt/homebrew/opt/freetype/lib/libfreetype.6.dylib": "@loader_path/libfreetype.6.dylib",
    },
}


@dataclass(frozen=True)
class RenderTask:
    hymn_no: str
    source_path: Path
    source_slide: int
    output_path: Path


def run(command: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(command)}\n{result.stdout}"
        )
    return result


def otool_libraries(path: Path) -> str:
    if not path.exists():
        return ""
    return run(["otool", "-L", str(path)]).stdout


def ensure_libreoffice_runtime() -> None:
    if not SOFFICE.exists():
        raise FileNotFoundError(f"LibreOffice runtime not found: {SOFFICE}")
    if not PDFTOPPM.exists():
        raise FileNotFoundError(f"pdftoppm runtime not found: {PDFTOPPM}")

    LO_FRAMEWORKS.mkdir(parents=True, exist_ok=True)
    for name, source in LIBREOFFICE_BUNDLED_LIBS.items():
        if not source.exists():
            raise FileNotFoundError(f"Missing bundled LibreOffice dependency source: {source}")
        target = LO_FRAMEWORKS / name
        if not target.exists():
            shutil.copy2(source, target)

    for dylib_name, replacements in LIBREOFFICE_INSTALL_NAME_FIXES.items():
        dylib = LO_FRAMEWORKS / dylib_name
        if not dylib.exists():
            continue
        libraries = otool_libraries(dylib)
        for old, new in replacements.items():
            if old not in libraries:
                continue
            run(["install_name_tool", "-change", old, new, str(dylib)])
            libraries = libraries.replace(old, new)

    run([str(SOFFICE), "--headless", "--version"])


def source_path_for(entry: dict, slide: dict, source_dir: Path) -> Path:
    source = slide.get("source") or entry.get("source")
    if not source:
        raise ValueError("Manifest entry is missing source")
    path = Path(source)
    return path if path.is_absolute() else source_dir / path


def deck_cache_key(source_path: Path) -> str:
    digest = hashlib.sha1(str(source_path.resolve()).encode("utf-8")).hexdigest()[:10]
    return f"{source_path.stem}-{digest}"


def export_deck_to_pdf(source_path: Path, cache_dir: Path, force: bool) -> Path:
    if not source_path.exists():
        raise FileNotFoundError(f"Source PPTX not found: {source_path}")
    deck_dir = cache_dir / deck_cache_key(source_path)
    deck_dir.mkdir(parents=True, exist_ok=True)
    if not deck_dir.is_dir():
        raise RuntimeError(f"Could not create LibreOffice export directory: {deck_dir}")
    pdf_path = deck_dir / f"{source_path.stem}.pdf"
    if (
        pdf_path.exists()
        and not force
        and pdf_path.stat().st_mtime >= source_path.stat().st_mtime
    ):
        return pdf_path

    for stale in deck_dir.glob(f"{source_path.stem}*.pdf"):
        stale.unlink()
    result = run([
        str(SOFFICE),
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        str(deck_dir),
        str(source_path),
    ])
    if not pdf_path.exists():
        raise RuntimeError(f"LibreOffice did not write expected PDF: {pdf_path}\n{result.stdout}")
    return pdf_path


def render_pdf_page_to_image(
    page_png_path: Path,
    output_path: Path,
    image_format: str,
    quality: int,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(page_png_path).convert("RGB")
    if image.size != OUTPUT_SIZE:
        image = image.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    if image_format == "webp":
        image.save(output_path, format="WEBP", quality=quality, method=6)
    elif image_format == "png":
        image.save(output_path, format="PNG", optimize=True)
    else:
        raise ValueError(f"Unsupported output format: {image_format}")


def render_pdf_range_to_pngs(
    pdf_path: Path,
    first_page: int,
    last_page: int,
    tmp_dir: Path,
    render_dpi: int,
) -> dict[int, Path]:
    prefix = tmp_dir / "page"
    run([
        str(PDFTOPPM),
        "-f",
        str(first_page),
        "-l",
        str(last_page),
        "-png",
        "-r",
        str(render_dpi),
        str(pdf_path),
        str(prefix),
    ])
    rendered: dict[int, Path] = {}
    for png_path in tmp_dir.glob("page-*.png"):
        page_text = png_path.stem.removeprefix("page-")
        if page_text.isdigit():
            rendered[int(page_text)] = png_path
    return rendered


def parse_exported_slide_dirs(values: list[str] | None) -> dict[str, Path]:
    mappings: dict[str, Path] = {}
    for raw in values or []:
        if "=" in raw:
            source_name, directory = raw.split("=", 1)
        else:
            directory = raw
            source_name = f"{Path(raw).name}.pptx"
        source_name = source_name.strip()
        if source_name and not source_name.lower().endswith(".pptx"):
            source_name = f"{source_name}.pptx"
        path = Path(directory).expanduser()
        if not source_name:
            raise ValueError(f"Missing source name for exported slide directory: {raw}")
        if not path.is_dir():
            raise FileNotFoundError(f"Exported slide directory not found: {path}")
        mappings[source_name] = path
    return mappings


def index_exported_slide_dir(directory: Path) -> dict[int, Path]:
    indexed: dict[int, Path] = {}
    for path in directory.iterdir():
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        match = re.search(r"(\d+)$", path.stem)
        if match:
            indexed[int(match.group(1))] = path
    return indexed


def render_exported_slide_tasks(
    source_name: str,
    source_tasks: list[RenderTask],
    exported_dir: Path,
    image_format: str,
    quality: int,
    done: int,
    total: int,
) -> int:
    exported = index_exported_slide_dir(exported_dir)
    missing = sorted({task.source_slide for task in source_tasks if task.source_slide not in exported})
    if missing:
        preview = ", ".join(str(value) for value in missing[:20])
        more = f" ... {len(missing) - 20} more" if len(missing) > 20 else ""
        raise RuntimeError(f"{source_name} exported slides missing: {preview}{more}")

    print(f"PNG {source_name} <- {exported_dir}", flush=True)
    for task in source_tasks:
        render_pdf_page_to_image(exported[task.source_slide], task.output_path, image_format, quality)
        done += 1
        if done == total or done % 50 == 0:
            print(f"WROTE {done}/{total} {task.output_path.relative_to(ROOT)}", flush=True)
    return done


def collect_tasks(
    manifest_path: Path,
    source_dir: Path,
    hymns: set[str] | None,
    image_format: str,
) -> list[RenderTask]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    tasks: list[RenderTask] = []
    for hymn_no, entry in sorted(
        manifest.items(),
        key=lambda item: int(item[0]) if item[0].isdigit() else item[0],
    ):
        if hymns and hymn_no not in hymns:
            continue
        for slide in entry.get("slides", []):
            source_slide = slide.get("sourceSlide")
            if not source_slide:
                continue
            output_path = ROOT / slide["src"]
            if output_path.suffix.lower() != f".{image_format}":
                output_path = output_path.with_suffix(f".{image_format}")
            tasks.append(RenderTask(
                hymn_no=hymn_no,
                source_path=source_path_for(entry, slide, source_dir),
                source_slide=int(source_slide),
                output_path=output_path,
            ))
    return tasks


def render_tasks(
    tasks: list[RenderTask],
    cache_dir: Path,
    image_format: str,
    quality: int,
    force_export: bool,
    dry_run: bool,
    page_chunk_size: int,
    render_dpi: int,
    exported_slide_dirs: dict[str, Path],
) -> None:
    grouped: dict[Path, list[RenderTask]] = defaultdict(list)
    for task in tasks:
        grouped[task.source_path].append(task)

    total = len(tasks)
    done = 0
    for source_path, source_tasks in grouped.items():
        exported_dir = exported_slide_dirs.get(source_path.name)
        if exported_dir:
            if dry_run:
                print(f"DRY PNG {source_path.name} <- {exported_dir} :: {len(source_tasks)} slides")
                continue
            done = render_exported_slide_tasks(
                source_path.name,
                source_tasks,
                exported_dir,
                image_format,
                quality,
                done,
                total,
            )
            continue

        if dry_run:
            print(f"DRY EXPORT {source_path} :: {len(source_tasks)} slides")
            for task in source_tasks[:5]:
                print(f"DRY PAGE {task.hymn_no} #{task.source_slide} -> {task.output_path.relative_to(ROOT)}")
            if len(source_tasks) > 5:
                print(f"DRY ... {len(source_tasks) - 5} more")
            continue

        pdf_path = export_deck_to_pdf(source_path, cache_dir, force_export)
        pdf_display = pdf_path.relative_to(ROOT) if pdf_path.is_relative_to(ROOT) else pdf_path
        print(f"PDF {source_path.name} -> {pdf_display}", flush=True)

        tasks_by_page: dict[int, list[RenderTask]] = defaultdict(list)
        for task in source_tasks:
            tasks_by_page[task.source_slide].append(task)

        pages = sorted(tasks_by_page)
        with tempfile.TemporaryDirectory(prefix="mindex-hymn-pages-") as tmp:
            tmp_root = Path(tmp)
            for chunk_start in range(0, len(pages), page_chunk_size):
                chunk_pages = pages[chunk_start:chunk_start + page_chunk_size]
                first_page = chunk_pages[0]
                last_page = chunk_pages[-1]
                chunk_dir = tmp_root / f"{first_page}-{last_page}"
                chunk_dir.mkdir()
                print(f"PAGES {first_page}-{last_page}", flush=True)
                rendered_pages = render_pdf_range_to_pngs(pdf_path, first_page, last_page, chunk_dir, render_dpi)
                for page in chunk_pages:
                    page_png = rendered_pages.get(page)
                    if not page_png:
                        raise RuntimeError(f"Missing rendered PDF page {page} from {pdf_path}")
                    for task in tasks_by_page[page]:
                        render_pdf_page_to_image(page_png, task.output_path, image_format, quality)
                        done += 1
                        if done == total or done % 50 == 0:
                            print(f"WROTE {done}/{total} {task.output_path.relative_to(ROOT)}", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Render hymn score assets from native PowerPoint exports or source PPTX decks."
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR)
    parser.add_argument("--format", default="webp", choices=["png", "webp"])
    parser.add_argument("--quality", type=int, default=92)
    parser.add_argument("--page-chunk-size", type=int, default=100)
    parser.add_argument("--render-dpi", type=int, default=72)
    parser.add_argument("--hymns", nargs="*", help="Hymn numbers to render. Defaults to all manifest entries.")
    parser.add_argument("--force-export", action="store_true", help="Re-export deck PDFs even if cached.")
    parser.add_argument(
        "--exported-slide-dir",
        action="append",
        default=[],
        help="Use PowerPoint-exported slide images for a source deck. Format: DB_HYMN1.pptx=/path/to/Slide*.png",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    manifest_path = args.manifest if args.manifest.is_absolute() else ROOT / args.manifest
    source_dir = args.source_dir
    cache_dir = args.cache_dir if args.cache_dir.is_absolute() else ROOT / args.cache_dir
    hymns = {str(int(value)) if value.isdigit() else value for value in args.hymns} if args.hymns else None
    exported_slide_dirs = parse_exported_slide_dirs(args.exported_slide_dir)

    tasks = collect_tasks(manifest_path, source_dir, hymns, args.format)
    needs_pdf_fallback = any(task.source_path.name not in exported_slide_dirs for task in tasks)
    if needs_pdf_fallback and not args.dry_run:
        ensure_libreoffice_runtime()
    print(f"READY {len(tasks)} slides from {len({task.source_path for task in tasks})} deck(s)", flush=True)
    render_tasks(
        tasks,
        cache_dir,
        args.format,
        args.quality,
        args.force_export,
        args.dry_run,
        args.page_chunk_size,
        args.render_dpi,
        exported_slide_dirs,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
