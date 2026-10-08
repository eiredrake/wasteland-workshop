# Blueprint Share Print — Issue #14

Open any blueprint in Blueprint Catalog or a collection and select **Share Print** beside its name. Preview the actual generated PNG, then choose Share, Copy Image, or Save Image. Close or Escape dismisses the preview. These actions do not update collection membership, economics settings, builds, shopping lists, or warehouse inventory.

## Implementation

`BlueprintShareCard.ts` extracts the displayed first crafting recipe and its first final product, matching Blueprint Details. Applicable fields: title, Crafting Skill, Components and quantities, Mind Cost, Crafting Time, Production Cost, Uses, Expiration, Requirements to Use, Item Mechanics, Special Notes. Empty/N/A metadata is omitted; meaningful numeric zero is preserved. Alternative and generic ingredient requirements remain unchanged. Production cost calls the existing `calculateBlueprintCost` service with the current calculator, including effective user overrides. Unknown component pricing remains explicitly unknown, with an explanation. No warehouse or build expenses are included.

`sharing/ShareCard.ts` is a reusable native Canvas renderer: 900px width, measured text wrapping, variable height, solid dark background, rust and gold headings, readable system Arial font. Paragraph breaks and long words are handled without truncating content. It is independent of page layout, viewport, and application theme. No dependencies or backend services were added. Cards exceeding 16,000px height fail with a useful explanation rather than silently clipping; this conservative bound avoids common mobile canvas allocation limits.

`components/SharePreview` contains the reusable modal and its CSS. The image area scrolls independently; buttons wrap on small screens and have at least 44px height. Close remains available during generation. Pending generation is discarded on unmount, and preview object URLs are released. The PNG is generated before the final action, allowing native share and clipboard calls to run directly in a button interaction.

`sharing/ImageActions.ts` checks file-specific native sharing, copies PNG via ClipboardItem, and downloads a sanitized PNG filename through an object URL. Unsupported native sharing/clipboard controls are disabled with explanatory text and Save Image remains available. Share cancellation is ordinary feedback. Copy success is shown after the clipboard promise resolves. Saving reports only that the download started; a web page cannot confirm the user saved the file. Native share completion does not prove a message reached a recipient.

## Platform constraints

File sharing varies by browser, device and installed target application. Web Share and image clipboard generally require a secure context (HTTPS, or localhost for development), user activation and browser permission. A phone accessing an HTTP LAN development address may therefore offer only Save Image. Use the HTTPS deployment for actual Android testing. The app supplies a real PNG file; Discord/Messenger availability is determined by the OS share sheet.

References: [MDN Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) and [MDN Clipboard.write](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write).

## Validation and review

Automated coverage includes applicable/absent fields, multiline text, zero values, ingredient selectors, effective economics, collection-independent action, lack of mutation callbacks, accessible preview controls, fixed-width long text layout, opaque PNG rendering, encoding failure, native file sharing/cancellation/unsupported support, clipboard promise completion/rejection, download URL cleanup, and filename sanitization. Browser APIs are mocked in unit tests; dialog opening/closing and OS integration still need real browser testing.

Manual browser verification was attempted but the browser-control runtime failed to start with a Windows sandbox helper error. No desktop, physical phone, Discord, Messenger, clipboard paste, or saved-file result is claimed as verified for this change.

Before closing #14, verify on desktop and Android HTTPS:

1. Open catalog and collection details; open and close Share Print, including Escape and closing during generation.
2. Preview a simple blueprint, one with many populated fields, long mechanics and notes, alternative ingredients, and absent optional fields. Verify readable wrapping and scrolling at desktop and phone widths.
3. Copy Image and paste into Discord; confirm clipboard denial gives fallback feedback.
4. Save Image, open the downloaded PNG, and inspect its full content and filename.
5. On Android use Share to Discord/Messenger and also cancel the share sheet; confirm no misleading error.
6. Confirm collection status, build queue, warehouse and settings remain unchanged.

Issue #14 remains open for review and device testing.
