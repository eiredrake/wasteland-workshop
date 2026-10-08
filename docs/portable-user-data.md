# Portable user data: persistence audit and proposed backup design

Implementation update (2026-10-08): full backup/restore is now implemented. See [the implementation report](backup-and-restore.md) for the shipped controls, schema, recovery design, tests and remaining physical-device checks. The investigation below records the earlier findings.

Date: 2026-10-07. Application inspected: 0.4.6. Repository: eiredrake/wasteland-workshop.

## Decision

Complete the investigation first; do not expose destructive full restore yet. Current readers can silently replace unreadable data with defaults, collection records are not validated, Build snapshots are incompletely validated, and independent persistence keys have no coordinated commit/recovery mechanism. Existing Warehouse readers reject unknown canonical IDs, making recoverable stale inventory incompatible with normal loading. These are concrete safety gaps rather than an unresolved replace-versus-merge preference. The work order explicitly directs stopping before destructive import when significant data-loss risks are found.

No user data was imported, exported, overwritten, or transmitted during this investigation. No issue was closed. Only this report and four non-destructive characterization tests were added. Export/restore UI and end-to-end phone transfer remain unimplemented.

## Complete persisted inventory

Repository-wide searches found localStorage only for user persistence. No IndexedDB, sessionStorage, cookie persistence, or additional storage wrapper was found. Keys are origin-specific; HTTP, HTTPS, and different host/port combinations hold separate data.

| Browser key | Actual user state | Current schema / reader |
|---|---|---|
| wasteland-workshop-blueprint-collections | Collection IDs, names, entries with blueprintId and acquired/to-acquire/sell status | Unversioned array; BlueprintCollectionRepository. Reader checks only Array.isArray; malformed JSON becomes []. |
| wasteland-workshop-active-blueprint-collection | Active collection ID | Plain string in a separate key. App resolves it using find; stale IDs result in no active collection. |
| wasteland-workshop-shopping-lists | All list IDs/names, resource/requirement rows, resourceId, stored name, quantity, acquired boolean, optional structured requirement; activeListId | Version 1 object; ShoppingListRepository validates rows, combines duplicate resource IDs and reconstructs known ingredient choices. Any loading error becomes {lists:[]}. Invalid active ID is omitted. |
| wasteland-workshop-warehouse | Credits plus concrete itemId/quantity/expirationDate lots | Version 2; version 1 accepted as undated. WarehouseRepository rejects invalid quantities, duplicate item/date lots, selectors/unknown IDs and dates on currency. Errors preserve raw storage and disable editing through useWarehouse. |
| wasteland-workshop-economics-settings | Actual global overrides and resourceValues overrides | Version 1 {overrides}; older unversioned effective settings have a migration. EconomicsSettingsRepository sanitizes/drops invalid fields, unknown fields and selector valuations; malformed/unsupported state becomes {}. |
| wasteland-workshop-alarm-settings | Sound and vibration preferences | Unversioned {sound,vibration}; invalid/missing booleans individually default true. No stored browser capability/permission. |
| wasteland-workshop-warehouse-settings | expirationWarningDays | Version 1; whole days 0..3650; missing/corrupt/unsupported data defaults to 30. |
| wasteland-workshop-build-queue | Ordered Builds and completed history, IDs, blueprintId/name, copied recipe, economicSnapshot, overrides, notes, status, timer, createdAt/startedAt/completedAt | Version 1 {builds}; BuildQueueRepository checks several invariants, sanitizes overrides, advances Working deadline on load. Raw invalid storage is preserved; edits disabled by useBuildQueue. |

There are **eight keys**, including the active-collection selection key. There are seven persisted domain categories if collections and their selection are counted together.

Global override names: mindCostPerPoint, timeCostPerMinute, resolveCostPerPoint, foragingCardCost, defaultMarkupPercent, resourceValues keyed by canonical numeric item ID.

Shopping-list Blueprint acquisition targets are derived from the active Blueprint Collection's to-acquire entries. They are not separate persisted shopping rows. Restoring collections/statuses restores these targets.

