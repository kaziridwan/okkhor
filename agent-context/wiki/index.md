# Okkhor Wiki

Client-side Bijoy/SutonnyMJ → Unicode Bangla document converter; single HTML
file; hand-written Word `.doc` binary parser.

## Pages

- [Decisions](decisions.md) — key technical decisions with rationale (engine
  bundling, single-file architecture, parser-from-scratch, detection strategy,
  testing methodology).
- [Architecture](architecture.md) — how the pieces fit: template + spliced
  modules, data flow for each input format, the UI surface, build and deploy.
- [Bijoy conversion](bijoy-conversion.md) — the encoding problem, how the
  bundled engine works, detection layers (font tags → high bytes → bigrams),
  and known conversion limitations.
- [.doc binary format](doc-binary-format.md) — the Word 97 structures the
  parser reads (CFB, FIB, pieces, CHPX/PAPX, fonts, OfficeArt images, tables)
  **and the five format traps that cost real debugging time**. Read before
  touching `src/doc-extract.js`.
- [Testing](testing.md) — the LibreOffice ground-truth methodology, fixture
  inventory, what the suite covers, and how to add a fixture for a new
  feature.

> Maintenance: update the relevant page after every change, and link any new
> page here. See the documentation-discipline section in the root `CLAUDE.md`.
