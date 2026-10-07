# Issue #28 — Build Queue, active crafting, and history

Implemented directly in G:\codebase\wasteland-workshop. Application version 0.4.0 is unchanged. Issue #28 remains open. Changes are uncommitted; no release, deployment or GitHub publication was performed.

## What changed

Blueprint Details now offers Add to Build Queue for an Enqueued job. Its timer creates a new Build at the top and starts it immediately, provided nothing else is Working. The action is available without an active Blueprint Collection. Builds have independent IDs, recipe references/snapshots, captured prices, overrides, notes, timestamps, and timer state. Build Queue is in application navigation. Completed jobs remain visible until explicitly deleted.

## Persistence architecture

BuildQueueRepository uses the existing localStorage approach with a new key, wasteland-workshop-build-queue. Stored shape: {version:1, builds:[...]}; array order is the authoritative queue position. Each Build stores id, blueprintId, blueprintName, recipe, economicSnapshot, overrides, notes, status, timer, createdAt, startedAt, completedAt. The complete recipe is copied so resource quantities and historical costs survive future catalog changes or removed recipes. All non-completed requirements can later be queried directly from recipe.craftingComponents.

Runtime validation checks version, IDs/uniqueness, recipe inputs, economic numbers, timer/status consistency, and at most one Working record. Corrupt or unsupported storage is preserved, with queue edits blocked and a visible error instead of overwriting history. Command saves happen before updating the displayed state; storage failure leaves the previous queue intact. If completion persistence fails, the job still completes in memory and warns the user to keep the app open and save it again.

## Timer integration

The Working Build's CraftTimerState is the authoritative timer. The existing CraftTimerEngine handles start, deadline calculation, pause, resume, tick and minute adjustments. The existing CraftTimer renders that same Build state; BlueprintCraftTimer displays it and routes creation through the queue. There is no separate standalone crafting timer owner. Completed timers are read-only; Enqueued jobs retain their full recipe duration until started. Started jobs cannot reset to Enqueued.

useBuildQueue ticks every 250ms for display, using the stored endTimeMs rather than subtracting interval counters. Navigation, visibility changes and pageshow do not discard time. Running deadlines are persisted on commands; ticking does not write storage every quarter-second. Completion and all workflow/edit/reorder/delete commands persist. On reload a Working job is reconciled against Date.now(); if expired, it restores as Completed with the original deadline as completedAt. Paused time remains unchanged while the app is closed. Restoration is saved on mount.

createBuildCompletionTracker reuses the existing createCompletionTracker for each Build owner. Completion is consumed before calling the existing playAlarm with current alarm settings; subsequent updates and rerenders do not replay it. Restored completed/expired jobs do not replay stale alarms on startup. The existing sound/vibration settings, Test Alarm, and autoplay preparation are retained. Browser suspension/locked-screen output limitations remain: elapsed time stays correct, but an alarm cannot reliably sound while JavaScript is suspended. No OS wrapper, server push, or notification workaround was added.

## Economic snapshots and overrides

Creation deep-copies the current effective global economics, including resource values and Mind/time/Resolve/card/markup. Build overrides are stored separately and sanitized using the existing settings validator. Resolution is Build override ?? Build's captured value; Reset returns to the captured value, not today's Settings. Zero is valid and unknown stays unknown.

DefaultCostCalculator.fromSnapshot uses those exact effective Build values without reintroducing current application defaults for missing captured resources. calculateBuildCost calls the existing calculateBlueprintCost; no costing formulas are duplicated. Blueprint and Shopping List prices still use current global values. Changing a Build override does not affect Settings, its source Blueprint, or other Builds. Notes and explicit override edits remain available after completion.

Browser price check: an existing Sosweet job retained 84.8cr after global Rare Scrap changed 7 → 10. A new Sosweet job captured the new price and showed 96.8cr. A zero Basic Scrap override affected only its AA Blade job (25cr), while another AA Blade stayed at 37cr.

## One Working Build and status badges

BuildQueueService is the shared transition authority, including protections independent of disabled UI controls:

- Enqueued → Working starts the saved full duration and sets first startedAt.
- Working → Paused explicitly pauses and preserves deadline-derived remaining time.
- Paused → Working resumes remaining time and preserves first startedAt.
- Timer expiration → Completed sets completedAt, releases Working, retains history, and never starts the next job.
- Completed is terminal: its badge is a readable span, not a cycling button; timer restart/adjustment is rejected.

