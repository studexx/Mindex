# SOLID Refactor Notes

This note is the lightweight guardrail for Mindex refactors. The app is still a
static HTML/CSS/JS app, so the goal is not to force a class-heavy architecture.
Use SOLID as a way to keep change boundaries small and predictable.

## Current Risk Shape

- `app.js` is the main pressure point. It contains app shell logic, data loading,
  persistence, rendering, editor events, Worship templates, Presenter controls,
  Presenter output, Praise, Scripture, Calendar, References, and Order Sheets.
- The main SOLID risk is `SRP`: several functions own event routing, state
  mutation, DOM rendering, and persistence decisions at the same time.
- `OCP` is the second risk: adding new service element types or presenter output
  behavior often means editing large conditional functions.
- `DIP` is a future risk: domain decisions are close to Supabase, localStorage,
  BroadcastChannel, and DOM APIs.
- `LSP` is not a major current concern because the app does not rely on class
  inheritance.

## Refactor Rules

- Do not split files just to split files. First create small stable boundaries
  inside the current file, then move them if the boundary holds.
- Prefer registry/table-driven dispatch for action handlers and presenter
  element builders.
- Keep behavior-preserving refactors separate from feature work.
- Avoid touching broad dispatcher functions when another thread is likely editing
  `app.js`; add tests or docs first, then perform narrow extraction.
- Every important behavior refactor should add or update smoke coverage.

## Safe Sequence

1. Add guardrails and diagnostics.
2. Extract pure helpers from large functions without changing call sites.
3. Convert presenter element building to a type-to-builder map.
4. Convert detail event handling to action registries.
5. Move stable modules out of `app.js` only after their boundaries stop changing.

## Guardrail

Run:

```bash
python3 tests/solid_audit.py
```

The audit is intentionally conservative. It does not demand a perfect SOLID
score today. It prevents the known large functions and global coupling markers
from growing silently while Mindex is still being stabilized.
