# Review remaining printable recipes: taxonomy outputs and item-producing procedures

Tracked in [GitHub issue #35](https://github.com/eiredrake/wasteland-workshop/issues/35).

The catalog audit found 16 remaining prints excluded from the master list because the first recipe output has `kind: taxonomy`. These are choice/group outputs, not necessarily unusable recipes. Review their intended behavior before changing the exclusion rule.

All 48 Benediction / Procedure / Necrology Procedure / Dubious Procedure prints now appear in the master list and collections. Forty-five can be recorded as Actions. Three explicitly produce items and remain visible but cannot be queued until their crafting inputs/outputs are modeled. This issue covers those three exceptions as well as the 16 excluded recipes.

## 16 taxonomy-output recipes still excluded

| Blueprint ID | Print | Current recipe | Output choice / review needed |
|---|---|---|---|
| 4466 | Antithesis Poison | 20 min; 15 Mind; 0 Resolve; 1 × Epazote or Witch Hazel, 2 × Rare Herb | 1 × Antithesis Poison: Antithesis Poison (Applied); Antithesis Poison (Consumed) |
| 4467 | Arsenic Poison | 20 min; 15 Mind; 0 Resolve; 2 × Rare Herb, 1 × Viral Hemlock | 1 × Arsenic Poison: Arsenic Poison (Applied); Arsenic Poison (Consumed) |
| 6418 | Basic Travel Trade Resource | 0 min; 1 Mind; 0 Resolve; 5 × Local Currency | 1 × Basic Travel Trade Resource: Eggs; Mechanical Drive; Mechanical Gear System; Fruit; Vegetables; Meat; Milk; Tree Nuts |
| 4468 | Betrayal Poison | 20 min; 15 Mind; 0 Resolve; 2 × Rare Herb, 1 × Milk Thistle or Salvia | 1 × Betrayal Poison: Betrayal Poison (Applied); Betrayal Poison (Consumed) |
| 4469 | Bitter Herb Poison | 20 min; 15 Mind; 0 Resolve; 1 × Prairie Wildrye or Lemongrass, 2 × Rare Herb | 1 × Bitter Herb Poison: Bitter Herb Poison (Applied); Bitter Herb Poison (Consumed) |
| 4470 | Bloodless Poison | 20 min; 15 Mind; 0 Resolve; 1 × Dill or Parsley, 2 × Rare Herb | 1 × Bloodless Poison: Bloodless Poison (Applied); Bloodless Poison (Consumed) |
| 6382 | Generic Blueprint Reproduction | 20 min; 1 Mind; 0 Resolve; 2 × Any Herb | 1 × Blueprint: Generic Blueprint output has no child choices in the catalog; identify the print being copied. |
| 4471 | Ghost Town Poison | 20 min; 15 Mind; 0 Resolve; 1 × Hibiscus or Thyme, 2 × Rare Herb | 1 × Ghost Town Poison: Ghost Town Poison (Applied); Ghost Town Poison (Consumed) |
| 4472 | Lost Trail Poison | 20 min; 15 Mind; 0 Resolve; 1 × Aralia or Lemon Balm, 2 × Rare Herb | 1 × Lost Trail Poison: Lost Trail Poison (Applied); Lost Trail Poison (Consumed) |
| 6417 | Master Travel Trade Resource | 0 min; 10 Mind; 0 Resolve; 15 × Local Currency | 1 × Master Travel Trade Resource: Infection Material; Recovered Electronics; Synthetic Fibers; Mechanical Airship Framework; Mechanical Components; Passenger Carrier; Supply Carrier; Weapons Platform |
| 5937 | Night Terror Draught | 20 min; 5 Mind; 0 Resolve; 1 × Radioactive Compounds Crafting Component, 1 × Salty Crafting Component, 2 × Basic Herb | 1 × Night Terror Draught: Night Terror Draught (Applied); Night Terror Draught (Brew); Night Terror Draught (Injected) |
| 6419 | Proficient Travel Trade Resource | 0 min; 5 Mind; 0 Resolve; 10 × Local Currency | 1 × Proficient Travel Trade Resource: Plastics; Mechanical Auto Frame; Mechanical Hull; Fish; Shellfish; Machined Components; Mechanical Engine; Mechanical Fuel System |
| 4473 | Recession Poison | 20 min; 15 Mind; 0 Resolve; 1 × Fennel or Wormwood, 2 × Rare Herb | 1 × Recession Poison: Recession Poison (Applied); Recession Poison (Consumed) |
| 4474 | Rotting Corpse Poison | 20 min; 15 Mind; 0 Resolve; 2 × Rare Herb, 1 × Horehound or Valerian | 1 × Rotting Corpse Poison: Rotting Corpse Poison (Applied); Rotting Corpse Poison (Consumed) |
| 6384 | Trade Note to Local Currency Conversion | 0 min; 5 Mind; 0 Resolve; 1 × Trade Note | 3 × Local Currency: Gold Standard; Slag; Stone; Scrip; Scrim; Cred; Day; Wager; Dollar; Brass; Chuck; Lug (Retired); Exposure; Film; Shell; Byte; Access; Permit; Cheese; Lakes; Cassette |
| 4475 | Transgressive Poison | 20 min; 15 Mind; 0 Resolve; 1 × Shellfish, 2 × Rare Herb | 1 × Transgressive Poison: Transgressive Poison (Applied); Transgressive Poison (Consumed) |

### Decisions needed
- Ten poison recipes (#4466–4475): choose Applied or Consumed/Ingested output before queueing; preserve each concrete child item’s mechanics, expiration, use count and canonical item ID. Ingredient selectors such as “Epazote or Witch Hazel” are alternatives, not a single inventory resource.
- Night Terror Draught (#5937): the taxonomy lists Applied, Brew and Injected variants, but the blueprint notes mention only Applied or Ingested. Resolve that conflict against the intended rules before enabling a selection.
- Travel Trade Resource recipes (#6418 Basic, #6419 Proficient, #6417 Master): determine whether these belong in printable collections, the Action picker, or both. Select a concrete reward and actual Local Currency input. The source records have zero time; do not invent a crafting timer or treat the output group as an inventory item.
- Generic Blueprint Reproduction (#6382): choose which print is being copied; respect that print’s copying permission, reproduction skills/costs and ingredients rather than assuming every print uses the generic recipe. Decide how a copied print is recorded.
- Trade Note to Local Currency Conversion (#6384): choose an actual currency, preserve the printed output quantity of 3 and Mind cost of 5, and review retired currencies. Keep this conversion separate from credit valuation settings (Trade Notes valued at 5cr; other currencies at 1cr). Do not silently change either the recipe or economics defaults.

## Three visible procedures with item outputs still awaiting queue support

| Blueprint ID | Procedure | Printed operation / output | Review needed |
|---|---|---|---|
| 6219 | Hypocritical Oath | 10 minutes, 10 Mind; creates one Hypocritical Sample, 3-month expiration | Capture the disease name and local-disease restrictions; preserve target/performer disease effects. Model the concrete output and its expiration. |
| 5958 | Infectus Copiam | 15 minutes; 1 Rare Scrap expended; 1 Resolve per killed Target; creates Bottled Infection, 12-month expiration | Support the two-target / single-last-Infection alternatives and correct costs; retain Guide/site consequences and printed eligibility constraints. |
| 6221 | Nero Extraction | 10 minutes, 1 Resolve, 1 Psionic Crystal expended; creates one Squid Crystal, one use, 6-month expiration | Capture the recorded memory and emotions, target eligibility and required attached description; model the item output and consumable. |

These three prints can already be read, shared and tracked in collections. Their queue controls show a crafting-output review notice; they are not misrepresented as empty-output Actions.

## Related procedure considerations
- Cutting Corners, Sedlec Engineering Plans, Shared Hands, Synthesis of Prognosis and Turning the Key of Memories are now recorded Actions. They display the original modifier rules, but do not automatically change another activity’s materials, costs, duration, output mechanics or expiration. Consider linked-project support as a separately scoped follow-up.
- Procedures whose duration is “same as project”, per-target, or “see text” require an explicit duration instead of a fabricated default.
- Preserve source contradictions for rules review: Turning of the Seasons’ Wheel has 10-minute duration versus 30-minute roleplay text; The Glass Onion Technique has 5-minute duration versus 1-minute mechanics.

## Acceptance criteria
- [ ] Classify all 19 prints individually: concrete-output Blueprint, Action, choice recipe, reproduction, conversion, or intentionally excluded; document each decision.
- [ ] Expose approved prints in the master list and collections without making taxonomy/selector groups into Warehouse resources.
- [ ] Require concrete input/output choices where the print specifies alternatives; use canonical IDs and recorded choice snapshots.
- [ ] Preserve printed costs, quantities, skills, locations, targets, mechanics, expiration and uses; identify source conflicts without silently rewriting rules.
- [ ] Define whether and how completion records produced items; follow the current policy of not automatically consuming inventory or character resources.
- [ ] Keep fractional internal economics precision and round up only final displayed credit valuations.
- [ ] Cover master/collection search, queue routing, choices, zero-duration operations, immutable history, persistence and portable backup round trips.
- [ ] Verify desktop/mobile controls using existing themed components; run tests, lint, build and relevant browser checks.

## Evidence / implementation locations
- Bundled catalog: `src/data/wasteland-blueprints.json` (generated 2026-10-06). IDs above are catalog Blueprint IDs, not GitHub issue numbers.
- Master filtering: `src/features/blueprints/blueprints.ts`.
- Procedure classification, output exceptions and action snapshots: `src/features/blueprints/ProcedureAction.ts`.
- Procedure queue controls: `src/features/blueprints/ProcedureQueueEntry.tsx`; queue pickers: `src/features/actions/QueueEntry.tsx`.
- Existing selector handling: `src/features/blueprints/IngredientCatalog.ts` and `IngredientRequirement.ts`.
- Audit invariant: `ProcedureAction.test.ts` verifies that exactly 16 taxonomy-output recipes remain excluded; output-producing procedures are visible but queue-blocked.

This is a review work order. Do not blanket-enable taxonomy outputs or fabricate recipes from prose without resolving the choices above.
