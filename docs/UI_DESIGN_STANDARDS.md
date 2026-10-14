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
| BackButton: `src/components/BackButton/` | One screen navigation control, arrow and explicit destination | `<BackButton onClick={goBack}>Back to Work Queue</BackButton>` | Native keyboard behavior and gold focus. No independent Back button. Picker dismissal uses Close Action Selection; dialogs use Cancel/Close. |
| SearchInput: `src/components/SearchInput/` | Every ordinary text filter, optional visible label, variable width/placeholder | `<SearchInput label="Search inventory" value={query} onValueChange={setQuery}/>` | Accessible label, magnifier, clear action only for nonempty query, disabled honored. Browser native cancel is hidden to avoid duplicate X. Plain single-line text fields reuse this control with text input semantics and no magnifier. Clear returns focus to the field. It does not select resources. |
| Native select foundation: `src/styles/controls.css` | Short category/sort/type/alarm/markup/option lists | Labeled `<select>` with native `<option>` | 44px, dark/cream, shared border/radius/font/gold focus. Do not replace accessible native behavior for cosmetics; OS popup interior remains native. |
| SearchablePicker: `src/components/SearchablePicker/` | Large Blueprint/resource/Action catalogs | Existing options/key/label/onChange props | Preserve listbox, keyboard arrows/Enter/Escape and accessibility. The text field reuses SearchInput with combobox semantics, including the same X to clear both typed text and the selected option. Shared field sizing/tokens/gold focus; do not use raw text-plus-select duplicates. |
| RemoveBadge: `src/components/RemoveBadge/` | Individual record/association removal | `<RemoveBadge label="Delete collection Example" onClick={requestDelete}/>` | Label is mandatory; X is decorative. Standard 44px visual; compact 32px visual **inside a nonoverlapping 44px button**. Do not replace bulk delete, draft Reset, quantity +/- or confirmation labels with X. |
| Status foundation: `src/styles/controls.css` grouped badge selectors; BuildStatusBadge specialized component | Compact informational pills; 34px interactive status pills with fine pointers, 44px touch targets | Existing workshop-status, blueprint-access-status, build-status, expiration/active/usage badges | Same font/border/corners/tokens by semantic state across screens. Informational spans remain spans; buttons retain status callbacks. Positive green, needed/pending gold, paused blue-grey, expired neutral, selling cyan. Circular Blueprint Build remains a distinct action. |
| Selected source/filter: shared `[aria-pressed=true]` and Workshop filter roles | Gold persistent selection | Blueprint/Action queue source buttons | Keep aria-pressed; focus adds separate outline. Selection is not represented by gold focus alone. |
| InformationPanel: `src/components/InformationPanel/` using .blueprint-details-card | Existing Blueprint-style structured information | `<InformationPanel title="Requirements" tone="gold">...</InformationPanel>` | Rust/gold/green/neutral side accents, existing panel shapes. Action configuration and snapshots reuse it; original Blueprint panels remain intact. Omit inapplicable sections. |
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

`tools/ui-visual-check.py` uses Python Playwright/Chromium (already available on the development machine; no new application dependency). It freezes time, seeds isolated synthetic data, fixes locale/timezone/viewport, and compares **28 reviewed screenshots** in `tests/visual/baselines`. Covers catalog/details, queue Action configuration, queue/history, Warehouse/shopping, Timer page and confirmation dialogs, full timer, keyboard focus, hover, selected source and error states, desktop and mobile. It also checks geometry/focus/targets.

`npm run test:visual` compares; it never updates baselines. Differences fail and write candidates to ignored `tests/visual/actual`. `python tools/ui-visual-check.py --record` records candidates only. Inspect old and candidate screenshots, investigate unintended changes, then explicitly copy approved individual files to baselines. Never automatically accept a changed baseline. Browser version/platform is recorded; exact PNG comparison needs the same Chromium/font environment. Intentional environment changes require review, not blind refresh. A machine without Python Playwright/Chromium must provision that test runtime; unit/lint/build do not require it. Physical phone and native OS popup testing remains a separate follow-up.

Queue Action entry places required configuration and option selection before Add to Queue. Optional target and requirements/details stay collapsed below it. Simple Actions offer the same immediate primary button as Blueprint entry; catalog details retain their full layout.

