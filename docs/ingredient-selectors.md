# Ingredient selectors and concrete resource valuations

The catalog previously treated every crafting component ID as a resource. Juno uses real IDs for taxonomy nodes as well as concrete items; the application type omitted the child classifications and catalog discovery never followed them. The Ayden mapping then matched names to selector IDs and missed concrete children that were never direct ingredients.

## Domain correction

Use kind: taxonomy as the selector marker and childItemClassifications[].childItem as the qualifying options. No name splitting or blacklist is used. All 38 distinct selector valuation controls are removed. 2 erroneous shipped prices (Any Produce 5.4 and Local Currency 1) are removed. The catalog changes from 111 entries to 119 concrete entries. Existing overrides for known selector IDs are ignored and removed by sanitization on load/save; unrelated resource overrides remain.

Blueprints keep the original label, amount, and acceptsExpiredItemWithinDays; choices contain the concrete IDs separately. A recipe ingredient is either concrete or an unresolved choice. Recursive groups deduplicate leaves and stop cycles. The source data is retained unchanged. The existing master-blueprint taxonomy filtering still applies.

## Source audit

The bundled data has 107 distinct directly referenced ingredient IDs; 38 are taxonomies. All apparent Any/or selector names have taxonomy kind. There are no apparent Any/or/slash selector names with a concrete kind. This includes category names without obvious Any/or wording: Local Currency and Expired Herbs within 3 Months Expired. The raw import directory currently contains no JSON files, so the audit uses the bundled normalized Juno dataset, which retains the child classification metadata. None of the 38 bundled selectors lacks children. All current groups resolve to concrete children. Names are labels, not a parsing grammar.

