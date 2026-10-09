# UI Theme Standardization — Implementation Report

Historical reference: standalone Actions catalog/details have since been consolidated into Work Queue → Add to Queue → Action. The screenshots below document the earlier audit.

Date: 2026-10-08 · Wasteland Workshop 0.6.3 · Repository: G:/codebase/wasteland-workshop

## A. Summary

All 20 audit findings were addressed using the existing charcoal/olive, cream, rust, gold, green and grey theme. Shared Back/Search/Remove controls are wired into existing screens; ordinary buttons/selects/fields/statuses/dialogs use common foundations. Action information and saved snapshots reuse Blueprint panel styling. The shared full Craft Timer fits narrow screens.

Timer calculations, Action rules, economics, source definitions and persisted schemas were not changed by this UI work. Existing user data and earlier working-tree feature changes were preserved. History presentation changed to legible recorded economics with editable notes; its saved snapshots remain fixed.

## B. Audit resolution matrix

All entries are implemented and verified; device/OS limitations are listed below, not silently omitted.

| Finding | Resolution | Components/files | Verification |
|---|---|---|---|
| UI-001 | Shared 44px button/font/padding/hover/focus/disabled foundation replaces small browser buttons across screens. | controls.css; App.css; settings/collection/shopping controls | Screenshot dimensions and visual target assertions; isolated workflows. |
| UI-002 | Shared full timer uses border-box sizing, responsive ring and wrapping; no separate mobile timer. | controls.css; CraftTimer/CraftTimer.css | 35 screen/width measurements plus timer screenshots at 320/360/390/768/1280. |
| UI-003 | Accent token defined; Datalist Back moved to shared BackButton; universal gold focus. | theme.css; Datalist; BackButton | Keyboard Tab/Shift+Tab focus measured 2px gold at all five widths. |
| UI-004 | Actions search migrated to canonical icon/clear field. | ActionsView.tsx; SearchInput | Search filtering/clear workflows and screenshot comparisons. |
| UI-005 | Warehouse and economics filtering use the same SearchInput; selection still uses SearchablePicker. | WarehouseView.tsx; EconomicsSettingsView.tsx | Rendered fields, filter workflows and selectors reviewed. |
| UI-006 | One catalog-level Back remains; embedded Action form uses Close Action Selection. | ActionDetails.tsx; ActionsView.tsx; QueueEntry.tsx | Visual assertion: exactly one Back in catalog Action Details. |
| UI-007 | Queue/history details and full timer use destination-labeled BackButton. | BuildDetails.tsx; App.tsx | Rendered views and workflow transitions. |
| UI-008 | Individual queue/history/collection/list/resource/lot removals use grey RemoveBadge; compact 32px visual inside 44px target. | RemoveBadge; BuildQueueView; WorkHistoryView; BlueprintCollectionsView; ShoppingListsView; WarehouseView | Accessible label tests; compact adjacent badges reviewed; deletion workflows. |
| UI-009 | Browser deletion confirmations replaced by themed ConfirmationDialog; explicit final labels, one bulk confirmation. Quantity zero stays immediate. | BlueprintCollectionsView; ShoppingListsView; ConfirmationDialog | Cancel/confirm, collection/list/resource/bulk deletion and immediate quantity checks; lint bans window.confirm. |
| UI-010 | Short native selects share 44px dark/cream/gold-focus baseline; existing searchable picker retained. | controls.css; SearchablePicker | Rendered selectors; ArrowDown/Enter picker workflow. OS popup interiors remain native. |
| UI-011 | Queue source aria-pressed selection visibly uses persistent gold; filter selection follows same convention. | controls.css; QueueEntry; Workshop filters | Selected-source screenshot and aria-pressed assertion. |
| UI-012 | Action Details and corresponding snapshots use existing Blueprint-style InformationPanel sections and accents. | InformationPanel; ActionDetails; ActivitySnapshotView | Desktop/mobile comparison with existing Blueprint Details; all execution model/rules unchanged. |
| UI-013 | Flex summaries show right/down markers; native details/summary and default open states retained. | controls.css; BuildQueueView; WorkHistoryView | Collapsed/expanded screenshot coverage and shared queue/history tests. |
| UI-014 | Existing badge families now share typography/pill border/corners and semantic tokens; informational spans stay noninteractive, status buttons keep touch targets. | controls.css; legacy badge CSS; BuildStatusBadge; BlueprintUsageBadges | Rendered statuses in Blueprint/queue/history/shopping/Warehouse; membership/status logic retained. |
| UI-015 | Gold keyboard focus applies to buttons, links, fields, selectors, badges and summaries; semantic hover retained. | controls.css; BackButton; SearchInput; theme tokens | Actual keyboard focus measured and captured; hover/selection screenshots. |
| UI-016 | Disabled styling is consistent/legible; historical economics is readable recorded text, not disabled editing fields. | controls.css; BuildDetails | History notes/save workflow; regression test rejects historical numeric editors. |
| UI-017 | Alerts/invalid borders use shared danger appearance with warning icon; expiration/economic/build/Action field errors have associations. | controls.css; WarehouseSettingsView; EconomicsSettingsView; BuildDetails; ActionDetails | Invalid expiration screenshot, aria association and existing validation tests. |
| UI-018 | Native dialog visuals and hierarchy consolidated; destructive confirmation danger, primary Apply/Save orange, Cancel neutral. | controls.css; ConfirmationDialog; TimerConfiguration; SharePreview | Open confirmation/timer/sharing reviewed; Cancel/Apply/Escape semantics retained. |
| UI-019 | Common duplicated palette literals replaced by existing semantic tokens; obsolete badge/search/Back rules consolidated. | theme.css; controls.css; feature/component CSS | Lint plus palette/foundation tests; specialized timer/art color exceptions documented. |
| UI-020 | Queue heading precedes Add to Queue; detail names use nested headings; Settings has one main heading and section headings. | App.tsx; BuildQueueView; BuildDetails; ActionDetails; Settings components | Rendered page hierarchy and mobile width checks. |

