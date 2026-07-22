# Architecture

One deployable file, three source modules, one build splice.

## Module map

```
dist/index.html  =  src/template.html
                    with /*__ENGINE__*/ replaced by, in order:
                    ├── src/engine.js       window.BijoyEngine  (bundled upstream)
                    ├── src/doc-extract.js  window.DocExtract   (.doc binary → blocks)
                    └── src/doc-convert.js  window.DocConvert   (blocks → Unicode .docx)
```

Load order matters: `doc-convert.js` captures `window.BijoyEngine` at IIFE
time. JSZip loads first from cdnjs and is used by both the engine (docx
read/write) and `doc-convert` (output packaging).

## Data flow by input type

**.docx / .rtf / .odt / .html / .txt** — handled entirely by the engine:
`BijoyEngine.convertFile(file, {force, onProgress})`. For .docx it walks
`word/document.xml` (plus styles for font inheritance: run → paragraph style →
docDefaults), converts only runs whose effective font is a known Bijoy font,
and re-points those `w:rFonts` to Nikosh. Returns `{blob, filename}`.

**.doc** — the from-scratch path:

```
DocConvert.convertDoc(file, {force, onProgress})
  └─ DocExtract.extract(arrayBuffer)
       1. CFB/OLE container → WordDocument, 0/1Table, Data streams
       2. FIB → piece table → text chars + FC→CP map
       3. SttbfFfn → font names          (table stream)
       4. CHPX FKP pages → per-CP char props (b/i/u/size/font-idx/fcPic)
       5. PAPX FKP pages → per-CP align + inTable/TTP flags + row defs
       6. Images: PICF in Data stream (inline), DggInfo blip store +
          PlcSpaMom anchors (floating)
       7. assemble → { blocks, fonts }
          block = {type:'p', align, runs}
                | {type:'table', rows:[{cells:[[para…]], widths, bordered}]}
          run   = {text, props} | {image:{ext, bytes, compressed, wTwips, hTwips}}
  ├─ classify each run (see wiki/bijoy-conversion.md) and convert
  ├─ inflate compressed metafile images (DecompressionStream)
  └─ buildDocx: w:p / w:tbl XML + word/media/* + rels + content types → blob
```

The UI (in `template.html`) renders one progress card per file, a download
link, a per-file message with stats (`converted/runs`, images, tables,
font-aware flag), and leftover-glyph chips from `BijoyEngine.scanUnmapped`
run over the converted text.

## UI surface

- Header: wordmark + privacy note (no uploads).
- Specimen: cycling live before/after conversion of sample phrases (computed
  by the real engine, not hardcoded strings).
- Dropzone: multi-file, keyboard accessible; "Convert all text" force toggle.
- File cards: progress → download + message + leftover chips.
- Quick-paste: live text converter with copy button.
- Footer: capability/limitation statements + engine attribution. Keep these
  truthful when capabilities change.

Design tokens live in `:root` of the template (paper/ink/bottle-green/red
palette; Noto Serif Bengali for Bangla display, Archivo for UI, IBM Plex Mono
for the "bytes" side). The mojibake side of the specimen intentionally
renders in mono — it *is* Latin gibberish until converted.

## Build & deploy

- `python3 scripts/assemble.py --check` → `dist/index.html` (byte-reproducible)
- `dist/` is the complete GitHub Pages site (`.nojekyll`, README, licenses)
- `src/engine.js` is generated-but-committed; regenerate only via
  `scripts/rebuild-engine.sh` when upgrading upstream `bijoy2unicode`

## Invariants

- The app must keep working from `file://` (no fetch of local resources, no
  module imports at runtime).
- No browser storage APIs (nothing to store; files are processed in memory).
- `doc-extract.js` never throws on unknown structures it can skip — it throws
  only on: not-OLE, no WordDocument stream, encrypted, malformed piece table.
  Everything else degrades (image dropped, table flattened, prop ignored).
