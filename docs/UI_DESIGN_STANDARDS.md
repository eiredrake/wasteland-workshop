# Wasteland Workshop UI Design Standards

Authoritative UI reference. The approved 2026-10-08 standardization work order supersedes ambiguities in the earlier audit. Preserve existing functionality and the distinctive Blueprint Details theme; this is consolidation, not a replacement design.

## Palette, typography and foundations

`src/styles/theme.css` owns semantic tokens. `src/styles/controls.css` owns shared control foundations, imported by App. Feature CSS owns layout and specialized geometry, not competing equivalent-control appearances.

| Role | Token | Use |
|---|---|---|
| Background/surfaces | --color-background / --color-surface / --color-surface-raised | Charcoal/olive pages, fields and popups |
| Text | --color-text / --color-text-muted | Cream content and supporting text |
| Primary | --color-primary / --color-primary-hover / --color-primary-text | Existing rust/orange actions |
| Headings/accents | --color-rust / --color-rust-light | Rust titles, rules, side accents |
| Compatibility accent | --color-accent | Defined alias to rust-light; never leave referenced tokens undefined |
| Keyboard focus | --color-focus | Universal gold 2px outline, 3px offset via :focus-visible |
| Selection/warning | --color-selection / --color-warning-tint | Persistent gold selected/needed states |
| Positive | --color-success / --color-success-text / --color-success-tint | Green acquired/working/completed/good |
| Neutral/removal | --color-neutral / --color-neutral-tint | Grey untracked/expired/X controls |
| Paused | --color-paused / --color-paused-tint | Existing blue-grey paused meaning |
| Selling | --color-sell / --color-sell-tint | Existing cyan sell classification |
| Danger | --color-danger / --color-danger-text | Destructive confirmations, errors and invalid borders |
| Structure | --color-border / --color-border-strong | Fields, panels, hover edges |
| Shape/size | --control-radius / --panel-radius / --control-height | 6px controls, 8px panels, 44px targets; circles/pills remain role-specific |

Application font is Arial/Helvetica/sans-serif, inherited by fields/buttons. Main page headings are rust uppercase with rust underlines; nested section headings remain legible cream/rust and have appropriate hierarchy. Do not introduce an independent replacement palette. Existing specialized timer art, chart/share output and meaningful accent shades may retain role-specific colors not represented by an equivalent token; do not use that exception to duplicate common controls.

## Canonical families

