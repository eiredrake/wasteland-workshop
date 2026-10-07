# Craft timer alarms — issue #3

Implemented a built-in three-tone Web Audio alarm, browser vibration, independently persisted On/Off switches, and Test Alarm. No downloaded audio asset or custom audio upload is needed. The existing timer engine, controls, ring styling, and blueprint timer displays retain their behavior.

## Files changed

- `src/App.tsx`: observes completion at the shared timer owner, primes audio during user interaction when sound is enabled, refreshes from the absolute deadline on visibility/pageshow, mounts alarm settings.
- `src/App.css`: mobile-sized alarm select controls using existing theme colors.
- `src/components/CraftTimer/CraftTimer.tsx` and `.css`: foreground-only warning beside timer controls.
- `src/features/settings/AlarmSettingsView.tsx`: automatically saved On/Off switches, Test Alarm, explicit capability/volume/background feedback.
- `src/features/timer/AlarmSettings.ts`: validated settings under `wasteland-workshop-alarm-settings`, following existing JSON/localStorage conventions.
- `src/features/timer/CraftAlarm.ts`: built-in sound, guarded vibration, per-owner completion tracker, device failure handling.
- `src/features/timer/CraftAlarm.test.ts`: completion, settings, devices and timer regression tests.
- `docs/craft-timer-alarms.md`: limitations, verification and proposed follow-up.

## Completion and timer behavior

Completion is consumed before playback. Repeated updates, effect replay, settings changes, and navigation between displays cannot re-trigger an already completed timer. Reset/restart re-arms it. The tracker is per timer owner, so independent timers do not share a global completion latch. The current application has one shared timer, rather than a collection of concurrently running timers; this change preserves that design.

Elapsed time still comes from `endTimeMs - Date.now()`, never an accumulated interval count. Visibility/pageshow updates catch up promptly after resuming. This is accurate across suspension while the page state survives. Existing timers are not persisted; a discarded/reloaded page loses its timer, as before. Completing by adjusting remaining time to zero also triggers once. Completed timers loaded as an initial state do not sound retroactively.

## Browser/mobile investigation

These findings come from platform documentation and automated tests, **not physical phone testing**.

| Situation | Expected behavior and limits |
| --- | --- |
| App visible, screen awake | Alarm attempts sound/vibration once. Web Audio must be enabled by a user interaction. Test Alarm checks playback and requests tactile confirmation. |
| Browser backgrounded or another app active | Timer callbacks can be throttled or suspended. There is no guaranteed alarm at the deadline. If a callback executes hidden, completion is consumed once even if the device blocks output; this feature does not queue repeated attempts. |
| Screen locked | The page may be suspended, and audio/vibration cannot be promised. An installed PWA does not acquire native alarm scheduling privileges. |
| Expiry during suspension, then return | The absolute deadline catches up and completes at the first resumed update. Output is attempted once at that time, subject to the browser's audio state. |
| Page discarded, browser killed, or reload | Existing in-memory timer state is lost. Persistence/recovery is separate future work. |
| Vibration unavailable | Safely skipped. WebKit/Safari does not implement this API; Firefox removed it in version 129. Chromium support still depends on hardware and settings. |

The Vibration specification requires a visible document and user activation; hidden documents are rejected and running patterns abort when visibility changes. A true API result does not establish that the user physically felt vibration. Sound scheduling likewise cannot establish audible volume, output routing, or silent-mode behavior. Test Alarm intentionally tells the user to listen/feel, and reports unsupported, blocked, disabled, and failed requests separately. Device DND, silent settings, browser policy and volume can suppress alerts.

No background audio keepalive, silent looping audio, worker interval workaround, or timer architecture redesign was added. Service workers are event-driven and may be terminated; they are not dependable long-running countdown processes.

Sources:

- [Chrome page lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api): frozen tasks and discard lifecycle.
- [Web Audio autoplay restrictions](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay): user interaction and playback policies.
- [Vibration specification](https://www.w3.org/TR/vibration/): visible document, user activation, implementation status.
- [Navigator.vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate): device settings and non-guaranteed hardware output.
- [ServiceWorkerGlobalScope](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope): event-driven lifecycle.
- [WebKit: iOS/iPadOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): Home Screen app push support and permission requirements.

## Optional custom sounds

There is no standard browser/PWA API for selecting the operating system's alarm tones. A user-selected local audio file is feasible through a file input and supported media playback. It would need format/error handling and persistent Blob storage (for example IndexedDB) to survive reopening; an object URL alone is temporary. It remains subject to autoplay and suspension restrictions, and does not provide lock-screen reliability. This is deliberately deferred.

- [Browser file input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file)

## Automated validation

`npm test`: 23 tests passed in five files (13 existing tests plus ten new tests).
`npm run build`: passed, with the existing large bundle warning.
`npm run lint`: passed.

New coverage: Test Alarm with both settings disabled, no delayed audio queue for suspended contexts, one-shot completion including repeated ticks/effect replay, rearming, independent timer trackers, sound/vibration disabled, unsupported/rejected/throwing devices, built-in three-tone scheduling, settings round-trip and malformed values, absolute elapsed time after a simulated long gap, pause/resume/adjust/reset.

Tests mock device APIs and simulate suspension with a later timestamp. They do not claim to verify actual sound, hardware vibration, browser autoplay policy or lock-screen delivery. No component/browser rendering tests were present in the existing suite.

## Phone acceptance checklist — leave #3 open

Test Android Chrome and iPhone Safari (also Home Screen installations where available):

1. Test Alarm with both controls On. Record OS/browser version, audible sound and felt vibration. iPhone browser vibration should report unsupported.
2. Turn sound Off, then vibration Off; confirm each separately and both Off. Reload and check persistence.
3. Start a short timer from both timer and blueprint controls. Navigate to other views before completion; confirm exactly one alert and no duplicate after returning/rerendering. Reset and run again.
4. Pause/resume and adjust minutes. Confirm completion and controls retain their behavior.
5. Background the browser, switch apps, and lock the screen before expiry in separate runs. Return after expiry and record when completion and any output actually occur.
6. Repeat after a long background interval and browser termination to distinguish suspension from discarded state.
7. Repeat with low volume, silent mode and DND. Test Alarm must not imply that an accepted request guarantees delivery.

## Recommended follow-up issue (not filed)

**Reliable crafting completion notifications while locked/backgrounded; timer recovery after reload.**

The product direction is a serverless PWA, potentially packaged later in a native OS container. No server or push notifications are planned. First evaluate persistent deadlines and recovery after reload. For offline alerts while the phone is locked, evaluate a Capacitor-style native container with OS-scheduled local notifications, permissions and actual phone testing. The web/PWA version retains foreground alarms and an explicit visibility/screen-awake warning.

Native scheduling should happen when a timer starts, with cancellation/rescheduling on pause, reset, replacement or adjustment. Completion-only browser callbacks cannot schedule reliable alerts while suspended. Keep the existing timer engine and UI shared, and prevent duplicate web/native alerts. Browser output is isolated in CraftAlarm.ts; there is no native dependency in this work order. A native completion notification is distinct from a continuously ringing Clock alarm. Do not substitute a service-worker timeout for native scheduling.

Issue #3 stays open until actual phone acceptance testing is complete. This implementation does not close it.