Build history is part of the same ordered Build array, not another store. Build recipe and economic snapshot are captured historical values; preserve them even when current catalog/defaults change. This legitimate per-Build snapshot is different from embedding the complete shipped catalog in every backup.

## Deliberately excluded state

Static Juno Blueprint/resource catalogs, taxonomy tables and shipped economic defaults are application data. Do not export them. Menu/view selection, search/filter/sort values, open detail panels, Toast messages, form drafts, timerBuildId, audio context/unlock status and capability detection are transient. There is no independently persisted standalone timer; App derives craftTimer from the current Working Build or creates an idle timer. No Ledger, sales/customer orders, account sync or inventory reservations were found.

## Inconsistencies and reproducible safety gaps

- Collections bypass record validation entirely and have no schema version. Collections and active selection are separate writes.
- Shopping and settings loaders recover silently. A full export built from their return values could certify corrupt data as a valid empty backup. Import adapters must distinguish absent storage from unreadable storage and reject the latter.
- Economics sanitization is appropriate for interactive recovery but inappropriate for claiming a complete backup: unknown fields or invalid overrides must be reported instead of silently discarded.
- Shopping parser combines duplicate rows and derives choices from the current catalog. Backup parsing must explicitly define migrations and reject accidental duplicate rows rather than silently changing user quantities.
- Warehouse requires current catalog membership. A structurally valid backup with an old item ID cannot currently be restored as an unresolved lot. Retaining the input file alone is not enough if the UI claims every record was restored.
- Build validation does not completely validate component metadata, final-product structures or override fields. A passing local reader does not guarantee later rendering/calculation is safe.
- Feature hooks and App hold separate snapshots; a restore that only changes localStorage leaves mounted UI/timer state inconsistent and can overwrite restored data on later actions.
- Seven domain repositories write eight keys independently. A quota/security failure or reload midway through restore can leave mixed old/new data. Best-effort rollback itself can fail. Multiple open tabs can continue writing old state.

Four investigation tests reproduce collection acceptance of malformed entries, silent shopping corruption fallback, silent unsupported economics fallback, and rejection of a stale Warehouse ID. These characterize current behavior; they are not desired future backup contracts.

## Proposed public format (schemaVersion 1)

Use a typed domain model, independent of browser keys. Required fields: format='wasteland-workshop-backup', schemaVersion=1, appVersion, exportedAt (valid ISO timestamp), data. All domain sections are required, even when empty. No ambiguous partial backups.

Suggested shape:

```json
{
  "format": "wasteland-workshop-backup",
  "schemaVersion": 1,
  "appVersion": "0.4.6",
  "exportedAt": "2026-10-07T22:00:00.000Z",
  "data": {
    "blueprintCollections": {"collections": [], "activeCollectionId": null},
    "shoppingLists": {"lists": [], "activeListId": null},
    "warehouse": {"credits": 0, "entries": []},
    "settings": {
      "economicsOverrides": {},
      "alarm": {"sound": true, "vibration": true},
      "warehouse": {"expirationWarningDays": 30}
    },
    "buildQueue": {"builds": []}
  }
}
```

Collections preserve all three statuses. Shopping rows preserve resource/requirement kind, canonical ID, quantity, acquired flag and stored label; serialize choice data as a minimal qualifying-ID/label snapshot if needed to retain historical interpretation. Warehouse preserves exact lots and dates, including legacy undated lots. Economics exports only actual overrides; Build economicSnapshot intentionally preserves captured effective values. Zero, false, empty names/notes where valid, empty arrays and empty overrides are valid values, not missing sections.

Keep Build recipe snapshots in v1 to avoid silently repricing/replacing historical Builds with today's recipe. Define and validate their complete nested schema instead of treating them as arbitrary JSON. Global catalogs remain excluded.

## Validation and migration boundary

