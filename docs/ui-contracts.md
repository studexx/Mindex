# Mindex UI Contracts

Read `HANDOFF.md` first. This file is the short UI contract for Codex threads so layout work does not require rediscovering the same app-shell rules.

## Shell

- Detail pane page padding: `25px` on all sides on desktop and narrow layouts,
  unless a feature has an explicit fullscreen/presenter reason to override it.
- Sidebar open or closed must not change the detail pane gutter.
- Topbar icon buttons are square, normally `32px` by `32px`.
- Sidebar toggle, home, theme, and save controls should share the same button geometry.
- Left topbar actions align to the left rail edge. Right topbar actions align to
  the right rail edge because they belong to the app-level utility side.
- Mindex brand/home buttons may navigate home, but should not add hover motion.
- Avoid horizontal page overflow on desktop and mobile.

## Color And Surfaces

- Preserve token relationships across light and dark themes. If `accent`,
  `warn`, and `danger` are grouped in one mode, keep that grouping in the other
  mode.
- Shell controls should stay neutral. Theme, navigation, and disabled save
  buttons should not pull accent color into the app chrome.
- Use accent for active/primary/data emphasis, such as selected rows, brand
  accent, enabled primary save/present actions, and linked/reference states.
- Search should read as an independent surface on the sidebar through background
  contrast, not a visible stroke. Focus may strengthen the surface tone without
  adding an accent or border line.

## Navigation

Primary app modules:

1. `service` - Worship and presenter work.
2. `activities` - Activity/game foundation.
3. `praise` - Song database.
4. `scripture` - Bible/search/copy tools.
5. `calendar` - Home utility.
6. `references` - Home utility.
7. `order-sheets` - Home utility.

Home hierarchy:

- Worship is the primary operational area.
- Activities, Praise, and Scripture are major resources.
- Calendar, References, and Order Sheets are home utilities.

Inactive module tabs should stay visually quiet. Active tabs may show a clearer label and accent.

## Sidebar

- Sidebar width should stay consistent unless a module has a strong reason.
- Sidebar row padding should align visually with the sidebar toggle x-position.
- Sidebar content should feel relaxed, not cramped.
- Home utility pages should keep the integrated Mindex search available.

## Empty States

- Home, Activities, Praise, and Scripture empty states should use the shared UI verse system when available.
- Do not hardcode live content into empty states.
- Setup errors may name the required SQL file, but should not become a visually separate design system.

## References

- Reference links are database-managed.
- Groups are the organizational model. Avoid category/description UI unless there is a new product need.
- Groups should be editable and reorderable.
- Link move buttons inside a group should reorder only within that group.
- Group move buttons should move the whole group.
- References should remain visually neutral unless the design system intentionally changes.

## Calendar

- Calendar is a home utility, not a Praise or Scripture filter.
- Active calendar handling starts at `2025-11-30`.
- Opening Calendar should scroll to the current month when data exists.
- Header summary may show church year and series, such as `2026 · Series A`.
- Fixed feasts may appear visually, but should not behave like editable Sunday services.

## Order Sheets

- Order-sheet generation is a home utility.
- Friday/monthly order sheets use landscape A4 split into two vertical halves.
- Order sheets should be generated from service data.

## Presenter

Presenter details live in `docs/thread-worship-presenter.md`. Keep shell edits out of presenter internals unless required for integration.
