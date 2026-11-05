# Issue #38: Lineage applicability audit and implementation report

## Confirmed baseline

Catalog: **655 Blueprints**. The unchanged parser recognized **48 named-Lineage prints** and **1 Strain print**. The original investigation is confirmed: **8 healing brews** and **7 consumed poison variants** supply named lineage applicability in mechanics despite None/empty requirements. There are **31 Any Lineage occurrences**, of which 30 describe item effects and one describes a corpse.

The original before-parser output was captured before edits on main revision `dbbfd71`. The audit uses the actual shared parser, not a copy of its business logic. Both machine-readable reports contain every Blueprint, existing badge, relevant product name, exact source path/text, and local structured requirement. The source catalog SHA-256 is identical in both reports.

Catalog SHA-256: `9abda8d6a7ae9e12d3ed8074cd7daaa3ee2ee10f5c36c3256680d66e382c21ec`

## Before/after results

| Result | Count |
|---|---:|
| Previously detected Lineage prints | 48 |
| Newly recognized named-Lineage prints | 16 |
| Newly recognized valid Any-Lineage prints | 30 |
| Total prints with a Lineage badge | 94 |
| Removed/changed previously working badges | 0 |
| Changed Strain prints | 0 |
| Actual structured/mechanics conflict records | 0 |
| Ambiguous source records retained for review | 12 |
| Incidental source records excluded | 6 |

The additional named miss beyond the initial 15 is **Recession Poison (Elitariat)**. Its applied variant explicitly calls `20 Body to Elitariat`. Its consumed variant says `members of the Elitariat 10 Body Damage`, missing both Lineage and a verb. That malformed text is flagged, not repaired or guessed from; the clear applied variant provides the badge. All 46 newly matched prints below were reviewed. There are no unexpected new matches.

## Reviewed newly recognized badges

Every badge below was absent before the fix. Source paths and complete supporting text are in the after JSON. The displayed badge is also the reviewed expected result.

