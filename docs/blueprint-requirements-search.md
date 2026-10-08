# Requirements to Use search — Issue #30

Catalog and Collection views now call the same usage-restriction matcher while retaining their existing name, skill, kind, date and collection-status search fields. Search remains trimmed, case-insensitive and partial. Blueprint metadata and every crafted final product's metadata.requirementsToUse are searched. Empty metadata is safe. No blueprint records or collection state are modified.

## Lineage investigation

The bundled normalized Juno catalog contains no keys named lineage or requiredLineage, including nested metadata. Actual lineage restrictions are present in crafted finalProduct.metadata.requirementsToUse: Angry Apple Invigorating Brew (#4403) says Townie Lineage; Adrenaline Healing Injection (#4439) and Bloody Healing Meal (#4422) say Gorger Lineage. These are now directly searchable as usage requirements. No lineage property is inferred from strings.

The fetcher saves observed Juno GraphQL response data, and normalize_blueprint copies metadata and itemCraftings intact rather than reconstructing or stripping final-product metadata. Therefore requirements/lineage text present in captured responses survives normalization. Raw response files are not available in this checkout; this investigation establishes the representation in the bundled catalog and preservation by importer code, not the absence of additional fields in Juno's entire live schema or unrequested GraphQL fields. If a future import exposes a dedicated lineage field, add its documented type and search source then.

Tests use actual Townie/Gorger blueprint records, case/partial/trim matches, blueprint-level and multiple-output requirements, absent metadata, existing searchable fields, and no source data mutation. Both views use the shared helper. No GitHub issue is automatically closed.

## Compact lineage and strain badges

Both protected blueprint-name columns now show small labeled restriction badges beneath the name, without introducing a Requirements column. The shared parser reads blueprint and crafted-output requirements and deduplicates identical restrictions. It recognizes explicit named lineage clauses for the eight lineage names present in this catalog, and explicit `Strain: …` clauses. `Iron or Unstable` remains one alternative expression. It never scans mechanics, invents a canonical lineage field, or displays full skill/lore restrictions. Ambiguous compound conditions remain in Details and search rather than being guessed. Future lineage names or alternate source formats may require extending the parser. Badge text wraps within the existing mobile name cell. Automated tests render both real list views and check parsing, omissions, alternatives, deduplication and unchanged data. Physical mobile layout testing remains outstanding.