| Selector ID | Original label | Qualifying concrete items |
| --- | --- | --- |
| 3902 | Anise or Geranium | Anise (#3811), Geranium (#3819) |
| 3903 | Anise or Rosemary | Anise (#3811), Rosemary (#3820) |
| 3940 | Any Herb | Anise (#3811), Aralia (#3832), Ayahuasca (#3846), Basic Herb (#3807), Basil (#3813), Bayberry (#3829), Bay Leaf (#3827), Burnet (#3826), Calendula (#3812), Cannabis (#3843), Caraway (#3836), Chervil (#3810), Cicely (#3834), Dill (#3817), Epazote (#3816), Fennel (#3815), Foxglove (#3842), Geranium (#3819), Hibiscus (#3833), Horehound (#3831), Jimson Weed (#3844), Lemon Balm (#3840), Lemongrass (#3838), Marjoram (#3821), Milk Thistle (#3814), Parsley (#3825), Peppermint (#3828), Prairie Wildrye (#3830), Quinine (#3847), Ragweed (#3818), Rare Herb (#3809), Rosemary (#3820), Sage (#3837), Salvia (#3822), Thyme (#3841), Turmeric (#3835), Uncommon Herb (#3808), Valerian (#3839), Viral Hemlock (#3845), Witch Hazel (#3824), Wormwood (#3823) |
| 3939 | Any Produce | Eggs (#3848), Fish (#3849), Fruit (#3850), Infection Material (#3851), Meat (#3852), Milk (#3853), Shellfish (#3854), Tree Nuts (#3855), Vegetables (#3856) |
| 3904 | Aralia or Lemon Balm | Aralia (#3832), Lemon Balm (#3840) |
| 3905 | Basil or Cicely | Basil (#3813), Cicely (#3834) |
| 3906 | Basil or Marjoram | Basil (#3813), Marjoram (#3821) |
| 3908 | Bay Leaf or Turmeric | Bay Leaf (#3827), Turmeric (#3835) |
| 3909 | Bayberry or Ragweed | Bayberry (#3829), Ragweed (#3818) |
| 3910 | Bayberry or Sage | Bayberry (#3829), Sage (#3837) |
| 3911 | Burnet or Cicely | Burnet (#3826), Cicely (#3834) |
| 3912 | Burnet or Turmeric | Burnet (#3826), Turmeric (#3835) |
| 3913 | Calendula or Marjoram | Calendula (#3812), Marjoram (#3821) |
| 3914 | Calendula or Rosemary | Calendula (#3812), Rosemary (#3820) |
| 3915 | Chervil or Geranium | Chervil (#3810), Geranium (#3819) |
| 3916 | Chervil or Ragweed | Chervil (#3810), Ragweed (#3818) |
| 3917 | Dill or Parsley | Dill (#3817), Parsley (#3825) |
| 3918 | Epazote or Witch Hazel | Epazote (#3816), Witch Hazel (#3824) |
| 3938 | Expired Herbs within 3 Months Expired | Anise (#3811), Aralia (#3832), Ayahuasca (#3846), Basic Herb (#3807), Basil (#3813), Bayberry (#3829), Bay Leaf (#3827), Burnet (#3826), Calendula (#3812), Cannabis (#3843), Caraway (#3836), Chervil (#3810), Cicely (#3834), Dill (#3817), Epazote (#3816), Fennel (#3815), Foxglove (#3842), Geranium (#3819), Hibiscus (#3833), Horehound (#3831), Jimson Weed (#3844), Lemon Balm (#3840), Lemongrass (#3838), Marjoram (#3821), Milk Thistle (#3814), Parsley (#3825), Peppermint (#3828), Prairie Wildrye (#3830), Quinine (#3847), Ragweed (#3818), Rare Herb (#3809), Rosemary (#3820), Sage (#3837), Salvia (#3822), Thyme (#3841), Turmeric (#3835), Uncommon Herb (#3808), Valerian (#3839), Viral Hemlock (#3845), Witch Hazel (#3824), Wormwood (#3823) |
| 3919 | Fennel or Wormwood | Fennel (#3815), Wormwood (#3823) |
| 3920 | Foxglove or Viral Hemlock | Foxglove (#3842), Viral Hemlock (#3845) |
| 3921 | Hibiscus or Thyme | Hibiscus (#3833), Thyme (#3841) |
| 3922 | Horehound or Valerian | Horehound (#3831), Valerian (#3839) |
| 3923 | Jimson Weed or Quinine | Jimson Weed (#3844), Quinine (#3847) |
| 5559 | Local Currency | Gold Standard (#5557), Slag (#5601), Stone (#5590), Scrip (#5591), Scrim (#5593), Cred (#5592), Day (#5602), Wager (#5594), Dollar (#5595), Brass (#5596), Chuck (#5597), Lug (Retired) (#5598), Exposure (#5599), Film (#5600), Shell (#5603), Byte (#5604), Access (#5623), Permit (#5624), Cheese (#6151), Lakes (#5689), Cassette (#5788) |
| 3924 | Meat or Eggs or Fruit | Meat (#3852), Eggs (#3848), Fruit (#3850) |
| 3925 | Meat or Fruit or Milk | Meat (#3852), Fruit (#3850), Milk (#3853) |
| 3926 | Meat or Fruit or Vegetables | Meat (#3852), Fruit (#3850), Vegetables (#3856) |
| 3927 | Meat or Vegetables or Tree Nuts | Meat (#3852), Vegetables (#3856), Tree Nuts (#3855) |
| 3928 | Milk or Eggs or Fruit | Milk (#3853), Eggs (#3848), Fruit (#3850) |
| 3929 | Milk or Eggs or Tree Nuts | Milk (#3853), Eggs (#3848), Tree Nuts (#3855) |
| 3931 | Milk or Vegetables or Tree Nuts | Milk (#3853), Vegetables (#3856), Tree Nuts (#3855) |
| 3932 | Milk Thistle or Salvia | Milk Thistle (#3814), Salvia (#3822) |
| 3933 | Peppermint or Caraway | Peppermint (#3828), Caraway (#3836) |
| 3934 | Peppermint or Sage | Peppermint (#3828), Sage (#3837) |
| 3935 | Prairie Wildrye or Lemongrass | Prairie Wildrye (#3830), Lemongrass (#3838) |
| 3936 | Shellfish or Fish | Shellfish (#3854), Fish (#3849) |
| 3937 | Vegetables or Eggs or Tree Nuts | Vegetables (#3856), Eggs (#3848), Tree Nuts (#3855) |

## Newly discovered concrete resources

Following structured child links finds 46 additional concrete ingredient identities. They include 21 local currencies, which remain Unknown rather than inheriting the Local Currency selector price.

- Access (#5623): Unknown
- Anise (#3811): 7 cr
- Aralia (#3832): 7 cr
- Basil (#3813): 7 cr
- Bay Leaf (#3827): 7 cr
- Brass (#5596): Unknown
- Burnet (#3826): 7 cr
- Byte (#5604): Unknown
- Calendula (#3812): 7 cr
- Caraway (#3836): 7 cr
- Cassette (#5788): Unknown
- Cheese (#6151): Unknown
- Chervil (#3810): 7 cr
- Chuck (#5597): Unknown
- Cicely (#3834): 7 cr
- Cred (#5592): Unknown
- Day (#5602): Unknown
- Dill (#3817): 7 cr
- Dollar (#5595): Unknown
- Exposure (#5599): Unknown
- Fennel (#3815): 7 cr
- Film (#5600): Unknown
- Fish (#3849): 12 cr
- Geranium (#3819): 7 cr
- Gold Standard (#5557): Unknown
- Hibiscus (#3833): 7 cr
- Horehound (#3831): 7 cr
- Lakes (#5689): Unknown
- Lemon Balm (#3840): 7 cr
- Lemongrass (#3838): 7 cr
- Lug (Retired) (#5598): Unknown
- Milk Thistle (#3814): 7 cr
- Parsley (#3825): 7 cr
- Permit (#5624): Unknown
- Ragweed (#3818): 7 cr
- Rosemary (#3820): 7 cr
- Sage (#3837): 7 cr
- Scrim (#5593): Unknown
- Scrip (#5591): Unknown
- Shell (#5603): Unknown
- Slag (#5601): Unknown
- Stone (#5590): Unknown
- Thyme (#3841): 7 cr
- Turmeric (#3835): 7 cr
- Wager (#5594): Unknown
- Witch Hazel (#3824): 7 cr

25 new mappings use exact standalone rows in the previously captured Ayden Ingredient Lookup data (2026-10-07). All have a unique structured concrete ID and source cell provenance. Anise (O42), Geranium (O58), and Rosemary (O71) each map independently to 7 cr. Existing concrete defaults, including Basic Scrap 3, Rare Scrap 7, Soft Metal 21, are unchanged. Shipped concrete defaults increase from 73 to 96 after removing two selector mappings and adding 25 concrete mappings. Spreadsheet acquisition rows and category input prices remain provenance only, never independent selector prices. No live spreadsheet values were changed.

## Costing and Builds

An unresolved choice has Unknown unit/total cost even when an old global or captured per-Build snapshot contains a price for its selector ID. The estimator sums known material costs but leaves production/selling/profit totals Unknown when an ingredient is unresolved. It does not use the cheapest option or select both. Build overrides list only concrete ingredients. Anise/Geranium/Rosemary can be priced separately globally; selecting the ingredient used on a particular Build is follow-up work. Existing recipe snapshots and timers are retained.

## Shopping Lists

The Find a Resource picker lists concrete resources only. Adding all blueprint ingredients stores one kind: requirement row for an unresolved selector, with structured qualifying options and the original label/quantity. The row says Ingredient choice / Choice not yet selected and has Unknown cost. Repeated identical requirements merge quantities; alternative members are not separately added as shopping demand. Fulfilled status and remove controls remain available. Storage/export stays version 1 with the additive requirement discriminator; legacy resource rows with known selector IDs are reclassified on load/import, retaining quantity and acquired status. Current taxonomy options are restored from authoritative bundled Juno metadata, not trusted imported option objects. Older app versions cannot read the new requirement rows; update devices before transferring lists.

## Ambiguities and follow-up

No current taxonomy lacks children. General missing/nested/cyclic groups stay unresolved rather than manufacturing resources or prices. Local Currency has 21 qualifying currencies; their relative exchange values are unspecified and remain Unknown. The expired-herb group preserves the existing recipe expiry constraint; options are eligibility information, not an ingredient inventory selection. Unknown concrete IDs remain Unknown unless the user provides an override. No ingredient-selection UI is added: follow-up should record the chosen concrete item on each Build/shopping requirement, validate membership and expiry constraints, and value its captured effective price. No issue is closed.

## Validation and files

177 tests pass across 10 files. Added 21 tests cover required selector exclusions, concrete prices/overrides, preserved Blueprint descriptions and option membership, nested/cyclic groups, Unknown costs, captured Build snapshots, shopping persistence/export/import and legacy migration. Updated economics tests remove obsolete fake-selector-price assumptions. All existing Blueprint, Shopping List, Craft Timer and Build Queue tests pass. Lint and production build pass. Browser verification confirms independent Anise settings (7 cr), unchanged Gourmand Recovery Meal requirement text, and a Shopping List row labeled Ingredient choice / Choice not yet selected with Unknown value.

- src/features/blueprints/IngredientRequirement.ts
- src/features/blueprints/IngredientCatalog.ts
- src/features/blueprints/CraftingComponent.ts
- src/economics/EconomicResourceCatalog.ts
- src/economics/EconomicsSettings.ts
- src/economics/DefaultCostCalculator.ts
- src/economics/ResourceValuationService.ts
- src/economics/BlueprintCostService.ts
- src/data/ayden-resource-defaults.json
- src/features/builds/BuildDetails.tsx
- src/features/shopping/ShoppingList.ts
- src/features/shopping/ShoppingListService.ts
- src/features/shopping/ShoppingListRepository.ts
- src/features/shopping/ShoppingListsView.tsx
- src/economics/EconomicsOverrides.test.ts
- src/economics/IngredientSelectors.test.ts
- docs/ingredient-selectors.md