Starting/resuming while another Build is Working throws a clear pause-first message without modifying either job. Immediate Blueprint timer creation checks the same condition before creating a Build. Enqueueing additional planned work while a Build runs remains allowed. Blueprints do not silently stop active work.

BuildStatusBadge follows the existing compact status-badge convention with separate themed Enqueued, Working, Paused and Completed colors. Other start/resume badges are disabled while active work exists. The queue header shows the active name, remaining time, and Working badge for quick explicit pausing even if history is above the active row.

## Reordering and active protection

Touch/keyboard-accessible Move Up and Move Down buttons reorder all eligible statuses. No mouse-only dragging is required. The existing Datalist sorts columns and owns transient detail selection rather than persisted user order, so the queue uses the existing responsive card styles with explicit ordered-list semantics instead of enabling an incompatible sort control.

Working has no move controls or delete action; its checkbox is disabled. The service rejects moving it. Other rows reorder around its fixed array slot, so even indirect movement does not shift the Working position. Explicit pausing unlocks movement. Reordering changes only array order, preserving status, timer, notes and economics. Starting/resuming an existing job leaves its chosen position unchanged. Only immediate Blueprint timer creation intentionally inserts a new job at the top. Completed jobs are not forced to the bottom.

## Selection and deletion

Each row has an independent 44px checkbox target. Select All includes Enqueued, Paused and Completed but excludes Working; Deselect All clears selection. Bulk Delete and individual Delete use the shared themed ConfirmationDialog, with initial focus on Cancel and Escape support. Cancellation leaves records intact. Confirmation removes only the selected IDs and persists the resulting queue. The service rejects any individual or bulk deletion containing a Working job, including a job that became Working after selection. The user must explicitly pause first.

The confirmation component was extracted from the existing Shopping List prompt, keeping its behavior/style and Remove label there; Build deletion uses Delete. No row-level click handler couples checkbox, badge, reorder or secondary actions. The Blueprint-name button opens details; Notes & Overrides and Timer remain distinct actions.

## Mobile approach

Cards instead of a wide table; wrapped actions; minimum 44px action/checkbox targets; distinct workflow badge, selection, movement, details and deletion targets. Active work is highlighted with the theme's rust border; completed work uses a darker, readable green surface. The 360×800 browser viewport had no horizontal overflow (document width and content width both 345px with scrollbar). This is responsive browser validation; physical-phone testing remains for review.

## Validation

- **137 unit tests passed in 8 files**, including 39 new Build Queue cases. Existing 98 economics/Shopping List/alarm tests remain passing.
- New tests cover creation/identity/order/recipe capture; fixed economic snapshots; isolated/reset/zero/unknown overrides; shared cost formulas; start/pause/resume/terminal/zero-duration behavior; explicit one-Working protection; Blueprint immediate creation/rejection; deadline completion and first/completed timestamps; timer adjustments/reset protection; alarm output once; all reorder/delete statuses; Working protection; notes and stable history; bulk deletion; badge markup; storage round trips; restored deadlines/expired completion; malformed/duplicate/multi-Working storage; unavailable storage.
- Full scripts/run-all-tests.ps1 passed, including version/lockfile/PowerShell validation and isolated release/deploy fixtures. Fixture pushes target temporary local repositories and use mocked services; they did not publish or deploy this app.
- Production build passed. Lint passed. git diff --check passed.
- Browser workflow: enqueue A/B; reorder B above A; start A without moving it; verify B disabled; explicitly pause A with preserved time; reorder paused A; start/pause B; create C through Blueprint timer at top; edit live notes and isolated zero override; allow shortened timers to expire naturally into history; verify no automatic next job; resume A and reload with deadline intact; confirm blocked Blueprint timer; change global values and compare old/new captures; Select All/Deselect All; cancel deletion; bulk-delete two completed test jobs; reload and verify only selected history removed and active/unselected jobs retained.
- Shortened test timers used the existing minute adjustment controls, then expired by deadline; no hidden timer/storage manipulation was used.

## Compatibility and deferred work

No prior Build Queue exists, so no Build data migration is needed. Existing Blueprint Collections, Shopping Lists, global economic storage, alarm settings, and version are retained. The former in-memory standalone crafting timer had no persisted job history to migrate; timer actions now create Builds as required. CraftTimer keeps its original optional standalone control API for component compatibility, while App always supplies Build-managed badge controls.

