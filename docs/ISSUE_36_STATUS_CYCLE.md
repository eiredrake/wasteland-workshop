# Issue #36: consistent Blueprint collection statuses

## Behavior and root cause

The catalog had its own Not Acquired -> To Acquire -> Acquired -> Not Acquired cycle, with a special case that prevented selecting To Sell. Blueprint Details duplicated those rules in catalog mode, while Workshop and collection-mode Details used a different cycle.

`nextBlueprintCollectionStatus` in `src/features/blueprints/BlueprintCollectionService.ts` is now the single transition implementation:

Not Acquired -> Acquired -> To Acquire -> To Sell -> Not Acquired.

`blueprintCollectionStatusLabel` supplies the four consistent labels. Not Acquired is still an absent collection entry, and the persisted identifiers remain `acquired`, `to-acquire`, and `sell`. Catalog, Workshop and both Details modes use the same active-collection data and shared transition function. Status badges now expose the full current status, print name and collection to assistive technology, including when visually compact. Compact catalog/Workshop controls have a minimum 44px width; existing pointer-specific heights, colors and focus styles remain.

## Direct acquisition

Explicit Acquire still uses the existing App callback setting `acquired` directly. Scanner/manual dialogs previously suppressed Acquire for To Sell entries as already owned. They now allow the explicit action to return To Sell to Acquired as required by the work order; already-Acquired safeguards remain. OCR and matching are unchanged. Cancel does not write collection data.

## Data protection

There is no migration or automatic wish-list cleanup. Existing memberships and statuses remain untouched until a deliberate action. The existing immutable membership update and save-before-publish persistence paths remain in use. Only the selected print in the active collection changes. Export/import formats, catalog records, queue/history, shopping calculations and local storage mechanisms are unchanged. All transitions work without network access.

## Changed files

- `src/features/blueprints/BlueprintCollectionService.ts`: shared transition and label functions.
- `src/features/blueprints/BlueprintSearch.tsx`: catalog cycle, including To Sell, and accessible badge label.
- `src/features/blueprints/BlueprintDetails.tsx`: same cycle in both modes and accessible badge label.
- `src/features/blueprints/WorkshopView.tsx`: shared cycle/label and accessible badge label.
- `src/features/scanner/ScanPrintsView.tsx`: permit direct Acquire for To Sell entries.
- `src/styles/controls.css`: minimum compact status-button width.
- `src/features/blueprints/BlueprintCollectionStatus.test.ts`: transition, repetition, collection isolation, direct acquisition and backup compatibility tests.
- `tools/ui-blueprint-status-check.py`: real browser integration/acceptance tests using isolated synthetic collections.
- `tools/ui-scanner-acquisition-check.py`: scanner/manual direct acquisition, cancel, failure/retry and isolation regressions.

## Validation and limitations

667 unit tests pass, plus the PowerShell release/deployment tooling suite, lint and production/PWA build. Chrome checks passed at 320, 360, 390, 768 and 1280 pixels; Firefox at 390 and 1280 pixels. Scanner/manual acquisition checks passed at 390 and 1280 pixels. Browser checks cover catalog and both Details modes, Workshop filters/counters, switches between collections, touch/keyboard clicks, persistence, reopening, offline refresh/edits, storage failure/retry and full export/restore. Scanner tests use real local OCR on generated fixtures and check explicit Acquire separately from cycling.

Mobile viewports/touch are emulated. No physical phone or installed home-screen app was tested for this change. Service-worker-controlled offline browser behavior is covered. This targeted fix is separate from the pending update-check-message branch. Staging only; production requires explicit approval.
