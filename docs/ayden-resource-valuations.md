# Ayden / Econtism resource defaults — implementation report

Implemented in G:\codebase\wasteland-workshop on 7 October 2026. Version 0.3.1 is preserved. Related issues remain open. No Build Queue, per-build overrides, deployment, publishing, or source-spreadsheet edits were performed.

## Source and mapping

Source: [Econtism 2.1 — Ingredient Lookup](https://docs.google.com/spreadsheets/d/1o0Ovtq8fzaaSSWMuwH64eP_w9X5bxKr2VPRUv4QNrU4/edit#gid=0). The supplied gid=1493758412 identifies By Item; Ingredient Lookup is gid=0. Read all 122 data rows in Ingredient Lookup and all 121 data rows in Ingredient Lookup2, plus Input. The second lookup is a sorted alternative with acquisition-route naming differences and no plain Foraging Card row. Matching configured rows agree. Input confirms Mind 0.4, minutes 0.1, Resolve 15, Foraging Card 4, Scrap 3/5/7, and Corpse 0. The lookup's plain Foraging Card total 5 describes acquisition and does not replace Input's configured card value 4.

The checked-in JSON preserves every primary source row, its acquisition fields and ingredient-input prices, plus mapping provenance and unmatched labels. There is no live Google Sheets dependency.

**73 application resource defaults mapped:** 70 exact unique names from source output rows; one reviewed singular/plural alias, Machined Component → Machined Components (3882); two additional explicit, consistent ingredient-input values, Any Produce and Local Currency. No inferred category or alternative-ingredient prices. All 111 Settings resources comprise these 73 mapped defaults and 38 current recipe ingredients without mapped defaults. There are 107 distinct recipe ingredient IDs in the bundled catalog.

## Effective values and persistence

Effective resource value = saved Settings override ?? imported application default. One immutable application-default map feeds the calculator and shared effective-value lookup, Blueprint costing, Blueprint Details, Shopping Lists, and Settings. Changing Mind, time, Resolve, card price, or another resource does not recompute fixed material values. Fractions and zero are preserved; unknown stays unknown. Settings exposes default, effective value, override, individual Reset, and Restore Defaults. Saved overrides become the normal value throughout the app; reset removes the override. No per-build layer is implemented.

The existing localStorage key wasteland-workshop-economics-settings stores version 1 with overrides only. Previously saved explicit version-1 values are preserved, including older card or resource overrides: reset them if the user wants the new baseline. Legacy full-object settings migrate compatible non-default labor/markup values; original 0.8 Mind, 0.1 time, and 25% markup baseline fields are removed so shipped defaults apply. Three obsolete card price fields are not converted by guessing. Malformed/invalid/unsupported data fails safely; save failure is reported without applying unsaved edits.

Global defaults: Mind **0.4**, time **0.1/minute**, Resolve **15**, one Foraging Card **4**; markup remains **25%**.

## Acquisition calculations kept separate

ResourceValuationService.calculateResourceAcquisitionCosts retains ordered acquisition routes, prerequisite recursion, cycle/unknown protection, card-tier yield distinctions, and per-unit ceiling. It never substitutes these results into configured prices. ResourceValuation.calculateResourceValuation calculates a particular method's cost; optional yieldQuantity defaults to one, with no invented game yields. Existing foraging, agriculture, travel, Artisan conversions, and manufactured-metal definitions remain. Explicit Helscape Mine methods for Basic/Uncommon/Rare Scrap calculate 3/5/7 at default labor settings, independently of configured values. All 122 spreadsheet rows, including Dirt Engineer's Toolkit and additional mine/NPC/production routes, are preserved in the snapshot for future comparison work; they are not represented as extra standalone resource IDs. No cheapest-route selection UI was added.

## Sosweet Smashstick regression

Calculated from the actual bundled blueprint and shared effective defaults:

| Component | Quantity | Unit credits | Material credits |
| --- | --- | --- | --- |
| Rare Scrap | 4 | 7 | 28 |
| Soft Metal | 1 | 21 | 21 |
| Synthetic Fibers | 1 | 19 | 19 |
| Craftable Stone | 2 | 4.4 | 8.8 |

**Materials: 76.8 credits.** Mind/time labor: 8; crafting Resolve: 0; production: 84.8. At 25% markup, selling price is 106, profit 21.2. Item activation Resolve is separate from recipe crafting Resolve. The total is calculated, never hardcoded. A test verifies each actual component ID, quantity and unit value; override tests verify the result changes appropriately.

## Validation

- Unit tests: **98 passed, 7 files**. EconomicsOverrides.test.ts adds 41 cases for complete import/provenance, scalar/check values, zero, persistence/reset/migration, invalid storage/input, immutable defaults, configured/acquisition independence, real Sosweet components, Resolve, fractional Shopping Lists, unknown values, yields, and cycles. Existing calculator, valuation/acquisition, blueprint-cost, and Shopping List tests were updated for the corrected model. Existing alarm tests remain passing.
- Full scripts/run-all-tests.ps1: passed, including version/lockfile/PowerShell checks and isolated release/deploy fixtures. Fixtures use temporary repositories and mocked services; application publication/deployment did not occur.
- Production build: passed. Vite reports its bundle-size advisory (approximately 1.97 MB main JS); no compilation errors.
- Lint and git diff --check: passed.
- Browser: verified default Settings, real Sosweet component costs, Rare Scrap override 10, saved reload persistence, Shopping List estimate update, and reset to 7. Checked resource settings at 360×800; controls remain within the mobile viewport. This is responsive browser validation, not a new physical-phone test.

## Files changed

- src/App.tsx
- src/economics/AcquisitionMethod.ts
- src/economics/BlueprintCostService.test.ts
- src/economics/BlueprintCostService.ts
- src/economics/CostCalculator.ts
- src/economics/DefaultCostCalculator.test.ts
- src/economics/DefaultCostCalculator.ts
- src/economics/EconomicsSettings.ts
- src/economics/ResourceValuation.test.ts
- src/economics/ResourceValuation.ts
- src/economics/ResourceValuationService.test.ts
- src/economics/ResourceValuationService.ts
- src/economics/testResourceEconomics.ts
- src/features/blueprints/BlueprintDetails.tsx
- src/features/help/ValuationAlgorithmView.tsx
- src/features/settings/EconomicsSettingsView.tsx
- src/features/shopping/ShoppingList.test.ts
- src/features/shopping/ShoppingListService.ts
- src/features/shopping/ShoppingListsView.tsx
- docs/ayden-resource-valuations.md
- docs/configurable-economics.md
- src/data/ayden-resource-defaults.json
- src/economics/ApplicationResourceDefaults.ts
- src/economics/EconomicResourceCatalog.ts
- src/economics/EconomicsOverrides.test.ts
- src/economics/EconomicsSettingsRepository.ts
- src/features/settings/EconomicsSettingsView.css

## All mapped application defaults

| Juno ID | Application resource | Credits/unit | Source name | Source cell / mapping |
| --- | --- | --- | --- | --- |
| 3857 | Acid Compounds Crafting Component | 13.8 | Acid Compounds Crafting Component | Ingredient Lookup!O2; Exact name and unique ID |
| 3858 | Adhesive Crafting Component | 13.8 | Adhesive Crafting Component | Ingredient Lookup!O3; Exact name and unique ID |
| 3869 | Alloy Metal | 21 | Alloy Metal | Ingredient Lookup!O80; Exact name and unique ID |
| 3939 | Any Produce | 5.4 | Any Produce | Ingredient Lookup!J:K / M:N; Exact ingredient-input name and consistent explicit unit value |
| 3846 | Ayahuasca | 7 | Ayahuasca | Ingredient Lookup!O44; Exact name and unique ID |
| 3807 | Basic Herb | 3 | Basic Herb | Ingredient Lookup!O39; Exact name and unique ID |
| 3866 | Basic Scrap | 3 | Basic Scrap | Ingredient Lookup!O103; Exact name and unique ID |
| 3829 | Bayberry | 7 | Bayberry | Ingredient Lookup!O47; Exact name and unique ID |
| 3843 | Cannabis | 7 | Cannabis | Ingredient Lookup!O50; Exact name and unique ID |
| 3877 | Combustible Materials | 6 | Combustible Materials | Ingredient Lookup!O114; Exact name and unique ID |
| 3870 | Conductive Metal | 21 | Conductive Metal | Ingredient Lookup!O81; Exact name and unique ID |
| 3859 | Cooking Oil Crafting Component | 13.8 | Cooking Oil Crafting Component | Ingredient Lookup!O4; Exact name and unique ID |
| 3878 | Craftable Stone | 4.4 | Craftable Stone | Ingredient Lookup!O112; Exact name and unique ID |
| 3848 | Eggs | 5.4 | Eggs | Ingredient Lookup!O92; Exact name and unique ID |
| 3816 | Epazote | 7 | Epazote | Ingredient Lookup!O55; Exact name and unique ID |
| 3900 | Festering Crystal | 15 | Festering Crystal | Ingredient Lookup!O87; Exact name and unique ID |
| 3842 | Foxglove | 7 | Foxglove | Ingredient Lookup!O57; Exact name and unique ID |
| 3850 | Fruit | 5.4 | Fruit | Ingredient Lookup!O93; Exact name and unique ID |
| 3864 | Generic Brew | 9 | Generic Brew | Ingredient Lookup!O9; Exact name and unique ID |
| 3876 | Generic Engineered Item | 24 | Generic Engineered Item | Ingredient Lookup!O10; Exact name and unique ID |
| 3875 | Generic Genre Motorized Item | 18 | Generic Genre Motorized Item | Ingredient Lookup!O11; Exact name and unique ID |
| 3874 | Generic Handheld Item | 15 | Generic Handheld Item | Ingredient Lookup!O12; Exact name and unique ID |
| 3865 | Generic Meal | 11.4 | Generic Meal | Ingredient Lookup!O13; Exact name and unique ID |
| 3901 | Grave Flesh | 18 | Grave Flesh | Ingredient Lookup!O90; Exact name and unique ID |
| 3872 | Hard Metal | 21 | Hard Metal | Ingredient Lookup!O82; Exact name and unique ID |
| 3879 | High Grade Lumber | 4.4 | High Grade Lumber | Ingredient Lookup!O113; Exact name and unique ID |
| 3897 | Imprint Crystal | 15 | Imprint Crystal | Ingredient Lookup!O91; Exact name and unique ID |
| 3851 | Infection Material | 19 | Infection Material | Ingredient Lookup!O100; Exact name and unique ID |
| 3844 | Jimson Weed | 7 | Jimson Weed | Ingredient Lookup!O61; Exact name and unique ID |
| 5559 | Local Currency | 1 | Local Currency | Ingredient Lookup!J:K / M:N; Exact ingredient-input name and consistent explicit unit value |
| 3882 | Machined Components | 12 | Machined Component | Ingredient Lookup!O117; Reviewed singular/plural name alias |
| 3821 | Marjoram | 7 | Marjoram | Ingredient Lookup!O64; Exact name and unique ID |
| 3852 | Meat | 5.4 | Meat | Ingredient Lookup!O94; Exact name and unique ID |
| 4874 | Meaty Bits | 4 | Meaty Bits | Ingredient Lookup!O21; Exact name and unique ID |
| 4377 | Mechanical Airship Framework | 19 | Mechanical Airship Framework | Ingredient Lookup!O29; Exact name and unique ID |
| 4375 | Mechanical Auto Frame | 12 | Mechanical Auto Frame | Ingredient Lookup!O30; Exact name and unique ID |
| 3883 | Mechanical Components | 19 | Mechanical Components | Ingredient Lookup!O119; Exact name and unique ID |
| 4378 | Mechanical Drive | 5.4 | Mechanical Drive | Ingredient Lookup!O31; Exact name and unique ID |
| 4376 | Mechanical Engine | 12 | Mechanical Engine | Ingredient Lookup!O32; Exact name and unique ID |
| 4379 | Mechanical Fuel System | 12 | Mechanical Fuel System | Ingredient Lookup!O33; Exact name and unique ID |
| 4385 | Mechanical Gear System | 5.4 | Mechanical Gear System | Ingredient Lookup!O34; Exact name and unique ID |
| 4386 | Mechanical Hull | 12 | Mechanical Hull | Ingredient Lookup!O35; Exact name and unique ID |
| 3853 | Milk | 5.4 | Milk | Ingredient Lookup!O95; Exact name and unique ID |
| 3899 | Mortis Extract | 45 | Mortis Extract | Ingredient Lookup!O89; Exact name and unique ID |
| 3898 | Mycelium Wiring | 45 | Mycelium Wiring | Ingredient Lookup!O88; Exact name and unique ID |
| 3880 | Natural Fibers | 6 | Natural Fibers | Ingredient Lookup!O115; Exact name and unique ID |
| 3860 | Pain Killer Crafting Component | 19 | Pain Killer Crafting Component | Ingredient Lookup!O5; Exact name and unique ID |
| 3894 | Passenger Carrier | 19 | Passenger Carrier | Ingredient Lookup!O36; Exact name and unique ID |
| 3828 | Peppermint | 7 | Peppermint | Ingredient Lookup!O67; Exact name and unique ID |
| 3884 | Plastics | 12 | Plastics | Ingredient Lookup!O118; Exact name and unique ID |
| 3830 | Prairie Wildrye | 7 | Prairie Wildrye | Ingredient Lookup!O68; Exact name and unique ID |
| 3881 | Psionic Crystal | 8 | Psionic Crystal | Ingredient Lookup!O116; Exact name and unique ID |
| 3847 | Quinine | 7 | Quinine | Ingredient Lookup!O69; Exact name and unique ID |
| 3861 | Radioactive Compounds Crafting Component | 33 | Radioactive Compounds Crafting Component | Ingredient Lookup!O6; Exact name and unique ID |
| 3871 | Radioactive Metal | 21 | Radioactive Metal | Ingredient Lookup!O83; Exact name and unique ID |
| 3809 | Rare Herb | 7 | Rare Herb | Ingredient Lookup!O41; Exact name and unique ID |
| 3868 | Rare Scrap | 7 | Rare Scrap | Ingredient Lookup!O111; Exact name and unique ID |
| 3885 | Recovered Electronics | 19 | Recovered Electronics | Ingredient Lookup!O120; Exact name and unique ID |
| 3862 | Salty Crafting Component | 15 | Salty Crafting Component | Ingredient Lookup!O7; Exact name and unique ID |
| 3822 | Salvia | 7 | Salvia | Ingredient Lookup!O73; Exact name and unique ID |
| 3854 | Shellfish | 12 | Shellfish | Ingredient Lookup!O99; Exact name and unique ID |
| 3873 | Soft Metal | 21 | Soft Metal | Ingredient Lookup!O84; Exact name and unique ID |
| 3895 | Supply Carrier | 19 | Supply Carrier | Ingredient Lookup!O37; Exact name and unique ID |
| 3886 | Synthetic Fibers | 19 | Synthetic Fibers | Ingredient Lookup!O121; Exact name and unique ID |
| 3855 | Tree Nuts | 5.4 | Tree Nuts | Ingredient Lookup!O96; Exact name and unique ID |
| 3808 | Uncommon Herb | 5 | Uncommon Herb | Ingredient Lookup!O40; Exact name and unique ID |
| 3867 | Uncommon Scrap | 5 | Uncommon Scrap | Ingredient Lookup!O107; Exact name and unique ID |
| 3839 | Valerian | 7 | Valerian | Ingredient Lookup!O76; Exact name and unique ID |
| 3856 | Vegetables | 5.4 | Vegetables | Ingredient Lookup!O97; Exact name and unique ID |
| 3863 | Vinegar Crafting Component | 13.8 | Vinegar Crafting Component | Ingredient Lookup!O8; Exact name and unique ID |
| 3845 | Viral Hemlock | 7 | Viral Hemlock | Ingredient Lookup!O77; Exact name and unique ID |
| 3896 | Weapons Platform | 19 | Weapons Platform | Ingredient Lookup!O38; Exact name and unique ID |
| 3823 | Wormwood | 7 | Wormwood | Ingredient Lookup!O79; Exact name and unique ID |

## Every unmatched spreadsheet output label

These **51 labels** have no confidently matching standalone item ID in the bundled recipe catalog or inspected importer data. Several describe alternate routes for an already mapped resource; they are retained as source acquisition data rather than invented new resource IDs. Named herbs are not substituted into alternative-ingredient slots.

| Source row | Source label | Credits | Reason |
| --- | --- | --- | --- |
| 14 | Mechanical Airship Framework - Artisan | 23 | No matching standalone Juno item ID |
| 15 | Mechanical Auto Frame - Artisan | 15 | No matching standalone Juno item ID |
| 16 | Mechanical Drive - Artisan | 18 | No matching standalone Juno item ID |
| 17 | Mechanical Engine - Artisan | 15 | No matching standalone Juno item ID |
| 18 | Mechanical Fuel System - Artisan | 18 | No matching standalone Juno item ID |
| 19 | Mechanical Gear System - Artisan | 18 | No matching standalone Juno item ID |
| 20 | Mechanical Hull - Artisan | 18 | No matching standalone Juno item ID |
| 22 | Mechanical Airship Framework - Travel | 19 | No matching standalone Juno item ID |
| 23 | Mechanical Auto Frame - Travel | 12 | No matching standalone Juno item ID |
| 24 | Mechanical Drive - Travel | 5.4 | No matching standalone Juno item ID |
| 25 | Mechanical Engine - Travel | 12 | No matching standalone Juno item ID |
| 26 | Mechanical Fuel System - Travel | 12 | No matching standalone Juno item ID |
| 27 | Mechanical Gear System - Travel | 5.4 | No matching standalone Juno item ID |
| 28 | Mechanical Hull - Travel | 12 | No matching standalone Juno item ID |
| 42 | Anise | 7 | No matching standalone Juno item ID |
| 43 | Aralia | 7 | No matching standalone Juno item ID |
| 45 | Basil | 7 | No matching standalone Juno item ID |
| 46 | Bay Leaf | 7 | No matching standalone Juno item ID |
| 48 | Burnet | 7 | No matching standalone Juno item ID |
| 49 | Calendula | 7 | No matching standalone Juno item ID |
| 51 | Caraway | 7 | No matching standalone Juno item ID |
| 52 | Chervil | 7 | No matching standalone Juno item ID |
| 53 | Cicely | 7 | No matching standalone Juno item ID |
| 54 | Dill | 7 | No matching standalone Juno item ID |
| 56 | Fennel | 7 | No matching standalone Juno item ID |
| 58 | Geranium | 7 | No matching standalone Juno item ID |
| 59 | Hibiscus | 7 | No matching standalone Juno item ID |
| 60 | Horehound | 7 | No matching standalone Juno item ID |
| 62 | Lemon Balm | 7 | No matching standalone Juno item ID |
| 63 | Lemongrass | 7 | No matching standalone Juno item ID |
| 65 | Milk Thistle | 7 | No matching standalone Juno item ID |
| 66 | Parsley | 7 | No matching standalone Juno item ID |
| 70 | Ragweed | 7 | No matching standalone Juno item ID |
| 71 | Rosemary | 7 | No matching standalone Juno item ID |
| 72 | Sage | 7 | No matching standalone Juno item ID |
| 74 | Thyme | 7 | No matching standalone Juno item ID |
| 75 | Turmeric | 7 | No matching standalone Juno item ID |
| 78 | Witch Hazel | 7 | No matching standalone Juno item ID |
| 85 | Festering Crystal - The Wheels of Commerce | 45 | No matching standalone Juno item ID |
| 86 | Festering Crystal - Dead Market Harvest | 15 | No matching standalone Juno item ID |
| 98 | Fish | 12 | No matching standalone Juno item ID |
| 101 | Basic Scrap - Foraging | 4.4 | No matching standalone Juno item ID |
| 102 | Basic Scrap - Helscape Mine | 3 | No matching standalone Juno item ID |
| 104 | Uncommon Scrap - Artisan | 12 | No matching standalone Juno item ID |
| 105 | Uncommon Scrap - Dirt Engineer's Toolkit | 6 | No matching standalone Juno item ID |
| 106 | Uncommon Scrap - Helscape Mine | 5 | No matching standalone Juno item ID |
| 108 | Rare Scrap - Artisan | 18 | No matching standalone Juno item ID |
| 109 | Rare Scrap - Dirt Engineer's Toolkit | 6 | No matching standalone Juno item ID |
| 110 | Rare Scrap - Helscape Mine | 7 | No matching standalone Juno item ID |
| 122 | Foraging Card - Vaguely Trustworthy Map Set | 5 | No matching standalone Juno item ID |
| 123 | Foraging Card | 5 | No matching standalone Juno item ID |

## Unmatched explicit ingredient-input values

| Source name | Explicit credits | Reason |
| --- | --- | --- |
| Corpse | 0 | No standalone Juno ID; price retained in source data only |

Corpse's confirmed **0** is preserved in source data. No standalone Corpse Juno ID was found, so no unrelated corpse-named item is assigned that price. Zero works for all valid mapped/custom resource IDs and is covered by tests.

## Every current app recipe ingredient without a mapped valuation

| Juno ID | Resource / ingredient slot | Default |
| --- | --- | --- |
| 3902 | Anise or Geranium | Unknown |
| 3903 | Anise or Rosemary | Unknown |
| 3940 | Any Herb | Unknown |
| 3904 | Aralia or Lemon Balm | Unknown |
| 3905 | Basil or Cicely | Unknown |
| 3906 | Basil or Marjoram | Unknown |
| 3908 | Bay Leaf or Turmeric | Unknown |
| 3909 | Bayberry or Ragweed | Unknown |
| 3910 | Bayberry or Sage | Unknown |
| 3911 | Burnet or Cicely | Unknown |
| 3912 | Burnet or Turmeric | Unknown |
| 3913 | Calendula or Marjoram | Unknown |
| 3914 | Calendula or Rosemary | Unknown |
| 3915 | Chervil or Geranium | Unknown |
| 3916 | Chervil or Ragweed | Unknown |
| 3917 | Dill or Parsley | Unknown |
| 3918 | Epazote or Witch Hazel | Unknown |
| 3938 | Expired Herbs within 3 Months Expired | Unknown |
| 3919 | Fennel or Wormwood | Unknown |
| 3920 | Foxglove or Viral Hemlock | Unknown |
| 3921 | Hibiscus or Thyme | Unknown |
| 3978 | Hooch | Unknown |
| 3922 | Horehound or Valerian | Unknown |
| 3923 | Jimson Weed or Quinine | Unknown |
| 3924 | Meat or Eggs or Fruit | Unknown |
| 3925 | Meat or Fruit or Milk | Unknown |
| 3926 | Meat or Fruit or Vegetables | Unknown |
| 3927 | Meat or Vegetables or Tree Nuts | Unknown |
| 3928 | Milk or Eggs or Fruit | Unknown |
| 3929 | Milk or Eggs or Tree Nuts | Unknown |
| 3931 | Milk or Vegetables or Tree Nuts | Unknown |
| 3932 | Milk Thistle or Salvia | Unknown |
| 3933 | Peppermint or Caraway | Unknown |
| 3934 | Peppermint or Sage | Unknown |
| 3935 | Prairie Wildrye or Lemongrass | Unknown |
| 3936 | Shellfish or Fish | Unknown |
| 5558 | Trade Note | Unknown |
| 3937 | Vegetables or Eggs or Tree Nuts | Unknown |

This inventory covers all current crafting ingredients, including category/alternative slots, rather than every crafted weapon or consumable output. A user may assign an override to these unknown resources in Settings. Unknown components keep the final blueprint cost unknown; Shopping Lists show the known subtotal plus unknown items. No acquisition fallback supplies a fabricated price.
