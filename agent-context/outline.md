# Okkhor — Outline

## What this is

Okkhor (অক্ষর, "letter/character") converts legacy Bangla ANSI documents to
Unicode, entirely in the browser. Bangladesh has decades of Word documents
typed in Bijoy-encoding fonts (SutonnyMJ etc.) where Bangla is stored as
ASCII/cp1252 codepoints and only *renders* as Bangla through font glyph
mapping. Okkhor turns those into real Unicode Bangla documents — including
the binary `.doc` format, which it parses from scratch — with formatting,
images, and tables preserved. Privacy is a feature: files never leave the tab.

## Goals

- One-file, zero-server converter deployable on GitHub Pages
- Font-aware conversion: only Bijoy-tagged runs convert; mixed English/Bangla
  documents come out clean
- Maximum-fidelity `.doc` support without WASM or heavy dependencies
- Honest UX: every limitation is stated in the UI, and a leftover-glyph
  scanner flags suspect output per file

## Scope

**In scope:** `.docx`, `.doc`, `.rtf`, `.odt`, `.html`, `.txt` input; Bijoy →
Unicode text conversion; `.doc` formatting/images/tables reconstruction; the
paste-box quick converter.

**Out of scope (for now):** reverse conversion (Unicode → Bijoy), other legacy
encodings (e.g. Alpona, Proshika Shabda), OCR of scanned documents, .doc
headers/footers/footnotes, nested tables, password-protected files (detected
and refused with a clear message).

## Current state

v5. All source in `src/`, deployable site in `dist/`, 28-assertion regression
suite green (`npm test`), and `python3 scripts/assemble.py` reproduces
`dist/index.html` byte-for-byte. The version history that got here:

- **v1** — .docx/.rtf/.odt/.html/.txt via the bundled `bijoy2unicode` engine
  (MIT); font-aware run detection; leftover-glyph scan; paste converter; UI.
- **v2** — `.doc` support: hand-written CFB/OLE + FIB + piece-table text
  extractor; heuristic Bijoy detection; text-only rebuilt .docx.
- **v3** — `.doc` formatting: CHPX (bold/italic/underline/size/**font**),
  PAPX (alignment), SttbfFfn font table → detection became font-aware per run.
- **v4** — `.doc` images: inline PICF/OfficeArt pictures, floating shapes via
  the drawing-layer blip chain (anchor → spid → pib → blip, incl. delayed
  blips), deflate-compressed EMF/WMF decompressed via DecompressionStream,
  DIB→BMP wrapping.
- **v5** — `.doc` tables: real `w:tbl` reconstruction with original column
  widths and border detection from sprmTDefTable.

## Key decisions

Full rationale in [wiki/decisions.md](wiki/decisions.md). Headlines:

- Bundle the MIT `bijoy2unicode` engine rather than reimplement ~270 glyph
  mappings from scratch (D-001)
- Single-file app, modules spliced at build time (D-002)
- Hand-written `.doc` parser instead of porting a library or using WASM (D-003)
- LibreOffice-generated fixtures as ground truth, validated down to rendered
  pixels (D-006)

## Open questions

- **Real-world file behaviour** — everything is validated on synthetic
  fixtures. Real 1990s–2000s files (fast saves, Word 6/95, other Bijoy-family
  fonts, complex tables) will surface gaps; the leftover scanner exists to
  find mapping holes. Highest-value next validation step.
- **Replacement font** — output hardcodes Nikosh. Should it be user-selectable
  (Kalpurush, Noto Sans Bengali), or should the output embed a font?
- **Per-run conversion boundary** — Bijoy sequences that straddle a run
  boundary (e.g. a kar at a bold/regular seam) reorder within each run
  independently. Same limitation exists in the upstream docx path. Rare;
  unclear if worth solving (would need cross-run conversion with re-split).

## Next steps

Priority-ordered detail in [plans/claude-code-handoff.md](plans/claude-code-handoff.md):

1. Publish to GitHub Pages and validate against real legacy documents
2. Merged table cells (vMerge/gridSpan from TC80 flags)
3. Headers/footers extraction (PlcfHdd)
4. Configurable replacement font
