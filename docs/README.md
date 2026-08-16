# Mindex Documentation Map

Read `HANDOFF.md` first, then open the smallest current document for the task.
When documents disagree, use the current contract or decision log and update the
stale document in the same change.

## Current Contracts

- `worship-presenter-decisions.md`: current Worship/Presenter behavior,
  service-specific rules, visual output decisions, and live-operation
  conventions.
- `worship-data-contract.md`: Supabase-backed Worship schema, persisted data
  contracts, service type IDs, input modes, and default materialization rules.
- `thread-worship-presenter.md`: implementation workflow for Worship and
  Presenter changes.
- `ui-contracts.md`: app shell and UI interaction contracts.
- `code-organization.md`: runtime script order, code ownership boundaries, and
  safe-refactoring rules.

## Planning Or Deferred Work

- `electron-packaging-plan.md`: packaging and auto-update plan.
- `admin-access-security.md`: admin and access-control planning.
- `youtube-live-automation.md`: livestream automation notes.
- `young-adult-bulletin.md`: deferred young-adult bulletin plan. Do not expose
  bulletin UI or store arbitrary bulletin payloads until the feature is
  explicitly resumed.
- `solid-refactor-notes.md`: refactor notes only. Do not treat as a required
  migration plan unless the user asks to resume it.

## Historical Or Incident Notes

- `emergency-worship-handoff.md`: temporary safety note from the 2026-08-09
  live-service incident. Revalidate before applying it to normal development.
- `worship-order-review-draft.md`: archived planning draft, not runtime seed
  data and not the source of truth.
- `2026-07-19-sunday-second-db-repair.md`: historical repair log.
- `review-status-incident.md`: historical incident/review note.

Historical notes may contain old table names, old service IDs, or emergency
workarounds. Preserve them as evidence, but do not copy those names into new
code or migrations unless the current data contract also lists them.

## Cleanup Rule

If a user-facing behavior changes, update the current decision log or data
contract with the same commit. Do not let old drafts, emergency notes, or
incident logs override current reviewed behavior.
