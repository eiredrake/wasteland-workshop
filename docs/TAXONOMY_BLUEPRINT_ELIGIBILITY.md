# Taxonomy-output Blueprint eligibility

The filter was in `src/features/blueprints/blueprints.ts`, in `masterBlueprints`. It rejected a recipe when its first crafted output had kind `taxonomy`. That check is removed. Procedure inclusion and the existing no-recipe exclusion remain unchanged.

All 16 formerly excluded prints are now eligible: Antithesis Poison, Arsenic Poison, Basic Travel Trade Resource, Betrayal Poison, Bitter Herb Poison, Bloodless Poison, Generic Blueprint Reproduction, Ghost Town Poison, Lost Trail Poison, Master Travel Trade Resource, Night Terror Draught, Proficient Travel Trade Resource, Recession Poison, Rotting Corpse Poison, Trade Note to Local Currency Conversion, and Transgressive Poison.

This is a catalog visibility change only. Existing recipe snapshots retain all crafting components/quantities, Mind, Resolve, duration and output associations. Work Item Notes remain the place to record a chosen output. No output picker, new Work Queue fields, storage/schema changes, special reproduction logic or currency-conversion workflow was added. The Generic Blueprint Reproduction record and Trade Note record become visible under the same eligibility rule; their existing data and behavior are unchanged. Currency exchange semantics remain outside scope.

## Validation

- 753 unit tests pass, including all 16 recipes entering the existing queue service with unchanged snapshots, costs and durations; notes save and round-trip through the existing persistence validator alongside an older ordinary activity.
- Lint, TypeScript and production/offline-PWA build pass.
- `tools/ui-taxonomy-blueprints-check.py` verifies all 16 Catalog rows open and enqueue using the existing Build control, exact recipe snapshots persist, Notes save, and 16 activities survive reload at 320/360/390/768/1280px.
- Updated `tools/ui-lineage-mechanics-check.py` verifies all eight lineage poison prints now in Catalog, Workshop and both Details modes (390/1280px), alongside healing brews, Any/Strain badges, unchanged collections and offline refresh.
- Representative desktop queue and mobile poison Details screenshots were inspected. No actual-device test was performed.
- Source catalog, economic calculations, queue/storage/backup implementation and Action/reproduction code are unchanged.

This supersedes the accepted taxonomy visibility limitation documented in the earlier issue #38 audit; that report describes the previous staging state.

Staging deployment verification is recorded below. Production deployment is not authorized.
