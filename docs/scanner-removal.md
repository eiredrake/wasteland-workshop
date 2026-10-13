# Scanner subsystem removal — 2026-10-13

The former scanner, photo analysis, OCR, crop UI, result dialogs, diagnostic display and scanner offline cache code are removed on development. Scan & Acquire remains a themed rebuilding placeholder. OCR/photo selection are unavailable. Replacement development requires a separate work order.

## Inventory reviewed before deletion

CameraPreview owned preview/focus/framing; PhotoAdjuster owned rejected crop gestures; PrintClaimDialog owned OCR acquisition; LoadingIndicator had no consumers outside the scanner. The scanner directory owned camera/file handlers, decoding/preprocessing, OCR workers/lifecycle, recognition, matching, state/errors and cache code. Exclusive tests, scripts, fixture photos, screenshots, models and documentation are removed. Useful history remains in Git.

## Deleted files

- `docs/mobile-blueprint-scanner.md`
- `docs/scanner-photo-import.md`
- `docs/scanner-screens/mobile-camera.png`
- `docs/scanner-screens/mobile-result.png`
- `docs/scanner-screens/mobile-scanner-ambiguous.png`
- `docs/scanner-screens/mobile-scanner-camera.png`
- `docs/scanner-screens/mobile-scanner-result.png`
- `docs/scanner-screens/mobile-scanner-summary.png`
- `docs/scanner-screens/name-focused-results.json`
- `docs/scanner-screens/sample-results.json`
- `public/ocr-paddle/ONNX-LICENSE.txt`
- `public/ocr-paddle/OPENCV-LICENSE.txt`
- `public/ocr-paddle/PADDLEOCR-LICENSE.txt`
- `public/ocr-paddle/PP-OCRv5_mobile_det.tar`
- `public/ocr-paddle/PP-OCRv5_mobile_rec.tar`
- `public/ocr-paddle/manifest.json`
- `public/scanner/aiming-example.jpg`
- `src/components/CameraPreview/CameraGeometry.test.ts`
- `src/components/CameraPreview/CameraGeometry.ts`
- `src/components/CameraPreview/CameraPreview.css`
- `src/components/CameraPreview/CameraPreview.tsx`
- `src/components/LoadingIndicator/LoadingIndicator.css`
- `src/components/LoadingIndicator/LoadingIndicator.tsx`
- `src/components/PhotoAdjuster/PhotoAdjuster.css`
- `src/components/PhotoAdjuster/PhotoAdjuster.tsx`
- `src/components/PrintClaimDialog/PrintClaimDialog.css`
- `src/components/PrintClaimDialog/PrintClaimDialog.tsx`
- `src/features/scanner/BlueprintScanner.css`
- `src/features/scanner/BlueprintScanner.tsx`
- `src/features/scanner/PhotoImage.test.ts`
- `src/features/scanner/PhotoImage.ts`
- `src/features/scanner/PhotoImport.tsx`
- `src/features/scanner/ScanAutoCapture.test.ts`
- `src/features/scanner/ScanAutoCapture.ts`
- `src/features/scanner/ScanCapture.test.ts`
- `src/features/scanner/ScanCapture.ts`
- `src/features/scanner/ScanFocus.test.ts`
- `src/features/scanner/ScanFocus.ts`
- `src/features/scanner/ScanMatching.ts`
- `src/features/scanner/ScanNameRows.test.ts`
- `src/features/scanner/ScanNameRows.ts`
- `src/features/scanner/ScanOcr.test.ts`
- `src/features/scanner/ScanOcr.ts`
- `src/features/scanner/ScanQuality.test.ts`
- `src/features/scanner/ScanQuality.ts`
- `src/features/scanner/ScanRecognition.test.ts`
- `src/features/scanner/ScanRecognition.ts`
- `src/features/scanner/ScanSession.ts`
- `src/features/scanner/Scanner.test.ts`
- `src/features/scanner/ScannerOffline.ts`
- `tests/fixtures/scanner/freeiron-dry-pack.jpg`
- `tests/fixtures/scanner/hooch.jpg`
- `tests/visual/baselines/desktop-scanner-camera.png`
- `tests/visual/baselines/desktop-scanner-result.png`
- `tests/visual/baselines/desktop-scanner-summary.png`
- `tests/visual/baselines/mobile-scanner-camera.png`
- `tests/visual/baselines/mobile-scanner-result.png`
- `tests/visual/baselines/mobile-scanner-summary.png`
- `tools/photo-recognition-comparison.py`
- `tools/ui-photo-import-check.py`
- `tools/ui-photo-offline-check.py`
- `tools/ui-photo-recovery-check.py`
- `tools/ui-scan-claim-check.py`
- `tools/ui-scanner-auto-check.py`
- `tools/ui-scanner-check.py`
- `tools/ui-scanner-cleanup-check.py`
- `tools/ui-scanner-diagnostics.py`
- `tools/ui-scanner-production-check.py`
- `tools/ui-scanner-samples.py`

## Dependencies and build

Removed direct dependencies: @paddleocr/paddleocr-js, onnxruntime-web, tesseract.js and development dependency @tesseract.js-data/eng, with exclusive transitive packages. Removed Vite OCR serving/emission and scanner service-worker generation, and the OCR-only nginx mjs rule.

## Preserved shared features and data

BackButton, SearchInput, SearchablePicker, RemoveBadge, ConfirmationDialog, collection membership service, catalog search/manual acquisition, repositories and deployment workflows remain. Collection/acquisition schemas and records are unchanged. Scan Diagnostics keeps its original name, persisted key/value and Settings integration; wording clearly says it is unavailable during rebuilding.

Existing backup schema 4 did not include the separate Scan Diagnostics preference; restore left it untouched. This removal preserves that existing behavior and all backup readers/writers, without a new incompatible schema. No browser data is deleted or migrated by this work.

Previously installed scanner workers/caches can remain on devices that opted in. This build no longer registers or generates them. Later PWA migration must handle legacy registrations separately without clearing user data.

## Deployment restriction

Production is untouched: no release, deployment, asset replacement or production container changes. Existing Deploy DEV targets workshop-test / workshop-test.foundationsrpg.org; work order names workbench-test / workbench-test.foundationsrpg.org. Staging deployment awaits reconciliation; no production substitute.

## Validation

Placeholder regression checks navigation, absence of camera/photo/OCR activity, retained diagnostics persistence and manual acquisition. Existing suites cover catalog/details, collections, queue/timer/history, shopping/warehouse, settings and backup compatibility. Results are recorded in the completion report.

## Validation results

- 458 tests passed across 36 files; full release/DEV deployment tooling tests passed with disposable Git repositories and mocked Docker commands.
- ESLint and TypeScript/Vite production build passed. No OCR externalization warnings or OCR-generated assets remain. The ordinary catalog remains bundled.
- New placeholder browser check passed at 320/360/390/768/1280px, including zero camera/worker/OCR activity, preserved records, manual acquisition and diagnostics persistence.
- Existing mobile workflow checks passed: catalog/details, queue, timer/persistence, history, Settings, export/restore, shopping/warehouse.
- Queue mode checks passed desktop/mobile.
- Generic visual regression reports the previously known mobile-error-state.png mismatch (minor Settings layout difference). Baseline was not changed or failure suppressed.

- Desktop/mobile guided-tour checks passed, including first-run onboarding, real manual acquisition/Build, navigation, completion/replay, keyboard Escape and touch targets.
