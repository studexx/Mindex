# Runtime Code Organization

This document records the stable 2026-08-16 runtime ownership boundaries. It
is a maintenance contract, not a request to split large files mechanically.

## Load Order

`index.html` must load the runtime scripts in this order:

1. `mindex.constants.js`
2. `mindex.presenter.js`
3. `app.js`

The order is checked by `tests/solid_audit.py`.

## Ownership

- `mindex.constants.js` owns static values shared by the app and presenter.
- `mindex.presenter.js` owns slide construction and presenter-output helpers.
- `app.js` owns bootstrap, state, persistence, DOM events, canonical shared
  helpers, and controller integration.
- A top-level function name has exactly one owner. Do not shadow or redeclare a
  function in another runtime file to change behavior through load order.
- User-facing behavior belongs in the current contract documents under
  `docs/`; incident notes and old drafts are not runtime specifications.

## Safe Refactoring Rule

Keep behavior changes separate from structural cleanup. Before moving a block,
first add or confirm a smoke test for its behavior. After moving it, run syntax
checks, `tests/solid_audit.py`, the app smoke suite, and the worship presenter
smoke suite.

The annotated Git tag `stable-2026-08-16` is the rollback point immediately
before this ownership cleanup.

## 2026-08-19 Structural Audit

The current stable version intentionally raised the ratchet ceilings after the
home/service navigation, presenter stability, praise input, and button grammar
work landed across multiple threads. This was a stabilization checkpoint, not a
new architecture target.

Known pressure points:

- `app.js` is still the integration hub for state, persistence, service input,
  controller UI, and app-level event delegation.
- `bindStaticEvents` and `handleDetailClick` are the highest-risk growth areas
  because new controls often enter through those event routers.
- Service navigation now has two explicit sentinel panels:
  `SERVICE_WEEK_PANEL_ID` for `금주 예배` and `SERVICE_LIST_PANEL_ID` for
  `전체 예배`. Home keeps its own `이번 주 예배` dashboard copy.
- Do not move presenter slide construction into app UI code. Keep output
  rendering in `mindex.presenter.js`, and keep controller/service authoring in
  `app.js` until an extraction has smoke coverage.

Recommended extraction order:

1. Move pure worship parsing and song lookup helpers out first.
2. Move service dashboard/list rendering helpers only after the service-tab
   smoke tests cover `금주 예배`, `전체 예배`, and direct service opening.
3. Split controller presenter-board helpers after Chrome output/reload smoke
   remains stable.
4. Split CSS by module only when visual smoke screenshots or pixel checks cover
   the affected presenter/controller surfaces.

## Baseline Ratchets

The size and coupling limits in `tests/solid_audit.py` describe the current
stable ceiling, not the desired final architecture. Lower the limits whenever
code is safely extracted. Raising them requires a documented reason in the
same change.
