# Share Wasteland Workshop

Help → Share Wasteland Workshop opens a themed native dialog. Existing Help entries remain. The locally generated black-on-white SVG QR has a four-module quiet zone, readable website link, Copy Link and Close. Native Share appears only where supported. Canonical URL: https://workshop.foundationsrpg.org/ including trailing slash.

## Files and library

- src/components/AppShare/AppShare.tsx and AppShare.css: responsive accessible dialog, clipboard fallback, feedback, initial Close focus and Escape.
- src/sharing/AppSharing.ts and AppSharing.test.ts: canonical URL, clipboard and native-share helpers, six new unit tests.
- src/App.tsx: Help entry, dialog state and return focus to menu.
- package.json/package-lock.json contain pinned qrcode.react 4.2.0. It is eagerly bundled with the app, requiring no external service or deferred asset downloads. Reference: https://github.com/zpao/qrcode.react
- tools/ui-app-share-check.py and tests/visual/baselines/app-share-{1280,390}.png: workflow/decoding checks and two individually inspected dialog baselines.
- docs/UI_DESIGN_STANDARDS.md: canonical sharing pattern.

No backend, accounts, image uploads or analytics. Native share sends the title Wasteland Workshop, text Wasteland Workshop — a free crafting companion., and the canonical URL. Cancellation is silent; failures offer Copy Link. Clipboard success is announced only after it succeeds; failure shows a selectable read-only URL.

## Verification

435 unit tests pass, including six new sharing tests. Lint and TypeScript/production build pass. Existing functional workflows, 34 theme comparisons and eight guided-tour comparisons pass.

Sharing checks cover 1280×900, 768×1024, 390×844, 360×800, 320×700 and 844×390. Independent zxing-cpp decoding confirms the exact URL at all sizes. Tests cover offline opening/reopening, successful copying, clipboard rejection/manual selection, supported/unsupported sharing, exact payload, cancellation/error, Close/Escape, keyboard focus and no horizontal overflow. Native sharing and clipboard actions are mocked for deterministic browser checks.

Run python tools/ui-app-share-check.py against development port 5186. Python Playwright, Pillow and zxing-cpp are test-only prerequisites. APP_SHARE_TEST_URL selects a production preview. The script compares against reviewed baselines and never updates them. A bounded allowance (20 pixels, channel difference at most 25) handles Chromium border antialiasing; observed production difference was 13 pixels on the dialog top edge.

## Offline boundary and device signoff

Disconnecting after the application loads does not prevent opening/reopening the dialog. The application currently has no service worker/offline installation cache: fresh offline launch or reload is not guaranteed. When adding PWA support, precache the app shell and main JS/CSS; this feature needs no additional remote asset. Recipients need connectivity unless the app is already available offline on their device.

Actual iPhone/Android camera scanning and OS share sheets remain unverified. Before release, show this QR at ordinary brightness and scan with a second physical phone on both platforms; verify exact destination, copy/paste, native sharing/cancellation, offline display while the app is open, safe-area layout and Close. Software decoding/mobile-width browser checks do not replace physical verification.

No release tagged or published.
