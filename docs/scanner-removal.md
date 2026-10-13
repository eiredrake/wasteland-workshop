# Scanner subsystem removal — final production-facing cleanup

The revised instruction supersedes the original requirement to preserve a placeholder and diagnostics UI. All blueprint scanner/photo-analysis implementation, OCR dependencies/assets, result dialogs, crop UI, scanner navigation, rebuilding placeholder and Scan Diagnostics setting code are removed. There is no new scanner menu item. QR app sharing remains an unrelated feature.

The original deletion inventory follows for audit purposes only; the scanner is not an active feature. Additionally deleted: ScanAcquirePlaceholder and its test; ScannerSettings module/view and their tests; ui-scanner-placeholder-check.py. App imports and Collections state/controls were cleaned up.

Existing collections, acquired blueprints, manual catalog acquisition and backup schema/readers/writers are preserved. No saved user data is deleted, including dormant legacy preferences. The test-server banner remains independent of scanner functionality. No deployment or production container changes occurred. Replacement work requires a subsequent TEST work order.

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

Final cleanup validation: 460 tests pass; lint and TypeScript/Vite build pass. Desktop/mobile browser regressions confirm no scanner menu/Collections control or diagnostics setting, saved acquisitions/manual acquisition preserved, and ordinary queue/timer/history/settings/export/restore/shopping/warehouse workflows passing.
