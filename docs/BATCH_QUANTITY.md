# Batch quantities

Build, queue Blueprint, Action, and Blueprint shopping controls share `QuantitySplitButton` and `QuantityDialog` under `src/components/QuantitySelection`. Tap adds one; hold 500ms or use the adjacent arrow to choose 1-10. Keyboard users can activate either button, choose with the native select, confirm, or cancel with Escape. Movement, scrolling, pointer cancellation and blur cancel pending holds.

`src/features/batch/BatchQuantity.ts` validates whole numbers 1-10 in business logic. `src/features/builds/BatchQueueService.ts` reuses the existing Blueprint and Action factories for independent snapshots and IDs. Batches stay consecutive at the existing insertion point, and only the first instance uses the existing automatic-start behavior. Existing activities, timers, completion/history, overrides and material-consumption rules remain unchanged.

`ShoppingListService.addBlueprintComponentCopies` multiplies ingredients before the existing aggregation operation. `BlueprintShoppingAction` preserves destination selection. App handlers persist each complete result once before publishing state. Submission guards prevent duplicates; failed persistence leaves valid data unchanged and permits retry. No data migration, network dependency, or export-format change is introduced.

## Validation

- 647 automated tests pass, including quantity bounds, independent snapshots, ordering, Action batches, shopping aggregation, backup/restore and gesture cancellation.
- Lint and production/PWA build pass.
- Browser workflow checks cover Chrome at 320, 360, 390, 768 and 1280 pixels; Firefox at 390 and 1280; landscape, native touch holds, keyboard, cancellation, storage-failure retry and offline refresh/additions.
- Existing timer, queue, procedure, warehouse, history and backup workflows pass mobile-width browser regression checks.
- Physical Android/iPhone testing remains outstanding. Emulated mobile viewports are not actual-device tests.

## Changed areas

Shared quantity UI and validation; App operation handlers; Blueprint Details/Search/Workshop/procedure controls; Action configuration and queue entry; queue factories and submission guard; shopping service/control; shared timer-press gesture handling; automated batch/component/gesture tests; `tools/ui-batch-quantity-check.py`.

Deploy only to TEST for acceptance. Production requires explicit approval.
