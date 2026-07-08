# Mindex Admin Access Security

Read `HANDOFF.md` first. This note defines the long-term external administrator
link model for Mindex.

## Current Lightweight Model

The static app can be opened with a browser-safe Supabase anon key. This is
convenient, but it means any browser that has the link has the same permissions
as the anon role allowed by RLS.

This is acceptable only as a temporary trusted-link model.

## Target Model

Use Supabase Auth for administrator access:

1. Enable Supabase Auth email login.
2. Add the GitHub Pages URL and localhost URL to Supabase Auth redirect URLs.
3. Invite or create accounts for worship/Praise/Scripture administrators.
4. Run `scripts/admin-auth-rls.sql` in Supabase SQL Editor.
5. Open/share Mindex with `auth=required` in the hash:

```text
https://<github-user>.github.io/<repo-name>/#supabaseUrl=<PROJECT_URL>&supabaseAnonKey=<ANON_KEY>&auth=required
```

For private hosting, injected config can use the same option:

```html
<script>
  window.MINDEX_SUPABASE = {
    url: "https://project.supabase.co",
    anonKey: "<ANON_KEY>",
    authRequired: true
  };
</script>
```

## RLS Contract

After `scripts/admin-auth-rls.sql`:

- `anon` can read shared app data.
- `anon` insert/update/delete grants and shared write policies are removed from
  editable Mindex tables.
- `authenticated` can insert/update/delete editable Mindex tables.
- Bible verse/book/translation tables remain read-only from the browser.
- Presenter read views remain readable by `anon` and `authenticated`.
- Server-side imports and GitHub Actions should keep using server-side secrets
  or narrow RPC contracts, not browser write access.

## Important

Do not put a service role key in client code, GitHub Pages, screenshots, issues,
or shared URLs. The anon key is browser-safe, but RLS decides what that key can
do.
