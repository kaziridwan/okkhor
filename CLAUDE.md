# Okkhor (অক্ষর) — Bijoy → Unicode Bangla Converter

A fully client-side web app that converts legacy Bangla ANSI documents
(SutonnyMJ and other Bijoy-encoding fonts) to modern Unicode Bangla. It is a
single self-contained HTML file: no server, no uploads, no build framework.
Users drop `.docx` / `.doc` / `.rtf` / `.odt` / `.html` / `.txt` files and get
converted downloads; a live paste box converts raw Bijoy text as they type.

## Status

v5, feature-complete for the current milestone and fully tested. The `.doc`
(Word 97–2003 binary) path — written from scratch for this project — preserves
text, character formatting (bold/italic/underline/size/font), paragraph
alignment, images (inline + floating, raster + EMF/WMF vector), and real
table grids with original column widths and borders. Known gaps are listed in
`agent-context/plans/claude-code-handoff.md`. Everything so far is validated
against synthetic fixtures; the next major step is validation on real-world
legacy files.

## Tech stack

- Vanilla JS (ES5-style in `src/doc-*.js` for consistency), single-file HTML app
- JSZip 3.10.1 from cdnjs at runtime (only runtime dependency; dev copy via npm for tests)
- `DecompressionStream` (browser/Node built-in) for deflate-compressed metafiles
- Conversion core: bundled from `bijoy2unicode` v1.0.2 (MIT — see `dist/licenses/`)
- Python 3 for the build splice; Node ≥20 for tests (the suite uses the global File class)
- Google Fonts at runtime: Noto Serif Bengali, Archivo, IBM Plex Mono

## Running it

```bash
npm install                      # dev-only (jszip for tests)
npm run build                    # assemble dist/index.html + node --check each script block
npm test                         # 28-assertion regression suite over fixtures/
open dist/index.html             # the app works from file:// or any static host
```

There is no watch mode; edit `src/`, re-run build. `dist/` is the deployable
GitHub Pages site (includes `.nojekyll` and README).

## Layout

```
src/
  template.html        UI + app logic; /*__ENGINE__*/ placeholder gets the JS modules
  engine.js            GENERATED but committed — bundled bijoy2unicode core (don't hand-edit;
                       regenerate via scripts/rebuild-engine.sh when upgrading upstream)
  doc-extract.js       .doc binary parser: CFB/OLE → FIB → pieces → CHPX/PAPX → fonts/images/tables
  doc-convert.js       .doc pipeline: detection, conversion, docx emission (tables, media, rels)
  scan-fns.js          scan helpers extracted from upstream dist/index.js (used by rebuild script)
scripts/
  assemble.py          splices src → dist/index.html (--check runs node --check per script block)
  rebuild-engine.sh    regenerates src/engine.js from npm (only when upgrading upstream)
tests/
  run-tests.cjs        full regression suite (text, docx path, all .doc features)
fixtures/              .doc files (LibreOffice-generated ground truth) + their .docx sources + images
dist/                  deployable site: index.html, README, license attribution, .nojekyll
agent-context/         project documentation wiki — see below
```

## Conventions

- **The app stays one HTML file.** New JS goes in `src/` modules spliced by
  `assemble.py`; new runtime dependencies only via cdnjs `<script>` tags, and
  only if truly necessary.
- `src/doc-*.js` use IIFEs assigned to `window.*` (`DocExtract`, `DocConvert`)
  and ES5-ish style — they are eval-loaded in tests and inlined in the page.
- Every format-parsing change needs a fixture: generate ground truth with
  LibreOffice (`soffice --headless --convert-to doc x.docx`), add assertions to
  `tests/run-tests.cjs`. See `agent-context/wiki/testing.md` for the method.
- Bangla comparisons in tests: normalise precomposed য়/ড়/ঢ় (the engine emits
  precomposed forms; source literals may be decomposed).
- UI copy is honest about limitations — when a feature has a gap, the card
  message and footer say so.

## Where the context lives

- `agent-context/outline.md` — high-level project map
- `agent-context/wiki/index.md` — full documentation wiki
- `agent-context/plans/claude-code-handoff.md` — current plan and next steps

Read `agent-context/wiki/doc-binary-format.md` before touching
`src/doc-extract.js` — it documents the Word binary structures **and the
five format traps that cost real debugging time** (sprm length quirks,
header offsets, OOXML value names).

## Documentation discipline (MANDATORY)

This project is documented in `agent-context/wiki/`. Keeping it current is part of every task, not an afterthought.

After completing any task, prompt, or session — before you consider the work done:

1. Update the `agent-context/wiki/` pages affected by your changes (architecture, data model, etc.).
2. If you made a non-trivial decision, append an entry to `agent-context/wiki/decisions.md` (context → decision → rationale → alternatives).
3. If you created a new area of the codebase, add or update its wiki page and link it from `agent-context/wiki/index.md`.
4. Update `agent-context/plans/claude-code-handoff.md` so it reflects the current state and the next steps, letting a fresh session pick up cleanly.

If a change touches code but the wiki wasn't updated to match, the task is not complete.
