# Wasteland Workshop #10 — Named Resource Shopping Lists

Implemented directly in `G:\codebase\wasteland-workshop`. The current GitHub issue #10 was read before implementation. Changes are uncommitted and the issue remains open for review and actual phone testing.

## 1. Files created / changed

Created:

- `src/features/shopping/ShoppingList.ts`: explicit resource, blueprint acquisition, list and state types.
- `src/features/shopping/ShoppingListService.ts`: list/resource manipulation, recipe addition, catalog derivation, valuation and live blueprint acquisition projection.
- `src/features/shopping/ShoppingListRepository.ts`: persistence and validated import/export.
- `src/features/shopping/ShoppingListsView.tsx`: named-list management, resource entry, estimates, acquisition controls and live print targets.
- `src/features/shopping/BlueprintShoppingAction.tsx`: recipe target picker and Add All Components.
- `src/features/shopping/ShoppingLists.css`: theme-matched, narrow-screen styling.
- `src/features/shopping/ShoppingList.test.ts`: 34 new automated test cases.
- `docs/shopping-lists.md`: this implementation report.

Changed:

- `src/App.tsx`: persisted shopping state, menu navigation, mutation callbacks and Blueprint Details integration props.
- `src/App.css`: small shared-header overflow fix found at 320-pixel width.
- `src/features/blueprints/BlueprintDetails.tsx`: shopping action card.
- `src/features/blueprints/BlueprintSearch.tsx` and `WorkshopView.tsx`: pass shopping integration to details from both entry points.

No new dependencies, economics algorithm changes, collection persistence changes or Craft Timer changes.

## 2. Data model and persistence

Each named ShoppingList has a stable ID, name and resource items. Resource items contain `kind: resource`, the real resource ID, a display-name fallback, desired quantity and an acquired boolean. BlueprintAcquisitionItem has `kind: blueprint`, blueprint ID, source collection ID and name. It has no fabricated resource ID, quantity or price.

Shopping state is stored as versioned JSON in localStorage under `wasteland-workshop-shopping-lists`. Lists and the active-list ID are saved in one write to keep them consistent, following the application's local JSON repository pattern. React state changes only after persistence succeeds; failed writes show a toast and keep the prior state. Loading validates stored shape and clears dangling active IDs. Invalid/unreadable storage loads an empty state, consistent with existing repository fallback behavior.

Lists are separate from Blueprint Collections. All shopping changes remain local and need no server. IDs also work on LAN HTTP origins where randomUUID may be unavailable.

## 3. Active shopping list

Create, rename, delete (with confirmation), Set Active, import and export are available from Shopping Lists in the existing app menu. The first created/imported list becomes active automatically. Creating another list preserves the current selection. Deleting the active list clears selection and prompts the user to select another, matching Blueprint Collection behavior. Both lists and active selection survive reload.

The selected active list receives manually added resources and is the default destination in Blueprint Details. Choosing another destination in Blueprint Details makes that list active when components are successfully added.

## 4. To Acquire blueprint synchronization

The acquisition section is derived live from the **active Blueprint Collection**, the same character/library context used by Workshop and Blueprint Details. These print targets are shared across the shopping workflow and appear with every named shopping list, including when there are no resource lists yet. The UI states that relationship explicitly.

Blueprint Collections remain the only source of truth. Targets are not copied into named shopping lists. Marking a target acquired updates its source collection using the existing callback; it immediately leaves the To Acquire section. Removing a target asks confirmation and untracks it in the active Blueprint Collection. Switching active collections changes the targets. Unknown blueprint IDs remain visible with a fallback name. Blueprint prints do not contribute to material estimates.

Shopping-list exports consequently contain resource demand only, not these live collection-derived targets. Use Blueprint Collection exports to transfer print acquisition state. This prevents two independently imported acquisition states from drifting apart.

## 5. Blueprint Details integration

Both Catalog and Workshop details show **Add Components to Shopping List**, a list selector and **Add All Components**. The active list is selected by default. It adds one complete recipe, using the same first crafting definition currently displayed in Blueprint Details. Existing resource IDs merge quantities. There is a create/import/manage path when no list exists and a selector when lists exist without an active one. No fake Warehouse or Add Missing Components control is included.

## 6. Resources, acquisition and valuation

Manual entry uses a searchable picker derived from existing blueprint component/product names and existing resource economics IDs. No second hard-coded catalog exists. Resources such as Basic/Uncommon Scrap, Psionic Crystal, herbs, metals and produce are available from that data.

