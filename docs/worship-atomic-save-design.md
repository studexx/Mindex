# Atomic Worship Save Design

Status: proposed implementation contract, 2026-09-10. Not deployed. This document
does not authorize a production migration, permission change or data rewrite.
See [current implementation](worship-persistence-current.md) for verified gaps.

## Decisions

- One worship instance is the transaction boundary. Do not save siblings,
  canonical Praise/Scripture, service-type defaults or Storage objects inside it.
- Preserve current UUIDs, labels, user exceptions, JSON extension fields and
  canonical links. No label normalization or curated-data cleanup in this change.
- Phase 1 atomically commits existing rows and their document together; it does
  not claim to complete the separate source-text-only migration.
- A full save commits the frozen whole-service draft. An element Apply commits
  that element only, with the document rebuilt from the last committed aggregate
  plus that change. Other unsaved drafts remain local and dirty.
- Stale writes are conflicts, not automatic last-writer-wins or silent merges.
- No fallback to legacy multi-request writes after an atomic request fails.

## Aggregate and revision

Proposed authoritative concurrency token: `services.save_revision bigint`,
server-owned, nonnegative, returned as a decimal string over JSON. Every accepted
aggregate mutation increments it exactly once; `updated_at` remains an audit
timestamp, not the compare-and-swap token. Returning bigint as a string avoids
loss of precision in JavaScript.

The aggregate consists of the service's editable metadata, persisted sections,
elements (including suppression markers), any already-persisted slide rows,
and `source_ref.mindexServiceDocument`. Existing slide rows must be preserved
even though the current client normally generates document slides instead.
Removing an element explicitly removes its dependent slide rows in the same
transaction. Absence from a partial payload never means deletion.

The first aggregate read must return metadata, rows and revision from one
consistent DB snapshot. A proposed `get_worship_service_v1` read RPC should
return a single aggregate result; do not assemble a base from independently
fetched revisions. Lists can remain lightweight. Saves return the committed
aggregate and token so the client never has to guess its new baseline.

## Request contract

Proposed POST RPC: `save_worship_service_v1(request jsonb)`.

| Field | Meaning |
| --- | --- |
| `protocolVersion` | Exactly `1`; reject unsupported versions. |
| `serviceId` | Existing UUID, or a client-allocated UUID for an explicit create. |
| `requestId` | UUID allocated once per frozen request; retained on retry. |
| `operation` | `create`, `replace`, `element`, or `delete`. |
| `expectedRevision` | Required decimal string for existing services; null only for create. |
| `metadataPatch` | Explicit editable fields only; absent means preserve, null only where allowed. |
| `sectionUpserts`, `elementUpserts` | Exact intended changes with stable IDs. |
| `deletedElementIds`, `deletedSectionIds` | Explicit delete intent; absent/empty deletes nothing. |
| `document` | Document computed from the intended committed aggregate, not global UI state. |
| `baseContentSignature` | Diagnostic link to client baseline; not a replacement for revision CAS. |

For `element`, require one target element ID, no unrelated element writes,
metadata edits or structural deletions. Update a section only when required to
place that element and explicitly requested; never implicitly rewrite its person,
title or order from stale item state. Structural editing uses `replace`.
For `replace`, validate the intended final ID manifest, explicit deletes and
preserved rows together. An omitted saved row must not disappear implicitly.
For `delete`, no replacement payload is accepted; record a recovery revision and
delete the service and children atomically. Keep the request receipt/tombstone.
For `create`, a colliding service UUID or business identity is a conflict, not
permission to overwrite the existing service.

Server rejects client-written revision, timestamps, recovery history, receipt
metadata and permission fields. Unknown request fields are rejected, while
existing stored JSON extension fields are preserved. Known JSON deletions use
explicit deletion paths, not omission. Reserved document/history keys are
handled separately from non-document source_ref metadata.

## Transaction algorithm

1. Authenticate/authorize the actor for the specific service and operation.
   Validate protocol, payload size/depth and request ID before expensive work.
