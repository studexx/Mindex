# Version Name Preservation

Decision: 2026-09-12.

Explicit praise version names are user data, not localization keys. Preserve
nonempty names (including Default, default and 버전 1) through editing,
display, serialization and reload. Trim surrounding whitespace only.

New default versions and empty editor values continue to use 기본. Do not
infer whether an existing name was generated from its spelling, or rewrite
existing database rows. Previously replaced names cannot be recovered by
this change alone.

Verification: tests/smoke_korean_default_version.py.
