"""Section grouping rules for Worship v2 import candidates.

Rules here are intentionally conservative. They infer practical Worship
sections from staged legacy labels without mutating Praise/Scripture content.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SectionGuess:
    key: str
    title: str
    confidence: float
    reason: str


FALLBACK_SECTION = SectionGuess("review", "검토", 0.2, "fallback")


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def compact(value: Any) -> str:
    text = re.sub(r"\s+", "", clean_text(value))
    return text.translate(str.maketrans("", "", "·ㆍ-_()[]{}"))


def has(pattern: str, *values: Any) -> bool:
    return any(re.search(pattern, clean_text(value)) for value in values if value is not None)


def chas(pattern: str, *values: Any) -> bool:
    return any(re.search(pattern, compact(value)) for value in values if value is not None)


def section_guess_for_candidate(candidate: dict[str, Any]) -> SectionGuess:
    label = clean_text(candidate.get("normalized_label") or candidate.get("raw_label"))
    title = clean_text(candidate.get("normalized_title") or candidate.get("raw_title"))
    suggested_type = clean_text(candidate.get("suggested_type"))

    # Label-first rules prevent sermon titles such as "성경의 맥과 핵" from
    # being mistaken for scripture readings.
    if chas(r"준비|예배준비|대기", label, title):
        return SectionGuess("preparation", "준비", 0.95, "preparation-label")
    if chas(r"묵도|예배의부름", label):
        return SectionGuess("opening", "예배의 부름", 0.9, "opening-label")
    if chas(r"신앙고백|사도신경|공동체고백|참회기도", label, title):
        return SectionGuess("faith_confession", "신앙고백", 0.9, "faith-confession-label")

    if chas(r"성경봉독|말씀봉독", label):
        return SectionGuess("scripture_reading", "성경봉독", 0.95, "scripture-label")
    if chas(r"설교", label):
        return SectionGuess("sermon", "설교", 0.95, "sermon-label")

    if chas(r"특송", label):
        return SectionGuess("special_music", "특송", 0.9, "special-music-label")
    if chas(r"봉헌", label):
        return SectionGuess("offering", "봉헌", 0.9, "offering-label")

    if chas(r"교회소식|광고|알림", label, title):
        return SectionGuess("announcements", "교회소식", 0.9, "announcement-label")
    if chas(r"송영", label):
        return SectionGuess("doxology", "송영", 0.9, "doxology-label")
    if chas(r"축도", label):
        return SectionGuess("benediction", "축도", 0.9, "benediction-label")
    if chas(r"파송|폐회|마무리|나래파송|주기도문", label, title):
        return SectionGuess("sending", "파송", 0.85, "sending-label")

    if chas(r"결단찬양", label):
        return SectionGuess("response", "결단", 0.9, "response-song-label")
    if chas(r"결단|결단기도", label):
        return SectionGuess("response", "결단", 0.85, "response-label")

    if chas(r"기도찬양|기도회|통성기도|자율기도|월삭기도|공동기도", label):
        return SectionGuess("prayer_meeting", "기도회", 0.85, "prayer-meeting-label")
    if chas(r"대표기도|기도[0-9]+|기도", label):
        return SectionGuess("prayer", "기도", 0.75, "prayer-label")

    if chas(r"입례찬양|찬양[0-9]*|찬송", label):
        return SectionGuess("praise", "찬양", 0.85, "praise-label")
    if chas(r"2부활동|반별모임|셀모임|교제", label, title):
        return SectionGuess("fellowship", "교제", 0.85, "fellowship-label")
    if has(r"^[♪♫]|\+", label, title):
        return SectionGuess("praise", "찬양", 0.55, "music-title-fallback")

    if suggested_type == "praise":
        return SectionGuess("praise", "찬양", 0.6, "praise-type-fallback")

    if suggested_type == "scripture_reading":
        return SectionGuess("scripture_reading", "성경봉독", 0.6, "scripture-type-fallback")
    if suggested_type == "body" and chas(r"신앙|신경|고백", label, title):
        return SectionGuess("faith_confession", "신앙고백", 0.45, "body-faith-fallback")

    return FALLBACK_SECTION


def grouped_section_key(previous_key: str, guess: SectionGuess) -> str:
    """Return the grouping key used when building sections.

    Consecutive opening praise elements should stay in one praise section. Most
    other guesses become their own practical section key and can still contain
    multiple adjacent elements when the source order repeats the same block.
    """
    if guess.key == previous_key:
        return previous_key
    return guess.key
