# Mindex Electron Packaging Plan

Mindex keeps the existing web UI as the renderer. Electron is only responsible for the desktop shell: stable Chromium runtime, native presenter windows, app updates, and later native helpers.

## Goals

- Same UI code as the web version.
- Windows-friendly installed app for non-technical users.
- Presenter output opens as a native fullscreen window, not a browser popup.
- Supabase remains the source of truth.
- Local storage is cache only and can be discarded when cache versions change.
- Updates should feel simple: notify, download, restart.

## Architecture

```text
Electron main process
├─ loads static app over mindex://app/index.html
├─ creates controller BrowserWindow
├─ creates fullscreen presenter BrowserWindow
├─ owns auto-update lifecycle
└─ exposes a small preload bridge

Renderer
├─ existing index.html/app.js UI
├─ Supabase client with anon key only
├─ BroadcastChannel presenter state
└─ optional Electron bridge when installed app is running
```

## Update Strategy

Mindex uses GitHub Releases (`studexx/Mindex`) through `electron-updater`.
Packaged apps check on startup, show an update prompt, download only after the
operator confirms, and install on restart. Set `MINDEX_DISABLE_UPDATES=1` only
when an installed test build must stay offline. Dev builds never check.

Every release must be built with `pnpm electron:release`. It stops before
publishing unless all of these are configured:

1. `GH_TOKEN` for the GitHub Release upload.
2. `CSC_LINK` and `CSC_KEY_PASSWORD` for the Developer ID Application certificate.
3. Apple notarization credentials: API key (`APPLE_API_KEY`, `APPLE_API_KEY_ID`,
   `APPLE_API_ISSUER`), Apple ID/app-specific password, or a keychain profile.

The macOS artifact must be Developer ID signed and notarized. A local
`electron:pack` build is for testing only and must not be distributed.

## Data And Schema

Supabase is the primary database. Electron should not add a competing local database.

Local data is limited to:

- Supabase session/cache managed by the client.
- Last opened screen state.
- Media/cache files if needed later.

Schema changes should be backward-compatible first. Old cache can be invalidated by a cache version instead of migrated.

## Release Provider To Decide Later

- GitHub Releases: easiest if the repository can host public or private releases.
- S3-compatible storage: good for controlled church/internal distribution.
- Generic HTTPS server: simple if there is an existing hosting place.

Do not embed service role keys or private Supabase secrets in the desktop app.
