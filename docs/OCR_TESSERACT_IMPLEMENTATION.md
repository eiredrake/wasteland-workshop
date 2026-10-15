# Tesseract static-image scanner completion report

Historical phase report. Current behavior is documented in SCANNER_UNIFIED_ACQUISITION.md and scanner-development.md.
Date: 2026-10-13 (America/New_York). Branch: scanner-implementation. Experimental app version: 0.9.24.

TEST deployed through the command bound to Tentacles: Deploy DEV: Windows PowerShell running scripts/deploy-test.ps1. The user confirmed TEST is workshop-test (the earlier test alias in the order was corrected), at https://workshop-test.foundationsrpg.org. Production is wasteland-workshop.

## Required completion report

1. **Version:** Tesseract.js 7.0.0 pinned in package/lock files; English data @tesseract.js-data/eng 1.0.0, 4.0.0_best_int/eng.traineddata.gz. Core pinned transitively by the lockfile.
2. **Files:** complete created/modified list below. MockOcrProvider remains available.
3. **Interface:** OcrResult adds optional providerVersion/correlationId for existing-provider compatibility; Tesseract supplies both when the request has an ID. VIDEO_UNSUPPORTED is an image-stage error. Dimensions/targets require positive integer original pixels and in-bounds integer rectangles.
4. **Initialization:** existing OcrService owns shared initialization and NOT_LOADED/LOADING/READY/FAILED events. Scan Prints entry initializes, not app startup. READY follows actual worker/core/English initialization. Existing loading/error/Retry dialogs remain. Initialization timing is retained for scan diagnostics.
5. **Worker:** one reused worker across scans and navigation. Provider recognition is serialized. Service replacement/disposal waits for active operations before termination. A marked wrapper closes workers on rejected initialization; provider errorHandler propagates v7 language/init failures that can otherwise leave createWorker pending. Temporary URLs/region canvases are released. The selected File stays only in the mounted view for retry and is replaced/released on new selection or unmount.
6. **Assets:** generated under ocr/tesseract-7.0.0/: worker.min.js, scalar/SIMD/relaxed-SIMD LSTM .wasm.js runtimes (embedded WASM bytes), eng.traineddata.gz, licence/notices and size/SHA-256 manifest. Vite serves these locally in dev and emits them in builds. Manifest asset total: 14,789,256 bytes; English compressed data: 2,952,873 bytes. No runtime CDN paths.
7. **Caching:** no active app PWA worker existed in this branch. One generated app service worker now atomically precaches shell, hashed chunks, metadata/icons and explicit OCR allowlist. Failed install deletes its partial cache and does not activate. Navigation is network-first with shell fallback; allowlisted assets cache-first with online missing-asset recovery. Tesseract IndexedDB model caching is disabled; the app cache owns assets. Cleanup touches only obsolete workshop-app-* caches, never user records/photos. No deployment scripts, Compose/nginx or production release settings changed.
8. **Input:** Choose Image/accept hints remain. Acquisition and decoding are distinct events. Shared native decoding establishes actual dimensions without extension rejection. JPEG/PNG/WebP passed, including arbitrary extensions. Video MIME/container signatures yield VIDEO_UNSUPPORTED before OCR; invalid bytes yield IMAGE_INVALID. Filename stays visible; Scan Image requires usable selection/READY and prevents duplicate submission. Themed processing/outcome dialogs reflect real results.
9. **Targets:** default is (0,0,decodedWidth,decodedHeight). Real-worker tests showed garbled output from upstream SetRectangle on smaller regions. Shared ImageRegion now extracts requested original pixels at 1:1 size for non-full requests and sends the extracted image with its full rectangle. RGBA uses the same path. Tests verify text outside the target is excluded and bounds rejected. No crop UI, pan/zoom or enhancement.
10. **Candidates:** split raw text on CRLF/LF/CR; apply established trim/lowercase normalization to each nonempty line; deduplicate candidates. No joins, punctuation removal, internal-space collapse, substrings or fuzzy comparisons. Raw text remains separate.
11. **Matching:** existing master catalog API, exclusively in BlueprintMatcher. Exact normalized candidates are matched; results deduplicated by blueprint ID. One unique ID succeeds with canonical name; zero NO_MATCH; multiple AMBIGUOUS_MATCH; catalog exception CATALOG_UNAVAILABLE. OCR text alone never identifies a print.
12. **Diagnostics:** existing settings/export/500-record/1-MiB limits retained. Events: OCR_LOAD_STARTED/SUCCEEDED/FAILED, FILE_SELECTED/FILE_SELECTION_FAILED, IMAGE_DECODE_RESULT, SCAN_STARTED, OCR_SCAN_REQUEST/RESULT, BLUEPRINT_MATCH_RESULT, SCAN_COMPLETED. Whitelisted details include timestamps, session/scan IDs, browser/platform, filename/size/MIME, dimensions/target, provider/version, init state/timing, recognition timing, actual text/confidence, normalized candidates, IDs/count and structured stage/code/message. Recognition/matching share the request ID; acquisition/decoding use a paired ID. Disabled recording retains no details.
13. **Automated:** 509 tests / 41 files pass; lint, TypeScript/production build pass. Provider lifecycle/retry/reuse/error/cleanup, static input/dimensions/formats/video/errors, multiline matching and diagnostics covered. Actual encoded/RGBA region tests pass in Chrome/Firefox/WebKit. Controlled init/retry/remount/settings-backup checks and general mobile workflows pass. Deployment tooling guards pass using isolated mocks/temp repos.
14. **Browser:** actual generated fixture recognition, JPEG/PNG/WebP, unique/no-match/ambiguity, duplicate same-ID lines, retry/worker reuse, replacement, invalid/video errors, native picker cancellation/error, diagnostics, focus/dialogs pass in Chrome 155.0.8059.40, Firefox 155.0 and WebKit 26.6 at 390/1280 widths. Chromium 153 covers 320/360/390/768/1280. All three pass on deployed HTTPS TEST. WebKit's external Cloudflare RUM CORS error is reported separately from application/scanner errors.
15. **Offline:** production-build cold browser restart passes in Chrome/Firefox/WebKit after online install/OCR and physically stopping the local HTTP server. Chrome HTTP cache also cleared. Cached English data deletion produces initialization failure. Windows WebKit offline-emulation caused an internal navigation error; the stopped-server check without that emulator passes. These are actual desktop-browser tests, not phone-installed-PWA tests.
16. **Limitations:** physical Chrome/Firefox Android, Samsung Internet and iPhone Safari tests were not performed; no device/actual card photos were supplied. Generated fixtures verify integration, not physical-photo accuracy. Helscape Infection Transfusion and Benediction of Induction exist in catalog and still need real-photo testing. Native picker providers, EXIF edge cases, large photos/low-memory devices need device checks. WebKit automation is not iPhone certification. Image diagnostic attachments/export remain unimplemented, explicitly imageExportImplemented=false even with inclusion requested; no diagnostic photos stored. Existing large catalog bundle warning remains.
17. **TEST:** workshop-test rebuilt/recreated/health-checked through local DEV task script; image 4fb3923ab073bb21bc2248783d452fca55cb89a43d89f61252da478f34c03d1a. Deployed public UI/OCR verified in all three desktop engines.
18. **PROD:** production container ID/image ID/start time exactly matched pre-deploy snapshot. No main merge, production deploy/release, version tag or Git push. Changes remain local working-tree changes on scanner-implementation.