Timer Settings buttons and compact-timer long presses navigate to the selected activity’s full Timer page. Adjust minutes directly there; no separate adjustment dialog or redundant Timer Settings button on that page. Preserve authoritative running deadlines and the single Working Activity rule.


## Guided tours

GuidedTour owns the themed, nonmodal bottom panel, responsive scrolling, gold target highlight and 44px actions. Reuse its data-driven registry and stable data-tour-target anchors for additional tours. Use existing navigation and confirmed application actions; never synthesize demo records, auto-click destructive controls or undo user changes on Previous Step. Suspend around dialogs/import review and restore focus on exit. Reserve space beneath content and keep toasts out of the panel. Help > Guided Tours uses a native disclosure and independent completion markers.

Run `python tools/ui-tour-check.py` for isolated onboarding/replay checks and 8 additional desktop/mobile visual baselines. Its `--record` writes candidates only; inspect and copy individually after review. These complement the existing 34 theme screenshots.


## App sharing

AppShare reuses native dialog/button foundations. Its black-on-white QR with four-module quiet zone is a functional scanning asset. Keep the readable URL, selectable clipboard fallback and keyboard dismissal/focus restoration. Run `python tools/ui-app-share-check.py` for responsive layouts, offline display, independent decoding and two individually reviewed comparisons. Physical second-phone scanning remains required for release signoff.

TestVersionBanner owns the full-width green TEST VERSION strip above the shared app header. It uses runtime exact hostname matching for workshop-test.foundationsrpg.org; the same merged build remains unmarked on production. It is informational, outside the constrained main column and present across every view.

ConfirmationDialog supports success/danger tones and a single OK action for result messages, retaining its destructive-confirmation defaults. Choose Image uses the canonical primary-button-cream variant, gold focus and centered layout. Picker acquisition accepts every returned File; decoding and recognition failures are separate. Accept is a picker hint, never application validation.

ImagePicker is the shared native file-acquisition control, with its own code/CSS folder, canonical orange/cream button and unfiltered File callback. Scan Prints shows centered, horizontal Choose Image and Scan Image acquisition buttons. Scan Image opens the camera; only Confirm Image submits OCR. Both sources enter the same static review. Do not infer native picker providers or activate a camera from returned Files.

LoadingDialog owns the accessible native loading modal and indeterminate gold spinner, with reduced-motion support and no progress percentage. OCR status/retry uses shared ConfirmationDialog; scanner diagnostics use existing Settings/select/disclosure/button styling. FILE SELECTED remains acquisition success, never recognition success.

Static OCR reuses LoadingDialog for Scanning Image and green/red ConfirmationDialog for actual matching outcomes. See SCANNER_UNIFIED_ACQUISITION.md for current acquisition/review behavior and OCR_TESSERACT_IMPLEMENTATION.md for historical provider work.


## Unified scanner viewport

The authorized static review/camera pattern uses ScannerViewport.css and the camera-background theme token: a black rectangular viewport, stationary gold/yellow dotted target with a dark outline, and source image beneath it. Camera target is a native accessible capture button; static target is noninteractive decoration. BackButton labels To Collections. Ordinary actions use canonical primary/secondary buttons and native themed camera select.

Only the static image pans/zooms; the target remains fixed. Pointer capture and touch-action:none are scoped to the review viewport. Outside it, page scrolling remains normal. Zoom In/Out, Reset View and keyboard arrows/+/-/Home provide alternatives to touch gestures. No adjustable crop handles. Confirm Image is the only OCR submission action. CAMERA ERROR and IMAGE ERROR use the shared danger dialog.

Run tools/ui-unified-scanner-check.py for file/camera/static review/gesture/confirmation checks. Native WebKit selects use the existing dark color-scheme foundation.


## Native camera acquisition (TEST v0.0.13)

Scan Image reuses ImagePicker with image/* and capture=environment to request the operating system's rear-camera still-photo interface. Choose Image retains its unrestricted input with no accept/capture attributes. Both return a File to the same full-read, orientation normalization, static review, Confirm Image, OCR and acquisition flow. Retake reopens native capture; cancel retains the existing review. The OS controls focus and capture UI; unsupported desktop browsers may show a file picker. Scan Prints no longer opens a getUserMedia preview or processes live camera frames.
