# Decisions

ADR-style log. Newest at the top. Each entry should let a future agent
understand *why* without re-deriving it.

## D-009. Deployable directory renamed `dist/` → `docs/`

- **Date:** 2026-07-22 (v5)
- **Status:** accepted
- **Context:** The site will be published via GitHub Pages, which can serve
  directly from a `/docs` folder on the default branch — no branch juggling
  or copy-to-root step.
- **Decision:** The assembled site lives in `docs/` (index.html, README,
  `.nojekyll`, licenses). `scripts/assemble.py` writes `docs/index.html`.
- **Rationale:** Matches the GitHub Pages "deploy from folder" convention;
  removes the publish friction noted in the handoff plan.
- **Alternatives considered:** Keep `dist/` and use a Pages deploy action
  (extra CI for a static file); serve from repo root (clutters the repo).

## D-008. Always-bordered fallback, borders read from TC80 when possible

- **Date:** during handoff conversation (v5)
- **Status:** accepted
- **Context:** Rebuilt tables need a border decision. The row-level
  sprmTDefTable operand carries per-cell TC80 descriptors whose BRC80 bytes
  encode border type (byte 2 of each 4-byte BRC; 0 = none).
- **Decision:** Scan the first row's TC80 BRCs; any non-zero brcType → single
  hairline borders on the whole table; all zero → borderless. Default to
  bordered when no TC80s are readable.
- **Rationale:** Legacy Bangla office documents overwhelmingly use visible
  grids; a missing grid is a worse failure than an added one.
- **Alternatives considered:** Per-cell border fidelity (BRC → individual
  w:tcBorders) — deferred as polish; borderless default — wrong for the
  dominant document class.

## D-007. Floating images become inline pictures at their anchor paragraph

- **Date:** during handoff conversation (v4)
- **Status:** accepted (revisit if wrap positioning matters)
- **Context:** .doc floating shapes have full wrap/offset geometry (SPA);
  reproducing `wp:anchor` positioning faithfully is complex and fragile.
- **Decision:** Resolve the blip and its true size (SPA bounding rectangle),
  but emit it as `wp:inline` at the anchor CP's paragraph.
- **Rationale:** Content preservation over layout perfection; inline images
  are robust across Word/LibreOffice/Google Docs.
- **Alternatives considered:** Full `wp:anchor` emission (deferred);
  appending all floats at document end (loses position entirely — rejected
  once anchor mapping proved reliable).

## D-006. LibreOffice as ground-truth generator; validate down to pixels

- **Date:** during handoff conversation (v2–v5)
- **Status:** accepted — this is the project's testing methodology
- **Context:** No real legacy .doc corpus was available during development,
  and hand-crafting Word binary files is error-prone.
- **Decision:** Author fixtures as minimal .docx, convert with
  `soffice --headless --convert-to doc`, treat the result as ground truth.
  For visual features, round-trip pipeline output back through LibreOffice to
  PDF, rasterise, and assert on pixels (image colours present, border-line
  counts).
- **Rationale:** Exercises the real Word 97 filter; caught two genuine
  fixture/format errors (see testing.md) that spec-reading alone missed.
- **Alternatives considered:** Downloading sample .docs from the internet
  (unverifiable ground truth); unit-testing structures in isolation (misses
  integration; kept as a complement, not a substitute).

## D-005. DecompressionStream for compressed metafiles — no new dependencies

- **Date:** during handoff conversation (v4)
- **Status:** accepted
- **Context:** OfficeArt stores EMF/WMF blips zlib-deflated. The app needed
  inflate without adding pako or exposing JSZip internals.
- **Decision:** Use the built-in `DecompressionStream("deflate")` with a
  `"deflate-raw"` fallback; drop images that fail to decode rather than
  failing the file.
- **Rationale:** Zero dependency cost; available in all modern browsers and
  Node ≥18 (which the test suite relies on).
- **Alternatives considered:** pako via cdnjs (works everywhere incl. old
  browsers, but a new dependency for one call — take only if legacy-browser
  support becomes a requirement).

## D-004. Detection ladder: font tags → high-byte glyphs → bigram heuristic