Each row shows resource name, desired quantity, estimated unit and total value, and Needed/Acquired. Tap/click the status to toggle; hold the status for 650 ms to remove with confirmation. Movement, pointer cancellation and leaving the control cancel the hold so normal scrolling does not remove items. An explicit keyboard/mouse-accessible Remove action is always present. All controls have mobile-sized touch targets.

Acquired rows stay visible but do not contribute to the remaining estimate. Quantity is a whole-row acquisition target; there is no partial acquisition tracking. Adding new demand to an acquired row merges quantities and marks the combined row Needed again. The UI explains this rule.

Valuation calls the existing ResourceValuationService and current CostCalculator. It uses the same first acquisition method as BlueprintCostService and reflects changes to Economics Settings without persisting stale prices. Unpriceable resources remain usable and show Unknown for unit/total value. The remaining estimate states the known credit subtotal plus unknown values, so missing prices are not presented as a complete zero-cost estimate.

## 7. Import/export

Uses the established file-input / JSON download approach. Export format is `wasteland-workshop-shopping-list`, version 1, with list name and resource items. Imports are parsed and validated before saving, then offer a name form and create a new list with a new ID. Existing lists are preserved. Importing the first list makes it active.

Validation checks format/version, names, resource IDs, positive finite quantities, and boolean acquired flags. Unknown resource IDs are valid and retained. Duplicate resource IDs normalize to one row with summed quantities; any Needed duplicate keeps the merged row Needed. Invalid data and unsafe quantity overflow are rejected without persistence. Exports retain acquired state and unknown resources.

## 8. Warehouse integration

Repository inspection found no usable Warehouse. Transfers and inventory-aware Add Missing Components are intentionally deferred.

Future integration points:

- Compare the recipe's real component IDs against Warehouse stock, then supply the remaining quantities to `addResources` / `addBlueprintComponents`.
- Transfer acquired resource IDs and quantities through a Warehouse service with an explicit transfer ledger or transaction ID to avoid double counting. Do not treat toggling the boolean as an untracked repeated inventory deposit.
- Resolve generic recipe categories such as Any Herb before transferring to concrete inventory records.

This is ready for local inventory integration without introducing a server or changing the economics engine.

## 9. Verification

- Complete `npm test`: **57 tests passed in six files** (23 existing plus 34 new cases).
- `npm run build`: passed. The existing large-bundle advisory remains.
- `npm run lint`: passed.
- `git diff --check`: passed.

New automated coverage includes create/rename/delete, first-list and explicit active selection, persistence/reload, stale active IDs, resource addition and duplicate merge, toggling and removal, acquired-row cost exclusion, unknown prices, settings-sensitive valuation, catalog derivation, full recipe addition/merge and price parity, live blueprint synchronization, import/export round trip, first import selection, duplicate normalization, and malformed/unsupported imports.

Browser checks used an isolated localhost origin with synthetic QA data, separate from the user's normal app storage. Verified list creation, duplicate merge (2 + 3 = 5), acquisition cost change, recipe addition (AA Blade adds 4 Basic Scrap + 1 Alloy Metal), To Acquire synchronization, renaming, active selection, reload persistence, valid file import and invalid file rejection. No browser warnings/errors appeared in the checked console.

Narrow layouts were inspected at 320 and 390 pixels. An existing shared-header overflow was corrected; the shopping rows and controls fit without horizontal overflow. The accompanying screenshot shows a 390-pixel resource and blueprint acquisition view.

The export JSON round trip is automated-test verified. The in-app browser's download-event wait did not complete, so end-to-end browser download capture was not verified there. Actual Android/iPhone file download/import behavior, touch long-press, scrolling and device usability remain acceptance checks. No physical phone testing is claimed.

## 10. Recommended follow-ups and acceptance

- Warehouse resource transfers with duplicate-transfer protection and optional Undo.
- Add Missing Components after inventory and generic-component resolution exist.
- Partial acquired quantities, if players need to buy materials over multiple merchants.
- Optional association between a named shopping list and a specific Blueprint Collection, if multiple characters must be planned simultaneously. The current workflow follows the active collection.

On a phone: create two lists, switch active, add/merge resources, toggle Needed/Acquired, test normal scrolling versus long-press/remove confirmation, rename/delete, export/import a file, reload, and add a recipe from Catalog and Workshop. Verify To Acquire prints track the selected Blueprint Collection and update it when acquired. Confirm unknown estimates are obvious.

Issue #10 remains open. No GitHub issue, comment, commit or publication was created by this implementation.
