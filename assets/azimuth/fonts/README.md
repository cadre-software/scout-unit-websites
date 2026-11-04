# Bundled typefaces

Barlow (400–700), Barlow Condensed (600–700), Inter (400–700), and Source Serif 4
(normal 400/600, italic 400) retain the existing site typography. All supplied
Unicode subsets are included. The browser downloads only the faces it uses.

Retrieved from the Google Fonts CSS API on 2026-09-20 for Chromium with
`display=swap`. Versioned upstream font URLs and SHA-256 hashes are recorded in
`sources.json`; unmodified SIL Open Font License notices accompany each family.
The Google Fonts repository revision for those notices is in the same manifest.

Both shared page heads and the standalone page preview load `fonts.css` through
`assetUrl`. Font filenames retain their upstream content identifiers. Keep the
CSS, font files, licenses, and source manifest together when updating.

Serving these files from the application avoids blocking page parsing on an
external stylesheet in isolated CI, offline use, or restricted networks.
