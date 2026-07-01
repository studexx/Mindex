# Mindex Handoff

Last updated: 2026-07-01

Mindex is a church ministry operations app. It is not only a song database and not only a presenter. It should eventually support weekly worship preparation, lyrics/scripture management, worship presentation, order sheets, calendar, references, and activities while sharing one Supabase-backed data model and one coherent UI system.

This document is the canonical handoff for new Codex/Claude/GPT threads. Read this before editing. Keep changes conservative, verify them, and never undo unrelated local work.

## Repository And Runtime

- Repository: `/Users/parkjihun/Mindex`
- Current app: static HTML/CSS/JS app
- Main files:
  - `/Users/parkjihun/Mindex/index.html`
  - `/Users/parkjihun/Mindex/app.js`
  - `/Users/parkjihun/Mindex/styles.css`
  - `/Users/parkjihun/Mindex/supabase-schema.sql`
  - `/Users/parkjihun/Mindex/scripts/service-schema.sql`
  - `/Users/parkjihun/Mindex/scripts/activities-schema.sql`
  - `/Users/parkjihun/Mindex/scripts/reference-links-schema.sql`
- Local Supabase config:
  - `/Users/parkjihun/Mindex/.env.supabase.local`
  - `/Users/parkjihun/Documents/INDEX/.env.supabase`
- Preferred local server:
  - `python3 /Users/parkjihun/Mindex/serve.py`
  - The app is often tested at `http://localhost:4173`.
- GitHub Pages deployment exists, but do not assume remote pages are updated immediately after local edits. Local verification comes first.

## Global Product Direction

Mindex should become a practical ministry workbench for church media and worship preparation.

Top-level product areas:

1. Worship / Presenter
   - The operational worship preparation and presentation area.
   - Must be reliable enough for live church use.
   - Presenter is the urgent priority.

2. Praise
   - Song database.
   - Canonical song pages with versions and forms.
   - Used by Worship/Presenter, but not subordinate to Worship.

3. Scripture
   - Bible database and lookup/search/copy workflow.
   - Used by Worship/Presenter, but not subordinate to Worship.

4. Home Utilities
   - Calendar, References, Order Sheets, and similar support tools.
   - These should not feel like full database modules unless their functionality grows enough.

5. Activities
   - Reusable activity/game system for retreats, quizzes, team games, and worship/service insertion later.
   - It must be independent enough to run standalone and structured enough to be referenced by Worship.

## Strong Behavioral Rules

- Never overwrite already curated lyrics/forms/data unless explicitly asked.
- When syncing/importing from PPT, use PPT as reference material, not as authority over curated Mindex data.
- If existing Mindex data has been manually curated, preserve it.
- Do not hardcode real content that belongs in Supabase.
- Do not introduce dummy seed data into the app runtime.
- Do not invent song form splits. If uncertain, keep as `Lyrics` or leave for review.
- For hymns, official hymn titles should follow the Korean hymnal source requested by the user, not arbitrary first-line extraction.
- Children’s songs should generally be treated as audio-use lyrics, not manually split into song forms, unless explicitly curated.
- Do not treat a church department’s use of a song as the song’s intrinsic type.
- If one song has genuinely different canonical identities, split pages but provide related-song navigation.
- Keep the UI minimal. Remove decorative strokes, redundant labels, and explanatory copy that does not help live work.
- Use English for functional UI where natural, but worship content and Korean worship terms should remain Korean.

## Data Model Principles

The app is Supabase-centered. Local seeds should not be the source of truth for live content.

Song structure:

- `mindex_songs`
  - Canonical song metadata.
  - Title, subtitle, original title, hymn number, promoted metadata fields.
- Song versions
  - Version-specific title/name and lyrics/forms.
  - Version-level type tagging is important.
  - A song can have hymn/CCM/children-related versions without collapsing all versions into one type.
- Forms/units
  - Use structured forms when curated.
  - Use `Lyrics` when the lyrics are not meaningfully form-split.
  - Form labels should avoid unnecessary numbering when there is only one of that type.

Scripture structure:

- Bible books, chapters, verses, translations are database-managed.
- Copy behavior must support references and no-reference modes.
- Korean references should use spacing between book and chapter, e.g. `창 1:1`, not `창1:1`.

Service/Worship structure:

- Service types should use stable keys such as `sun_1st`, `sun_2nd`, `sun_3rd`, `sunday_afternoon`, `wednesday`, `friday`, `moon`, etc.
- Special seasonal or temporary services can be grouped as special services instead of being promoted to permanent top-level categories.
- First Friday prayer meeting of each month is replaced by monthly first-day worship where applicable.
- Worship items should be components, not loose text whenever possible.
- Praise components should link to Mindex Praise records.
- Scripture components should link to Mindex Scripture records or normalized references.
- Activity components should later link to Activity/Game records.

Activities structure:

- Activity Event: shared team/score context.
- Game: reusable playable unit.
- Team: name, color, score.
- Score Event: score change history.
- Presenter: projector-facing game display.
- Game-specific details should live in typed tables where useful, not all inside one JSON blob.

## Worship / Presenter Rules

The presenter must support real church operation.

Priority:

1. Live reliability.
2. Faithful worship sequence representation.
3. Fast correction before/during worship.
4. Clear controller UI.
5. Presentation output quality.

Current output concepts:

- Chromakey services:
  - Sunday 2nd, Sunday 3rd, Sunday afternoon, Wednesday, monthly first-day worship.
  - Special services vary.
  - Chromakey color is `#00ff00`.
  - Chroma range is narrow in the real broadcast setup.
- Non-chromakey services:
  - Department services and some prayer services.
  - Use background images.
  - Department worship backgrounds can rotate by two-month theme cycles.
- Youth and young adult department worship can use public-worship backgrounds where specified.

Presenter components:

- Preparation video / waiting slide should be the first component.
- Praise section should group consecutive praise songs under one praise section when they belong to one led praise block.
- Praise leader belongs next to the praise section, not as the main worship leader.
- Hymns in 1st/2nd service may not have a praise leader.
- Scripture reading should be linked to scripture data and displayed with proper reference formatting.
- Apostles’ Creed is a faith-confession component whose content is the Apostles’ Creed.
- PPTX/Keynote import/reference should be a component type, not a replacement for Mindex data.
- Blank screen should remain an available component.
- Video should be an available component.
- Live scripture lookup during sermon is required eventually.
- Pre/post worship music player and volume control are desired in the controller UI.

Presenter UI:

- Controller should feel closer to PowerPoint slide sorter / FreeShow controller, but simpler.
- Slide thumbnails must match the actual output aspect ratio and layout. Do not enlarge a single slide just because it is alone.
- Thumbnail labels should not invent titles. Use actual section/form labels only when helpful.
- A section can contain multiple slides/forms; show section grouping without making it visually heavy.
- Song form labels can appear near the slide title/section label, but avoid duplicate text such as `주기도문 주기도문`.
- Do not show unnecessary panels like Current/Next if thumbnail control is the primary mental model.
- Keep slide navigation keyboard-friendly:
  - Space/Right/Down: next
  - Left/Up: previous
  - Number + Enter: jump
  - B: black
- Do not expose browser-native title tooltips for dense shortcut text.

PPT/reference rule:

- Existing worship PPTs are reference material for layout and service component structure.
- For past services, each PPT section/slide sequence should map closely to Mindex components.
- If slide numbers are not continuous within a block, treat them as separate components unless the PPT clearly groups them.
- For complex cases such as intergenerational praise worship or 3rd-service special music, expect exceptions and manual slide editing.

## Praise Database Rules

Song identity:

- Same title does not always mean duplicate.
- Different title can still be same tune/history, but may need separate canonical pages with related links.
- Examples needing careful identity handling:
  - `살아 계신 주` / `하나님의 독생자` / `Because He Lives`
  - `이 믿음 더욱 굳세라` / `We Will Keep Our Faith Alive`
  - `저 들 밖에 한밤중에` and a children’s version
- Some same-title cases are homonyms, not duplicates. Check subtitle and original title before merging.

Metadata:

- Subtitle, original title, alternate title, artist, lyricist, composer, translator, album, track, scripture reference should be cleanly represented.
- Do not mix subtitle with original title.
- Parentheses in display are derived from metadata; avoid duplicated metadata display.
- `Other title` and `subtitle` may be conceptually close, but merge only when the meaning is truly the same.
- Be careful with English subtitle/original-title capitalization:
  - Main words capitalized.
  - Articles/prepositions/conjunctions lowercased unless first/last word.
  - Preserve user-confirmed exceptions.
- `Come and Celebrate` was user-confirmed as intended.

Forms:

- Supported types include at least:
  - `Lyrics`
  - `Verse`
  - `Pre-Chorus`
  - `Chorus`
  - `Bridge`
  - `Coda`
  - `Amen` where still needed