- **Date:** during handoff conversation (v2, upgraded v3)
- **Status:** accepted
- **Context:** Converting non-Bijoy text corrupts it; missing Bijoy text
  defeats the tool. .docx has font tags; .doc needed CHPX parsing to get
  them; ASCII-only Bijoy (e.g. "Avwg evsjvq Mvb MvB") has no high-byte tell.
- **Decision:** Per run: known Bijoy font → convert; known Unicode-Bangla
  font or existing Bengali codepoints → pass through; unknown font → fall to
  paragraph heuristics (high-byte Bijoy glyphs, then the engine's Bijoy
  bigram frequency vs English hint words, with a document-level
  "Bijoy-heavy" boost). A user-facing "Convert all text" toggle overrides
  everything for mis-tagged documents.
- **Rationale:** Strict-by-default protects mixed documents (the common
  government/office case); the toggle covers the rest without heuristic risk.
- **Alternatives considered:** Heuristics-only (corrupts English in edge
  cases); font-tags-only (misses mis-tagged Bijoy, common in old files).

## D-003. Hand-written .doc parser (CFB → FIB → pieces → CHPX/PAPX → OfficeArt)

- **Date:** during handoff conversation (v2, extended v3–v5)
- **Status:** accepted
- **Context:** No good pure-JS .doc parser exists with formatting support;
  `word-extractor` is text-only and Node-oriented; LibreOffice WASM is tens
  of MB against a "one small HTML file" product.
- **Decision:** Implement the needed subset of MS-DOC/MS-ODRAW from the spec
  in `src/doc-extract.js` (~700 lines), validating each layer against
  LibreOffice-generated files and `word-extractor` output where applicable.
- **Rationale:** The needed subset is tractable, dependency-free, and each
  layer was verifiable independently. Text output was confirmed
  byte-identical to `word-extractor` before building further layers on top.
- **Alternatives considered:** "Re-save as .docx" instruction only (v1
  behaviour — poor UX for archives); browserifying word-extractor (text-only
  ceiling, Buffer shims); WASM LibreOffice (size, complexity).

## D-002. Single-file app; modules spliced at build time

- **Date:** during handoff conversation (v1)
- **Status:** accepted
- **Context:** Product goal: trivially hostable (GitHub Pages), auditable,
  works from `file://`, no build framework.
- **Decision:** One `docs/index.html` (originally `dist/`; renamed in v5 —
  see D-009). Development happens in `src/` modules;
  `scripts/assemble.py` splices them into the template's `/*__ENGINE__*/`
  placeholder. Runtime deps only via cdnjs (JSZip); fonts via Google Fonts.
- **Rationale:** Zero-install deploy and easy source audit outweigh the
  slightly unusual build step. The splice is 30 lines of Python and
  reproduces the artifact byte-for-byte.
- **Alternatives considered:** Vite/bundler (overkill, fights the single-file
  goal); hand-editing one giant HTML (unmaintainable — this was effectively
  the v1 state and was factored out during v3).

## D-001. Bundle the MIT `bijoy2unicode` engine; don't reimplement

- **Date:** during handoff conversation (v1)
- **Status:** accepted
- **Context:** Bijoy → Unicode needs ~270 glyph mappings plus reordering
  rules (pre-base kars, reph, conjunct decomposition, prefix-pair conjuncts).
  Writing these from memory guarantees subtle errors.
- **Decision:** Bundle `bijoy2unicode` v1.0.2 (MIT, Md. Jehad / JehadurRE)
  dist code into `src/engine.js` via `scripts/rebuild-engine.sh`, exporting
  extra internal helpers (bigrams, font-name checks) the app needs. License
  and credit ship in `docs/licenses/` and the app footer.
- **Rationale:** It passed all hard test phrases (কর্মকর্তার, বিস্তারিত,
  স্বাধীনতা, গণপ্রজাতন্ত্রী) including trailing-reph and prefix-pair cases, is
  browser-compatible with JSZip as its only dependency, and includes a
  font-aware .docx path that became the v1 product.
- **Alternatives considered:** `bn-ansi-to-unicode` (simpler, less complete);
  writing the mapping from scratch (rejected: accuracy risk with no upside).
