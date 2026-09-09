# Supabase capacity maintenance

## Scope (2026-09-09)

Only the redundant `public.mindex_bible_verses_lookup_idx` is a removal target.
Do not delete worship content, source documents, recovery history, translations,
media files or historical setlist import records as part of this maintenance.
Storage objects without a current reference are candidates, not proven garbage:
drafts, external links and recovery references require separate review.

The audited index uses the same B-tree keys, operator classes, collations,
ordering and unfiltered predicate as the valid UNIQUE constraint index
`mindex_bible_verses_translation_id_book_code_chapter_verse_key`.
The ordinary index occupied 56,295,424 bytes. Preserve the UNIQUE index even
though its observed scan count was lower. Scan counts alone do not prove that
an index is unnecessary. Preserve the active-only and book/chapter indexes.

## Preflight

Run read-only checks on the target database immediately before maintenance.
Do not proceed if either index is invalid/unready, their definitions differ
beyond uniqueness, or the ordinary index backs a constraint/replica identity.
Do not proceed if unrelated schema maintenance is in progress.

```sql
SELECT c.relname, pg_relation_size(c.oid) AS bytes,
       i.indisvalid, i.indisready, i.indisunique, i.indisreplident,
       i.indkey::text, i.indclass::text, i.indcollation::text,
       i.indoption::text, pg_get_indexdef(c.oid), con.conname
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
LEFT JOIN pg_constraint con ON con.conindid = c.oid
WHERE i.indrelid = 'public.mindex_bible_verses'::regclass
  AND c.relname IN (
    'mindex_bible_verses_lookup_idx',
    'mindex_bible_verses_translation_id_book_code_chapter_verse_key'
  );

SELECT pg_database_size(current_database()) AS db_bytes,
       (SELECT count(*) FROM public.mindex_bible_verses) AS bible_rows,
       (SELECT count(*) FROM public.mindex_worship_services) AS services,
       (SELECT count(*) FROM public.mindex_worship_elements) AS elements;
```

Record representative Bible chapter/range results and their EXPLAIN plans.
Then execute the migration statement alone, without a transaction wrapper.
`CONCURRENTLY` allows normal reads/writes while waiting for conflicting
transactions. If the executor rejects it, do not substitute a blocking DROP.
If interrupted, inspect index existence/validity before retrying.

## Verification and recovery

Repeat the counts and physical size query. Verify the redundant index is gone,
the UNIQUE constraint/index remains valid, and representative chapter/range
queries still return the same results using retained indexes. Check application
Bible loading through its normal API. Counts may change independently during
live editing; investigate differences, do not overwrite concurrent edits.
Dashboard billing measurements can lag behind the physical database size.

If an unexpected query regression is attributable to the removal, recreate
the original index alone, outside a transaction:

```sql
CREATE INDEX CONCURRENTLY mindex_bible_verses_lookup_idx
ON public.mindex_bible_verses (translation_id, book_code, chapter, verse);
```

Recreation requires free disk space and takes time; it is not an instant undo.
Do not run recovery when an index of that name already exists without checking
its state. No data restore is needed for this index-only maintenance.

References: [unique indexes](https://www.postgresql.org/docs/current/indexes-unique.html),
[concurrent removal](https://www.postgresql.org/docs/current/sql-dropindex.html).
