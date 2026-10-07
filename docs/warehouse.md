# Warehouse inventory foundation (Issue #7 scope)

Warehouse tracks the user's declared concrete possessions in one inventory: entries contain canonical Juno itemId, quantity, and an expiration date for each lot. Matching item IDs and dates merge; different dates remain separate. Currency has no expiration date. Credits on hand are a separate balance, unrelated to Economics Settings. Storage uses wasteland-workshop-warehouse, version 2. Version 1 inventory is preserved as undated lots, marked Date needed until the user enters the actual date.

## Delivered

- Warehouse navigation and themed, responsive screen.
- Resources and owned items share one catalog and storage model. Canonical ingredient leaves plus crafting final products supply names, IDs, and kinds. Taxonomy selectors and blueprint documents are not inventory options. Resource kinds are grouped as Resources; gizmos, brews, equipment and other concrete outputs are Items. Concrete local currency items remain identifiable objects; the explicit Credits balance never uses a fake Juno ID.
- Searchable item/resource picker, add quantities, set quantities, +1/-1, X removal; zero removes a row. All / Resources / Items filtering and inventory search.
- Prominent Credits balance with Set, Add and Subtract. Negative balances, invalid numbers, unknown item IDs, selectors, and overflow are rejected. Quantities support non-negative finite numeric amounts, including fractional amounts.
- Atomic local-storage save before displaying changes. Corrupt/unsupported stored Warehouse data is preserved; edits are disabled and the screen shows an error. A save failure keeps the previous inventory and reports it.
- Blueprint details in both Catalog and Workshop show Materials Available / Can Craft xN or exact missing ingredient quantities. No-material recipes have no material limit. Query helpers are exported for future Shopping List, Build Queue and Ledger integrations.

## Craftability semantics

Concrete requirements match exact item IDs. Taxonomy requirements use the structured qualifying Juno child IDs; Anise OR Geranium may be satisfied by either, and quantities may be distributed across qualifying stock. Material allocation uses maximum flow so repeated concrete requirements and overlapping choices cannot count the same unit twice. Allocation can revise an early assignment when a more specific ingredient needs it. A binary search calculates maximum complete copies from the available stock. Missing selector rows retain the original choice label and represent one valid allocation's remaining shortage; there can be multiple equally valid ways to satisfy alternative requirements.

Availability is material-only: no character skills, Mind, Resolve or crafting-space eligibility is checked. Only dated usable inventory and non-expiring currency count. Expired stock counts only when the recipe explicitly permits expired ingredients within a specified number of days. Undated legacy stock does not count until dated. No stock is reserved for queued Builds, so availability answers what is on hand now, not a future schedule promise.

## Explicit boundaries

Only Warehouse controls mutate this inventory. Viewing Blueprints, adding Builds, timer completion, Shopping List acquisition, economic valuation changes and prospective sales do not consume/add items or spend/refund Credits. No purchase inference, Ledger transactions or material consumption is implemented. A future explicit transaction service can record deductions and crafted outputs after actual ingredient choices are confirmed. No GitHub issue is closed and no release/version change is made.

## Validation

217 tests pass across 12 files; 30 new Warehouse tests cover canonical catalog/resource/item membership, selectors excluded, quantity operations, invalid input/overflow, Credits separation and debt rejection, local storage round-trip and corrupt data, concrete/alternative/overlapping recipe allocation, maximum copies, exact shortages, empty recipes, fractional amounts, and no inferred inventory transactions. Existing economics, Shopping List, Blueprint, Build Queue and timer tests pass. Lint and production build pass (existing large-bundle advisory remains).

Browser QA: 237 Credits plus resources and Able Door x3; rejected subtraction of 238 without changing balance; reload preserved all five inventory rows and Credits; phone-width layout (390px) and Items filter verified; Sosweet Smashstick showed Materials Available / Can Craft x1 from the saved inventory. Screenshots are in the task output folder. This is responsive browser verification, not a physical-phone test.

## Files

- src/features/warehouse/Warehouse.ts
- src/features/warehouse/InventoryCatalog.ts
- src/features/warehouse/WarehouseService.ts
- src/features/warehouse/WarehouseRepository.ts
- src/features/warehouse/useWarehouse.ts
- src/features/warehouse/CraftabilityService.ts
- src/features/warehouse/WarehouseView.tsx
- src/features/warehouse/WarehouseView.css
- src/features/warehouse/Warehouse.test.ts
- src/App.tsx
- src/features/blueprints/BlueprintSearch.tsx
- src/features/blueprints/WorkshopView.tsx
- src/features/blueprints/BlueprintDetails.tsx
- docs/warehouse.md

## Expiration dates and warnings

Add a date from the item tag when adding non-currency inventory. The date remains valid through the listed local calendar day; it becomes expired the following day. Date calculations compare calendar days rather than elapsed hours, including across daylight-saving transitions. Status refreshes every minute and when the browser regains focus or visibility.

Warehouse supports Name, Expiration: soonest first, and Expiration: latest first sorting. Undated lots and currency stay at the end of expiration sorts. Good stock is green; stock within the configured warning window has a yellow Expiring badge; expired stock is grey with an Expired badge. Older stock without dates has a neutral Date needed badge. Editing a lot date merges its quantity into an existing matching item/date lot, if present. Quantity changes and removal affect only the chosen lot.

Global Settings includes Warn before expiration (days), default 30, accepting integers from 0 through 3650. Save Expiration Settings persists it under wasteland-workshop-warehouse-settings, version 1. A value of zero warns only on the expiration day. These warnings are visual status indicators, not scheduled background notifications.

Ten additional tests cover dated grouping, lot-specific quantity changes, date-edit merging, invalid dates/currency dates, legacy migration, version-2 round trips, duplicate lots, warning boundaries, leap days/daylight-saving dates, settings persistence, expired/undated material exclusion, and explicit expired-ingredient grace periods. Tests, lint and production build pass.

Additional browser QA verified three Angry Apple Invigorating Brew lots with distinct dates and grey/yellow/green statuses, repeat additions merging into a quantity of 4 for one date, soonest-first ordering, inventory persistence after reload, and the saved warning setting (including zero). The responsive screen was checked at 390px wide. Physical-phone verification remains for the user.

Additional files: src/features/warehouse/Expiration.ts, src/features/warehouse/Expiration.test.ts, src/features/warehouse/useCalendarDay.ts, src/features/settings/WarehouseSettings.ts, src/features/settings/WarehouseSettingsView.tsx.