## C. Canonical controls and migrations

- **BackButton** (`src/components/BackButton/`): Datalist Blueprint/Action details, Work Queue/History details, full timer destination navigation. Action picker dismissal is distinct.
- **SearchInput** (`src/components/SearchInput/`): master Blueprint catalog, Workshop collection, Actions, Warehouse and economics filtering. Clear callback and accessible context labels are shared.
- **RemoveBadge** (`src/components/RemoveBadge/`): queue/history records, named collections/lists, shopping resource/Blueprint association and Warehouse lots. Two visual sizes share a 44px effective target.
- **InformationPanel** (`src/components/InformationPanel/`): Action Details and Activity snapshots, reusing original Blueprint card structure and colored accents.
- **Existing controls retained:** SearchablePicker, ConfirmationDialog/shopping wrapper, Datalist, timers, TimerConfiguration, SharePreview, status and usage badge markup, Toast.
- **Shared CSS:** `src/styles/controls.css`, backed by `src/styles/theme.css`, owns buttons, native fields/selects, statuses, focus, selection, disabled, errors, dialogs and disclosure. Feature CSS retains layout/specialized geometry. Equivalent old classes receive the same standard; screens do not keep competing new-vs-old search/Back/removal implementations.

Other changed screen files: App; BlueprintSearch/Workshop/BlueprintCollections/BlueprintDetails CSS; ActionsView/ActionDetails/QueueEntry; BuildQueueView/WorkHistoryView/BuildDetails/ActivitySnapshotView; WarehouseView; ShoppingListsView/ShoppingConfirmationDialog; settings and backup presentation; TimerConfiguration/SharePreview/CraftTimer controls. Tests, ESLint configuration, package scripts, documentation and ignore rules were updated. Version remains 0.6.3.

## D. Permanent enforcement

[UI_DESIGN_STANDARDS.md](UI_DESIGN_STANDARDS.md) is the authoritative implemented reference. [AGENTS.md](../AGENTS.md) requires reuse, tokens, accessibility and rendered review.

ESLint's focused `workshop-ui/canonical-controls` rule rejects raw filtering search fields outside SearchInput, independent Back labels, bare X removal buttons outside canonical components, and window.confirm. Toast dismissal is an explicit exception. Normal native HTML is allowed. Foundation tests catch accessible-label/clear/variant regressions and common duplicate palette literals. These checks do not claim to infer every arbitrary control's meaning or to replace visual review.