- If there is only one form of a type, avoid unnecessary numbering.
- If multiple of a type exist, use numbered labels.
- Do not auto-split by location or repeated pattern without review.
- Children/audio-use lyrics should usually be `Lyrics`, not `Verse 1...Verse 6`.

Review markers:

- Review should be meaningful and version-level where possible.
- A sidebar marker should make it clear which version needs attention.
- Do not use noisy double-ring icons; simple `!` is preferred.

## Scripture Rules

Search:

- Support direct references:
  - `창 1:1`
  - `창세기 1장`
  - `창세기 1장 1절`
  - `Gen 1:1`
  - `gen 1 4`
  - `암 4 3`
- Do not auto-switch OT/NT tabs merely because a search result belongs there.
- Text search should show results in the main area, not force the sidebar to become result previews.
- Result count should be accurate, not `100+` unless truly paginated that way with controls.

Copy:

- Multiple verse selection must support Cmd/Ctrl click and Shift range selection.
- Cmd/Ctrl+C should copy selected verses.
- If text inside a selected verse is manually highlighted, copy only the highlighted text.
- Copy format should allow reference/no-reference modes clearly.
- Korean copy example:
  - `히 11:6   믿음이 없이는...`
  - Reference, three spaces, verse text.
- English versions should support the same reference inclusion behavior.

Display:

- Book list should show concise metadata only.
- Chapter count can appear like song version count.
- Metadata panes should share visual grammar with Praise.

## Home / Calendar / References / Order Sheets

Home:

- Home is not a dumping ground. It should clarify the hierarchy:
  - Worship as the main operational area.
  - Activities, Praise, Scripture as major resources.
  - Calendar, References, Order Sheets as home utilities.
- Empty/home verses are data-managed UI verses, not hardcoded copy.
- Current home verse candidates:
  - Amos 5:6a
  - Psalm 29:2
  - Psalm 42:5
- Fallback when service data cannot load:
  - Psalm 27:14, NIV.

Calendar:

- Calendar is a home utility, not part of Praise/Scripture filtering.
- Church year starts should not include dates before 2025-11-30 in active calendar handling.
- Calendar should scroll to the current month when opened.
- Calendar header should show year and series where useful, e.g. `2026 · Series A`.
- Church-year fixed feasts should be visually present but not treated like editable Sunday services.
- Do not show unnecessary labels such as `57 Sundays` unless useful in context.

References:

- References are home utility links.
- Reference links are database-managed, not hardcoded.
- Grouping is needed.
- Groups should be editable and reorderable.
- Links should be editable inline from each card.
- Avoid category/description fields if groups already cover the organizational need.
- References should not have a strong independent accent color unless the design system later calls for it.

Order Sheets:

- Order-sheet generation is a home utility, not the core Worship controller.
- Friday prayer meeting order sheet uses A4 split into two horizontal halves.
- It should be generated from database/service data.

## Activities Direction

Activities should be added inside Mindex, sharing Supabase, theme, and UI system.

Scope:

- Rec games
- Quizzes
- Team games
- Retreat games
- Presenter display

Core data:

- Activity Event
- Game
- Team
- Score Event
- Presenter state

Initial game types:

- Puzzle Hunt
  - Puzzle board.
  - Piece discovery state.
  - Team that found each piece.
  - Score changes.
- Quiz
  - OX, multiple choice, short answer, motion.
  - Question display.
  - Answer reveal.
  - Team score updates.
- Physical Game
  - Timer.
  - Score.
  - Supplies.
  - Owner/person in charge.
  - Location.
  - Memo.

Activity empty verse:

- Psalm 133:1, NIV.
- UI verse structure should match Home/Praise/Scripture, not a one-off implementation.

## UI System Rules

General:

- Match Studex spacing logic, but adapt visually to Mindex.
- Avoid one-off padding values unless there is a clear reason.
- Remove unnecessary borders and strokes.
- Keep hierarchy clear through spacing, type, and subdued backgrounds.
- Avoid too many labels, pills, and explanatory paragraphs.
- Do not use browser-native `title` tooltips for large shortcut/help text.
- Keep button hit areas stable.

Layout tokens:

- Desktop main content horizontal gutter: `25px`.
- Desktop main content top padding: `20px`.
- Narrow screen horizontal gutter: `15px`.
- Narrow screen top padding: `15px`.
- Sidebar open/closed should not change the main content gutter token.
- Reading panes may have max-width; dashboards, grids, lists, and search results should generally use the shared outer gutter.

Topbar:

