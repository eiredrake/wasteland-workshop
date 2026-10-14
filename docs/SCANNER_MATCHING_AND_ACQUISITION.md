# Scanner matching and acquisition

Deployed to workshop-test as TEST v0.0.12 on scanner-implementation. App version stays 0.9.24; production was not deployed.

OCR and catalog names are lowercased, Unicode punctuation is removed, and whitespace is collapsed. Existing word-bounded exact matching takes priority. If there is no exact match, name-sized OCR word spans are compared with a maximum Levenshtein distance of two (insertions, deletions, substitutions). The matcher retains all candidates within that limit. Canonical catalog IDs/names are preserved. Duplicate normalized names remain distinct candidates; repeated occurrences of the same ID are deduplicated.

One, two, or three candidates use the same shared themed PRINT MATCHES modal. The modal reports the count and presents Acquire [print name] buttons. Clicking a candidate marks that blueprint acquired in the active collection using the existing save/status path. Cancel/Escape does not change the collection. No match or more than three candidates opens SELECT PRINT with the canonical SearchablePicker over the full blueprint catalog. Users may type an exact name or select a filtered option. Acquire is disabled until a canonical catalog entry is selected; editing/clearing the field invalidates the old selection. Cancel/Escape never acquires. Successful acquisition or cancellation of either result modal clears the previous image and returns focus to Choose Image, ready for the next print. Saving failure keeps the candidate available for retry; repeat acquisition does not duplicate collection entries.

Diagnostics include raw OCR, normalized candidates, match mode, minimum edit distance, matched IDs, and explicit acquisition outcomes. The OCR engine, image loading, native picker and target geometry are unchanged by this matching/acquisition update.

Updated files: BlueprintMatcher.ts/tests, Diagnostics.ts, ScanPrintsView.tsx/CSS, App.tsx, scanner-development.md, ui-unified-scanner-check.py, and new ui-scanner-acquisition-check.py. The existing TEST deployment counter advanced normally.

Validation: 578 unit tests passed; lint and TypeScript/production build passed. Regression cases cover the user's Weldet/Welder, Toothpia/Toothpiq, Toothpig/Toothpiq, Where-Door/Whore-Door, and mixed quotation-mark examples against the actual catalog. Tests cover exact priority, punctuation normalization, one/two-edit matching, rejection beyond the limit, duplicate/ambiguous names and candidate counts. Deployed Chrome/Firefox/Windows WebKit workflows passed at 390 and 1280 pixels, including an approximate OCR fixture and persisted acquisition. Dedicated Chrome checks at 320 and 1280 pixels passed for one/two/three candidates, more-than-three ambiguity, cancellation, idempotency, and a simulated storage failure followed by successful retry. Mobile modal screenshots were inspected. Physical-device retesting remains with the user.

Scanner changes are checked in on scanner-implementation. No production release or merge was performed.

Manual fallback validation: dedicated real-OCR browser checks cover no match, more than three matches, typed and list selection, disabled unknown names, Cancel/Escape, storage failure/retry, persistence, and reset after acquisition or cancellation at 320/360/390/768/1280 widths. The matching tolerance and OCR pipeline are unchanged.

TEST v0.0.12 adds ManualPrintDialog using the canonical SearchablePicker and dialog/button foundations. Unknown free text cannot acquire an invented print. The manual dialog prevents pointer-down blur from collapsing the list and moving its action buttons before click. Both modal paths retain normal collection persistence and reset to the acquisition screen on Cancel or successful Acquire. Save failures retain the current selection. Unit checks (582), lint, and production build passed; Chrome and Firefox full file/camera regressions passed at 390/1280. Dedicated manual workflows passed at all five required widths; desktop and mobile screenshots were inspected.


### Existing collection ownership — TEST v0.0.14

ScanPrintsView receives the live active collection from App. Both recognized candidate results and the manual picker check canonical blueprint IDs in that collection. Acquired and Sell entries display "already in the active collection" with the collection name and no Acquire action. Wanted (To Acquire) entries remain acquirable and transition to acquired through the existing persistence path. Another collection's membership does not block the active collection. Mixed results show ownership messages alongside Acquire actions for missing prints. Done dismisses owned-only results and returns to a fresh scanner without writes; Cancel remains available for mixed/unowned results. The acquisition handler independently rejects owned IDs, preserving Sell status.

The active collection name is visible on the scanner and both result dialogs. No collection chooser was added; its value was discussed as a possible follow-up, not requested definitively.

Validation: 582 unit tests, lint and production build passed. Dedicated real-OCR checks passed at 320/360/390/768/1280 for owned single results, mixed results, manually selected owned prints, other-collection scope, wanted acquisition, Sell preservation, save failure/retry and cancellation. Desktop/mobile screenshots inspected. Firefox file/native-photo/static-OCR regression passed at 390/1280.


### Tester handoff — 14 October 2026

The user reported successful testing on Android in Chrome, Firefox, Opera, and the device's default browser, and approved check-in for wider testing. This is user-reported device validation; the default browser's product/version was not supplied. TEST v0.0.14 remains available at https://workshop-test.foundationsrpg.org. Production remains app v0.9.24 and was not deployed by this scanner work. The next TEST deployment counter is v0.0.15.
