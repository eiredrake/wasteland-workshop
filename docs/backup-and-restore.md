# Full user backup and restore

Implemented 2026-10-08 in app version 0.5.0. This supersedes the stop-before-implementation decision in portable-user-data.md; that document remains the original storage audit.

## Using it

Open Settings, then Data Backup & Restore at the top.

- Export All Data downloads one JSON file. Move that file to the other device using your normal file-transfer method.
- Share Backup appears when the browser says it can share JSON files. The actual generated file is checked again before opening the share sheet. Cancellation is harmless.
- Import / Restore Data opens a file picker. Selecting a file validates it and displays a summary, export date/app version, catalog notices and a prominent replacement warning. Nothing is restored merely by selecting a file.
- Export Current Data First offers a safety backup. Cancel leaves current state intact. Replace & Restore explicitly replaces all supported user data and reloads the app.

Close other Wasteland Workshop tabs before restore, particularly on LAN HTTP where Web Locks may not be supported. Keep a downloaded backup before replacing important data. The application never sends backup contents to a server.

## Public schema

format = wasteland-workshop-backup; schemaVersion = 1; appVersion and exportedAt are required. Maximum input size is 20 MB. The migration boundary accepts v1 and rejects unsupported versions/unknown top-level or domain fields before writing anything.

Required data sections:

- blueprintCollections: collections (IDs/names/Blueprint IDs/acquired, to-acquire or sell statuses) and activeCollectionId (string or null).
- shoppingLists: all lists with IDs/names, resource/choice rows, quantities, acquisition state, optional activeListId. Blueprint acquisition targets derive from collections and need no duplicate section.
- warehouse: Credits and concrete itemId/quantity/expirationDate lots, including preserved undated legacy stock.
- settings: actual economicsOverrides (Mind, Time, Resolve, Foraging Card, markup and resource prices); alarm sound/vibration preferences; warehouse expirationWarningDays.
- buildQueue: ordered Builds and history, canonical Blueprint references, notes, recipe snapshots, captured economic settings, per-Build overrides, statuses and timers/timestamps.

Static Master Blueprint/Juno catalogs, canonical item/resource definitions, taxonomy tables and shipped defaults are not embedded or modified. Build recipe/economic snapshots are existing user-owned historical records and travel with their Builds. Menus, open screens, filter/sort/search choices, UI drafts, Toasts and audio/capability state remain transient. User-created definitions do not currently exist; a later schema version can introduce a separate domain.

## Validation and compatibility

Backup.ts owns parseBackup, migrateBackup, validateData and prepareRestore. Required structures, numeric ranges, canonical-ID shape, duplicate IDs/lot identities, statuses, timer consistency, nested recipe/snapshot values, settings types and expiration dates are validated together. Zero Credits, zero valid economic overrides, false preferences, empty lists/collections and empty notes survive. Unsupported/corrupt local domain storage makes export fail explicitly rather than silently certify empty defaults. Existing legacy economics and selector-row migrations run at the local-storage adapter boundary; this is separate from backup schema migration.

Unknown positive safe-integer catalog IDs are valid unresolved references. Collections and shopping rows retain them; Warehouse loads and displays Unknown Item #ID / Catalog entry unavailable; Builds retain references and history and indicate unavailable entries. Unknown Warehouse stock is excluded from craftability. Known recipe selectors cannot become inventory. Malformed IDs are rejected. Catalog lookups are dynamic, so a future catalog update can resolve saved records without reimport. Invalid active collection/list selections are cleared with explicit notices.

First release is replace-only. It does not combine quantities, concatenate record arrays or infer acquisitions/material consumption. Existing feature-specific collection/list exports remain available as separate sharing workflows; their files cannot be mistaken for a full backup.

## Timers

Export calculates remaining time from a Working Build's absolute deadline at exportedAt without changing source work. Still-running work becomes Paused in the backup, preserving remaining duration and removing the running deadline. Work already elapsed at export becomes Completed with its deadline as completedAt. Restore also applies this normalization for incoming Working records at the backup's timestamp. Transfer time does not reduce a paused backup timer. Import does not resume work or trigger a completion alarm automatically.

## Persistence safety

All eight existing domain storage keys are read through explicit adapters; the public backup does not expose browser keys. All normal repositories now use a shared stale-revision/pending-recovery guard. Two private localStorage keys are added: wasteland-workshop-restore-journal and wasteland-workshop-data-revision. Neither is portable user data.

After complete validation, commitReplacement saves the exact old values to the recovery journal before any replacement write. It writes the complete new domain state and changes the revision marker last. On failure it rolls back all old values. If rollback also fails, the journal remains and edits are blocked; startup retries recovery before mounting App. A committed marker means journal cleanup can safely finish without reverting successful restored state. Failed journal allocation does not change any domain key. Successful restore reloads state; another tab's revision change requests reload and stale repository writes are rejected. Web Locks serialize restore and startup recovery where supported. This is coordinated localStorage recovery, not a database transaction; closing other tabs remains the advised restore workflow.

## Mobile and browser behavior

Download uses a user-triggered attached anchor with Blob/File JSON and delayed URL revocation. Import uses the browser's file picker and File.text(), without requiring a desktop save-file API. Share is optional and capability-checked; HTTPS/localhost and user activation are required by Web Share. Installed PWA status does not provide synchronization, and JSON file sharing varies by device/browser. Download remains the baseline fallback.

References: [MDN share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), [MDN canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare).

## Validation results

253 tests pass across 14 files; lint and production build pass. The existing large-bundle advisory remains. Backup.test.ts adds 31 tests covering metadata/all domains, clean-device round trip/re-export, replacement, empty/zero/false values, source timer immutability, delayed/elapsed timers, paused/enqueued/completed history and snapshots, malformed files and domains/IDs, unsupported versions/unknown sections, corrupt local storage, unresolved references and later catalog availability, active selections, rollback, startup recovery, failed cleanup, failed staging, stale tabs and Web Locks. PersistenceInvestigation.test.ts was updated for unresolved Warehouse preservation and storage guard isolation.

Browser QA used synthetic data only: a 390px source screen displayed import confirmation and catalog notices, then restored collection data including Unknown Blueprint #99999999. A separate clean localhost origin imported the same full fixture, reloaded, and visibly retained the collection, shopping list, 237 Credits, three inventory lots (including unknown Item #99999999), alarm preferences, Rare Scrap override, and paused Build with notes. An unrelated JSON file was rejected. The in-app browser displayed the export-started message without console errors, but its download-event capture timed out; a saved browser download could not be verified through this tool. Consequently an actual downloaded phone-to-desktop file transfer and native phone share sheet are still manual acceptance checks. Automated storage round-trip/re-export tests pass; do not confuse these with physical-phone QA.

Screenshot: task outputs/backup-restore-settings.png. Synthetic input: outputs/backup-qa-source.json.

## Files changed

New: src/features/backup/Backup.ts, BackupRepository.ts, UserStorage.ts, BackupSettingsView.tsx, BackupSettingsView.css, Backup.test.ts; docs/backup-and-restore.md.

Updated: src/App.tsx and src/main.tsx; all seven domain repositories (BlueprintCollectionRepository, ShoppingListRepository, WarehouseRepository, EconomicsSettingsRepository, AlarmSettings, WarehouseSettings, BuildQueueRepository); WorkshopView, ShoppingListsView, BuildQueueView, WarehouseView, WarehouseService, Expiration; PersistenceInvestigation.test.ts; exploratory report links/status.

No issue closed, commit created, deployment made or user version number changed by this implementation.
