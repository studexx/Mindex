# Worship / Presenter Thread Guide

Read `HANDOFF.md` first. Use this file as the short guide when a thread is mostly about Worship, service elements, presenter controls, presenter output, or order/PPT matching.

## Scope

Focus on:

- Service dashboard and service element editing.
- Presenter slide building.
- Presenter controller controls and keyboard behavior.
- Presenter output route and projector-facing layout.
- Service templates and PPT/reference mapping when needed.
- Order-sheet integration only where it touches service data or Friday/monthly print output.

Avoid:

- Reworking Praise or Scripture internals unless needed for linked worship elements.
- Replacing curated song/scripture data from PPT imports.
- Adding decorative UI that does not help live service operation.

## Presenter Rules

- Preparation video or waiting slide should be the first element.
- Consecutive praise songs that belong to one led block should be grouped under one praise section.
- Praise leader belongs next to the praise section, not as the main worship leader.
- Hymns in 1st/2nd service may not have a praise leader.
- Scripture reading should link to Scripture data or normalized references.
- Apostles' Creed is a faith-confession element.
- PPTX/Keynote import/reference should be an element type, not the source of truth.
- Blank screen and video should remain available elements.

## Controller UI

- The controller should feel like a simple PowerPoint/FreeShow slide sorter.
- Slide thumbnails must keep the actual output aspect ratio.
- A single thumbnail must not resize wildly just because it is alone.
- Labels should use actual section/form labels and avoid duplicate text.
- Avoid Current/Next panels when thumbnail control is the main mental model.
- Keyboard behavior:
  - Space, Right, Down: next.
  - Left, Up: previous.
  - Number plus Enter: jump.
  - B: black.

## Output

- Chromakey services use `#00ff00`.
- Chroma range is narrow in the real broadcast setup.
- Non-chromakey services use background images.
- Department worship backgrounds may rotate by two-month theme cycles.
- Youth and young adult services may use public-worship backgrounds where specified.
- Paperlogy may be used for department outputs, but never apply it to the whole app by accident.

## Verification

For presenter work, run at least:

```bash
cd /Users/parkjihun/Mindex
/Users/parkjihun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check app.js
git diff --check -- app.js styles.css index.html tests/smoke_app.py tests/smoke_worship_presenter.py
python3 tests/smoke_worship_presenter.py
```

For broader app changes, also run:

```bash
python3 tests/smoke_app.py
```

Manual checks when changing live presenter behavior:

- No horizontal overflow.
- Thumbnails stay 16:9 and stable.
- Double-click thumbnail starts presenter at that slide.
- Number input plus Enter jumps correctly.
- Space/Right/Down and Left/Up only affect presenter where intended.
- Non-chromakey services do not flash chromakey green.
- Output slide matches thumbnail in background, title, lyrics, and labels.
