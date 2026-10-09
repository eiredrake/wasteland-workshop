# UI Theme Consistency Audit

Historical reference: standalone Actions catalog/details have since been consolidated into Work Queue → Add to Queue → Action. The screenshots below document the earlier audit.

Project: Wasteland Workshop · Version inspected: 0.6.3 · Date: 2026-10-08

**Audit only. All findings are AWAITING REVIEW. No application source, CSS, persistence or behavior was changed.** Existing feature edits in the working tree were preserved.

## A. Existing design conventions

Dark charcoal/olive surfaces, cream Arial text, rust/orange primary accents, gold warnings/selection, green positive states and grey neutral/removal states form the established language. Uppercase section headings use rust underlines. Cards generally use subtle borders, 8px corners and 1–1.25rem padding. Compact badges use uppercase bold text, colored outlines and tinted fills. Shopping grey X and Warehouse green +/- with grey X establish the requested removal convention.

Likely reference implementations:

- `src/styles/theme.css`: surface/text/rust/focus/status tokens; **--color-accent is undefined**.
- `BlueprintSearch.tsx` + `BlueprintSearch.css`, duplicated in `WorkshopView.tsx`: magnifier, dark field, cream text, rust focus, native search clearing. No dedicated reusable search component exists.
- `src/components/SearchablePicker`: existing accessible large-catalog selector, 44px fields/options, gold focus and in-page listbox. Free-text filtering and selection have different purposes.
- `src/components/Datalist`: sorting, responsive columns and arrow Back; undefined accent currently breaks border/hover/focus.
- `BlueprintDetails.css` access badges, Shopping grey X and Warehouse lot badges: established compact/removal references. No general shared removal component.
- `ConfirmationDialog`: themed native dialog/backdrop, Cancel and labeled confirmation; shopping wraps it.
- Specialized shared controls: CraftTimer, BuildCraftTimer, TimerConfiguration, BuildStatusBadge, Toast, BlueprintName and BlueprintUsageBadges.

Competing conventions must be reviewed rather than arbitrarily resolved: gold versus rust focus; compact pills versus rectangular actionable statuses; 3–10px radii; square browser-sized buttons versus padded controls; brown/gold Share actions versus orange primary buttons. Global primary/secondary classes style colors/borders but omit a complete sizing/font baseline.

## B. Findings

Each entry includes current/expected appearance, component location, reference, recommendation and evidence. Screenshots show both desktop and mobile. State coverage exceptions are documented below; findings are not implemented.

### UI-001

**Severity:** High  
**Screen:** Collections / Settings / full Timer  
**Control:** Buttons and mobile touch targets

**Current:** Collection Import/Add/Export/Delete and Save/Cancel, Mark All Blueprints Read, Save Expiration Settings and Open Work Queue measure 19px high with 13.33px browser font and square corners. Full Timer Settings is 21px high.

**Expected / established:** Warehouse and menu controls use inherited fonts and 44px targets.

**Location / component:** `src/App.css primary/secondary classes; BlueprintCollectionsView.tsx; BlueprintReadSettingsView.tsx; WarehouseSettingsView.tsx; App.tsx; CraftTimer.tsx`

**Reference:** `WarehouseView.css; SearchablePicker.css`

**Recommendation:** Review a complete existing button baseline, preserving specialized timer/status controls.

