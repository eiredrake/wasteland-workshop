# Queue-only Actions

Actions are now created exclusively through Work Queue → Add to Queue → Action. The standalone menu entry, App view and catalog/detail navigation are removed. The existing searchable picker and configuration workflow remain; rules, prerequisites, tools, facilities, inputs, outputs and effects stay in expandable Requirements and details. Duration, Mind and Resolve now recalculate visibly above Add to Queue.

## Removed and retained code

Removed exclusively standalone `src/features/actions/ActionsView.tsx`. The former `ActionDetails.tsx` shared form was retained as `ActionConfigurationForm.tsx`, with its standalone branch and redundant target inputs removed. `Actions.css` became `ActionConfigurationForm.css`, preserving queue, summary and historical snapshot styling and removing the obsolete catalog selector. Form CSS is also imported directly by the form so styling does not depend on a deleted page.

No edits to ActionCatalog.ts, Action.ts, ActionService.ts, Action IDs/versions/formulas, queue/history repositories, ActivitySnapshotView.tsx or backup schemas. Existing Action executions remain snapshots and are not recalculated or migrated. Historical target values and configurations still display normally.

Modified files:

- src/App.tsx: remove Actions import, view union, menu and render branch.
- src/features/actions/QueueEntry.tsx: reuse renamed form, add Work Queue tour anchors.
- src/features/actions/ActionConfigurationForm.tsx/.css and ActionConfiguration.ts: simplified retained form, fixed defaults and visible mechanical fields.
- src/features/builds/BuildQueueView.tsx: renamed shared CSS import.
- src/features/tours/TourRegistry.ts: remove standalone Actions tour, expand Work Queue tour to cover selecting/searching/configuring/reviewing/adding/starting Actions.
- src/styles/controls.css: remove obsolete catalog styling.
- src/features/actions/Actions.test.ts, QueueEntry.test.tsx, ActionConfiguration.test.ts; src/features/tours/Tours.test.tsx; src/components/ThemeControls.test.tsx; tools/ui-theme-rules.test.mjs: updated references and new audit/compatibility coverage.
- tools/ui-functional-check.py, ui-tour-check.py, ui-visual-check.py, ui-action-consolidation-check.py: queue-only workflows and revised scene/tour coverage.
- Six individually reviewed queue form/menu baselines; docs/guided-tours.md and docs/UI_DESIGN_STANDARDS.md.

## Input audit

All 17 catalog options were inspected against resolveAction and session enforcement.

Removed new-form optional Target inputs (object, self or another character, willing/consenting character, etc.): these were metadata-only and changed no calculation, validation, resource/output or execution behavior. Eligibility remains documented in requirements. Existing historical Target snapshots remain intact.

Removed fixed one-choice herb selectors for Basic, Uncommon and Rare Herb from the UI. Their only possible value is populated automatically in the configuration, preserving output naming and same-herb session enforcement. Definitions themselves remain intact for historical validation.

Retained:

- Herb quantity: changes Mind, duration, output quantity and session limits.
- Named herb: changes output type and same-herb session eligibility.
- Session ID: groups gathering and enforces per-session limits.
- Additional healing Mind: changes Mind and restored Body, up to 100 Body; time stays 10 minutes.
- Affected limbs: changes Treat Mangle cost, duration and effect quantity.
- Option choices: agricultural output, meditation Resolve/effects and mine scrap tiers change mechanically.
- Generic resource/multi-choice/text/quantity field support remains for meaningful definitions. Per-Activity price overrides remain in Notes & Overrides.

Quantity defaults use the definition's minimum; single choices are automatic. A preview-only session placeholder lets costs update before the required session ID is entered; actual submission still validates the real ID and session limits.

## Tours and compatibility

Nine tours remain. The Work Queue tour has explicit Action source, search, input, cost-review and submit steps, followed by start/pause/order/settings/completion instructions. It does not create demonstration work or auto-select/start Activities. Existing Viewed/Completed distinctions, replay and intro suppression remain unchanged.

Legacy actions-tour progress is retained as a valid unknown ID by existing storage/backup validation, but it is no longer listed or launchable. No unrelated progress is reset. Historical and pending Action records remain readable with target metadata and configurations unchanged.

## Verification

455 tests pass in 33 files, including the complete catalog-option input audit, limb/fixed-herb UI checks and removed-tour/legacy-progress coverage. Lint, TypeScript and production build pass. The build retains its existing large-bundle advisory.

Automated desktop/mobile browser checks pass at 1280, 768, 390 and 320 widths: absent standalone navigation; queue Action search; medical/gathering/mine choices; dynamic costs; required session validation; start/pause/reload/resume/completion; legacy Target history; backup snapshots and legacy progress; manual revised Work Queue tour without resource spending. Existing general workflows and tour checks pass. The theme suite now compares 28 current scenes after retiring six standalone Actions scenes, plus eight tour scenes. The six intentional queue-form/menu changes were inspected individually before accepting baselines. Original audit documents/screenshots remain historical evidence.

No new data migration, networking, official rules change, tag or release publication. Physical-device checks remain separate from responsive desktop browser emulation.
