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

## Baseline Ratchets

The size and coupling limits in `tests/solid_audit.py` describe the current
stable ceiling, not the desired final architecture. Lower the limits whenever
code is safely extracted. Raising them requires a documented reason in the
same change.
