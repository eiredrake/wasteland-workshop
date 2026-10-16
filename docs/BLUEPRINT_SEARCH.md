# Blueprint search

Blueprints and Workshop collection searches include names, mechanics/descriptions, notes, usage and lineage restrictions, print/output types, and the existing view columns (skills, dates or collection status).

Search is case insensitive and supports partial text. Spaces form a phrase, so `Mind Brew` looks for those words together in a searchable field. It does not imply an exact whole-name match.

- `Mind+Brew`: both terms, anywhere in the searchable fields, in either order.
- `Mind|Brew`: either term.
- `Mind-brew`: Mind present, Brew absent from all searchable fields.
- `"box-trap"`: literal hyphen rather than exclusion. Quote any phrase containing operator characters.

AND and exclusion bind before OR: `mind+brew|resolve+brew` accepts either pair. Parentheses are not operators. Empty search shows all prints; a trailing operator retains the preceding terms while typing.

Description regression: catalog mechanics live primarily on crafting final-product metadata. The shared matcher now searches both Blueprint metadata and every crafted output, without changing catalog data or stored user data.
