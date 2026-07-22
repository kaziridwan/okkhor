# Claude Code Handoff Plan

## Snapshot

Okkhor is at v5: the single-file converter handles .docx/.rtf/.odt/.html/.txt
via the bundled engine, and .doc via a from-scratch binary parser that
preserves formatting, images (raster + vector), and real tables. Build is
reproducible (`npm run build` recreates `dist/index.html` byte-for-byte),
`npm test` is green (28 assertions), and `dist/` is a ready GitHub Pages
site. Everything is validated on synthetic LibreOffice-generated fixtures;
no real-world legacy file has been through it yet.

## Immediate next tasks

0. **Publish the repo (first run, if not already on GitHub).** `git init &&
   git add -A && git commit -m "Okkhor v5 — handoff"`, then
   `gh repo create okkhor --private --source . --push` (confirm repo name and
   visibility with Kazi first). Skip if the repo already exists.
1. **Publish and validate on real files.** Push `dist/` (or the whole repo
   with Pages serving `/dist` — or copy dist contents to root) to GitHub
   Pages. Then run real 1990s–2000s Bijoy documents through it. Done =
   a handful of genuine files convert with correct output, and every
   leftover-glyph chip or visual defect is triaged into issues/fixtures.
   Expect: glyph-map holes (scanner will show them), fast-saved files with
   scattered pieces, Word 6/95 files, other Bijoy-family fonts to add to
   detection.
2. **Merged table cells.** TC80 `rgf` flags carry horizontal-merge
   (fMerged/fFirstMerged) and vertical-merge (fVertMerge/fVertRestart) bits;
   emit `w:gridSpan` / `w:vMerge` accordingly. Done = a fixture with both
   merge directions round-trips visually through the LibreOffice→PDF→pixel
   check (see wiki/testing.md for the method). Parse TC80s fully in
   `parseTDefTable` (they're already located) and thread per-cell info
   through the row def.
3. **Headers/footers.** PlcfHdd (FIB 0x00F2) partitions a CP range *after*
   the main document text into header/footer stories. Extract at least the
   primary header/footer, convert, and emit `word/header1.xml` /
   `word/footer1.xml` + rels. Done = fixture with Bijoy header text converts.
4. **Configurable replacement font.** UI dropdown (Nikosh / Kalpurush /
   Noto Sans Bengali) threaded into both paths: the engine's docx path
   (check `convertDocx` options for a font parameter; if absent,
   post-process the rFonts swap) and `doc-convert.js` `rPrXml`.

Nice-to-haves after those: footnotes/endnotes, per-cell border fidelity,
`wp:anchor` positioning for floating images (D-007), nested tables (itap>1).

## Context the next agent needs

- **Read `../wiki/doc-binary-format.md` before touching the extractor** —
  five documented format traps, each of which cost real debugging time.
- `src/engine.js` is generated-but-committed; never hand-edit (changes will
  be lost on `scripts/rebuild-engine.sh`). App-side logic belongs in
  `doc-convert.js` / `template.html`.
- The fixture-first workflow (wiki/testing.md) is the project's core
  discipline: hex-verify against a LibreOffice-generated file before
  implementing any new structure.
- `template.html` app logic references `DocConvert.convertDoc` stats fields
  (`converted`, `runs`, `images`, `tables`, `fontAware`); extend that object
  rather than renaming fields, and keep UI copy honest about limitations.
- Not-yet-handled marks in the text stream: 0x28 (symbol), footnote/annotation
  reference chars — currently dropped silently by the assemble loop's
  control-char filter.
- Dev-time tools used for ground truth (LibreOffice, olefile, pdftoppm) are
  NOT project dependencies; the committed suite needs only Node + jszip.

## Definition of done (current milestone)

The app is live on GitHub Pages; at least several real legacy .doc/.docx
files convert correctly end-to-end (or their failures are captured as
fixtures + issues); merged cells render correctly; the wiki reflects
everything learned from real files.

## Pointers

- Project map: `../outline.md`
- Wiki: `../wiki/index.md` (architecture · bijoy-conversion ·
  doc-binary-format · testing · decisions)
- Agent instructions: root `CLAUDE.md`
