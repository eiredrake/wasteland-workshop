# Android image-loading investigation

## Confirmed findings

The work-order evidence reports FILE_SELECTED followed by IMAGE_DECODE_RESULT failure before preview or OCR. Metadata receipt does not establish content access. The browser exception name and failing API were not retained, so the Android failing operation and root cause remain unestablished.

ImagePicker receives input.files[0], calls onSelected synchronously, then clears input.value in finally. It also clears the value before opening the picker to support reselection. It never resolves an Android URI or filesystem path. The File is passed directly into ScanPrintsView.acquire and prepareStaticImage. It is not copied into new bytes. The asynchronous function retains it, and on success PreparedImage containing the original File and normalized PNG Blob is stored in React state.

The actual sequence is:
1. file.slice(0,4).arrayBuffer reads only a four-byte video-signature header.
2. MIME/video-signature validation rejects known video inputs.
3. URL.createObjectURL(file) creates a source reference and HTMLImageElement.src receives it.
4. HTMLImageElement.decode runs. On rejection, createImageBitmap(file,{imageOrientation:'from-image'}) is attempted when available. Previously the second exception replaced the first.
5. Decoded dimensions are validated.
6. A full-resolution canvas draws the decoded source, normalizing native orientation.
7. canvas.toBlob(image/png) prepares the shared review/OCR image.
8. Source URL is revoked in finally, after both decoder attempts and normalization have settled. Bitmap/canvas resources are released.
9. StaticImageReview creates a distinct URL for the normalized Blob. Native image load marks preview ready; effect cleanup removes src and revokes only that URL.

The original file is accessed by the header read and decoder(s). There is no explicit full-file byte read, FileReader, filesystem access, or Android storage-permission request. Success of the header read does not prove all bytes are accessible. decode and createImageBitmap combine underlying image loading and decoding; an exception there may not conclusively distinguish provider read failure from malformed data.

## Instrumentation and classification

Each attempted operation emits start/success/failure with operation/API, elapsed time, acquisition/scan ID, file metadata including lastModified, and original exception name/message when an exception is available. Both decoder failures survive independently. Separate codes identify IMAGE_READ_FAILED, IMAGE_DECODE_FAILED, IMAGE_REFERENCE_FAILED, IMAGE_PREVIEW_FAILED, and VIDEO_UNSUPPORTED. Unclassified preparation exceptions retain their original details.

URL events use logical acquisition-specific source/preview resource IDs rather than retaining URLs or bytes. Preview load/error and acquisition abandonment are recorded. Native HTMLImageElement error events do not supply an exception name/message; none is fabricated. The export includes app and TEST versions. Storage remains bounded at 500 records/1 MiB and image content is not included automatically. Export remains available after image failure without OCR.

## Lifecycle and race analysis

Clearing the input does not clear the local JavaScript File variable. This does not prove any Android provider preserves its underlying access. React rerendering does not revoke the source URL. The source URL is held until decoding and normalization finish. Review unmount revokes a separate normalized URL; it cannot revoke the earlier source URL.

Generation and mounted checks prevent a stale completed acquisition from updating the UI. Previously started loads can continue until their own completion, independently of newer selections/navigation. This order was not changed. New acquisition-abandonment and per-resource cleanup records make the sequence visible.

No premature source revocation or confirmed lifecycle race was found by inspection or delayed/overlapping-load tests. Device-specific provider invalidation, browser behavior around input reset, memory pressure, and decoder compatibility remain unverified possibilities.

## Compatibility and provider investigation

Android's document picker can expose content through providers; native URI grants do not establish how this particular browser implements a web File. The app makes no persistent-path assumption. No evidence justifies additional storage permissions.

HTMLImageElement.decode, Blob URLs, and createImageBitmap have documented web APIs; createImageBitmap availability and implementation vary by browser/version. The existing fallback checks availability and retains its orientation option. An EncodingError alone does not identify a permissions fault. No decoder replacement, full-file copying workaround, new storage permission, or scanner rewrite was introduced.

References:
- https://developer.android.com/training/data-storage/shared/documents-files
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode
- https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap

Chrome Android, Firefox Android, Samsung Internet, and iOS Safari require fresh device testing. Desktop Chrome/Firefox and Windows WebKit checks are not substitutes for these browsers on their operating systems.

## Tests and proposed next step

560 unit tests passed, including JPEG/PNG/WebP handling, delayed decoding, independent overlapping acquisitions, header-read rejection, both decoder exceptions preserved in exported diagnostics, URL cleanup, and preview encoding rejection. Lint and TypeScript/production build passed. Browser integration checks cover reselection, different inputs, cancellation, navigation/remount, JPEG/PNG/WebP, preview and OCR workflows, plus JSON export after invalid-image failure. Browser mocks do not reproduce a confirmed Android failure.

The smallest justified change now is diagnostic instrumentation only. After TEST deployment, reproduce a failing photo and screenshot on Android and export diagnostics. Use the new operation/API/exception sequence to choose any correction. Do not change Tesseract, BlueprintMatcher, target geometry, or the separate desktop zoom issue in this investigation.

## Deployment and stop point

Deployed through the local Tentacles: Deploy DEV script to workshop-test as TEST v0.0.2 (app version remains 0.9.24). Container health/version verification passed. Chrome, Firefox, and Windows WebKit unified desktop/mobile-size workflows passed, including diagnostic export after a real invalid-image decode rejection. A separate mobile-size Chrome browser test injected NotReadableError into the header read and verified its original name/message in the exported JSON without OCR. These are desktop-engine and simulated failure checks, not Android hardware reproduction.

Production container ID, image ID, and start time remain unchanged. No production deployment, release, or merge was performed. No new Tesseract, BlueprintMatcher, or targeting-rectangle changes were made for this investigation.

Await a fresh Android export from TEST v0.0.2 or later. Reproduce separately using a photo and screenshot, noting browser and picker source (Files/My Files, Photos, Gallery, or camera return). Do not infer permission, race, provider, or decoder root cause until the new events identify the failure.