| Blueprint | Source product / field | Structured requirement | Expected badge | Relevant text |
|---|---|---|---|---|
| Adrenal Stabilizer Serum Combat Enhancer | Adrenal Stabilizer Serum Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Aberrant Horror and Aberrant Suffering. |
| Alleyway Performance Enhancer | Alleyway Performance Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Knockout and Malicious Discussion. |
| Antithesis Poison | Antithesis Poison (Applied) / Item Mechanics | None | Lineage: Evolved | Applied. On next attempted Strike, call "20 Body to Evolved". |
| Arisen Healing Brew | Arisen Healing Brew / Item Mechanics | None | Lineage: Devoted | Applied. Target (Both) of the Devoted Lineage regains 10 Body. |
| Auntie Deadeye's Combat Enhancer | Auntie Deadeye's Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Trick Shot and Equipment Awareness. |
| Backroad Performance Enhancer | Backroad Performance Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Awareness and Blinding. |
| Bastion Safeguard Combat Enhancer | Bastion Safeguard Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Members of any Lineage regain up to 2 uses of Shield Master and Mangle. |
| Bayful Healing Brew | Bayful Healing Brew / Item Mechanics | None | Lineage: Mutant | Applied. Target (Both) of the Mutant Lineage regain 10 Body. May self-Target. |
| Betrayal Poison | Betrayal Poison (Applied) / Item Mechanics | None | Lineage: Devoted | Applied. On next attempted Strike, call "20 Body to Devoted". |
| Bitter Herb Poison | Bitter Herb Poison (Applied) / Item Mechanics | None | Lineage: Landsman | Applied. On next attempted Strike, call "20 Body to Landsmen". |
| Bloodless Poison | Bloodless Poison (Consumed) / Item Mechanics | None | Lineage: Gorger | Ingested. When consumed, members of the Gorger Lineage take 10 Body Damage. |
| Burney Healing Brew | Burney Healing Brew / Item Mechanics | None | Lineage: Landsman | Applied. Target (Both) of the Landsman Lineage regain 10 Body. May self-Target. |
| Caleh Performance Enhancer | Caleh Performance Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Avoid and Break. |
| Charred Moments Combat Enhancer | Charred Moments Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Dead Trigger and Rally Call. |
| Dark Syrup Performance Enhancer | Dark Syrup Performance Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Balance and Takedown. |
| Fast and the Pugilist Combat Enhancer | Fast and the Pugilist Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Ground and Pound and Momentum. |
| Fireside Performance Enhancer | Fireside Performance Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Enhanced Movement and Salvaging. |
| Ghost Town Poison | Ghost Town Poison (Consumed) / Item Mechanics | None | Lineage: Townie | Ingested. When consumed, members of the Townie Lineage take 10 Body Damage. |
| Gold Label Performance Enhancer | Gold Label Performance Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Mental Endurance and Interfere. |
| Hearty Healing Meal | Hearty Healing Meal / Item Mechanics | None | Lineage: Any | Members of any Lineage regain 20 Body. Upsurge 5 Body. |
| Hooch | Hooch / Item Mechanics | None | Lineage: Any | Ingested. Members of any Lineage become intoxicated for 20 Minutes. |
| Iron Shadow Combat Enhancer | Iron Shadow Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Murder and Bleeding Mark. |
| Liquorish Healing Brew | Liquorish Healing Brew / Item Mechanics | None | Lineage: Elitariat | Applied. Target (Both) of the Elitariat Lineage regain 10 Body. May self-Target. |
| Lost Trail Poison | Lost Trail Poison (Consumed) / Item Mechanics | None | Lineage: Nomad | Ingested. When consumed, members of the Nomad Lineage take 10 Body Damage. |
| Mary-Gold Healing Brew | Mary-Gold Healing Brew / Item Mechanics | None | Lineage: Evolved | Applied. Target (Both) of the Evolved Lineage regain 10 Body. May self-Target. |
| Oddity Performance Enhancer | Oddity Performance Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Choking Blow and Stealth. |
| P. BeeR | P. BeeR / Item Mechanics | None | Lineage: Any | Ingested. Members of any Lineage become intoxicated for 20 minutes. |
| Reaper's Healing Brew | Reaper's Healing Brew / Item Mechanics | None | Lineage: Gorger | Applied. Target (Both) of the Gorger Lineage regain 10 Body. May self-Target. |
| Recession Poison | Recession Poison (Applied) / Item Mechanics | None | Lineage: Elitariat | Applied. On next attempted Strike, call "20 Body to Elitariat". |
| Red Mist Healing Injection | Red Mist Healing Injection / Item Mechanics | None | Lineage: Any | Members of any Lineage regain 20 Body, Injected (Can be self injected when in Bleed Out). Causes a Fracture in the user if they do not currently have one. |
| Rotting Corpse Poison | Rotting Corpse Poison (Consumed) / Item Mechanics | None | Lineage: Mutant | Ingested. When consumed, members of the Mutant Lineage take 10 Body Damage. |
| Rover Tea | Rover Tea / Item Mechanics | None | Lineage: Any | Ingested. Members of any Lineage regain 30 Body |
| Ruiner Combat Enhancer | Ruiner Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Death Stalk and Hunter's Mark. |
| Safe Harbor Performance Enhancer | Safe Harbor Performance Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Double Tap and First Aid. |
| Saint John's Recovery Brew | Saint John's Recovery Brew / Item Mechanics | None | Lineage: Any | Ingested.  Members of any Lineage regain 40 Mind. |
| Sharpened Mind Performance Enhancer | Sharpened Mind Performance Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Scatter Shot and Piercing Strike. |
| Silt Step Combat Enhancer | Silt Step Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Riposte and Agile Movement. |
| Skadou Combat Enhancer | Skadou Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Dead to Rights, Ground Shatter, and Cutthroat. |
| Slicker Healing Brew | Slicker Healing Brew / Item Mechanics | None | Lineage: Townie | Applied. Target (Both) of the Townie Lineage regain 10 Body. May self-Target. |
| Spiritwalk | Spiritwalk / Item Mechanics | None | Lineage: Any | Ingested. Members of any Lineage are intoxicated and experience hallucinations for 30 minutes. |
| Steamer Bag Recovery Meal | Steamer Bag Recovery Meal / Item Mechanics | None | Lineage: Any | Members of any Lineage regain 50 Mind and Upsurge 20 Mind. |
| Tattered Shards Combat Enhancer | Tattered Shards Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Gimme Your Kicks and Cowards Way Out. |
| Uncle Ember's Combat Enhancer | Uncle Ember's Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Never Here and The a la Menthe. |
| Uncle Todd's Healing Brew | Uncle Todd's Healing Brew / Item Mechanics | None | Lineage: Any | Ingested. Members of any Lineage regain 40 Body. |
| Wandering Healing Brew | Wandering Healing Brew / Item Mechanics | None | Lineage: Nomad | Applied. Target (Both) of the Nomad Lineage regain 10 Body. May self-Target. |
| Y.C. Vapor's Combat Enhancer | Y.C. Vapor's Combat Enhancer / Item Mechanics | Requires User To Have Expended Levels of the Appropriate Skill | Lineage: Any | Injected. Members of any Lineage regain up to 2 uses of Drag Handle and I've Seen Worse. |

