# Mobile Blueprint Scanner — Batch Scan & Acquire

Implemented locally in G:/codebase/wasteland-workshop. No release publication, tag, issue closure or deployment performed.

## Use

Choose an active collection in Blueprint Collections, then select Scan & Acquire. The destination is displayed throughout. Allow camera access, move closer and center the complete Item Name in the wide strip (the label is optional), and Capture Photo. Review the catalog match, then Acquire. Scan Next Blueprint reuses the open camera and OCR worker; it does not reopen permissions or navigate to the catalog. Already Acquired records do not duplicate entries. Retake retries the same document. Exit Scanner stops the camera and shows counters; Done returns to collections.

On a phone use an HTTPS URL. Plain HTTP to a computer's LAN address does not satisfy the secure-context requirement; desktop localhost is the development exception. Camera access is requested only after opening the scanner. Missing APIs, denied permission, busy/interrupted camera, missing destination and OCR/storage errors have explanatory messages. Backgrounding stops the camera and invalidates pending recognition; Resume Camera resumes explicitly. Confirmed acquisitions are already persisted if the tab closes.

## Architecture and privacy

- src/features/scanner/BlueprintScanner.tsx and CSS: batch workflow, guarded capture/acquisition, counters, error handling and summary.
- src/components/CameraPreview/: reusable live preview and wide name-only live viewfinder and centered 90% capture frame. object-fit:cover projects the same 3.4:1 strip used by capture in portrait or landscape. Lightweight 2Hz local luminance/contrast/movement guidance does not perform live OCR or block capture.
- ScanOcr.ts: lazy Tesseract.js 7.0.0, one Web Worker per session, local English int8 model, capture just the visible name strip, request higher camera resolution and best-effort continuous focus, bound capture width at 2200px with at most 2× upscaling. Use sparse/single-line OCR on the original strip, contrast-normalized block/single-line passes and bounded -5/+5 degree retries. At most six passes; no full-page fallback. Word-supported fallback suggestions remain uncertain and require a choice before Acquire. Canvas memory is released after each operation; model initialization/recognition runs off the UI thread.
- ScanMatching.ts: bounded text parsing and canonical catalog matching. ScanSession.ts owns session counters and destination checks.
- BlueprintCollectionService.ts: shared membership mutation used by existing status badges and the scanner; preserves collection and entry metadata.
- BlueprintCollectionsView.tsx and App.tsx: entry point, fixed destination identity, canonical ID validation, current stored destination/membership check, existing repository persistence before publishing success.
- vite.config.ts, package.json and package-lock.json: pinned local OCR assets served during development and emitted into production, with runtime licenses. No image/API server is required.

Photographs are temporary in-memory inputs. They are not uploaded, logged, written to local storage, added to backups or collected for analytics/training. Only normal collection membership changes persist. Explicitly supplied development photos live in tests/fixtures/scanner; no production fixture endpoint or automatic collection is added. These photographs were tested, not used to train a model.

## OCR selection, size and offline limits

