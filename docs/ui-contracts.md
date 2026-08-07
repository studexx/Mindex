# Mindex UI Contracts

Read `HANDOFF.md` first. This file is the short UI contract for Codex threads so layout work does not require rediscovering the same app-shell rules.

## Shell

- Detail pane page padding: `24px` on all sides on desktop and narrow layouts,
  unless a feature has an explicit fullscreen/presenter reason to override it.
- New app-layout spacing should prefer clean `5px`/`10px` rhythm values. Existing
  shell tokens may stay on the older `4px` scale until that area is deliberately
  retuned; when touching a dense page, choose the nearest stable `5px` or `10px`
  value instead of adding one-off numbers.
- App UI typography is separate from presenter output typography. Use the
  compact app scale by role: labels `11px / 700`, supporting metadata
  `12px / 500`, normal rows and form controls `14px / 600`, card titles
  `15px / 700`, and page titles `20px / 700`.
- Weight should communicate hierarchy, not decoration: primary labels and
  titles may use `700`, routine editable values should usually use `600`, and
  helper/meta text should stay at `500` unless it is an actionable label.
- Icon sizing follows a separate glyph rhythm because Lucide-style interface
  icons are optically tuned around `16px`: use `16px` for normal icons, `14px`
  for dense helper icons, and `20px` for large home/action tiles. Topbar buttons
  stay `40px`; normal icon buttons stay `34px`; dense inline controls may use
  `30px` or `28px` only when they sit inside compact editor/tool rows.
- Sidebar open or closed must not change the detail pane gutter.
- Topbar icon buttons are square, `40px` by `40px`.
- Sidebar toggle, home, theme, and save controls should share the same button geometry.
- Left topbar actions align to the left rail edge. Right topbar actions align to
  the right rail edge because they belong to the app-level utility side.
- Mindex brand/home buttons may navigate home, but should not add hover motion.
- Avoid horizontal page overflow on desktop and mobile.

## Color And Surfaces

- Keep `accent`, `warn`, and `danger` semantically distinct in both themes:
  accent is primary/selection, warning is incomplete attention, and danger is
  destructive or failed work. Do not make them aliases of one another.
- All normal-size text on a solid UI surface must meet at least WCAG AA `4.5:1`.
  Accent-colored text needs a text-safe accent token; do not reuse a low-contrast
  decorative fill color for labels or buttons.
- Keyboard focus must remain conspicuous in both themes: use a `2px` accent
  outline with an offset rather than a low-contrast neutral hairline.
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
2. `praise` - Song database.
3. `scripture` - Bible/search/copy tools.
4. `calendar` - Home utility.
5. `references` - Home utility.

Home hierarchy:

- Worship is the primary operational area.
- Praise and Scripture are major resources.
- Calendar and References are home utilities.

Inactive module tabs should stay visually quiet. Active tabs may show a clearer label and accent.

- When two or more page tabs are open, tabs can be dragged to reorder them.
- The active page remains active after reordering, and the new order is persisted with the existing tab session state.
- The add-tab control is not part of the draggable sequence.

## Sidebar

- Sidebar width should stay consistent unless a module has a strong reason.
- Sidebar row padding should align visually with the sidebar toggle x-position.
- Sidebar content should feel relaxed, not cramped.
- Home utility pages should keep the integrated Mindex search available.

## Empty States

- Home, Praise, and Scripture empty states should use the shared UI verse system when available.
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

## Presenter

Presenter details live in `docs/thread-worship-presenter.md`. Keep shell edits out of presenter internals unless required for integration.