## Manual-review records and false-positive checks

These are source-data interpretation notes, not errors shown to app users. No badge is inferred from the following wording unless separate clear evidence exists.

| Blueprint/product | Classification | Reason for withholding a badge from this text |
|---|---|---|
| Bloody Bedlam Bands / Bloody Bedlam Bands | ambiguous | Generic willing Lineage Targets; no explicit Any/named lineage statement. |
| Daline Death Measure Osteotome / Daline Death Measure Osteotome | incidental | Corpse/advantage/lore reference is not an applicability restriction. |
| Devotion of the Free Radical / Devotion of the Free Radical | incidental | Corpse/advantage/lore reference is not an applicability restriction. |
| Freeiron Chakram / Freeiron Chakram | ambiguous | Lineage is selected at crafting time; no fixed lineage to display. |
| Ghost Pipes / Ghost Pipes | ambiguous | Generic Lineage Targets; do not assume a named lineage or Any. |
| Grave Head Death Brew / Grave Head Death Brew | incidental | Corpse/advantage/lore reference is not an applicability restriction. |
| Heavycraf Punchers / Heavycraf Punchers | ambiguous | Conditional Landsman bonus; other lineages can use the weapon. |
| Infectus Copiam / Infectus Copiam | ambiguous | Generic sacrificial Lineage Targets; no explicit Any/named applicability. |
| M.M. Necro-Info Head Jar / M.M. Necro-Info Head Jar | incidental | Corpse/advantage/lore reference is not an applicability restriction. |
| Necrological Transformation Procedure / Necrological Transformation Procedure | ambiguous | Protection against Lineage Bane; not user or target lineage eligibility. |
| On The Go Patch Kit (Virtual Only) / On The Go Patch Kit (Virtual Only) | ambiguous | Nomad is an exception to a movement condition, not a restriction on use. |
| Purple Sheened Byproduct / Purple Sheened Byproduct | ambiguous | Immunity to Lineage Bane; not eligibility. |
| Recession Poison / Recession Poison (Consumed) | ambiguous | Malformed consumed description; applied variant independently supplies Elitariat. |
| Sedlec Engineering Plans / Sedlec Engineering Plans | ambiguous | Generic sacrificial Lineage Targets; not a fixed user restriction. |
| That Cursed Pitchfork / That Cursed Pitchfork | incidental | Corpse/advantage/lore reference is not an applicability restriction. |
| The Big Hate / The Big Hate | ambiguous | A lineage is selected by the user; no fixed lineage to infer. |
| The Hunter's Secret / The Hunter's Secret | incidental | Corpse/advantage/lore reference is not an applicability restriction. |
| Toothpiq Jagged Ulu / Toothpiq Jagged Ulu | ambiguous | A named lineage is selected in a damage call; no fixed lineage specified. |

The Hunter's Secret and Devotion of the Free Radical describe lineage advantages/changes and receive no fixed lineage badge. M.M. Necro-Info Head Jar references an Any Lineage corpse and does not receive Lineage: Any. The parser deliberately prefers unbadged, reviewable ambiguity over an invented restriction.