Ledger integration, inferred payments/customers, full Queue → Shopping List aggregation, native locked-screen notification delivery, and cloud/multiple-device synchronization are deferred. Drag-and-drop is optional future polish; Move Up/Down is the implemented complete reorder mechanism. Local queue storage is per browser/device, following the rest of the app. Multiple simultaneous browser tabs are not synchronized by this work; use one active app tab for crafting.

## Files changed

- G:/codebase/wasteland-workshop/src/App.tsx
- G:/codebase/wasteland-workshop/src/components/CraftTimer/BlueprintCraftTimer.tsx
- G:/codebase/wasteland-workshop/src/components/CraftTimer/CraftTimer.tsx
- G:/codebase/wasteland-workshop/src/economics/DefaultCostCalculator.ts
- G:/codebase/wasteland-workshop/src/features/blueprints/BlueprintDetails.tsx
- G:/codebase/wasteland-workshop/src/features/blueprints/BlueprintSearch.tsx
- G:/codebase/wasteland-workshop/src/features/blueprints/WorkshopView.tsx
- G:/codebase/wasteland-workshop/src/features/shopping/ShoppingConfirmationDialog.tsx
- G:/codebase/wasteland-workshop/src/features/shopping/ShoppingLists.css
- G:/codebase/wasteland-workshop/src/components/BuildStatusBadge/BuildStatusBadge.css
- G:/codebase/wasteland-workshop/src/components/BuildStatusBadge/BuildStatusBadge.tsx
- G:/codebase/wasteland-workshop/src/components/ConfirmationDialog/ConfirmationDialog.css
- G:/codebase/wasteland-workshop/src/components/ConfirmationDialog/ConfirmationDialog.tsx
- G:/codebase/wasteland-workshop/src/features/builds/Build.ts
- G:/codebase/wasteland-workshop/src/features/builds/BuildDetails.tsx
- G:/codebase/wasteland-workshop/src/features/builds/BuildFormatting.ts
- G:/codebase/wasteland-workshop/src/features/builds/BuildQueue.test.ts
- G:/codebase/wasteland-workshop/src/features/builds/BuildQueueRepository.ts
- G:/codebase/wasteland-workshop/src/features/builds/BuildQueueService.ts
- G:/codebase/wasteland-workshop/src/features/builds/BuildQueueView.css
- G:/codebase/wasteland-workshop/src/features/builds/BuildQueueView.tsx
- G:/codebase/wasteland-workshop/src/features/builds/useBuildQueue.ts
- G:/codebase/wasteland-workshop/docs/build-queue.md (this report)

## Compact Build timer follow-up

Working and Paused jobs now include a 96px timer control on the queue card and Build Details page. It reuses BlueprintCraftTimer's ring and the same Build-owned timer state. Tap pauses/resumes through toggleBuildStatus; it does not create another Build. Paused jobs remain visible so the user can resume them, with the same one-Working guard. Hold for 650ms opens the existing Craft Timer controls for minute adjustments without toggling status. Scrolling more than 10px, pointer cancellation, leaving, or unmount cancels a pending hold. Release after a long press is consumed so it does not pause/resume unexpectedly. Timer Settings and F2 provide keyboard-accessible alternatives.

Added components/BuildCraftTimer code/CSS and CraftTimer/TimerPress gesture helper/tests; updated BlueprintCraftTimer, BuildQueueView, and BuildDetails. Nine new tests cover tap, long press, release suppression, movement/cancellation, subsequent taps, countdown display, paused progress, and blocked resume. Current validation: **146 tests in 9 files pass**, full project checks pass, lint and production build pass. Build retains the existing bundle-size advisory. Browser checks verified tap pause/resume, F2 settings without stopping work, minute adjustments and 360px mobile layout. Physical touch long press remains a phone review check; its timing/cancellation is covered by automated tests.


### Top-only timer workflow
The queue shows the compact timer only on its first item (unless Completed). Lower Enqueued/Paused status badges open a themed confirmation to move that Build to the top and start/resume it. Confirmation explicitly authorizes pausing any existing active Build while preserving its deadline-derived remaining time. Cancel makes no queue changes. Ordinary timer/Blueprint start actions still require an explicit pause. The top Working badge is green and read-only; its timer controls pause/resume/settings. Lower Build details omit timer controls. Tests cover the single displayed timer and confirmed switching with preserved progress.


### Blueprint Build action
Blueprint details now offer a single large green Build badge, with no timer or separate Add to Build Queue button. Successful creation opens the Build Queue. An entirely empty queue starts the new Build immediately; otherwise it appends Enqueued, preserving existing work and order (including paused/completed entries). Regression checks cover these cases and the simplified collection details.