`npm run test:visual` compares 30 reviewed desktop/mobile screenshots. It freezes time and uses isolated synthetic data and a fixed browser/locale/timezone. Candidate generation never updates baselines automatically. Review/update instructions and environment limitations are documented in the standards. A lightweight Python Playwright runner reuses the available runtime; no new application/browser framework dependency was added. `python tools/ui-functional-check.py` exercises affected workflows independently of screenshot comparison.

## E. Actual validation

- **Unit tests:** 366 passing, 27 files. Includes five canonical control/foundation tests, three enforcement tests, and updated readable-history assertions; existing functional tests remain passing.
- **Lint:** passing with canonical-control enforcement enabled.
- **Type checking:** `tsc -b`, included in production build, passing.
- **Production build:** passing. Existing catalog bundle-size warning remains; this task did not redesign loading.
- **Visual regression:** 30 reviewed screenshot comparisons passing; rerun confirmed stable comparisons after settling responsive list effects.
- **Widths:** 35 combinations (seven screens at 320, 360, 390, 768 and 1280px) showed no document overflow. Actual keyboard Back gold focus passed at all five widths. [Measurements](ui-theme-standardization/width-checks.json).
- **Browser workflows:** mobile-width Chromium checks passed for Blueprint/Action searches, collection detail search returning to list, search clear, keyboard picker, source selection, explicit queue switch, timer adjustment/pause/reload persistence, history notes/read-only economics, settings persistence, full backup export/restore, bulk cancel/confirmation, shopping row/list deletion, collection deletion, and immediate Warehouse +/-/zero removal.
- **Rendered audit coverage:** desktop/mobile snapshots checked Actions, Blueprint catalog/details, Workshop, collections, shopping, Warehouse, queue/history/details, Settings, full timer, dialogs and help pages. Baselines cover representative default/hover/focus/selected/disabled/expanded/error/dialog states, not every content/OS combination.

## F. Representative before / after

| View | Before | After |
|---|---|---|
| Mobile Actions search | [Before](ui-theme-audit/mobile-actions.png) | [After](../tests/visual/baselines/mobile-actions.png) |
| Desktop Actions | [Before](ui-theme-audit/desktop-actions.png) | [After](../tests/visual/baselines/desktop-actions.png) |
| Mobile Action Details | [Before](ui-theme-audit/mobile-action-details.png) | [After](../tests/visual/baselines/mobile-action-details.png) |
| Desktop Blueprint Details | [Before](ui-theme-audit/desktop-blueprint-details.png) | [After](../tests/visual/baselines/desktop-blueprint-details.png) |
| Mobile timer | [Before](ui-theme-audit/mobile-craft-timer.png) | [After](../tests/visual/baselines/mobile-craft-timer.png) |
| Mobile confirmation | [Before](ui-theme-audit/mobile-delete-dialog.png) | [After](../tests/visual/baselines/mobile-delete-dialog.png) |
| Mobile shopping badges | [Before](ui-theme-audit/mobile-shopping.png) | [After](../tests/visual/baselines/mobile-shopping.png) |
| Keyboard focus | [Before](ui-theme-audit/mobile-back-focus.png) | [After](../tests/visual/baselines/mobile-keyboard-focus.png) |
| Error state | [Before](ui-theme-audit/desktop-settings-error.png) | [After](../tests/visual/baselines/mobile-error-state.png) |

Additional timer sizes: [320px](ui-theme-standardization/timer-320.png), [360px](ui-theme-standardization/timer-360.png), [390px](ui-theme-standardization/timer-390.png), [768px](ui-theme-standardization/timer-768.png), [1280px](ui-theme-standardization/timer-1280.png).

## G. Remaining limits and follow-up

- Physical Android/iPhone testing was not performed. Review real touch/long-press, native date/select/file popups and browser focus differences on phones.
- Native OS popup interiors intentionally stay native; canonical in-page controls are themed.
- Screenshot comparisons are exact PNGs and require the recorded Chromium/font environment. Different browser/platform rendering needs investigated, reviewed baseline updates. Python Playwright/Chromium must be available for visual/workflow tools; unit/lint/build do not depend on it.
- Focused enforcement cannot infer every dynamic label/icon or prove contrast across all arbitrary content. Canonical component reuse and rendered review remain mandatory.
- No persisted data formats changed, no issue was automatically closed, and no commit/deployment was performed.