2. Serialize requests for this service, including create/delete/missing-row
   cases. Use one transaction-scoped lock strategy for every entry point, then
   lock the existing service row. Use deterministic lock order for related rows.
3. Look up `(service_id, actor_id, request_id)` in the private receipt store.
   Compare a server-computed canonical JSONB request digest. Same request returns
   the prior committed receipt; changed payload with the same ID is rejected.
   Authorize before replay; receipts must not leak another actor's data.
4. Compare expected revision with the locked row. Stale input returns conflict
   without modifying rows, document, history or receipt. Create requires absence.
5. Validate the complete resulting aggregate against current DB references and
   ownership. Check requested section/element IDs against the database, not only
   against IDs supplied by the client. Do not reparent another service's rows.
6. Derive/preserve the committed document under the document rules below. Store
   the prior committed aggregate as a recovery checkpoint in the same transaction.
7. Apply section/element changes, intended child deletions and metadata/document
   update. Advance revision once, assign server timestamps, and write the receipt.
8. Return the committed revision and canonical aggregate. An exception at any
   stage rolls back all effects. Do not catch an error and return success after
   partial writes. A transaction timeout is not permission for legacy fallback.

For foreign references, ordinary FK existence is insufficient for semantic pairs.
The actual song/version mapping must follow `source_song_id` and canonical mapping
rules; `song_id == canonical_song_id` is not a valid general assumption. Confirm
the current resolver before implementing this check. Lock or otherwise protect
referenced rows against concurrent canonical deletion during the commit. Imports
and canonical deletes that affect Worship must participate in aggregate revision
invalidation or be blocked during the write-only-RPC rollout.

## Document consistency and single-element Apply

Refactor document/slide building to accept an explicit immutable aggregate rather
than reading `state.serviceItems` or current presenter globals. For an element
save, derive the candidate from baseline + target patch; do not render or persist
another dirty item. For full save, build once from the frozen full draft.

Server validation must establish that document sourceRecords refer to existing
final elements/sections, have matching identities/links and represent the saved
content. A client-supplied hash alone proves nothing about consistency. Preserve
unknown exception metadata and intentional text spelling. Do not reparse arbitrary
natural language to establish ownership.

The first implementation may keep client-derived display/source text, but must
define a versioned canonical content projection the server can validate against
final rows. If that projection is not yet implementable, phase 1 may protect
atomicity/concurrency only and must explicitly report document semantic validation
as incomplete; do not advertise a single source of truth prematurely.

## Client lifecycle and retry

- Keep committed baseline, local draft and pending immutable request separate.
  Building a payload must not mutate the committed `_worshipSourceRef`.
- Preserve request ID and exact request bytes/digest across uncertain network
  outcomes. Retry with the same request, not a regenerated timestamp or fresh ID.
- A newer edit made while saving stays dirty. Apply the receipt to the baseline,
  reconcile stable IDs, and clear only the local edits captured by that request.
- If a replay returns an older committed revision than a later save, never move
  the baseline backward. Read the latest aggregate and retain local edits.
- Conflict retains local draft and offers comparison/reapply against latest data.
  Reapply is a new explicitly reviewed request, not automatic overwrite.
- Permission errors, validation errors, conflicts, timeouts and transport errors
  must be distinguishable. Keep the existing local recovery snapshot as an extra
  safeguard, not proof that the server committed.

## History, receipts and capacity

Do not add another unlimited copy of every slide document. Initially preserve the
existing bounded document history and add one server-owned previous-aggregate
checkpoint per live service; replace that checkpoint atomically on successful save.
Keep deleted-service checkpoints separately until a user-approved retention policy
exists. These include text/metadata/URLs, never binary media. No automatic deletion
of current recovery history is part of rollout.

Receipts retain identity/digest/result revision even after bulky response payloads
expire. An expired exact replay returns committed status plus a latest-read request,
not another mutation. Retention of the lightweight receipt identity must be defined
before enabling retry; pruning it blindly permits duplicate create/delete replay.
Measure projected DB/index growth before enabling the new tables. DB space-saving
maintenance and history-retention policy remain separate decisions.