- Topbar button grid should align with Studex.
- Icon buttons should remain square, normally `32x32`.
- Sidebar, calendar/home utility, theme, and save buttons should use consistent button geometry.
- Inactive module tabs should not retain strong accent colors.
- Active tab can show label and accent.
- If tabs are icon-only while inactive, ensure active label appears clearly.
- Mindex logo should sit vertically centered in the topbar.
- Logo can navigate home, but should not have noisy hover animation.

Sidebar:

- Sidebar element hover/padding should align to the sidebar toggle x-position.
- Sidebar content spacing should feel relaxed, not cramped.
- Sidebars across modules should have consistent y-start and width unless there is a strong reason.
- Sidebar toggle should not make the sidebar/home button jump vertically.

Typography:

- Avoid overly bold subtitles and metadata.
- Metadata labels should share a consistent style across Praise and Scripture.
- Functional UI can be English.
- Worship/service labels may remain Korean.
- Presenter output font choices:
  - Paperlogy may be used for department worship outputs.
  - Do not apply Paperlogy to the whole app by accident.

Color:

- Maintain sufficient contrast in dark and light modes.
- Avoid muddy colors.
- Praise can lean pink.
- Scripture can lean blue.
- Worship can lean warm/olive/gold where appropriate.
- Calendar should not accidentally inherit Scripture blue unless intended.
- References should be neutral unless a strong design reason emerges.

## Testing And Verification

Use the lightest verification that matches the risk, then broader tests before committing or deploying.

Always after JS/CSS edits:

```bash
cd /Users/parkjihun/Mindex
/Users/parkjihun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check app.js
git diff --check -- app.js styles.css index.html
```

Schema/data sanity:

```bash
cd /Users/parkjihun/Mindex
python3 tests/check_supabase_schema.py
python3 scripts/audit_mindex_content.py --json
```

App smoke:

```bash
cd /Users/parkjihun/Mindex
python3 tests/smoke_playwright.py
```

Presenter-specific checks:

- Open Worship/Presenter locally.
- Verify no horizontal overflow.
- Verify slide thumbnails maintain 16:9 and do not resize wildly when count changes.
- Verify double-click thumbnail starts presenter at that slide.
- Verify number input + Enter jumps correctly.
- Verify Space/Right/Down and Left/Up only affect presenter where intended.
- Verify non-chromakey services do not flash chromakey green.
- Verify fonts do not flash from one family to another after output opens.
- Verify output slide matches thumbnail, including background, title, lyrics, and labels.

Praise-specific checks:

- Check song count loads correctly above 1000 if applicable.
- Check Hymns/CCM/Children filters and version-level tagging.
- Check review markers are meaningful and version-level.
- Check metadata editor displays the same data that appears in the list/detail display.
- Check copy/export outputs preserve brackets/original-title conventions.

Scripture-specific checks:

- Search `창 1:1`, `창세기 1장`, `Gen 1:1`, `gen 1 4`, `암 4 3`.
- Multi-select verses with Cmd/Ctrl and Shift.
- Copy selected verses with Cmd/Ctrl+C.
- Copy with and without references in Korean and English.
- Verify chapter-level copy.

Calendar/Home/Reference checks:

- Calendar opens at current month.
- Calendar does not show pre-2025-11-30 active church-year data unless intentionally in historical view.
- References list loads from DB.
- Reference group edit/reorder works.
- Home integrated search stays available when opening Calendar/References.

Activities checks:

- Activity tab empty state uses the same UI verse system as Home/Praise/Scripture.
- Event/team/game tables exist before exposing editing controls.
- Score changes should create score-event rows, not only mutate totals.

Deployment sanity:

- Localhost passing does not guarantee GitHub Pages has updated.
- If GitHub Pages does not show fresh changes, confirm commit/push and Pages build status.
- External access needs anon Supabase config to be available through approved link/config path.
- Do not expose service role keys in public links or client code.

## Current Split For Future Threads

Use three focused threads:

1. Presenter / Worship
   - Live service operation, service components, templates, presenter output, order/PPT matching.

2. Database / Praise / Scripture
   - Song metadata, song forms, hymn/CCM/children tagging, Bible search/copy, scripture metadata.

3. Shell / Home / Utilities / Activities
   - App shell, navigation, home, calendar, references, order sheets, activities.

Each thread should read this document first, then inspect current files before editing.

## Final Reminder

The user values practical church usability over technical cleverness. Make the app calmer, faster, clearer, and safer. Preserve curated data. When uncertain, inspect the source data and ask only when a wrong automatic edit could damage real worship material.
