# Scanner photo import delivery — 2026-10-12

Implemented in G:\codebase\wasteland-workshop for review toward v1.0.0-alpha.1. Package version remains unchanged; no release was tagged or published.

## UX update — 2026-10-12

The subsequent review supersedes the original entry/exit and result presentation below: Take Photo was removed because the tested device opened a file picker. Use Camera and Choose Photo are primary themed actions; canonical Back to Collections returns directly and releases camera/OCR resources. The separate exit-summary screen was removed. Both recognition modes now use a green-bordered PrintClaimDialog with a gold canonical name and circular Cancel/Claim badges. The camera close-up disclosure was removed; tap/click the preview requests focus at the mapped point where supported, with autofocus fallback and honest capability feedback. Enter/Space requests center focus. Verified with ui-scan-claim-check.py at 320, 390 and 1280px, plus point-focus/mapping tests (536 automated tests pass).

## Input and acquisition

Scan & Acquire now opens without requesting camera permission. Choose Photo immediately opens a native, multiple-file image picker without a capture restriction. Use Camera opens the original live scanner, including autofocus, flash support, automatic capture, diagnostics and explicit acquisition.

Imported photos show an aspect-preserving preview before Analyze Photo. The active destination remains visible. High-confidence recognition opens the green PrintClaimDialog with the print name in gold; ambiguous/manual-search candidates require selection before that same dialog opens. Its circular Cancel/Claim controls keep acquisition explicit. All acquisition calls use the existing collection service through the same onAcquire callback. To Acquire changes to Acquired, existing Acquired records stay unique, metadata is preserved, and failed writes do not report success. No new master entries are created.

Multiple files are processed sequentially. File handles are retained for the pending batch, but only one image is decoded at a time. Next Photo lets the user deliberately advance past an unmatched or corrupt image; there is no automatic batch acquisition or ambiguous-result skipping. Choose Next Photo supports repeated batches. Retry/manual correction count the same document once. Camera and photo inputs contribute to the existing shared session counters until Back to Collections returns directly to the collection screen.

## Image and OCR processing

PhotoImage.ts accepts JPEG/JPG, PNG, WebP and HEIC/HEIF when the browser decoder supports them. Unsupported/corrupt images show a recoverable conversion message. Inputs are limited to 30 MB and 60 million decoded pixels; decoded canvases are bounded to a 2560-pixel longest edge and OCR inputs to 1800 pixels. Extremely large images may still exceed a device’s decoding memory before dimensions become available.

createImageBitmap uses from-image orientation, respecting EXIF. The original File and an oriented working canvas stay temporary during the current photo. PhotoAdjuster provides a drag rectangle, keyboard-accessible percentage crop fields, 90-degree left/right rotations, a title-region preset, and reset. OCR receives the rotated/cropped pixels; these are not display-only changes. Reset redraws from the original working canvas. Cancel, replacement, switching input and exit release canvases and terminate OCR as appropriate. ImageBitmap objects are closed; no temporary object URLs are created.

Both modes reuse createScanRecognizer, the existing PaddleOCR engine/Tesseract fallback, title extraction and catalog matcher. No additional OCR library or remote service was introduced. Static photos first try a broad upper-left title region, then the full image if no high-confidence result is found. An explicit user crop is respected. Existing grayscale/contrast and reduced-scale retries remain available in the shared engine. Thresholding, denoising and automatic deskew were not added blindly: the comparison did not establish a need for new transformations. Tilted text is left for the OCR engine; manual quarter-turn rotation handles sideways images.

The editable Recognized Text field supports recovery through Search Catalog. Matching retains existing exact, normalized, character-confusion and fuzzy behavior and canonical Blueprint IDs. Corrected text never creates an entry or acquires automatically.

Photo diagnostics follow the existing global scanner diagnostics preference. Each report contains input method, dimensions, crop/rotation, timings, extracted text, candidates/scores, confidence and failure details. Photo diagnostic reports exclude pixel/image payloads. Camera reports now explicitly identify their input method. Diagnostics are hidden during normal use. There are no uploads, external OCR calls, permanent photo storage, training collection, raw console logging or photo data in backups.

## Offline operation

Prepare Offline Scanning is an explicit action in the production photo screen’s Offline Use disclosure. It uses approximately 148 MB of device storage for both engines; preparation is not automatically started on every app visit. A production-only generated service worker caches the built application, worker scripts, WASM, Paddle models and Tesseract language/core assets. It caches only bundled same-origin static files; imported photos never pass through it. Offline readiness is shown in the photo workflow, with an understandable unavailable state if browser storage cannot complete preparation. Incomplete new caches are discarded on failed preparation. Old scanner asset caches are replaced after a successful new installation; user local-storage data is not touched.

Verified in a fresh production Chromium context: choose Prepare Offline Scanning, wait for successful installation, disable network, reload the app, choose a real photograph, perform OCR and acquire it. This passed for PaddleOCR and a forced Tesseract fallback (primary model removed from the test cache). HTTPS or localhost and service-worker/browser storage support are required. Offline operation starts after the initial downloads finish and depends on the browser retaining cached assets. This is a narrow offline cache, not a complete installable-PWA or native-wrapper implementation. Preparation refuses to replace another worker already registered at the same scope; when the app gains a full PWA worker, integrate these asset-cache rules there rather than registering competing workers.