Tesseract.js provides browser-side WebAssembly OCR in a worker, avoids API keys/cloud photo transfer and supports local worker/core/language paths. Alternatives such as cloud OCR conflict with the local-first requirement; platform text detection APIs do not provide a dependable cross-browser baseline. Sources: [Tesseract.js](https://github.com/naptha/tesseract.js), [local asset installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md), [camera secure context and facingMode](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

OCR is loaded only on first Capture. The lazy wrapper is about 17.2KB (7.3KB gzip). The English compressed model is 2.95MB, worker 111KB, and the selected embedded LSTM core about 3.9MB before HTTP compression. All supported SIMD/non-SIMD variants are shipped, but the device requests only one core. Full OCR asset distribution is approximately 48MB uncompressed on disk. Production smoke testing requested only local worker.min.js, one core and eng.traineddata.gz. Static files can be compressed/cache-served by hosting.

Recognition itself needs no network/API once the session engine has loaded. Guaranteed cold-start offline scanning is not claimed: the application does not yet have a PWA service worker that precaches its shell and OCR assets. Future PWA work should precache the lazy engine, selected core and English model without caching user captures. Current sessions use no persistent photograph cache.

## Match confidence

Normalize case, whitespace, punctuation, diacritics and joined words. Exact normalized catalog names rank first; common 0/O and 1/I/l confusions receive a 0.96 score. Otherwise use normalized Levenshtein similarity. Fuzzy names under five characters are rejected, candidate lengths are bounded, and similarity below 0.86 is discarded. A single exact name or a best score at least 0.94 with at least a 0.08 lead is high confidence. Other plausible results are ambiguous and require selection; display at most five candidates. No result creates a Master Catalog record. Acquire always requires an explicit click even for high confidence.

## Initial implementation evidence and limitations (historical)

The two supplied real photographs matched Freeiron Dry Pack (catalog ID 5234) and Hooch (4407), both exact/high confidence: 2/2 original photos. With derived 5-degree rotation and dim-light variants, all 6/6 test inputs matched the expected Blueprint. Before the bounded angle retry, rotated Freeiron failed safely; that informed the retry implementation. These are two distinct documents, not a representative general success-rate claim. Desktop timings in the recorded run were 559ms first scan including model initialization, 538ms rotated Freeiron, and 291–346ms for remaining warm scans. See scanner-screens/sample-results.json.

No physical Android/iOS phone has been tested by the agent. Chromium desktop/mobile emulation verifies layout/workflows, not real camera lens selection, permissions, memory pressure or phone speed. Target current Android Chrome and iOS Safari with HTTPS, getUserMedia, Canvas, Web Workers and WebAssembly; runtime checks decide availability. Physical-device camera and performance acceptance remains open. Severe perspective, major rotation, glare, blur and damaged prints may require retakes. No automatic edge detection, full perspective correction or learned model is implemented. Hundreds-of-document memory behavior needs a real-device soak test.

Counters count processed documents; retakes replace the current document outcome. Unmatched includes failed, skipped or unconfirmed documents. Successful acquisitions and already-owned results are distinct. Counters are session-only and not backed up.

## Initial implementation verification (historical)

429 tests in 31 files pass, including 18 new scanner tests. Full release-tooling tests, lint, TypeScript and production build pass. Existing mobile workflows, all ten tours, queue/timer checks and 42 earlier visual comparisons pass. Six new reviewed scanner screenshots cover camera, result and summary on desktop/mobile; ambiguous presentation is reviewed separately. Real local OCR integration verifies explicit acquisition, double-click protection, metadata preservation, already-owned batch scans, no-match/retake counters, reload/reopen, background recovery, camera release and same-origin requests. Controlled integration also verifies ambiguity, OCR failure, storage failure, changed/deleted destinations, unsupported API and denied permission. Production bundle smoke testing recognizes and acquires a reference Blueprint using only built local assets.

Run scripts/run-all-tests.ps1, npm run lint, npm run build, python tools/ui-functional-check.py, python tools/ui-tour-check.py, python tools/ui-queue-mode-check.py, python tools/ui-scanner-check.py and python tools/ui-scanner-samples.py with Vite at 127.0.0.1:5186. Reference sample results and screenshots are review artifacts, not application data.

## Physical-phone sign-off checklist

On HTTPS, test Android Chrome and iOS Safari: grant/deny permissions; verify rear camera; scan both reference documents plus at least 20 varied prints; exercise ambiguous/unmatched results and existing membership; rotate portrait/landscape; background/resume; acquire/reload; confirm camera privacy indicator turns off on exit; measure first/warm latency and memory over 100 captures. Check the browser console/network panel for unexpected endpoints. Record device/OS/browser and results. Until this is done, the implementation is available for testing but the real-device acceptance criterion is not complete.

![Live preview](scanner-screens/mobile-scanner-camera.png)

![Identified Blueprint](scanner-screens/mobile-scanner-result.png)

![Exit summary](scanner-screens/mobile-scanner-summary.png)


## Name-focused improvement (2026-10-09)

Replaces whole-page framing after reported mobile failures. Capture the full name in the upper-left Item Name row; the label is optional. The live viewfinder now shows only this wide strip, making close-up alignment and keeping mobile Capture accessible easier. Static examples use developer fixtures, not a live phone.

More light needed / little text contrast / hold still guidance comes from a temporary 192×56 sample every 500ms. It is advisory, not a blur measurement or promise that OCR will succeed. It never locks Capture or automatically acquires a Blueprint. No camera autofocus capability is assumed; failure to apply supported continuous focus leaves normal capture working.

OCR retains raw-image passes before contrast normalization. Name-before-label ordering on tilted paper is supported. Word-confidence filtering or an exact catalog fragment surrounded by OCR noise may discard a meaningful qualifier, so those candidates are always uncertain and never promoted to an automatic high-confidence selection. Captured pixels and a bounded read-text snippet help diagnose failed/uncertain results; neither persists.

470 tests pass (15 new tests for light/contrast/movement, crop geometry/resolution, parser ordering, raw single-line pass, bounded retries, uncertain word/fragment suggestions and cleanup). Actual local OCR fixture tests cover ten cases from the two supplied photographs: normal, +5°, -5°, 40% brightness and name-value-only. Nine exact high-confidence matches, one uncertain correct Hooch candidate for explicit selection. These are transformed reference cases, not ten independent photos, and do not establish a real-world success rate. Current results: scanner-screens/name-focused-results.json. Source crop coordinates exist only in the fixture test, not in production.

Desktop/mobile browser checks cover actual OCR, batch counts, retakes, repeated ownership, metadata persistence, same-origin requests, background/resume, camera cleanup, unsupported/denied cases, changing light feedback and rejected autofocus constraints. Review the updated camera/result screenshots and retest on the actual phone that reported one successful attempt in five. Heavy blur, glare, clipping and perspective distortion can still defeat recognition. No new dependency, cloud service, release or deployment.

Segmentation, contrast and skew approach follows Tesseract quality guidance: https://github.com/tesseract-ocr/tessdoc/blob/main/ImproveQuality.md and browser API support: https://github.com/naptha/tesseract.js/blob/master/docs/api.md.


Production preview verification passed with a name-value-only capture and local bundled OCR assets. The noisy capture produced an uncertain correct Freeiron Dry Pack candidate; explicitly choosing it and then Acquire persisted canonical ID 5234. No development source imports or external requests occurred.

Additional files changed for this improvement: `ScanQuality.ts`, `ScanQuality.test.ts`, `ScanOcr.test.ts`, `ScanMatching.ts`, `ScanOcr.ts`, `Scanner.test.ts`, `BlueprintScanner.tsx/.css`, CameraPreview code/CSS/geometry, both scanner browser tools, four individually reviewed camera/result baselines and documentation/evidence. Existing capture/session/destination tests remain passing.