| Family / implementation | Purpose and approved variants | Example | Accessibility / mistakes / exceptions |
|---|---|---|---|
| Button foundation: `src/styles/controls.css`, .primary-button/.secondary-button/.danger-button | Orange main action, neutral secondary, danger final deletion | `<button className="primary-button">Save Settings</button>` | Native button type/disabled; minimum 44px, inherited font/padding/hover/gold focus. Timer rings, circle Build, badges and sortable headers keep appropriate geometry; ordinary text buttons must not look browser-default. |
| BackButton: `src/components/BackButton/` | One screen navigation control, arrow and explicit destination | `<BackButton onClick={goBack}>Back to Actions</BackButton>` | Native keyboard behavior and gold focus. No independent Back button. Picker dismissal uses Close Action Selection; dialogs use Cancel/Close. |
| SearchInput: `src/components/SearchInput/` | Every ordinary text filter, optional visible label, variable width/placeholder | `<SearchInput label="Search Actions" value={query} onValueChange={setQuery}/>` | Accessible label, magnifier, clear action only for nonempty query, disabled honored. Browser native cancel is hidden to avoid duplicate X. It does not select resources. |
| Native select foundation: `src/styles/controls.css` | Short category/sort/type/alarm/markup/option lists | Labeled `<select>` with native `<option>` | 44px, dark/cream, shared border/radius/font/gold focus. Do not replace accessible native behavior for cosmetics; OS popup interior remains native. |
| SearchablePicker: `src/components/SearchablePicker/` | Large Blueprint/resource/Action catalogs | Existing options/key/label/onChange props | Preserve listbox, keyboard arrows/Enter/Escape and accessibility. Shared field sizing/tokens/gold focus; do not use raw text-plus-select duplicates. |
| RemoveBadge: `src/components/RemoveBadge/` | Individual record/association removal | `<RemoveBadge label="Delete collection Example" onClick={requestDelete}/>` | Label is mandatory; X is decorative. Standard 44px visual; compact 32px visual **inside a nonoverlapping 44px button**. Do not replace bulk delete, draft Reset, quantity +/- or confirmation labels with X. |
| Status foundation: `src/styles/controls.css` grouped badge selectors; BuildStatusBadge specialized component | Compact informational pills; 34px interactive status pills with fine pointers, 44px touch targets | Existing workshop-status, blueprint-access-status, build-status, expiration/active/usage badges | Same font/border/corners/tokens by semantic state across screens. Informational spans remain spans; buttons retain status callbacks. Positive green, needed/pending gold, paused blue-grey, expired neutral, selling cyan. Circular Blueprint Build remains a distinct action. |
| Selected source/filter: shared `[aria-pressed=true]` and Workshop filter roles | Gold persistent selection | Blueprint/Action queue source buttons | Keep aria-pressed; focus adds separate outline. Selection is not represented by gold focus alone. |
| InformationPanel: `src/components/InformationPanel/` using .blueprint-details-card | Existing Blueprint-style structured information | `<InformationPanel title="Requirements" tone="gold">...</InformationPanel>` | Rust/gold/green/neutral side accents, existing panel shapes. Action Details and snapshots reuse it; original Blueprint panels remain intact. Omit inapplicable sections. |
| Disclosure: native details/summary, shared .work-summary markers | Right triangle collapsed, down expanded; entire header is interactive | Existing queue/history native details | Preserve default open states and keyboard behavior. Flex summaries supply equivalent markers when native marker is suppressed. Do not replace with div onclick. |
| Disabled/read-only: foundation plus recorded value markup | Inactive controls at legible .7 opacity; immutable history as readable text | BuildDetails Recorded Economics | Preserve disabled semantics. Read-only information is not a disabled form; historical notes remain editable. |
| Error presentation: `[role=alert]`, `[aria-invalid=true]` foundation | Danger border/text, warning icon and clear message | Expiration/economic/build errors | Field errors link via aria-describedby; do not remove validation/role=alert. General queue/backup/Action errors share appearance. Existing native required/number validation remains native. |
| Dialog foundation: native dialog in shared CSS | Common dark panel/backdrop/border/heading/buttons | ConfirmationDialog / SharePreview | Orange primary, neutral secondary, danger destructive confirmation. Preserve showModal, initial focus, Escape, keyboard interactions and responsive max height. Do not give Delete and Apply identical meanings. |
| Page organization: existing headers plus shared layout | Main heading, page actions, content sections | Work Queue heading before Add to Queue | One main heading; nested configuration names use lower heading levels. Narrow content fits viewport; preserve colored accents and existing table column hiding. |

## Confirmation policy

Permanent record deletion uses themed ConfirmationDialog with an explicit label (Delete Collection, Delete List, Delete Activity, Delete History Record, Delete Selected). No window.confirm. Bulk deletion confirms the whole group once. Individual removals use RemoveBadge and confirm when information cannot be trivially recovered. Shopping resource/association removal preserves its existing confirmation. Warehouse +/- or quantity-to-zero is an immediate quantity update and does not confirm. Search clear, editable override Reset and draft Restore Defaults do not confirm. Interruption/timer reset is an explicitly labeled timer operation, not record removal.

## Responsive and interaction checks

Review 320, 360, 390, tablet (768) and desktop (1280) widths for affected screens. No unintended document overflow. Ordinary controls target 44px; compact removal visuals keep a full effective target with spacing, never overlapping adjacent status controls. Check actual keyboard Tab/Shift+Tab focus (programmatic focus after mouse use need not match :focus-visible), hover, selected, disabled, expanded, error and open dialog states. Gold outlines must not be suppressed. Long names wrap; preserve existing responsive Datalist behavior.

