# Wasteland Workshop agent instructions


## Mandatory UI consistency

All new or modified user-facing controls MUST follow [docs/UI_DESIGN_STANDARDS.md](docs/UI_DESIGN_STANDARDS.md).

Before implementing a control:

1. Search the shared library under `src/components`.
2. Reuse the canonical component when one exists.
3. Do not independently style an equivalent control.
4. Use established theme tokens in `src/styles/theme.css`.
5. Preserve keyboard and mobile accessibility.
6. Inspect the rendered desktop and mobile result, including relevant states.
7. Flag genuinely new visual patterns for user approval; patterns already authorized by a work order need no repeated approval.

Do not introduce unapproved button styles, raw filtering search fields, competing dropdown styles, duplicate Back/removal implementations, hardcoded replacement palettes, or browser-default controls where themed equivalents exist. Extend canonical controls before creating duplicates. Native HTML remains appropriate inside canonical components and for accessible forms/selects/details/dialogs.

New UI is incomplete until visual consistency review passes. Run tests, lint, build and relevant visual/workflow checks. Screenshot candidates never automatically replace reviewed baselines. Preserve timer/economics/rules/persistence unless the task explicitly authorizes those changes.
