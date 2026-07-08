#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "assets/hymn-scores/manifest.json"
OCR_SCRIPT = ROOT / "scripts/vision_ocr_text.swift"


def chunked(values: list[Path], size: int) -> list[list[Path]]:
    return [values[index:index + size] for index in range(0, len(values), size)]


def normalize_ocr_text(value: str) -> str:
    return (
        str(value or "")
        .replace("．", ".")
        .replace("ㆍ", ".")
        .replace("·", ".")
        .replace("：", ":")
        .strip()
    )


def label_from_text(value: str) -> str:
    text = normalize_ocr_text(value)
    match = re.match(r"^[\[\|\s]*(\d{1,2})\s*[\.\)]\s*", text)
    if match:
        verse = int(match.group(1))
        return f"Verse {verse}" if 1 <= verse <= 6 else ""
    if re.match(r"^[\[\|\s]*(?:후|후렴|chorus)\s*[\.\):]?\s*", text, re.IGNORECASE):
        return "Chorus"
    if re.match(r"^[\[\|\s]*(?:coda|코다|아멘|amen)\s*[\.\):]?\s*$", text, re.IGNORECASE):
        return "Coda"
    return ""


def compact_match_text(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z가-힣]+", "", normalize_ocr_text(value)).lower()


def footer_form_candidates(value: str) -> list[tuple[str, str]]:
    text = normalize_ocr_text(value)
    matches = list(re.finditer(r"(?:^|\s)((?:\d{1,2}|후렴?|chorus|coda|코다|아멘|amen)\s*[\.\):]?\s*)", text, re.IGNORECASE))
    candidates: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        start = match.start(1)
        end = matches[index + 1].start(1) if index + 1 < len(matches) else len(text)
        chunk = text[start:end].strip()
        label = label_from_text(chunk)
        if not label:
            continue
        phrase = re.sub(r"^(?:\d{1,2}|후렴?|chorus|coda|코다|아멘|amen)\s*[\.\):]?\s*", "", chunk, flags=re.IGNORECASE).strip()
        compact = compact_match_text(phrase)
        if len(compact) >= 5:
            candidates.append((label, compact))
    return candidates


def score_body_lines(boxes: list[dict[str, Any]]) -> list[str]:
    lines: list[tuple[float, float, str]] = []
    candidates: list[tuple[float, float, str]] = []
    for box in boxes:
        text = str(box.get("text") or "").strip()
        x = float(box.get("x") or 0)
        y = float(box.get("y") or 0)
        height = float(box.get("height") or 0)
        # Ignore title/header and bottom navigation strips; use the main score body.
        if y < 0.10 or y > 0.82:
            continue
        if re.search(r"[가-힣]", text):
            lines.append((y + height, x, text))
        label = label_from_text(text)
        if not label:
            continue
        candidates.append((y + height, x, label))
    lines.sort(key=lambda item: (-item[0], item[1]))
    return [line for _, _, line in lines]


def score_form_label_from_boxes(boxes: list[dict[str, Any]], footer_text: str = "") -> str:
    candidates: list[tuple[float, float, str]] = []
    for box in boxes:
        text = str(box.get("text") or "").strip()
        label = label_from_text(text)
        if not label:
            continue
        x = float(box.get("x") or 0)
        y = float(box.get("y") or 0)
        height = float(box.get("height") or 0)
        # Ignore title/header and bottom navigation strips; use the main score body.
        if y < 0.10 or y > 0.82:
            continue
        candidates.append((y + height, x, label))
    if not candidates:
        footer_candidates = footer_form_candidates(footer_text)
        if footer_candidates:
            body_lines = score_body_lines(boxes)
            body = compact_match_text(body_lines[0]) if body_lines else ""
            matches = [(label, phrase) for label, phrase in footer_candidates if body.startswith(phrase)]
            if matches:
                chorus = next((label for label, _ in matches if label == "Chorus"), "")
                return chorus or matches[0][0]
        return ""
    candidates.sort(key=lambda item: (-item[0], item[1]))
    return candidates[0][2]


def ocr_executable() -> Path:
    binary = Path(tempfile.gettempdir()) / "mindex_vision_ocr_text"
    if not binary.exists() or binary.stat().st_mtime < OCR_SCRIPT.stat().st_mtime:
        subprocess.run(["swiftc", str(OCR_SCRIPT), "-o", str(binary)], check=True)
    return binary


def run_ocr(paths: list[Path], batch_size: int) -> dict[str, list[dict[str, Any]]]:
    results: dict[str, list[dict[str, Any]]] = {}
    executable = ocr_executable()
    batches = chunked(paths, batch_size)
    for batch_index, batch in enumerate(batches, start=1):
        proc = subprocess.run(
            [str(executable), *map(str, batch)],
            check=True,
            text=True,
            capture_output=True,
        )
        for line in proc.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            path = str(payload.get("path") or "")
            results[path] = payload.get("boxes") or []
        print(f"OCR {batch_index}/{len(batches)} :: {len(batch)} images", file=sys.stderr)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Add deterministic score form labels to hymn score manifest slides.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--hymns", nargs="*", help="Optional hymn numbers to update.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    hymn_filter = {str(int(value)) for value in args.hymns or []}
    slide_refs: list[tuple[str, dict[str, Any], Path]] = []
    for hymn_no, entry in manifest.items():
        if hymn_filter and hymn_no not in hymn_filter:
            continue
        for slide in entry.get("slides") or []:
            src = slide.get("src")
            if not src:
                continue
            path = ROOT / src
            if path.exists():
                slide_refs.append((hymn_no, slide, path))

    ocr = run_ocr([path for _, _, path in slide_refs], max(1, args.batch_size))
    updated = 0
    cleared = 0
    previous_label_by_hymn: dict[str, str] = {}
    for hymn_no, slide, path in slide_refs:
        label = score_form_label_from_boxes(ocr.get(str(path), []), slide.get("text") or "")
        if label and previous_label_by_hymn.get(hymn_no) == label:
            label = ""
        previous = slide.get("scoreFormLabel") or ""
        if label:
            slide["scoreFormLabel"] = label
            slide["scoreFormKey"] = f"score:{label.lower().replace(' ', '-')}"
            previous_label_by_hymn[hymn_no] = label
            updated += int(previous != label)
        else:
            if "scoreFormLabel" in slide or "scoreFormKey" in slide:
                cleared += 1
            slide.pop("scoreFormLabel", None)
            slide.pop("scoreFormKey", None)

    summary = {
        "slides": len(slide_refs),
        "updated": updated,
        "cleared": cleared,
        "labeled": sum(
            1
            for entry in manifest.values()
            for slide in entry.get("slides", [])
            if slide.get("scoreFormLabel")
        ),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not args.dry_run:
        args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
