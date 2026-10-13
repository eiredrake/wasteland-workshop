# Scanner development policy

All scanner changes are committed to `scanner-implementation`. Do not merge scanner work into `main`, create production releases or deploy production containers.

`Tentacles: Deploy DEV` invokes `scripts/deploy-test.ps1` and uses `docker-compose.test.yml`: project/service/container `workshop-test`, image `workshop-test:latest`, URL https://workshop-test.foundationsrpg.org. The existing proxy must route that hostname to `workshop-test:80` on `proxy-tier`.

Build DEV and Deploy DEV verify the active branch and reject `main`, other branches and detached HEAD. Deployment rechecks immediately before the image build and container update. The TEST VERSION bar detects the test hostname at runtime.

Production scripts/containers are not invoked by this workflow. Mock deployment tests verify branch rejection before Docker access, exact test target, preview behavior, ownership and failure guards.

## Phase 1 — Choose Image

Centered primary orange/cream Choose Image opens a standard single-file HTML input. JPG/JPEG, PNG, WebP and WebM accept values are native-picker hints only. No capture restriction is set; available sources are chosen by the browser/OS. Any returned File counts as success regardless of name, MIME or contents. The app reads only its filename, immediately resets the input, and stores only the result message in component state until OK/Escape. No decoding, inspection, preview, processing, OCR, upload or file persistence occurs.

Success/failure use the shared ConfirmationDialog with green/red tone and one OK action. Empty selection/cancellation does nothing. Only actual thrown picker/selection exceptions produce failures, using their original message. Browsers do not reliably expose OS-picker errors to page scripts; no inferred or fabricated failure is displayed when no error is supplied.

`tools/ui-choose-image-check.py` covers returned Files for each advertised format and unknown/invalid contents, same-file repeat, cancellation, injected native-picker exception, long filenames, focused OK/Escape, orange/cream button and mobile/desktop geometry. Decoding/reading/worker construction are trapped and storage is compared. 461 unit tests, lint, branch-checked TypeScript/production build and ordinary app workflows pass. Physical Android Files/Photos/Camera picker behavior is the required next user verification; no preview/OCR should be added before approval.
