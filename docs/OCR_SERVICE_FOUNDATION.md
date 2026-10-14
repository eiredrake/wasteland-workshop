# Mock OCR service foundation

Historical phase report. Current behavior is documented in SCANNER_UNIFIED_ACQUISITION.md and scanner-development.md.
`src/services/ocr/OcrTypes.ts` defines async provider initialize/scanImage/dispose, identity/version/state, structured outcomes/errors and static image requests. Image source is an encoded Blob (including File) or RGBA buffer. FILE and CAMERA_CAPTURE both use original-image pixel width/height and x/y/width/height target coordinates, never screen pixels. Finite positive dimensions and in-bounds positive targets are validated; extraction/decoding are not implemented.

OcrService owns one provider, one shared initialization Promise and typed timestamped lifecycle events: OCR_LOAD_STARTED, OCR_LOAD_SUCCEEDED, OCR_LOAD_FAILED. Successful initialization stays reusable; failed initialization permits retry. Subscribers unsubscribe; state remains directly readable for late mounts. Replacement/disposal wait for initialization/in-flight scans and dispose old resources. ScannerRuntime configures only MockOcrProvider; initialize is called on Scan Prints entry, never app startup. The default mock resolves on the next async turn; tests inject controlled preparation/failure. No fake text, progress percentage or identification is returned. scanImage yields OCR_NOT_IMPLEMENTED.

BlueprintMatcher uses the existing masterBlueprints data through an injectable async catalog accessor, without a database copy. Normalize names by surrounding trim + toLowerCase only. Preserve internal whitespace, punctuation, accents and spelling. One exact normalized name returns its real ID/canonical name; none is NO_MATCH; duplicates are AMBIGUOUS_MATCH; accessor errors are CATALOG_UNAVAILABLE. No fuzzy/substring matching or automatic acquisition; the matcher is not connected to file-selection UI or mock results.

DiagnosticRecorder records only enabled actual lifecycle/scan/matching/acquisition values in memory: schema, time, session/scan IDs, provider/version, stage, state/result, duration/errors, dimensions/target and optional recognized text. No image/File payload enters the explicit log whitelist. Limits are 500 records and 1,048,576 serialized character units (roughly up to twice that many JS string bytes); oldest records are evicted and over-limit single events are omitted; an actual droppedRecordCount is included in the export. Clear and JSON export are available in Scan Prints only when enabled. Disabling diagnostics clears records. Ordinary errors still appear when logging is off. No remote logging or diagnostic persistence.

Scan Diagnostics defaults Off; the restored original local-storage key also stores an explicit includeImages flag (Off by default), visible when diagnostics is On. Image attachments are a model only; no images are retained/exported even with opt-in in this phase. Future opt-in ZIP: diagnostics.json plus attachment manifest entries pointing to images/{id}, roles original/camera-capture/target/ocr-input, MIME/dimensions and scan ID. Add explicit retention limits and lifecycle cleanup before implementing; never embed base64 payloads in ordinary event JSON.

Backup schema 4 accepts an optional scanner settings object. New exports include both toggles; older absent settings restore to Off. New settings participate in the existing transactional replacement/rollback; older restore journals preserve a missing scanner preference. No unrelated domain is changed.

UI uses shared LoadingDialog indeterminate spinner and ConfirmationDialog failure Retry, with current service state for completed/failed loads. Returning after READY does not reload or show the modal. Choose Image's green FILE SELECTED acquisition result is unchanged and never claims PRINT IDENTIFIED. Live camera/decoding/preview/cropping/OCR remain unimplemented.

TEST is workshop-test at https://workshop-test.foundationsrpg.org, per corrected deployment configuration. Branch scanner-implementation only. No production release, merge or container modification is authorized.

## Validation

495 unit tests pass, including mock initialization concurrency/retry/events/unsubscribe, static target contract, exact catalog matching, bounded/no-image diagnostics and old/new settings backups. Lint and TypeScript/production build pass; existing mock deployment-tooling tests pass. Browser coverage validates controlled indeterminate loading, failure/Retry, no repeated initialization on navigation, file-only acquisition, no camera/recognition calls, JSON export/clear, transactional old/new backup restore and mobile/desktop layouts. Ordinary catalog/queue/timer/history/shopping/warehouse/settings/export workflows pass.

Visual regression comparisons currently report desktop-error-state.png and mobile-error-state.png (restored Scan Diagnostics panel changes the Settings screenshot), and mobile-shopping.png (Add List hover colour difference). These are reviewed comparison differences, not hidden failures; no baselines were replaced. Existing large catalog bundle warning remains unrelated to OCR assets.

## Files created or modified

- `docs/OCR_ENGINE_RESEARCH.md`
- `docs/OCR_SERVICE_FOUNDATION.md`
- `docs/UI_DESIGN_STANDARDS.md`
- `src/App.tsx`
- `src/components/LoadingDialog/LoadingDialog.css`
- `src/components/LoadingDialog/LoadingDialog.tsx`
- `src/features/backup/Backup.test.ts`
- `src/features/backup/Backup.ts`
- `src/features/backup/BackupRepository.ts`
- `src/features/backup/UserStorage.ts`
- `src/features/scanner/ScanPrintsView.css`
- `src/features/scanner/ScanPrintsView.tsx`
- `src/features/settings/ScannerSettings.test.ts`
- `src/features/settings/ScannerSettings.ts`
- `src/features/settings/ScannerSettingsView.tsx`
- `src/services/ocr/MockOcrProvider.ts`
- `src/services/ocr/OcrService.test.ts`
- `src/services/ocr/OcrService.ts`
- `src/services/ocr/OcrTypes.ts`
- `src/services/scanner/BlueprintMatcher.test.ts`
- `src/services/scanner/BlueprintMatcher.ts`
- `src/services/scanner/Diagnostics.test.ts`
- `src/services/scanner/Diagnostics.ts`
- `src/services/scanner/ScannerRuntime.ts`
- `tools/ui-ocr-foundation-check.py`

The public TEST site was verified after deployment: mock initialization emits one start/success pair across repeated navigation; file selection still shows FILE SELECTED; diagnostics JSON contains the actual lifecycle and filename events. Production container identity, image and start time were unchanged. No real OCR package or worker/model asset was added.