## Visual review

Canonical button/dialog/spinner styles reused; native selects now specify dark color-scheme in shared controls.css to correct observed WebKit white-surface/cream-text contrast, retaining native keyboard/picker behavior. Final deployed select and synthetic Helscape Infection Transfusion recognition checks pass in Chrome/Firefox/WebKit. desktop/mobile entry, loading, processing, success, ambiguity, invalid-image and selected-file screenshots inspected. Long names wrap, focus and no-overflow checks pass.

Visual comparison reports desktop-error-state.png, mobile-error-state.png, mobile-shopping.png. The same three differences were documented before this work in OCR_SERVICE_FOUNDATION.md: restored Scan Diagnostics panel versus old Settings baselines and Add List hover color. Current Settings text also reflects real OCR. No reviewed baseline was replaced.

## Changed files

- docs/OCR_TESSERACT_IMPLEMENTATION.md
- docs/UI_DESIGN_STANDARDS.md
- index.html
- package-lock.json
- package.json
- public/app-icon-192.png
- public/app-icon-512.png
- src/features/scanner/ScanPrintsView.css
- src/features/scanner/ScanPrintsView.tsx
- src/features/settings/ScannerSettingsView.tsx
- src/styles/controls.css
- src/main.tsx
- src/services/ocr/OcrService.ts
- src/services/ocr/OcrTypes.ts
- src/services/ocr/TesseractOcrProvider.test.ts
- src/services/ocr/TesseractOcrProvider.ts
- src/services/scanner/BlueprintMatcher.test.ts
- src/services/scanner/BlueprintMatcher.ts
- src/services/scanner/Diagnostics.test.ts
- src/services/scanner/Diagnostics.ts
- src/services/scanner/ImageRegion.ts
- src/services/scanner/ScannerRuntime.ts
- src/services/scanner/StaticImageInput.test.ts
- src/services/scanner/StaticImageInput.ts
- tools/ocr-assets.ts
- tools/ui-choose-image-check.py
- tools/ui-ocr-foundation-check.py
- tools/ui-ocr-offline-check.py
- tools/ui-tesseract-check.py
- tools/ui-tesseract-region-check.py
- vite.config.ts

## Reproduction and phone follow-up

Run npm test, npm run lint, npm run build. Start Vite on a free localhost port and set SCANNER_TEST_URL for the scripts.

- tools/ui-tesseract-check.py: real workflow; SCANNER_BROWSER=chrome/firefox/webkit.
- tools/ui-tesseract-region-check.py: real target tests on local dev.
- tools/ui-ocr-foundation-check.py: controlled init/retry/remount/settings backups on local dev.
- tools/ui-ocr-offline-check.py: serves dist on its own temporary port, stops that server and verifies cold offline restart; SCANNER_BROWSER selects engine.
- tools/ui-functional-check.py and tools/ui-visual-check.py use standard dev port 5186.

Phone TEST: select an active collection, enable Scan Diagnostics, open Scan Prints, Choose Image, dismiss FILE SELECTED, Scan Image, export diagnostics. Test actual photographs of both troublesome names and repeated/different selections.

Installed-phone offline: finish online install/cache/recognition, close app, disable network, reopen, select local photo, scan. Record browser/device and acquisition, decode, initialization, recognition, candidate/catalog/matching stages separately. Do not infer phone offline support from desktop results.

Upstream: [local assets](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md), [worker API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [data licence](https://github.com/naptha/tessdata/blob/gh-pages/LICENSE). Runtime selection/failure behavior checked against installed pinned source.
