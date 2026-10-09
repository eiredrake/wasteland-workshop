# Guided tours (Issue #1)

Implemented directly in G:\codebase\wasteland-workshop. Open the main menu, then Help > Guided Tours to start or replay a tour. Completed tours have a checkmark. Only Getting Started: Blueprints is offered automatically, after initialization and while no dialog, editing field, import review, or Settings screen is active. Skipping or exiting marks it viewed and suppresses future automatic offers; completion is separate.

## Implementation

Nine independent tours cover introductory Blueprints, collections, shopping lists, Warehouse, Work Queue (including Actions), Work History, Timer, Timer Settings, and application Settings. Definitions live in src/features/tours/TourRegistry.ts; progress validation/storage and the controller live alongside it. The shared panel and CSS live in src/components/GuidedTour. App owns navigation and confirmed action signals; existing views expose stable data-tour-target anchors. Datalist reports actual Blueprint selection and can retain that selection across tour navigation.

The nonmodal panel highlights real controls, scrolls them into view, supports Previous Step, Next, Skip Step, Exit and Finish, and suspends around dialogs. Missing targets can be skipped. Guided steps advance only after a meaningful confirmed application change. Previous Step never reverses data changes. Existing collections and queued work can be reused, avoiding duplicate records on replay. Tours never fabricate application data or click Build on the user's behalf.

Progress stores stable IDs, viewed/completed flags and timestamps in the existing user-storage system. Unknown valid future IDs are preserved. Unreadable data produces a warning rather than being silently overwritten. Replay preserves completion.

## Backup compatibility

New exports use schema 4 and include guided tour progress. Restoring a backup containing progress replaces that domain along with other application data. Versions 1–3 remain supported; missing tour progress preserves local completion and marks the introduction viewed to prevent an unexpected first-run offer after restore. Restore rollback and recovery include this storage key.

## Adaptations to the work order

The current UI says Timer, though the stable tour ID remains craft-timer. Timer Settings opens the full Timer page, with immediate minute adjustments rather than Apply/Cancel. Blueprint membership initially says Not Acquired. Build starts immediately when the pending queue is empty; the introductory tour explicitly explains this before the user-controlled action. Other tours describe existing controls and do not invent unsupported quantity or cost inputs.

## Validation

400 automated tests across 30 files pass, including 19 new tour tests and updated backup compatibility assertions. Lint and production build pass. Existing isolated browser workflows pass. Desktop and mobile browser tests cover first offer, skip/reload, real Blueprint selection, collection creation, membership, Build, backward navigation without duplication, completion, replay, all ten tours, older import suppression, Escape/focus restoration, highlights, resize and 44px controls.

34 existing visual comparisons plus 8 reviewed tour screenshots cover desktop and mobile. The existing Settings error screenshot was updated solely for the expanded backup description. Run npm test, npm run lint, npm run build, npm run test:visual, python tools/ui-functional-check.py and python tools/ui-tour-check.py with Vite at 127.0.0.1:5186. Screenshot comparison requires the same Chromium/font environment. Physical phone testing remains recommended; mobile checks use Chromium emulation. Issue #1 remains open.
