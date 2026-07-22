# Testing

## Methodology: LibreOffice as ground truth

There was no real legacy corpus during development, so every .doc feature is
validated against files produced by LibreOffice's Word 97 export filter:

1. Author a minimal `.docx` fixture in Python (zipfile + raw OOXML) with
   exactly the feature under test.
2. `soffice --headless --convert-to doc fixture.docx` → the `.doc` is ground
   truth (both files live in `fixtures/`).
3. Before implementing, **hex-dump the structure** (Python + `olefile`) to
   confirm the spec against reality — this caught all five traps in
   [doc-binary-format.md](doc-binary-format.md).
4. Implement, then assert in `tests/run-tests.cjs`.
5. For visual features, close the loop to pixels: pipeline output →
   `soffice --convert-to pdf` → `pdftoppm` → programmatic pixel assertions
   (v4: diagram colours + PNG gradient present; v5: 4 horizontal + 4 vertical
   border lines = complete 3×3 grid).

Steps 3 and 5 need LibreOffice/poppler and are development-time only; the
committed suite (`npm test`) is pure Node.

## Fixture inventory (`fixtures/`, .docx source + .doc ground truth each)

| fixture | exercises |
|---|---|
| test-bijoy | basic Bijoy runs + English run, font-aware .docx and .doc paths |
| mixed | 44 paragraphs: Bijoy + existing Unicode Bangla (UTF-16 pieces) + English; multi-sector streams; strictness (exactly 2 runs convert) |
| rich2 | bold/italic/underline/sizes, center/right/**both** alignment, mixed fonts within one paragraph, ASCII-only Bijoy run rescued by font tag |
| imgdoc | inline PNG + inline deflate-compressed EMF (diagram.svg → diagram.emf source), PICF sizes |
| floatdoc | floating anchored PNG: delayed blip, spid→pib mapping, SPA rectangle size |
| tabledoc | 3×3 table, distinct column widths (2000/2999/1501), borders, Bijoy + English cells |

`rich.docx`/`rich.doc` (with the invalid `justify` value) intentionally
weren't kept — `rich2` is the corrected fixture.

## What the suite asserts (28 checks)

Text conversion of the hard phrases (reph, conjuncts, prefix pairs); .docx
path (conversion + English preservation + font swap); .doc formatting
(bold/justify/size survive; mixed paragraph converts only its Bijoy run);
strict detection on `mixed`; image extraction (PNG byte-intact, EMF
decompressed to exact size, drawings placed); floating recovery; table
structure (rows/cells/widths/borders + cell conversion).

## Adding a fixture for a new feature

1. Write `fixtures/<name>.docx` generator (keep the Python inline or add it
   to a scratch script; commit both .docx and .doc).
2. Convert with LibreOffice; hex-verify the structure you're about to parse.
3. Add assertions to `tests/run-tests.cjs` — assert *content* (exact widths,
   byte sizes, converted strings), not just presence.
4. Normalise Bangla comparisons (precomposed য়/ড়/ঢ়) — see `norm()` in the
   test file; two v5-era test failures were caused by decomposed literals in
   the test itself, not by the pipeline.

## The other validation channel

`BijoyEngine.scanUnmapped` runs over every converted file's text in the UI
and surfaces surviving suspicious codepoints as chips. When real-world files
arrive, this is the primary instrument for finding glyph-map holes — treat
recurring chips as bug reports.
