# Unified static image acquisition completion report

Branch: scanner-implementation. TEST: https://workshop-test.foundationsrpg.org.

## 1. Changed files

This work adds CameraAcquisitionView.tsx, StaticImageReview.tsx, ScannerViewport.css, useViewportSize.ts, CameraAcquisition.ts and its tests, ReviewGeometry.ts and its tests, and browser checks ui-unified-scanner-check.py and ui-scanner-orientation-check.py.

It updates ScanPrintsView.tsx/CSS, App.tsx, ImagePicker.tsx, StaticImageInput.ts/tests, OcrTypes.ts, OcrService.ts, TesseractOcrProvider.ts, Diagnostics.ts/tests, theme.css, scanner-development.md, UI_DESIGN_STANDARDS.md, the historical OCR reports, and existing browser-check entry points/offline fixtures.

The working directory also contains the preceding Tesseract implementation's uncommitted changes, including local OCR asset packaging and service-worker support. Those changes are preserved. No commit, push, merge, tag, or production release was made.

## 2. Architecture

Choose Image and Scan Image converge on PreparedImage, then StaticImageReview. Only Confirm Image constructs the shared static OCR request. Acquisition and positioning do not invoke OCR. To Collections uses the shared back control.

## 3. Camera

Video-only acquisition prefers the rear camera and offers camera selection when multiple labeled devices are available. The dotted target is an accessible capture button. Capture freezes a full-resolution still and immediately stops tracks. Close, navigation, unmount, hidden-page suspension, unexpected track termination, and abandoned permission requests release streams. Returning from suspension requires Resume Camera. Errors use themed dialogs.

## 4. Native picker

Choose Image opens the native file picker without guessing camera versus gallery origin. Successful selection proceeds directly to review without a notification; decode failures still display an error. Cancellation preserves the existing review. File extension alone does not determine decode support; video inputs are rejected explicitly.

## 5. Review

Both sources use the same static review viewport, stationary yellow dotted target, drag/pinch positioning, Zoom In, Zoom Out, Reset View, and Confirm Image controls. Keyboard arrows, plus/minus, and Home provide alternatives. Retake and Choose Another return to the appropriate acquisition path. An uncovered target disables confirmation.

## 6. Target mathematics

The viewport transform maps the fixed target back into original normalized image pixels. Bounds are validated before extraction; inward integer rounding excludes pixels outside the visible target. Camera preview framing is projected into the captured still. Native orientation is normalized once, so preview and OCR operate on identical pixels. All eight EXIF orientations passed pixel-comparison checks in three browser engines.

## 7. OCR

The existing shared Tesseract service remains the sole OCR path. Confirmation extracts the selected original-resolution region, then uses the existing provider and worker lifecycle. One worker is reused across sources and navigation. Local assets and controlled failure behavior are preserved.

## 8. Matcher

Exact deterministic matching remains in place. No fuzzy matching, perspective correction, live OCR, or continuous camera recognition was added. Unique, ambiguous, and no-match outcomes passed browser checks.

## 9. Diagnostics

Bounded diagnostics include source type, acquisition identifier, review transform, target coordinates, and extracted dimensions. They do not retain images or live streams. Existing size and entry limits remain enforced.

## 10. Automated validation

540 unit tests in 43 files passed. Lint and production/TypeScript build passed. Unified acquisition/review/OCR checks passed locally and against deployed TEST in Chrome 155, Firefox 155, and WebKit 26.6 at 390 and 1280 pixels. Chromium additionally passed widths 320, 360, and 768. Checks cover pointer/keyboard controls, high-DPI mobile contexts, real Chromium pinch input, camera lifecycle with synthetic video tracks, permission failures, invalid files, orientation, OCR timing, matching, and navigation.

Production-build cold offline restart and missing-model failure checks passed in Chrome and Firefox. The fresh Windows WebKit offline cache-install check timed out with its service worker still installing; WebKit/Safari offline operation is unverified.

Existing mobile workflow, scanner initialization/retry, settings backup/export, menu visibility, and isolated deployment-tool tests passed. Visual comparison retained three previously known differences; baselines were not replaced.

## 11. Manual visual inspection

Inspected generated screenshots for the 320-pixel entry/review screens, 390-pixel camera screen, and 1280-pixel Firefox review. Controls, target contrast, and layout were acceptable with no observed horizontal overflow. These are automated-browser screenshots, not physical-device testing.

## 12. Limitations and naming audit

Physical Android, Samsung, iPhone Safari, and webcam testing remains outstanding. The user's original Android file decode failure has not been reproduced using that device and original file. Synthetic camera tests cannot certify device permissions, hardware, or mobile OS behavior. Windows WebKit has no getUserMedia/captureStream in this test runtime, so its camera checks cover the unsupported-camera error rather than actual capture.

The project naming audit found no forbidden legacy naming. One unused external Docker image alias remains, image ID sha256:af8b2e7afd6e8ab95fb6c2a3d03037531cf7b5d4dcb73b4a35a9e89771cc1b1f. It was left untouched as directed; its exact legacy alias is identified separately in the chat. No container uses that image.

## 13. TEST deployment

Ran the local scripts/deploy-test.ps1 script used by Tentacles: Deploy DEV. The branch guard passed and workshop-test was rebuilt and became healthy. Deployed image: sha256:89716ec5346e976c9873e0e87d3ff840cc1b9b56dcb85ba04e001f23ddda8c93. Post-deployment unified browser checks passed for all three engines at both tested sizes.

## 14. Production untouched

The wasteland-workshop container ID, image ID, and start timestamp matched their pre-deployment values after deployment. Production image remains sha256:299eee25ea344be0a84e7bf0237638e51248d1f52599063033a0ff28a3b40d20. No main-branch merge or production deployment occurred.

## Follow-up: remove selection notification

Removed the successful file-selection dialog and its deferred-error acknowledgement state. Valid files open review directly; decoding errors remain visible immediately. Browser checks now assert that the selection dialog is absent. Lint, production build, and deployed Chrome acquisition/review/OCR checks passed. Updated TEST image: sha256:472299446ba5a7cc1506d26594922875629b412b63fe3eb5b0b953d73452fe15.

## Follow-up: names within surrounding OCR text

User diagnostics showed successful recognition of Item Name Hooch : followed by Item Type Intoxication Brew, rejected because matching required a whole line. Matching now searches for complete catalog names with Unicode word boundaries throughout OCR text, normalizing case and whitespace. It accepts surrounding labels and punctuation without fuzzy spelling guesses. A longer complete name suppresses a shorter name contained within that same occurrence; distinct detected names and duplicate catalog names remain ambiguous. The supplied Hooch output is covered by a regression test. All 555 tests, lint, and build passed. Updated browser fixtures include labels and a second field inside the target. TEST image: sha256:3909f806f9d439cba617567c38c947d3ea2ed71a1b02b1857f68fea1fc7be3a9. Production was not deployed.

## Follow-up: partially covered target

TEST v0.0.4 removes the full-box coverage requirement. Confirm Image accepts any overlap containing complete source pixels, extracts only the intersection with the image, and still rejects an entirely empty target. This permits the name to remain inside the target while part of the box extends into viewport margins. Original pixel mapping and inward rounding remain unchanged; OCR does not receive invented border pixels or pixels outside the target. Five new edge/disjoint regression cases passed; all 565 tests, lint, and build passed. Browser workflow checks cover confirmation after zooming out past full target coverage, plus rejection when the image is entirely outside the target.