Implement pure parseBackup -> migrateBackup -> validateBackup -> prepareRestore. These return a complete typed candidate plus explicit warnings without writing storage. v1 passes through an explicit identity/normalization migration; future versions add sequential migrations. Reject newer schema versions with an upgrade explanation. Reject unknown sections/fields initially rather than claim success while discarding data. Future extensibility must include preservation rules and a corresponding version change.

Validate finite nonnegative quantities, safe integer IDs, enum values, duplicate IDs/lot identities, ISO dates, currency/date rules, unique collection/list/Build IDs, nested recipe/snapshot/override types, timer/status consistency, maximum one Working Build, valid timestamps and bounded file size/record counts. Cross-check canonical references separately from structural validity. Invalid active selections can be cleared with an explicit warning; no other user rows should silently disappear.

Known older local schemas are migrated by storage adapters before producing the public domain model. Local Warehouse v1 -> dated-lot v2 is distinct from backup schema v1. Do not mistake feature export version 1 for full backup schema version 1.

## Restore semantics and recovery

First release: **replace only**. Imported state replaces every supported domain, including zero balances and empty lists. No quantity addition, array concatenation, name-based deduplication or merge. Merge requires a separately designed conflict-resolution workflow.

UI in Settings / Data: Export All Data, Share Backup when supported, Import / Restore Data. File selection validates the whole candidate, then shows counts, timestamp/app version, warnings and a prominent replacement message. Include Export Current Data First. Restore proceeds only after explicit confirmation. Cancel leaves all state intact.

Recommended storage preparation: introduce an application-level generation coordinator that all repositories read/write through, or migrate to a single unified persisted user-state envelope. A prepared generation can be written and checked before atomically changing the active-generation pointer. Bootstrap resolves recovery before mounting App; keep the previous generation until success and offer recovery. Eight direct writes plus catch/rollback is not sufficient crash safety.

Alternative: an IndexedDB transaction can atomically replace all supported stores, but moving persistence must preserve/migrate old localStorage before deleting it. Do not change storage systems solely for the public JSON format; choose the smaller safe coordinated implementation after measuring migration effort.

Freeze timers and edits during commit, invalidate/remount feature state after success, and prevent stale other tabs from writing via a shared generation revision. Failed staging/commit must retain the old authoritative state. Raw recovery snapshots, if used internally, are private recovery artifacts, not the portable public format. If current state is unreadable, offer recovery/raw diagnostic preservation rather than create a misleading empty safety backup.

## Working timer portability

Current Build timers have an absolute endTimeMs and calculated remainingMs. Normal reload advances to completion using that deadline. It must not be reused unmodified for a delayed cross-device restore.

Proposed export policy: take a non-mutating snapshot at exportedAt; calculate max(0, endTimeMs-exportedAt). A timer already elapsed at export becomes Completed with its saved deadline as completedAt. A still Working timer becomes Paused in the portable snapshot, removes endTimeMs, and keeps exact remainingMs, original duration and startedAt. Original device continues normally. Clearly tell users that backup pauses active work in the copy only.

Restore never subtracts transfer time or starts an alarm automatically. Future restore-time normalization also converts any supported incoming Working record using the backup timestamp, then pauses it. Only explicit start resumes on the target device. Test delayed import, elapsed-at-export, adjusted timers, zero-duration recipes, repeated export, and source-state immutability. Keep at most one Working Build invariant even though canonical exported copies have none. Existing Completed history and queue order are preserved.

## Stale references

Validate canonical IDs without guessing by name. Known selectors are valid shopping requirements, never inventory. Collection/Build references to removed Blueprints, old concrete shopping items and old Warehouse IDs are recoverable user data.

Required by the user's follow-up: structurally valid unresolved references must survive restore. Reject malformed IDs (nonpositive, fractional, unsafe or nonnumeric), but preserve unknown positive safe-integer IDs, quantities, statuses, notes and history. Missing catalog membership is a warning, not invalid user data. The earlier proposed reject-on-unresolved policy is superseded.