## Parser and display changes

- `UsageRestrictions.ts`: centralized traversal of Blueprint metadata, direct crafted outputs and only their associated child variants. No ingredient, unrelated product, Special Notes or lore-field scanning.
- Structured requirements remain authoritative in their Blueprint/product/variant scope. None and non-lineage requirements do not block valid mechanics. Equivalent values are normalized/deduplicated. Distinct valid named contexts are retained. A named/Any combination is reduced to named information and a diagnostic because the existing bubble cannot distinguish those contexts.
- Mechanics matches carry internal `user`, `target`, or `unspecified` applicability and exact source/product provenance. Existing structured objects and Strain parsing remain compatible. Target effects are not modeled as user restrictions.
- Canonical names remain the existing eight lineages. Landsmen normalizes to Landsman. Any is a separate applicability value, not a new named lineage.
- Recognizes bounded Members/Target-of-Lineage effect statements, explicit lineage descriptors, Lineage-only phrases, and explicit applied-poison damage calls. Unsupported conditions and incidental references remain unbadged.
- `CraftingFinalProduct.ts`: describes the already-present childItemClassifications/childItem associations in TypeScript. No source catalog/schema or stored data changes.
- `BlueprintUsageBadges.tsx`: same gold badge component and CSS; mechanics tooltip identifies applicability.
- `BlueprintDetails.tsx` / `.css`: reuse that badge component below the existing header; a flex-row placement rule is the only layout addition. Catalog and Workshop continue through BlueprintName. Search matching is unchanged.

## Tests and delivery

`UsageRestrictions.test.ts` updates the previous intentional mechanics omission. `UsageRestrictionsMechanics.test.tsx` covers all real healing/poison mappings, all requested Any forms, case/whitespace/punctuation, Landsmen, Blueprint/product/variant contexts, precedence/conflicts, duplicates, multiple lineages, false positives, user vs target provenance, unaffected Strain and the entire before baseline.

Reproduce the after audit with `node tools/audit-lineage.mjs after`. The tool refuses to overwrite the pre-change baseline.

No ownership cycles, collection persistence, queue/timer logic, shopping/warehouse/pricing, export/import or source catalog data was changed. No production deployment is authorized. Physical-device verification remains separate from emulated browser checks.

## Accepted taxonomy visibility limitation

The existing master catalog deliberately excludes 16 taxonomy-output recipes, including all of the poisons audited here. The user explicitly requested preserving that filter pending a later taxonomy project. No catalog filtering was changed. Parser/unit and direct Blueprint Details checks cover every poison. Existing catalog/Workshop rows continue to show badges for visible prints; hidden taxonomy recipes remain hidden even when present in a saved collection. This is an accepted existing visibility limitation, not an unrecognized lineage or a new restriction. Direct catalog detail routes use the full catalog and can display their badges.

## Completed validation and file list

737 tests pass, including the full-catalog baseline-preservation assertions; lint, TypeScript and production/offline-PWA build pass. The PowerShell release/deployment tooling regression suite also passes. UI checks cover all 16 new named matches (poisons through direct Details), representative Any and the existing Strain badge, excluded corpse/advantage examples, Catalog, Workshop and both applicable Details modes. Chrome viewports: 320, 360, 390, 768 and 1280 pixels. All eight healing-brew header badges were visually inspected. Offline refresh and unchanged saved collection data were verified. The issue #36 status/collection/backup/offline acceptance suite passed again at 390px. These are emulated desktop/mobile checks, not actual-phone installation tests.

Implementation: UsageRestrictions.ts; CraftingFinalProduct.ts; BlueprintUsageBadges.tsx; BlueprintDetails.tsx and BlueprintDetails.css. Tests: UsageRestrictions.test.ts, UsageRestrictionsMechanics.test.tsx, tools/ui-lineage-mechanics-check.py. Audit: tools/audit-lineage.mjs and docs/audits/issue-38-lineage-{baseline,after}.json. This report is docs/ISSUE_38_LINEAGE_AUDIT.md. No status-cycle, queue, shopping, warehouse, pricing or source catalog files were changed.
