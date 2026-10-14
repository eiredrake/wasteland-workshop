# Scanner development policy

Scanner changes stay on scanner-implementation. Do not merge into main, release production or deploy production containers. Tentacles: Deploy DEV runs scripts/deploy-test.ps1 against workshop-test; production is wasteland-workshop.

## Current architecture

ScanPrintsView provides BackButton To Collections and centered side-by-side Choose Image / Scan Image. Existing active-collection menu visibility is preserved. Choose Image is browser-native file acquisition; Scan Image opens video-only camera acquisition and an accessible stationary targeting-box capture button. Native picker providers are opaque to the app: returned camera photographs are FILE inputs; in-app captures are CAMERA_CAPTURE.

Both sources produce a full-resolution, native-orientation-normalized static PNG through StaticImageInput and reach the same StaticImageReview. The image pans/zooms under a fixed target. Confirm Image freezes validated original-pixel target coordinates and submits through the same OcrService, shared ImageRegion extraction, Tesseract provider, BlueprintMatcher and result dialogs. No stream/video element reaches OCR. No automatic, repeated or continuous recognition.

CameraSession serializes starts and stops active/late streams on cancellation, replacement, navigation, capture or unmount. Hidden pages stop the camera and require explicit Resume Camera. Camera errors are distinct from image/target/recognition/matching errors.

Browser picker acquisition success remains distinct from image decoding and recognition. Invalid static images and video inputs produce image errors; cancellation preserves the previous review. Diagnostic image attachments are still not implemented; event JSON remains bounded and opt-in.

See SCANNER_UNIFIED_ACQUISITION.md for current verification and limitations. OCR_SERVICE_FOUNDATION.md and OCR_TESSERACT_IMPLEMENTATION.md are historical phase reports. Do not interpret their earlier restrictions as the current approved work order.

## Checks

npm test, npm run lint, npm run build.
tools/ui-unified-scanner-check.py tests real file OCR/review/gestures and simulated camera frames where the engine supports them. tools/ui-ocr-offline-check.py checks production-build cold offline restart. Existing UI functional/visual scripts still apply; candidates never replace reviewed baselines automatically.

Physical Android/iPhone camera, permissions, native picker sources and memory behavior still require actual-device testing.

## TEST version numbering

The green TestVersionBanner displays the version compiled into the running app, separately from the production/package version. TEST deployments begin at v0.0.0 and advance the patch by one after each healthy deployment. test-version.json stores the next deployment version. Preview, branch/ownership guards, and failed builds do not advance it. scripts/deploy-test.ps1 passes TEST_VERSION into the Docker build and verifies both app and TEST versions before advancing the counter. Use -TestVersion only when the user explicitly requests a different number; subsequent deployments resume patch increments from that number. Production versioning and deployment remain separate. Keep the counter file with the branch changes so future checkouts preserve the sequence.

## Name matching and acquisition

Normalize OCR and catalog names by lowercasing, stripping Unicode punctuation, and collapsing whitespace. Prefer normalized exact names within word boundaries; if none exists, compare name-sized word spans with Levenshtein distance at most two (substitutions/insertions/deletions). All candidates within the two-edit limit are retained, not just the first. Return canonical IDs/names. One to three candidates use the same themed PRINT MATCHES dialog, reporting the count and providing an Acquire [canonical name] button for each candidate. More than three returns ambiguity and requests a narrower target. Cancellation does not acquire anything. Collection updates use the existing persistence/status path and remain idempotent; saving failure retains the result for retry. Diagnostics retain raw OCR text plus normalized candidates, match mode, minimum edit distance, matching IDs, and explicit acquisition outcomes. A low confidence score is not an automatic rejection threshold.

## Exact OCR input diagnostics

When diagnostics and Retain exact OCR input image are enabled, the Tesseract provider hands the exact extracted Blob to the diagnostic recorder immediately before passing the same object to worker.recognize. No second extraction, processing, resize, or OCR setting change is introduced. Only the latest crop is retained, bounded to 8 MiB; a new scan, Clear Scan Diagnostics, diagnostics-off, or image-retention-off releases it. Oversized crops produce a skipped event. Scan Diagnostics shows scan ID, source coordinates, original dimensions, a responsive preview, and Save OCR Input PNG. The PNG preserves the exact input pixels and can be attached alongside the JSON. Copied/downloaded JSON remains event-only and does not embed private image content. Diagnostic capture errors do not affect recognition.

Exact-input diagnostics deployed to TEST v0.0.11. All 582 unit tests, lint, and build passed. Chrome, Firefox, and Windows WebKit checks at 390 and 1280 pixels saved the OCR-input PNG and compared every pixel to the corresponding source-image rectangle; all comparisons passed. Provider regression tests assert object identity with the Blob passed to recognize and isolation of diagnostic failures. Retention/off/clear/size-limit tests passed. Production image/start time unchanged. The user should repeat the Alert System failure and share the exact crop plus correlated JSON; no OCR tuning or crop-mapping correction was introduced by this diagnostic change.


### Native camera photo handoff — TEST v0.0.13

Scan Image now requests a rear-camera still using the shared ImagePicker (accept=image/*, capture=environment). The returned File follows the same prepareStaticImage path as Choose Image, including full-file read and orientation normalization, then static review and explicit Confirm Image. No live video stream is opened. Cancel causes no scan or acquisition; cancelling Retake preserves the existing image. Native camera autofocus and capture controls belong to the OS; hardware behavior is not covered by desktop automation. Choose Image keeps its successful unrestricted route. Existing matching, manual fallback, Cancel/Acquire and scanner-reset behavior are unchanged.

Browser regression coverage simulates native photo returns, same-name recapture, EXIF rotation, initial capture cancellation and retake cancellation; it verifies no OCR before Confirm Image, source diagnostics and no getUserMedia calls.

Validation for native capture: 582 unit tests passed; lint and production build passed. Chrome and Firefox local regressions passed at 390/1280. TEST v0.0.13 deployed through scripts/deploy-test.ps1. Physical mobile camera launch and autofocus remain unverified; no phone was available. Production image/container was not deployed.


### Collection card navigation — TEST v0.0.15

Clicking/tapping the active collection card opens Workshop with that collection's blueprints. Another collection opens the shared Switch Active Collection confirmation; Switch and Open Workshop uses the existing active-collection setter and then navigates to Workshop. Cancel/Escape leaves collection and navigation unchanged and restores focus to the collection button. Cards expose native buttons with keyboard Enter/Space support and a stretched card target. Export, Delete and Set Active remain independent actions.

Active collection persistence now completes before UI state changes. A save failure shows an error and keeps the old collection and Collections screen. Shared ConfirmationDialog supports an optional primary confirmation variant so switching is not styled as destructive.

Validation: 582 tests passed; lint and build passed. tools/ui-collection-open-check.py passed at 320/360/390/768/1280, covering active-card opening, switch/cancel/Escape, keyboard interaction, persisted selection after reload, export/delete/Set Active isolation, and storage failure. Mobile prompt and desktop cards inspected. General visual suite reported three differences (desktop/mobile Settings error-state screenshots include the previously added scanner diagnostics section; mobile Shopping Add List hover shade differs). These scenes do not use the changed collection controls or confirmation variant. Baselines were not updated; remaining comparisons passed.