**Screenshot:** [Desktop](ui-theme-audit/desktop-collections.png), [Mobile](ui-theme-audit/mobile-collections.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-002

**Severity:** High  
**Screen:** Full Craft Timer mobile  
**Control:** Panel sizing

**Current:** 390px viewport scrolls to 411px; timer panel is 395px wide inside 358px main content and clips its right edge.

**Expected / established:** Existing dialogs/fields use border-box sizing within narrow screens.

**Location / component:** `src/components/CraftTimer/CraftTimer.css .craft-timer`

**Reference:** `TimerConfiguration.css; WarehouseView.css`

**Recommendation:** Fix sizing in a later work order; review long labels and 320–390px widths.

**Screenshot:** [Desktop](ui-theme-audit/desktop-craft-timer.png), [Mobile](ui-theme-audit/mobile-craft-timer.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-003

**Severity:** High  
**Screen:** Datalist details and lists  
**Control:** Keyboard focus and navigation

**Current:** Undefined --color-accent causes computed Back border 0px, focus outline-style none and unchanged transparent hover background. Table header focus/hover uses the same missing token.

**Expected / established:** Existing gold picker focus and rust search focus visibly indicate keyboard interaction.

**Location / component:** `src/components/Datalist/Datalist.css:43–79; src/styles/theme.css`

**Reference:** `SearchablePicker.css; BlueprintSearch.css`

**Recommendation:** Choose a defined existing accent token and restore visible focus/hover.

**Screenshot:** [Desktop](ui-theme-audit/desktop-back-focus.png), [Mobile](ui-theme-audit/mobile-back-focus.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-004

**Severity:** Medium  
**Screen:** Actions Catalog  
**Control:** Search

**Current:** Narrow inline field without magnifier or placeholder, 5px radius, browser white focus. It remains above Details.

**Expected / established:** Blueprint search is full-width up to 32rem with magnifier, placeholder, 6px radius and rust focus; clearing is native.

**Location / component:** `src/features/actions/ActionsView.tsx:11; Actions.css`

**Reference:** `BlueprintSearch.tsx/CSS; WorkshopView.tsx`

**Recommendation:** Reuse/extract existing Blueprint search appearance; preserve filtering and detail navigation behavior.

**Screenshot:** [Desktop](ui-theme-audit/desktop-actions.png), [Mobile](ui-theme-audit/mobile-actions.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-005

**Severity:** Medium  
**Screen:** Warehouse / Economics  
**Control:** Search

**Current:** Separate plain filter fields lack magnifier; Warehouse is short, economics full-width, gold focus differs from Blueprint rust focus.

**Expected / established:** Blueprint search is the recognizable existing filter reference; no shared search component exists.

**Location / component:** `src/features/warehouse/WarehouseView.tsx:46/CSS; src/features/settings/EconomicsSettingsView.tsx:96/CSS`

**Reference:** `BlueprintSearch.css`

**Recommendation:** Review shared search appearance with context-specific width; keep filtering distinct from selection.

**Screenshot:** [Desktop](ui-theme-audit/desktop-warehouse-focus.png), [Mobile](ui-theme-audit/mobile-warehouse-focus.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-006

**Severity:** Medium  
**Screen:** Action Details  
**Control:** Back

**Current:** Arrow Back to Actions and inner square Back appear simultaneously; fonts are 16px versus 13.33px.

**Expected / established:** Blueprint Details has one Datalist Back; embedded Action picker needs a scoped dismissal instead.

**Location / component:** `src/features/actions/ActionDetails.tsx:13; ActionsView.tsx:12; Datalist.tsx:246`

**Reference:** `BlueprintSearch.tsx; Datalist.tsx`

**Recommendation:** Choose one navigation owner per context; separate picker dismissal from screen navigation.

**Screenshot:** [Desktop](ui-theme-audit/desktop-action-details.png), [Mobile](ui-theme-audit/mobile-action-details.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-007

**Severity:** Medium  
**Screen:** Queue / History details / Timer  
**Control:** Back navigation

**Current:** Back to Work Queue/History lacks arrow and uses square secondary styling; Open Work Queue is a tiny button.

**Expected / established:** Datalist arrow plus explicit destination is the existing candidate, subject to its token defect.

**Location / component:** `src/features/builds/BuildDetails.tsx:48; src/App.tsx timer view`

**Reference:** `Datalist.tsx/CSS`

**Recommendation:** Consolidate equivalent Back controls and destination labels.

**Screenshot:** [Desktop](ui-theme-audit/desktop-history-notes.png), [Mobile](ui-theme-audit/mobile-history-notes.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-008

**Severity:** Medium  
**Screen:** Queue / History / Collections / Shopping  
**Control:** Per-record delete/remove

**Current:** Individual records use rectangular Delete buttons while Shopping/Warehouse use grey X badges.

**Expected / established:** Grey status-style X is preferred for equivalent row removals; bulk/final confirmations are different.

**Location / component:** `src/features/builds/BuildQueueView.tsx:32; WorkHistoryView.tsx:14; BlueprintCollectionsView.tsx; ShoppingListsView.tsx:127`

**Reference:** `ShoppingListsView.tsx:43/181; WarehouseView.tsx:61; BlueprintDetails.css`

**Recommendation:** Shared accessible X candidate for row actions; preserve confirmation semantics and explicit bulk labels.

**Screenshot:** [Desktop](ui-theme-audit/desktop-queue-expanded.png), [Mobile](ui-theme-audit/mobile-queue-expanded.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-009

**Severity:** Medium  
**Screen:** Collections / named Shopping Lists  
**Control:** Confirmation

**Current:** Deletion uses browser window.confirm, unlike themed queue/history/resource/Blueprint removal dialogs.

**Expected / established:** ConfirmationDialog already provides themed native dialog/backdrop and clear actions.

**Location / component:** `src/features/blueprints/BlueprintCollectionsView.tsx:114; ShoppingListsView.tsx:128`

**Reference:** `ConfirmationDialog; ShoppingConfirmationDialog`

**Recommendation:** Reuse existing themed confirmation for equivalent record deletion after review. Native confirmation identified in source only; screenshot is the themed comparison.

**Screenshot:** [Desktop](ui-theme-audit/desktop-delete-dialog.png), [Mobile](ui-theme-audit/mobile-delete-dialog.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-010

**Severity:** Medium  
**Screen:** Options / filters / alarm / markup  
**Control:** Dropdowns

**Current:** Native selects differ: Actions 5px corners; shopping/Warehouse 6px; alarm 5px rust border; markup 4px and about 32px height.

**Expected / established:** Dark background, inherited font and 44px height recur; short native lists and large searchable catalogs need distinct roles.

**Location / component:** `src/features/actions/Actions.css; ShoppingLists.css; WarehouseView.css; App.css settings-row select; BlueprintDetails.css:175`

**Reference:** `SearchablePicker and existing dark native selects`

**Recommendation:** Agree common short-select baseline; preserve native accessibility. Actual OS popup interiors were not inspected.

**Screenshot:** [Desktop](ui-theme-audit/desktop-action-details.png), [Mobile](ui-theme-audit/mobile-action-details.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-011

**Severity:** Medium  
**Screen:** Add to Queue  
**Control:** Selected source

**Current:** Blueprint/Action buttons have aria-pressed but no styling for it; selection looks like the alternative.

**Expected / established:** Workshop filters visibly mark active selection in gold.

**Location / component:** `src/features/actions/QueueEntry.tsx:10; Actions.css`

**Reference:** `WorkshopView.css .workshop-filter-active`

**Recommendation:** Review selected-state appearance while retaining aria-pressed.

**Screenshot:** [Desktop](ui-theme-audit/desktop-queue-picker.png), [Mobile](ui-theme-audit/mobile-queue-picker.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-012

**Severity:** Medium  
**Screen:** Action Details and snapshots  
**Control:** Panels / hierarchy

**Current:** Rules, eligibility, outputs and configuration form a long unboxed paragraph sequence with catalog and detail headings.

**Expected / established:** Blueprint Details groups metadata/access/crafting/costs/components in themed cards.

**Location / component:** `src/features/actions/ActionDetails.tsx; src/features/builds/ActivitySnapshotView.tsx; Actions.css`

**Reference:** `BlueprintDetails.tsx/CSS`

**Recommendation:** Use established cards/headings to distinguish costs, outputs and effects without a new design.

**Screenshot:** [Desktop](ui-theme-audit/desktop-action-details.png), [Mobile](ui-theme-audit/mobile-action-details.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-013

**Severity:** Medium  
**Screen:** Work Queue / History  
**Control:** Disclosure

**Current:** display:flex on summary removes native disclosure marker. Queue shows Details among time/cost; History has no equivalent expansion cue.

**Expected / established:** Add to Queue, pending rules and valuation explanations retain native triangles.

**Location / component:** `src/features/actions/Actions.css .work-summary; BuildQueueView.tsx:28; WorkHistoryView.tsx:14`

**Reference:** `QueueEntry.tsx; EconomicsSettingsView.css`

**Recommendation:** Agree consistent expansion cue, preserving native details keyboard behavior.

**Screenshot:** [Desktop](ui-theme-audit/desktop-history.png), [Mobile](ui-theme-audit/mobile-history.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-014

**Severity:** Medium  
**Screen:** Blueprint / queue / Warehouse  
**Control:** Badges

**Current:** Small Blueprint pills, 44px rectangular queue statuses, and separately styled expiration pills have different shapes and color values.

**Expected / established:** Status meaning is established; compact versus actionable shape is ambiguous.

**Location / component:** `BuildStatusBadge.css; BlueprintSearch.css; BlueprintDetails.css; WorkshopView.css; WarehouseView.css`

**Reference:** `blueprint-access-status; workshop-status; BuildStatusBadge`

**Recommendation:** Review shared status primitives with purposeful compact/actionable variants.

**Screenshot:** [Desktop](ui-theme-audit/desktop-queue-expanded.png), [Mobile](ui-theme-audit/mobile-queue-expanded.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-015

**Severity:** Medium  
**Screen:** Forms throughout  
**Control:** Focus / hover

**Current:** Actions uses white browser focus; Blueprint rust shadow; Warehouse/picker/economics gold outline; status currentColor; square buttons default browser behavior.

**Expected / established:** Focus must remain visible, but no single accent is canonical throughout.

**Location / component:** `Actions.css; BlueprintSearch.css; WarehouseView.css; EconomicsSettingsView.css; SearchablePicker.css`

**Reference:** `--color-focus and existing rust search focus`

**Recommendation:** Choose existing focus conventions by role. Actions, Warehouse and Datalist captured; not every field keyboard-tested.

**Screenshot:** [Desktop](ui-theme-audit/desktop-action-details.png), [Mobile](ui-theme-audit/mobile-action-details.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-016

**Severity:** Medium  
**Screen:** Disabled / historical controls  
**Control:** Disabled styling

**Current:** Warehouse/timer/status set explicit opacity/cursor; generic buttons have no shared baseline. Historical disabled fields retain normal-looking dark input styling beside dim Reset buttons.

**Expected / established:** Disabled start/move/history editing should be legible and consistently discernible.

**Location / component:** `src/App.css; BuildDetails.tsx; BuildQueueView.css; WarehouseView.css; BuildStatusBadge.css`

**Reference:** `WarehouseView.css button:disabled; TimerConfiguration.css`

**Recommendation:** Review shared disabled treatment and readable history presentation; retain native disabled semantics.

**Screenshot:** [Desktop](ui-theme-audit/desktop-history-notes.png), [Mobile](ui-theme-audit/mobile-history-notes.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-017

**Severity:** Medium  
**Screen:** Settings / Actions / queue  
**Control:** Errors

**Current:** Expiration and Action/queue errors use plain paragraphs; backup alerts are pale red. Economic invalid border is danger, build override invalid border rust.

**Expected / established:** Existing danger token and backup error text are references; no shared alert styling exists.

**Location / component:** `WarehouseSettingsView.tsx; ActionDetails.tsx; BuildQueueView.tsx/CSS; BackupSettingsView.css; EconomicsSettingsView.css`

**Reference:** `--color-danger; BackupSettingsView.css role=alert`

**Recommendation:** Agree shared error text/borders. Expiration error rendered; other error paths source-reviewed.

**Screenshot:** [Desktop](ui-theme-audit/desktop-settings-error.png), [Mobile](ui-theme-audit/mobile-settings-error.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-018

**Severity:** Medium  
**Screen:** Timers / dialogs  
**Control:** Settings actions and hierarchy

**Current:** Compact Timer Settings is muted underlined text; full Timer Settings browser white. Timer Apply/Cancel are both dark rounded buttons; confirmation has orange confirm/square buttons; Share brown/gold controls.

**Expected / established:** Themed dialogs should share intentional hierarchy while retaining operation-specific semantics.

**Location / component:** `BuildCraftTimer.css; CraftTimer.tsx; TimerConfiguration.css; ConfirmationDialog.css; SharePreview.css`

**Reference:** `Existing themed native dialogs`

**Recommendation:** Review common dialog heading/radius/actions without flattening sharing, adjustment and destructive confirmation into one operation.

**Screenshot:** [Desktop](ui-theme-audit/desktop-timer-dialog.png), [Mobile](ui-theme-audit/mobile-timer-dialog.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-019

**Severity:** Low  
**Screen:** Global/shared styles  
**Control:** Tokens / radii / typography

**Current:** Theme 3px radius and named palette coexist with hard-coded alternative rust/cream/green/grey and 4/5/6/8/10px corners. Button classes omit a full baseline.

**Expected / established:** Dark/rust/cream language exists; exact component-role mapping needs review.

**Location / component:** `src/styles/theme.css; App.css; BlueprintDetails.css; BlueprintCollectionsView.css; SharePreview.css`

**Reference:** `Existing theme tokens`

**Recommendation:** Map existing roles to existing tokens after review; avoid wholesale palette replacement.

**Screenshot:** [Desktop](ui-theme-audit/desktop-blueprint-details.png), [Mobile](ui-theme-audit/mobile-blueprint-details.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

### UI-020

**Severity:** Low  
**Screen:** Queue / Actions / Settings  
**Control:** Heading order / spacing

**Current:** Wide Add to Queue precedes narrower Work Queue heading; other screens begin with heading. Settings mixes boxed/standalone headings; Action Details repeats titles.

**Expected / established:** Uppercase rust-underlined heading is consistent, placement is not.

**Location / component:** `src/App.tsx builds/settings views; QueueEntry.tsx; ActionDetails.tsx; App.css`

**Reference:** `Warehouse and Collections headers`

**Recommendation:** Agree heading/action order and container widths without changing heading theme.

**Screenshot:** [Desktop](ui-theme-audit/desktop-queue-picker.png), [Mobile](ui-theme-audit/mobile-queue-picker.png).

**Verification:** Rendered desktop/mobile and source-reviewed, except specifically noted subcases.

**Status:** AWAITING REVIEW

## C. Findings summary

**3 High, 15 Medium, 2 Low.**

| ID | Severity | Screen | Control | Recommended direction |
|---|---|---|---|---|
| UI-001 | High | Collections / Settings / full Timer | Buttons and mobile touch targets | Review a complete existing button baseline, preserving specialized timer/status controls. |
| UI-002 | High | Full Craft Timer mobile | Panel sizing | Fix sizing in a later work order; review long labels and 320–390px widths. |
| UI-003 | High | Datalist details and lists | Keyboard focus and navigation | Choose a defined existing accent token and restore visible focus/hover. |
| UI-004 | Medium | Actions Catalog | Search | Reuse/extract existing Blueprint search appearance; preserve filtering and detail navigation behavior. |
| UI-005 | Medium | Warehouse / Economics | Search | Review shared search appearance with context-specific width; keep filtering distinct from selection. |
| UI-006 | Medium | Action Details | Back | Choose one navigation owner per context; separate picker dismissal from screen navigation. |
| UI-007 | Medium | Queue / History details / Timer | Back navigation | Consolidate equivalent Back controls and destination labels. |
| UI-008 | Medium | Queue / History / Collections / Shopping | Per-record delete/remove | Shared accessible X candidate for row actions; preserve confirmation semantics and explicit bulk labels. |
| UI-009 | Medium | Collections / named Shopping Lists | Confirmation | Reuse existing themed confirmation for equivalent record deletion after review. Native confirmation identified in source only; screenshot is the themed comparison. |
| UI-010 | Medium | Options / filters / alarm / markup | Dropdowns | Agree common short-select baseline; preserve native accessibility. Actual OS popup interiors were not inspected. |
| UI-011 | Medium | Add to Queue | Selected source | Review selected-state appearance while retaining aria-pressed. |
| UI-012 | Medium | Action Details and snapshots | Panels / hierarchy | Use established cards/headings to distinguish costs, outputs and effects without a new design. |
| UI-013 | Medium | Work Queue / History | Disclosure | Agree consistent expansion cue, preserving native details keyboard behavior. |
| UI-014 | Medium | Blueprint / queue / Warehouse | Badges | Review shared status primitives with purposeful compact/actionable variants. |
| UI-015 | Medium | Forms throughout | Focus / hover | Choose existing focus conventions by role. Actions, Warehouse and Datalist captured; not every field keyboard-tested. |
| UI-016 | Medium | Disabled / historical controls | Disabled styling | Review shared disabled treatment and readable history presentation; retain native disabled semantics. |
| UI-017 | Medium | Settings / Actions / queue | Errors | Agree shared error text/borders. Expiration error rendered; other error paths source-reviewed. |
| UI-018 | Medium | Timers / dialogs | Settings actions and hierarchy | Review common dialog heading/radius/actions without flattening sharing, adjustment and destructive confirmation into one operation. |
| UI-019 | Low | Global/shared styles | Tokens / radii / typography | Map existing roles to existing tokens after review; avoid wholesale palette replacement. |
| UI-020 | Low | Queue / Actions / Settings | Heading order / spacing | Agree heading/action order and container widths without changing heading theme. |

## Control inventories

### Deletion, removal and clearing

| Component/location | Appearance | Meaning | Confirmation now | Existing reference/direction |
|---|---|---|---|---|
| BlueprintCollectionsView Delete | Small rectangular text button | Deletes named collection/associations; master survives | window.confirm | Grey X and themed dialog candidates |
| ShoppingListsView list Delete | Rectangular text button | Deletes list/resources; collection statuses survive | window.confirm | Same candidates, list-specific wording |
| BuildQueueView row Delete | Rectangular secondary | Deletes pending Activity/notes | ConfirmationDialog | Grey X candidate; Working deletion blocked |
| BuildQueueView Delete Selected | Rectangular text/count | Bulk deletes selected pending records | ConfirmationDialog | Keep clear bulk wording; not equivalent to single X |
| WorkHistoryView Delete | Rectangular secondary | Deletes historical snapshot/notes | ConfirmationDialog | Grey X with permanent-record warning |
| Shopping resource X / held status | Grey 32px badge | Removes row from one list | ShoppingConfirmationDialog | Established compact convention |
| Shopping Blueprint X | Grey 32px badge beside To Acquire | Removes collection association/acquisition target | ShoppingConfirmationDialog | Established convention; master is untouched |
| Warehouse lot X | Grey 44px badge | Quantity zero removes inventory lot | Immediate | Existing large touch variant; confirmation policy needs review |
| Warehouse -1 / quantity zero | Green badge / numeric field | Quantity change, possibly removes zero lot | Immediate | Quantity operation, not record deletion equivalent |
| BlueprintSearch / Workshop / Details cycling status | Status pill or compact symbol | Cycles access; untracked clears association | Immediate | Distinct status/association operation; removal transition source-reviewed |
| Economics / BuildDetails Reset | Rectangular text | Clears override to default/captured value | Immediate | Clearing; retain descriptive label |
| Economics Restore Defaults | Rectangular text | Clears draft overrides, committed by Save | Immediate draft change | Not data-record deletion |
| CraftTimer fallback Reset | Timer button | Resets standalone timer | Immediate | Source-only fallback; current queue supplies custom controls |
| Interruption restart | Rectangular text | Discards elapsed role-play, pauses full duration | Immediate | Timer reset; separate confirmation decision |
| Search native X | Browser-owned clear icon | Clears query | None | Not record removal |
| Dialog Delete/Remove/Replace & Restore | Explicit confirmation text | Confirms operation/replacement | Already in confirmation | Keep action label; do not turn blindly into X |

No custom Action editor, resource-option editor or master Blueprint deletion UI exists. No fictional remove-configuration control is asserted. Picker queries can be cleared by editing; no dedicated selection-delete button was found.

### Navigation

| Screen | Implementation | Observation |
|---|---|---|
| Master Blueprint details | Datalist arrow Back to Blueprints | Single control; broken accent token |
| Collection Blueprint details | Datalist arrow Back to named collection | Same component; detail source reviewed, collection list rendered |
| Action Details | Datalist Back plus inner Back | Duplicate navigation/styles |
| Queue-embedded Action form | Inner Back | Clears picker selection, different navigation context |
| Queue/History notes | BuildDetails destination text button | No arrow; font/border/spacing differs |
| Craft Timer | App Open Work Queue button | 19px height |
| Warehouse/Shopping/Settings/About/Valuation | Menu navigation | No detail Back currently; no missing-control defect asserted |
| Share/Timer/confirmation | Close/Cancel | Dismissal, not Back navigation |

### Search and selectors

| Screen | Implementation | Review |
|---|---|---|
| Master Blueprint / Workshop collection | Duplicate icon fields using BlueprintSearch.css | Both rendered; nonempty Master query/native clear captured |
| Actions | Plain type=search | Default/focus/detail rendered |
| Warehouse | Plain inventory filter | Default/focus rendered |
| Economics overrides | Plain full-width filter | Settings rendered; source reviewed |
| Shopping Find a Resource | SearchablePicker | Default rendered; option behavior source reviewed |
| Warehouse Add something | SearchablePicker | Open options rendered |
| Add to Queue | SearchablePicker | Action popup rendered; Blueprint picker source reviewed |
| Generic Action resource field | SearchablePicker | Source-only; no current verified definition uses it |
| Queue/History/collection manager/list manager | No free-text list search | Absence recorded, not a requested new feature |

Native selects inspected: Action category/option/herb, Warehouse expiration/type/sort, shopping target, Blueprint markup, Alarm Sound/Vibration. Source and closed rendered controls reviewed; OS popup interiors not inspected. Number/text/date/file inputs, collection/list forms and BuildDetails textarea reviewed. Queue checkboxes have rust accent and a 44px wrapper. No radio groups/custom switches found; alarm toggles are selects.

## D. Reusable component opportunities

| Family | Independent implementations | Shared today? | Direction |
|---|---|---|---|
| Back | Datalist, ActionDetails, BuildDetails, App timer | Datalist internal only | Reuse arrow/destination styling after token repair; separate dismissal |
| Search filtering | BlueprintSearch/Workshop duplicate; Actions/Warehouse/economics | No dedicated search component | Extract existing Blueprint treatment |
| Catalog selection | Shopping/Warehouse/queue/Action fields | SearchablePicker exists | Keep existing selector; consistent styling |
| Short native selects | Multiple feature CSS rules | No common baseline | Agree dark accessible baseline |
| Row removal | Shopping/Warehouse badges and text Deletes | No generic component | Shared grey X with reviewed compact/large variants |
| Status | workshop-status/access/expiration/BuildStatusBadge | Only specialized BuildStatusBadge | Shared semantic primitives with role variants |
| Primary/secondary buttons | Global colors plus feature-specific partial rules | No complete baseline | Consistent font/size/padding/focus/disabled |
| Confirmations | Shared themed dialog versus window.confirm | ConfirmationDialog exists | Reuse for equivalent deletion |
| Errors | Red backup / plain paragraphs / rust or danger borders | No shared presentation | Consistent existing error roles |
| Panels/disclosure | Repeated settings/help/collection/Blueprint CSS | No universal card | Clarify visual roles before consolidation |

## E. Ambiguous design decisions

1. Should named collection/list deletion use the same grey X as row removal? Bulk delete, Reset and confirmation need clear labels.
2. Which immediate association/lot removals need confirmation? Existing policies differ deliberately; audit does not change them.
3. Keep compact 32px Shopping X beside status and larger 44px Warehouse X, or agree one target strategy? Avoid wrapping.
4. Keep rectangular actionable queue statuses versus compact pills, or create role variants? Preserve meanings.
5. Choose gold versus rust focus by role; every keyboard control needs visible focus.
6. Choose one catalog Back owner and separate picker-dismissal wording.
7. Orange Add to Queue and green circular Blueprint Build are different workflows. Do not assume all actions should become green circles.
8. Agree Action information grouping using existing cards/headings, not a new theme.
9. Agree disclosure triangles/indicators for queue/history without replacing native details behavior.
10. Agree dialog action hierarchy/radii while distinguishing sharing, adjustment and deletion.
11. Accept OS-owned select/date/file UI variation versus controls that require in-page theming.

## F. Screen coverage and verification

Fresh isolated Chromium contexts used **1280×900 desktop** and **390×844 narrow/mobile** layouts. Synthetic collection, shopping, Warehouse and work/history records were seeded through existing app APIs/local storage in these contexts. Real user storage was not accessed or replaced. Narrow Chromium is not physical Android/iPhone testing.

| Screen | Coverage | States and gaps |
|---|---|---|
| Shared header/menu | Rendered desktop/mobile | Navigation and title wrapping |
| Workshop / collection list | Rendered desktop/mobile | Active collection, Acquired/To Acquire, filter/search; collection detail shared source reviewed |
| Master Blueprint list/details | Rendered desktop/mobile | Search/native clear, acquired Blueprint, Build/access/shopping/markup; Back hover/focus; Share dialog |
| Collections manager | Rendered desktop/mobile | Active card and Add form focused input; native delete confirmation source-only |
| Shopping Lists | Rendered desktop/mobile | List/resource/acquisition status/X, Add form; themed row-removal confirmation source-reviewed |
| Warehouse | Rendered desktop/mobile | Credits/disabled buttons/fields/selects/good lot, +/-/X, focused search, open picker; expired lot hidden by initial Unexpired filter, expired styling source-reviewed |
| Actions Catalog | Rendered desktop/mobile | Default/focused search/category/sort header hover/responsive columns |
| Action Details | Rendered desktop/mobile | Proficient Agricultural configuration/session; selected Foraging Card option; fixed and other medical forms share source-reviewed generic implementation |
| Work Queue | Rendered desktop/mobile | Working expanded, pending collapsed/expanded, disabled start/move/delete-selected, source selection and picker popup, timer and deletion dialogs |
| Work History | Rendered desktop/mobile | Collapsed/expanded Action snapshot, notes editor/disabled history economics; Blueprint history source-reviewed shared implementation |
| Full Craft Timer | Rendered desktop/mobile | Active timer; measured narrow overflow |
| Timer Settings | Rendered desktop/mobile | Cancel/Apply, default adjustment, disabled Apply; gestures outside visual scope |
| Settings | Rendered desktop/mobile | Read/backup/file/expiration/alarm/economics, Reset/Save; invalid expiration rendered |
| Backup restore confirmation | Source-only | Markup/CSS reviewed; no backup replacement performed during audit |
| About / Valuation Algorithm | Rendered desktop/mobile | Existing help cards/text hierarchy |
| Toast, optional usage badges, rare unavailable/backup errors | Source-only | No exhaustive transient-state rendering |
| OS popup interiors | Not inspected | Actual phone selects/date calendars/file dialogs/native confirmations |

Default, hover, focus, expanded, selected, disabled, error and confirmation were inspected in representative controls; not every combination was tested. Back focus was measured as outline-style none, not guessed from CSS. Native browser confirmation appearance was not captured; UI-009 labels that subcase source-only.

Among **46 initial screen/state captures**, only full Craft Timer overflowed: 390px viewport / 411px document. Another 16 interaction/form captures were collected. This does not prove all content or 320px layouts fit. The report includes 46 selected full-page screenshots (23 desktop/mobile pairs); very tall Settings screenshots require zooming. [Computed controls](ui-theme-audit/computed-controls.json) records initial dimensions/fonts/radii; [interaction evidence](ui-theme-audit/interaction-evidence.json) records Back and overflow measurements.

No tests/build rerun was required for this documentation/screenshot-only audit. No application controls, CSS, behavior, models or persistence were changed. Fixes await a separate implementation work order.

## Source location index

Paths below resolve abbreviated filenames used in findings/inventories. They refer to existing components and styles, not newly introduced controls.

- `src/App.css`
- `src/App.tsx`
- `src/components/BuildCraftTimer/BuildCraftTimer.css`
- `src/components/BuildStatusBadge/BuildStatusBadge.css`
- `src/components/ConfirmationDialog/ConfirmationDialog.css`
- `src/components/CraftTimer/CraftTimer.css`
- `src/components/CraftTimer/CraftTimer.tsx`
- `src/components/Datalist/Datalist.css`
- `src/components/Datalist/Datalist.tsx`
- `src/components/SearchablePicker/SearchablePicker.css`
- `src/components/SharePreview/SharePreview.css`
- `src/components/TimerConfiguration/TimerConfiguration.css`
- `src/features/actions/ActionDetails.tsx`
- `src/features/actions/Actions.css`
- `src/features/actions/ActionsView.tsx`
- `src/features/actions/QueueEntry.tsx`
- `src/features/backup/BackupSettingsView.css`
- `src/features/blueprints/BlueprintCollectionsView.css`
- `src/features/blueprints/BlueprintCollectionsView.tsx`
- `src/features/blueprints/BlueprintDetails.css`
- `src/features/blueprints/BlueprintDetails.tsx`
- `src/features/blueprints/BlueprintSearch.css`
- `src/features/blueprints/BlueprintSearch.tsx`
- `src/features/blueprints/WorkshopView.css`
- `src/features/blueprints/WorkshopView.tsx`
- `src/features/builds/ActivitySnapshotView.tsx`
- `src/features/builds/BuildDetails.tsx`
- `src/features/builds/BuildQueueView.css`
- `src/features/builds/BuildQueueView.tsx`
- `src/features/builds/WorkHistoryView.tsx`
- `src/features/settings/BlueprintReadSettingsView.tsx`
- `src/features/settings/EconomicsSettingsView.css`
- `src/features/settings/EconomicsSettingsView.tsx`
- `src/features/settings/WarehouseSettingsView.tsx`
- `src/features/shopping/ShoppingLists.css`
- `src/features/shopping/ShoppingListsView.tsx`
- `src/features/warehouse/WarehouseView.css`
- `src/features/warehouse/WarehouseView.tsx`
- `src/styles/theme.css`
