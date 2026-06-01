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
    anonKey: "eyJ..."
  };
</script>
```

## Run

Use any static server from this folder:

```sh
python3 -m http.server 4173
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

## PPT Draft

The PPT Draft tab creates reviewable draft data:

- one `title` slide
- multiple `lyrics` slides
- stable fields: `slide_type`, `label`, `text_lines`, `form_id`, `chunk_index`
- a fixed template marker: `template_version: "mindex-lyrics-v1"`

The `Export PPTX` button uses PptxGenJS in the browser to create a fixed-template
`.pptx` draft. The generated deck is intentionally simple: one title slide and
centered lyric slides with text replacement only.

## Copy / Projection

The Forms view keeps only the current working exports:

- `Text`: copies lyrics with song form labels such as `[Verse 1]` and `[Chorus]`
- `Show`: downloads the selected version as a FreeShow `.show` file
- `XML`: downloads the selected version as a simple XML file

The Scripture view stores a title, Bible book, reference, translation, passage
text, and note. Bible books are classified by canonical order, testament,
Christian category, Jewish category, canonical English title, and author in
`mindex_scripture_books`. The Notion export source has been normalized into
`data/scripture-books.csv`. `Text` copies the passage with its heading. `Slides`
copies blank-line separated passage blocks with `[Scripture n]` labels.