## Recognition comparison

The comparison uses the two provided physical Blueprint photographs (Freeiron Dry Pack and Hooch). Six conditions include the original full page, simulated 7-degree tilt, simulated low light, simulated minor blur, a title close-up, and the second real Hooch photo. Simulated variants are labeled and are not represented as additional real-world phone captures. The original photographs include their existing background/framing; no additional clutter or curled-paper accuracy claims are made.

| Method | Expected name among candidates | High-confidence results | Median measured time |
|---|---|---|---|
| Full-photo pipeline | 6/6 | 5/6 | 2.05 seconds |
| Manual title crop | 6/6 | 5/6 | 2.53 seconds |
| Existing camera-style name crop | 6/6 | 6/6 | 1.90 seconds |

There were no incorrect high-confidence identifications in these 18 runs. The tilted full-photo run took 21.96 seconds and remained ambiguous; its manual crop took 4.23 seconds and also remained ambiguous. The same tilted image’s camera-style crop matched confidently in 3.31 seconds. This demonstrates the new recovery path, not a general recognition-accuracy improvement. The camera comparison feeds its existing name-crop shape to the same recognizer; it is not a physical sensor/camera trial. Cold starts, hardware and other photographs will vary.

The complete measured text/candidate/timing report is generated by tools/photo-recognition-comparison.py at tests/visual/actual/photo-recognition-comparison.json (ignored test artifact).

## Verification

- 536 automated tests passed; lint, TypeScript and production build passed.
- PhotoImage tests cover JPEG/PNG/WebP/HEIC/HEIF admission, invalid/empty/large input, EXIF decode options, bitmap cleanup, resize, rotation/crop geometry and shared recognizer/full-image fallback cleanup.
- ui-photo-import-check.py: real OCR, library picker attributes and file chooser opening, no camera calls for import, desktop/mobile preview, rotation/crop/reset, explicit acquisition, manual name correction, JPEG/PNG/WebP decoding, sequential batch recovery, duplicates, metadata, counters and same-origin requests.
- ui-photo-recovery-check.py: forced ambiguous results, failed storage writes, retries counted once, crop/rotation/reset changes to actual OCR inputs, double-Analyze prevention, OCR failure, cancellation/exit and late-result rejection.
- ui-photo-offline-check.py: fresh built app offline reload/OCR/acquisition; SCANNER_TEST_FALLBACK=1 verifies the fallback engine too.
- Existing ui-scanner-auto-check.py, ui-scanner-cleanup-check.py, ui-scanner-check.py and ui-scanner-production-check.py camera workflows passed after explicitly choosing Use Camera. Four changed camera visual references were individually inspected; no blanket baseline update was used.
- ui-tour-check.py passed desktop/mobile onboarding and replay. ui-functional-check.py passed existing queue/history, collection, warehouse, settings and portable backup workflows.
- Main visual suite still reports its previously observed mobile-error-state.png settings screenshot mismatch. That reference was not changed by this work.

## Files changed

- src/features/scanner/BlueprintScanner.tsx and BlueprintScanner.css: input selection, shared session accounting, camera/photo transition, mobile result layout and camera input-method diagnostics.
- src/features/scanner/PhotoImport.tsx: native capture/library inputs, preview, analysis, results, confirmation, correction, batches, recovery and controlled diagnostics.
- src/features/scanner/PhotoImage.ts and PhotoImage.test.ts: decode/orientation, resource bounds, crop/rotation and shared static OCR.
- src/components/PhotoAdjuster/PhotoAdjuster.tsx and PhotoAdjuster.css: reusable themed crop control.
- src/features/scanner/ScannerOffline.ts and vite.config.ts: offline readiness, production cache registration and bundled asset service worker generation.
- tools/ui-photo-import-check.py, ui-photo-recovery-check.py, ui-photo-offline-check.py and photo-recognition-comparison.py: new workflow/offline/comparison checks.
- tools/ui-scanner-auto-check.py, ui-scanner-check.py, ui-scanner-cleanup-check.py and ui-scanner-production-check.py: select Use Camera at scanner entry.
- tests/visual/baselines: four reviewed camera/result snapshots reflect the photo-switch button.
- docs/scanner-photo-import.md and docs/UI_DESIGN_STANDARDS.md: feature and control guidance.

## Phone signoff still required

Desktop Chromium and mobile-sized/touch Chromium were exercised; no physical Android or iPhone was available to this run. Verify Use Camera opens the live camera, supported flash/autofocus and tap-point requests work, Choose Photo opens the library, native HEIC decoding, portrait EXIF orientation, low-memory behavior and offline reopening after preparation. Tap-point focus depends on exposed camera/browser controls; unsupported devices fall back to available autofocus.

Further physical recognition trials should include curled paper, extra background clutter and similarly named prints. Uncertain candidates always require selection and Acquire regardless of confidence. No alpha release should be inferred from automated/emulated checks alone.

Platform references: [Camera focus constraints](https://www.w3.org/TR/image-capture/), [createImageBitmap orientation](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap), [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).
