# Credit display and rounding audit

Completed 2026-10-08 in G:/codebase/wasteland-workshop.

## Boundary

`src/economics/Credits.ts` owns Math.ceil rounding and whole-credit formatting. Display final amounts as 180cr. Unknown stays Unknown; zero stays 0cr. Do not use displayed values as inputs to later calculations.

Blueprint components, production totals, shopping aggregates, Work Queue/History estimates, Warehouse balances and shared/printed Blueprint cards use the same formatting. Economics summaries round resource/card valuations; worked examples round resulting costs. Help now explains precise internal calculations and final rounding, with whole-credit equivalents for default labor rates.

Calculation rates, markup percentages and editable configuration inputs retain their actual precision. They are calculation inputs, not rounded transaction amounts. Existing resource defaults, user overrides, stored history snapshots and Warehouse data remain unchanged. Input controls continue to show their exact editable values. Per-point/per-minute rates can be fractional; rounding them would change the formulas. Summaries of resource amounts are whole credits.

All production components and shopping lines sum at full precision. Markup applies to precise production cost before the existing final selling-price ceiling. Existing acquisition unit rounding occurs after dividing by yield, as before. Displayed rounded components may not sum to the displayed rounded total; the UI explanation states this explicitly.

## Changed files

- src/economics/Credits.ts and Credits.test.tsx
- src/features/shopping/ShoppingListsView.tsx
- src/features/blueprints/BlueprintDetails.tsx and BlueprintShareCard.ts
- src/features/builds/BuildFormatting.ts and BuildDetails.tsx
- src/features/warehouse/WarehouseView.tsx and Warehouse.test.ts
- src/features/settings/EconomicsSettingsView.tsx, EconomicsValuationExplanation.tsx and its test
- src/features/help/ValuationAlgorithmView.tsx
- src/styles/controls.css: separately requested Build button centering, padding and exclusion from status-pill sizing
- tools/ui-visual-check.py: Build text-center assertion
- Six reviewed Blueprint/keyboard-focus/Warehouse visual baselines

## Verification

378 tests in 28 files pass, including 12 new credit tests for fractional/whole/zero/unknown amounts, precise shopping aggregation and quantity multiplication, rendered shopping and Warehouse amounts, markup before rounding, and shared/printed Blueprint valuations. Existing Warehouse expectation uses the consistent 237cr suffix. Economics explanation tests updated to avoid suggesting summation of independently rounded parts.

Lint and TypeScript/production build pass. The existing large catalog bundle warning remains. Isolated browser workflows pass. Thirty reviewed visual comparisons pass, including shopping alignment, Warehouse buttons and Build label center geometry on desktop and mobile-sized layouts.

Work Queue still contains the collapsed Add to Queue section with Blueprint and Action pickers. The Timer view already uses the themed Back to Work Queue button under its heading, separated from the menu. No issue was closed, no commit or deployment performed.
