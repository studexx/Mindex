# Mindex

Mindex is a ministry index prototype. The current modules are `Praise` for song
forms and projection exports, and `Scripture` for storing and copying Bible
passages.

## Collaboration Link

Mindex can be shared as a static GitHub Pages app. Share collaborators a link
with the Supabase project URL and browser-safe anon key. Prefer the `#` format
because it is read only by the browser:

```text
https://<github-user>.github.io/<repo-name>/#supabaseUrl=<PROJECT_URL>&supabaseAnonKey=<ANON_KEY>
```

Use only the Supabase anon key in browser links. Never put a service role key in
GitHub, GitHub Pages, screenshots, issues, or shared URLs.

The app also reads a local injected config if you host it somewhere private:

```html
<script>
  window.MINDEX_SUPABASE = {
    url: "https://project.supabase.co",
    anonKey: "<ANON_KEY>"
  };
</script>
```

## Run

Use the included no-cache server (changes reflect on Cmd+R):

```sh
python3 serve.py
```

Then open:

```text
http://localhost:4173
```

## Supabase

Run `supabase-schema.sql` in the Supabase SQL editor first.

The app accepts Supabase config in these ways:

1. Add hash params: `#supabaseUrl=...&supabaseAnonKey=...`
2. Add query params: `?supabaseUrl=...&supabaseAnonKey=...`
3. Inject `window.MINDEX_SUPABASE` before `app.js` loads.

Settings are intentionally not shown in the app UI because collaborators should
enter through a prepared link.

The app still remembers a link-provided config in browser `localStorage` after
it loads.

## Data Source

Content data lives in Supabase. Do not keep lyrics, Bible text, worship setlists,
or other ministry content in generated seed files. Repository files should define
schema, import tools, and UI behavior; content changes should be written to the
database.

## GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Select the branch, usually `main`, and folder `/root`.
5. Open the published URL and append the Supabase query params from the
   collaboration link format above.

## Theme

Mindex follows the system light/dark setting by default. Toggle manually with
`Cmd/Ctrl + Shift + L`, matching Studex and Notion-style theme switching.

## Form Label Rules

- Allowed types: `Verse`, `Chorus`, `Pre-Chorus`, `Bridge`, `Coda`
- A single type has no number: `Verse`
- Multiple blocks of the same type are numbered by structural order: `Verse 1`, `Verse 2`
- `display_label` is calculated by the app from `part_type` and `part_number`
- Hymn `Amen` endings use `Coda`

## Praise Classification

`hymn_no` is only the hymn number metadata. The song list filters use praise
types instead: `hymn`, `ccm`, or both. Existing songs are inferred so hymns still
appear under `Hymns` and non-hymns under `CCM`. Songs that were CCM before hymn
book inclusion can store `ccm` in `praise_types`; with a `hymn_no`, they appear in
both filters.

## Praise Metadata

Song metadata uses direct `mindex_songs` columns for fields that are edited often.
The app still reads older `mindex_songs.memo.metadata` values as a fallback, then
saves promoted fields back to columns when those columns exist.
Currently supported promoted fields are:

- `other_title`
- `praise_types`
- `artist`
- `lyricist`
- `composer`
- `credits`
- `album`
- `track`
- `scripture_refs`

When `lyricist` and `composer` are identical, the app displays them as
`Words/Music`.

## Copy / Projection

The Forms view keeps only the current working exports:

- `Text`: copies lyrics with song form labels such as `[Verse 1]` and `[Chorus]`
- `Show`: downloads the selected version as a FreeShow `.show` file
- `XML`: downloads the selected version as a simple XML file

The Scripture view stores a title, Bible book, reference, translation, passage
text, and note. Bible books are classified in `mindex_scripture_books`.
`english_name` is the compact book name, such as `1 Samuel`;
`canonical_english_title` is the formal full name, such as `First Book of
Samuel`. Book metadata is prepared for broader corpora with optional `corpus`,
`canon`, `book_group`, `osis_code`, `usfm_code`, and flexible `metadata` columns.

The Notion export source has been normalized into `data/scripture-books.csv`.
Future Bible XML imports should write a row to `mindex_bible_translations` and
verse rows to `mindex_bible_verses` keyed by `translation_id`, `book_code`,
`chapter`, and `verse`. These verse tables are read-only for browser links;
imports should use a server-side/service-role script. `Text` copies the passage
with its heading. `Slides` copies blank-line separated passage blocks with
`[Scripture n]` labels.

Import EasySlides XML Bible files after running `supabase-schema.sql`:

```sh
python3 scripts/import_bible_xml.py "/path/to/성경(.xml).zip" --dry-run
python3 scripts/import_bible_xml.py "/path/to/성경(.xml).zip"
```
