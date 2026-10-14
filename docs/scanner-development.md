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