## Enforcement and development workflow

1. Follow AGENTS.md: search and reuse shared controls before adding a new one; flag genuinely new visual patterns for approval.
2. `npm test`, `npm run lint`, `npm run build` (includes TypeScript) remain required.
3. ESLint `workshop-ui/canonical-controls` in `tools/ui-theme-rules.mjs` rejects raw type=search outside SearchInput, independently labeled Back buttons, bare X removal buttons outside canonical controls, and window.confirm. Toast X is an explicit dismissal exception, not a record-removal alternative.
4. `ThemeControls.test.tsx` tests labels/clear/variants/focus foundations and duplicate common palette literals. `tools/ui-theme-rules.test.mjs` tests valid/invalid enforcement cases.
5. Run Vite on 127.0.0.1:5186, then `npm run test:visual`; run `python tools/ui-functional-check.py` for isolated workflows.

Enforcement is deliberately focused. AST rules cannot determine the semantics of every conditional icon or arbitrary label, and the palette check does not claim to prove contrast or prohibit all specialist art colors. Native inputs/selects/buttons/details/dialogs are not indiscriminately banned. Rendered review remains mandatory.

## Visual regression review

`tools/ui-visual-check.py` uses Python Playwright/Chromium (already available on the development machine; no new application dependency). It freezes time, seeds isolated synthetic data, fixes locale/timezone/viewport, and compares **34 reviewed screenshots** in `tests/visual/baselines`. Covers catalog/details, Actions, queue/history, Warehouse/shopping, Timer page and confirmation dialogs, full timer, keyboard focus, hover, selected source and error states, desktop and mobile. It also checks geometry/focus/targets.

`npm run test:visual` compares; it never updates baselines. Differences fail and write candidates to ignored `tests/visual/actual`. `python tools/ui-visual-check.py --record` records candidates only. Inspect old and candidate screenshots, investigate unintended changes, then explicitly copy approved individual files to baselines. Never automatically accept a changed baseline. Browser version/platform is recorded; exact PNG comparison needs the same Chromium/font environment. Intentional environment changes require review, not blind refresh. A machine without Python Playwright/Chromium must provision that test runtime; unit/lint/build do not require it. Physical phone and native OS popup testing remains a separate follow-up.

Queue Action entry places required configuration and option selection before Add to Queue. Optional target and requirements/details stay collapsed below it. Simple Actions offer the same immediate primary button as Blueprint entry; catalog details retain their full layout.

Timer Settings buttons and compact-timer long presses navigate to the selected activity’s full Timer page. Adjust minutes directly there; no separate adjustment dialog or redundant Timer Settings button on that page. Preserve authoritative running deadlines and the single Working Activity rule.


## Guided tours

GuidedTour owns the themed, nonmodal bottom panel, responsive scrolling, gold target highlight and 44px actions. Reuse its data-driven registry and stable data-tour-target anchors for additional tours. Use existing navigation and confirmed application actions; never synthesize demo records, auto-click destructive controls or undo user changes on Previous Step. Suspend around dialogs/import review and restore focus on exit. Reserve space beneath content and keep toasts out of the panel. Help > Guided Tours uses a native disclosure and independent completion markers.

Run `python tools/ui-tour-check.py` for isolated onboarding/replay checks and 8 additional desktop/mobile visual baselines. Its `--record` writes candidates only; inspect and copy individually after review. These complement the existing 34 theme screenshots.


## Blueprint scanning

CameraPreview (`src/components/CameraPreview/`) owns the live video, intrinsic aspect ratio and centered portrait gold document frame with a dark outline. Scanner controls reuse primary/secondary button foundations and status/error announcements. Display the destination and identified name before Acquire, keep explicit confirmation separate from recognition, and retain the camera session between captures. Do not use width or user-agent checks as permission detection. Verify narrow/landscape layouts, camera cleanup and the six scanner comparisons with `python tools/ui-scanner-check.py`. Its `--record` writes review candidates only.