Implement unresolved-record support before full restore. Warehouse must load/store unknown IDs without assuming an InventoryCatalog lookup exists; show Unknown Item #ID / Catalog entry unavailable, preserve dates and quantities, and exclude unresolved stock from craftability. Collections and shopping rows must retain entries and show Unknown Blueprint #ID or Unknown Resource #ID rather than filter them away. Builds preserve Blueprint references and historical snapshots; unavailable current definitions must not erase history or trigger substitutes. Resource valuation overrides preserve structurally valid unknown IDs as user values, while known recipe selectors remain excluded from concrete-resource valuations.

Resolve IDs dynamically against the destination application's current catalogs. Keep no persistent unresolved flag that would prevent a later catalog update from resolving the same saved row automatically. Test restoration with unknown IDs, unchanged destination catalogs, malformed-ID rejection, and later resolution without reimport.

The Juno Master Blueprint Catalog, canonical item/resource definitions, taxonomy and shipped economic defaults are never exported or modified during restore. Collection membership exports IDs/statuses, not copied Blueprint definitions. Historical per-Build recipe/economic snapshots remain required user-owned historical records, not copies of the Master Catalog. Future user-created definitions would require their own user-data section/schema migration; this feature does not currently exist and is outside this work order.

## Existing feature exports

Collection format wasteland-workshop-blueprint-collection/version 1 includes entries only: neither collection ID/name nor active selection travels. Its import prompts for a name and creates a collection. Shopping format wasteland-workshop-shopping-list/version 1 contains name/items only: no list ID or active selection. Neither can stand in for full backup. Retain both as separate share-a-list workflows; optional future conversion can wrap them as partial-domain imports, explicitly distinct from full restore. Existing row validation logic can be extracted/shared after strengthening it.

## Mobile approach

Baseline: user-triggered Blob/File JSON download using an anchor with download, and native file input plus File.text() for import. Avoid requiring desktop-only save pickers. Use filename wasteland-workshop-backup-YYYY-MM-DD-HHMMSS.json. Revoke object URLs after the download has had time to start; do not confuse initiating a download with proving the file reached disk.

Optional native sharing: test navigator.canShare({files:[file]}) on the actual generated file; expose Share Backup only if supported, and invoke navigator.share in the user's button action. Web Share requires a secure context and transient user activation. JSON file sharing is not guaranteed even when general sharing is available, so always retain Download Backup. Share cancellation is not an error that needs an automatic download. Non-localhost LAN HTTP testing may lack sharing; HTTPS production/PWA can support it where the browser/device permits. Installed PWA status alone does not synchronize data. User chooses transfer destination; the application needs no server.

Sources inspected: [MDN share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [MDN canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare), [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Physical-phone save/share and a clean-browser restore were not performed because the feature is not implemented. Required later QA: mobile-sized source populated across all domains -> saved file -> clean desktop target -> validation/confirmation -> restore -> reload -> re-export. Verify actual Android Chrome and iPhone Safari file handling separately from responsive layout.

## Recommended implementation sequence and acceptance checks

1. Extract strict, pure domain validators and non-lossy read adapters; distinguish missing/corrupt/unsupported/stale state. Add versioned collection persistence with safe migration.
2. Resolve stale-reference retention and coordinated commit/recovery before exposing restore. Test interrupted writes, quota failures, recovery failures and stale tabs.
3. Implement typed snapshot/schema/migrations, replace preparation and timer normalization; test complete populated round trips, clean-device move, replacing different existing state, zeros/false/empty values, invalid inputs in each domain, unknown sections and newer versions.
4. Add themed mobile-friendly Settings controls, counts, safety-export action, explicit replacement confirmation and error reporting. No network transmission.
5. Verify phone-to-desktop flow, persistence after reload and re-export; run full suite/lint/build. Leave any GitHub issue open for review.

Current investigation validation: all 221 tests pass across 13 files (four new characterization tests plus the existing 217). Lint and production build pass; the existing large-bundle advisory remains. Checks ran against app version 0.4.7, updated independently during the investigation. No full-backup round-trip tests can be claimed until implementation exists.
