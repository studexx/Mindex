#!/usr/bin/env python3
"""Read-only Worship source analyzer.

This script inspects one bulletin HWP plus one or more PPTX files and emits a
JSON candidate report. It does not write to the Mindex database.

The report is intentionally conservative:
- the bulletin/order sheet is treated as the service structure authority;
- PPTX files are treated as slide material;
- praise titles derived only from cropped PPT lyrics are marked as weak hints.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import zlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any


TAG_PARA_TEXT = 67


def normalize_space(value: str) -> str:
  return re.sub(r"\s+", " ", value or "").strip()


def hangul_score(value: str) -> int:
  return len(re.findall(r"[가-힣]", value or ""))


def clean_hwp_text(value: str) -> str:
  value = value.replace("\x00", "")
  value = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f]", "", value)
  value = normalize_space(value)
  if not value:
    return ""
  # HWP records sometimes include binary-looking table control text such as
  # "氠瑢". Keep lines with real Korean content and drop obvious mojibake.
  if hangul_score(value) == 0 and not re.search(r"\d", value):
    return ""
  return value


def extract_hwp_texts(path: Path) -> list[str]:
  try:
    import olefile  # type: ignore
  except ImportError as exc:
    raise RuntimeError("olefile is required for HWP extraction") from exc

  ole = olefile.OleFileIO(str(path))
  flags = int.from_bytes(ole.openstream("FileHeader").read()[36:40], "little")
  compressed = bool(flags & 1)
  texts: list[str] = []

  section_names = ["/".join(parts) for parts in ole.listdir() if parts[:1] == ["BodyText"]]
  for name in sorted(section_names):
    raw = ole.openstream(name).read()
    if compressed:
      raw = zlib.decompress(raw, -15)
    pos = 0
    while pos + 4 <= len(raw):
      header = int.from_bytes(raw[pos:pos + 4], "little")
      pos += 4
      tag = header & 0x3ff
      size = (header >> 20) & 0xfff
      if size == 0xfff:
        size = int.from_bytes(raw[pos:pos + 4], "little")
        pos += 4
      data = raw[pos:pos + size]
      pos += size
      if tag != TAG_PARA_TEXT:
        continue
      text = clean_hwp_text(data.decode("utf-16le", errors="ignore"))
      if text:
        texts.append(text)
  return texts


def find_index(lines: list[str], pattern: str, start: int = 0) -> int | None:
  regex = re.compile(pattern)
  for index in range(start, len(lines)):
    if regex.search(lines[index]):
      return index
  return None


def slice_between(lines: list[str], start_pattern: str, end_pattern: str | None = None, start: int = 0) -> list[str]:
  begin = find_index(lines, start_pattern, start)
  if begin is None:
    return []
  if end_pattern is None:
    return lines[begin:]
  end = find_index(lines, end_pattern, begin + 1)
  return lines[begin:end if end is not None else len(lines)]


def parse_bulletin(path: Path) -> dict[str, Any]:
  lines = extract_hwp_texts(path)
  public_start = find_index(lines, r"3부/오전|1부.?오전")
  public_end = find_index(lines, r"\[다음주기도\]|이 름:", public_start or 0)
  public_lines = lines[public_start:public_end] if public_start is not None else []

  third_start = None
  if public_lines:
    praise_hits = [i for i, line in enumerate(public_lines) if re.search(r"경배와찬양|경배와 찬양", line)]
    if len(praise_hits) >= 2:
      third_start = praise_hits[1]
  third_lines = public_lines[third_start:] if third_start is not None else []
  first_second_lines = public_lines[:third_start] if third_start is not None else public_lines

  afternoon_lines = slice_between(lines, r"^주.*일.*오.*후.*예.*배$", r"✽다음주|위임목사", 0)
  friday_lines = slice_between(lines, r"^3금.*요.*기.*도.*회$|^“월삭예배”$", r"^월-금|^주.*일.*오.*후", 0)

  return {
    "path": str(path),
    "line_count": len(lines),
    "services": {
      "sunday_1_2_combined": first_second_lines,
      "sunday_3rd": third_lines,
      "sunday_afternoon": afternoon_lines,
      "friday_or_monthly_notice": friday_lines,
    },
    "raw_excerpt": [{"index": i + 1, "text": line} for i, line in enumerate(lines[:220])],
  }


def extract_pptx_slides(path: Path) -> list[dict[str, Any]]:
  try:
    from pptx import Presentation  # type: ignore
  except ImportError as exc:
    raise RuntimeError("python-pptx is required for PPTX extraction") from exc

  prs = Presentation(str(path))
  slides: list[dict[str, Any]] = []
  for index, slide in enumerate(list(prs.slides), 1):
    text_runs: list[str] = []
    for shape in slide.shapes:
      if hasattr(shape, "text"):
        text = normalize_space(getattr(shape, "text", ""))
        if text:
          text_runs.append(text)
    text = " | ".join(text_runs)
    slides.append({
      "number": index,
      "text": text,
      "shape_text_count": len(text_runs),
      "class": classify_slide_text(text),
    })
  return slides


def classify_slide_text(text: str) -> str:
  text = normalize_space(text)
  if not text:
    return "blank_or_media"
  if "사도신경" in text or "전능하신 아버지" in text:
    return "faith_confession"
  if "성경봉독" in text:
    return "scripture_title"
  if re.match(r"^\d+\s", text) and re.search(r"(장|복음|에베소서|에스더|요한복음)", text):
    return "scripture_body"
  if "말씀선포" in text or "목사" in text and re.search(r"[‘「].+[’」]", text):
    return "sermon_title"
  if "봉헌기도" in text:
    return "offering_prayer"
  if "봉헌" in text:
    return "offering"
  if "교회소식" in text or "새가족" in text:
    return "announcement"
  if "축도" in text:
    return "benediction"
  if text.startswith("♪"):
    return "praise_title"
  if re.match(r"^\d+[.)]\s*", text) or re.search(r"\|\s*\d+[.)]", text):
    return "lyrics_or_hymn_body"
  return "body_or_title"


def block_key(slide: dict[str, Any]) -> str:
  text = slide["text"]
  if slide["class"] == "blank_or_media":
    return "blank_or_media"
  # Repeated hymn slides often have identical multi-verse text. Collapse those.
  return f"{slide['class']}:{normalize_space(text)[:80]}"


def group_slide_blocks(slides: list[dict[str, Any]]) -> list[dict[str, Any]]:
  blocks: list[dict[str, Any]] = []
  current: dict[str, Any] | None = None
  for slide in slides:
    key = block_key(slide)
    if current and current["key"] == key:
      current["end"] = slide["number"]
      current["count"] += 1
      continue
    if current:
      blocks.append(current)
    current = {
      "key": key,
      "start": slide["number"],
      "end": slide["number"],
      "count": 1,
      "class": slide["class"],
      "sample": slide["text"][:220],
    }
  if current:
    blocks.append(current)
  return blocks


def infer_service_hint(path: Path, slides: list[dict[str, Any]], bulletin: dict[str, Any] | None) -> str:
  name = path.stem.lower()
  text_blob = "\n".join(slide["text"] for slide in slides[:120])
  if "아름다운 이름" in text_blob or "엡 1:1" in text_blob:
    return "sunday_afternoon"
  if "곤한 내 영혼" in text_blob or "할렐루야 찬양대" in text_blob:
    return "sunday_3rd"
  if "요 19:38" in text_blob or "_1st" in name:
    return "sunday_1st"
  if "에 9:20" in text_blob or "_2nd" in name:
    return "sunday_2nd"
  return "needs_review"


def summarize_pptx(path: Path, bulletin: dict[str, Any] | None = None) -> dict[str, Any]:
  slides = extract_pptx_slides(path)
  blocks = group_slide_blocks(slides)
  class_counts: dict[str, int] = {}
  for slide in slides:
    class_counts[slide["class"]] = class_counts.get(slide["class"], 0) + 1
  return {
    "path": str(path),
    "slide_count": len(slides),
    "service_hint": infer_service_hint(path, slides, bulletin),
    "class_counts": class_counts,
    "blocks": blocks,
    "first_slides": slides[:16],
    "important_slides": [
      slide for slide in slides
      if slide["class"] not in {"blank_or_media", "lyrics_or_hymn_body", "body_or_title"}
    ][:80],
    "notes": [
      "PPT praise titles are hints only. Cropped first-line lyric titles must be matched against Mindex Praise or a separate setlist.",
      "Filename suffix is not authoritative; service_hint uses content fingerprints.",
    ],
  }


def main() -> int:
  parser = argparse.ArgumentParser(description="Analyze Worship bulletin/PPTX sources without writing DB data.")
  parser.add_argument("--bulletin-hwp", type=Path)
  parser.add_argument("--pptx", type=Path, action="append", default=[])
  parser.add_argument("--pretty", action="store_true")
  args = parser.parse_args()

  bulletin = parse_bulletin(args.bulletin_hwp) if args.bulletin_hwp else None
  report = {
    "bulletin": bulletin,
    "pptx": [summarize_pptx(path, bulletin) for path in args.pptx],
    "algorithm": {
      "authority_order": ["bulletin_structure", "manual_setlist", "mindex_praise", "mindex_scripture", "pptx_slide_material"],
      "candidate_flow": [
        "extract bulletin cover/next-page order",
        "split service candidates by order markers",
        "extract PPT slide text and group repeated slide blocks",
        "infer service by content fingerprints, not only filename",
        "link praise by normalized Mindex Praise/fingerprint; mark cropped lyric titles as weak",
        "emit import candidates for review before writing canonical Worship tables",
      ],
    },
  }
  json.dump(report, sys.stdout, ensure_ascii=False, indent=2 if args.pretty else None)
  sys.stdout.write("\n")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