## Access control and rollout gate

Current `scripts/admin-auth-rls.sql` names policies "admin" but grants writes to
the authenticated role with true predicates. That does not prove an administrator
allowlist exists. Inspect live policies and the login workflow first. Do not grant
the new RPC to all anonymous callers or assume all authenticated users are admins.

An invoker function cannot write once callers lose direct table DML rights.
Proposed final boundary is a tightly scoped SECURITY DEFINER function owned by
a dedicated non-login role with only necessary table privileges, fixed safe
search_path and schema-qualified references, explicit actor authorization, and
PUBLIC execution revoked. Exact authorization predicates and grants are a launch
blocker until reviewed. No browser service-role credentials; no client-set flag
or custom GUC is accepted as a privilege boundary.

All direct writers must be inventoried and migrated before enforcement:

| Existing path | Required change |
| --- | --- |
| Full save / element Apply | New aggregate RPC with committed baseline and revision. |
| `createService` / automatic scheduling | Explicit create operation with idempotency and existing date/type exceptions preserved. |
| `deleteService` / automatic unavailable-service purge | Revision-aware delete, checkpoint and atomic cascading child deletion. |
| `persistSharedSundayServiceItems` | Remove only if proven unreachable, otherwise route through the same contract; no sibling implicit writes. |
| Templates, restore, imports, admin scripts | Use controlled aggregate operations; no hidden table-write bypass. |
| Canonical deletion / FK SET NULL cascades | Invalidate affected service revisions or restrict until that path is covered. |
| Service-type defaults | Separate versioned operation; never imply rollback with an instance save. |

Rollout sequence: read-only catalog audit -> disposable local DB failure and
concurrency tests -> staging using synthetic fixtures -> additive schema installed
with RPC unexposed -> client protocol support -> authorized cutover window ->
revoke legacy direct writes and expose authorized RPC -> verify old-client denial
and new-client success -> enable normal use. Reads/presenter remain available.
Do not claim protection while old direct writers can still bypass revisions.

Rollback uses the last RPC-compatible client or temporary read-only editing mode.
Do not restore unsafe legacy write grants or roll back user rows to deploy code.
Keep new revisions/checkpoints until a separately reviewed removal plan exists.

## Required acceptance tests

| Scenario | Required result |
| --- | --- |
| Failure at each DB write stage | No aggregate, revision, history or receipt changes. |
| Two clients saving same revision | Exactly one commit; other receives conflict. |
| Network lost after commit, exact retry | One revision increment; same committed receipt. |
| Same request ID, changed payload | Rejected without writes. |
| Element Apply with sibling dirty draft | Only target persists; sibling stays dirty and absent from committed document changes. |
| New local edit during request / late receipt | No local draft overwrite or backward baseline revision. |
| Foreign section/element ID or wrong canonical pair | Rejected atomically; other service unchanged. |
| Explicit remove vs omitted item | Only explicit intent deletes; retained content/suppression survives. |
| Unknown JSON fields / repeated labels / user exceptions | Preserved; UUID/slot identity remains stable. |
| Empty create, duplicate create, delete retry | Deterministic safe result and recoverable checkpoint. |
| Anonymous/non-admin/old direct client | Unauthorized writes rejected without affecting read/presenter access. |
| Restore from checkpoint | New revision, not silent rewind; identity/link/asset references intact. |
| Auth failure/lock timeout/FK race/payload limit | No partial commit; draft retained; useful distinct error. |

Existing offline characterization tests remain until replaced by real PostgreSQL
integration tests that demonstrate these guarantees. A mock transaction passing
is not evidence of database rollback, privilege isolation or lock behavior.

Technical references: [PostgREST transaction boundaries](https://docs.postgrest.org/en/stable/references/transactions.html),
[PostgreSQL function security](https://www.postgresql.org/docs/current/sql-createfunction.html).
