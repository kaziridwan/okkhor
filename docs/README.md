# Okkhor (অক্ষর) — Bijoy → Unicode Converter

A fully client-side converter for legacy Bangla ANSI documents (SutonnyMJ and
other Bijoy fonts) to modern Unicode Bangla. No server, no uploads — files
never leave the browser tab.

**Supported inputs:** `.docx` `.doc` `.rtf` `.odt` `.html` `.txt`

## Features

- Font-aware conversion for `.docx`: only runs tagged with a Bijoy font are
  converted, so mixed English/Bangla documents come out clean. A "convert all
  text" toggle handles Bijoy text typed in generic fonts.
- Formatting is preserved; Bijoy font tags are re-pointed to a Unicode font
  (Nikosh).
- Leftover-glyph scanner flags suspicious unmapped codepoints per file.
- Live paste box for quick text conversions.
- Binary `.doc` (Word 97–2003) support with formatting: the OLE container,
  piece table (CP-1252 and UTF-16 pieces, Word 6/95 fallback), CHPX
  character-formatting layer, PAPX paragraph layer, and font table are all
  parsed directly in the browser. Detection is font-aware per run — the same
  strictness as the `.docx` path — with a bigram heuristic fallback for runs
  without font info. Bold, italic, underline, font sizes, and paragraph
  alignment carry into the rebuilt `.docx`.
- Tables are reconstructed as real table grids: cell and row marks are read
  from the paragraph layer (`fInTable`/`fTtp` flags), and column widths and
  border presence come from the row-level table-definition sprm, so the
  output `.docx` has proper `w:tbl` structure with original column geometry.
  Merged cells are not resolved yet and appear as separate cells.
- Images and diagrams in `.doc` files are preserved: inline pictures are
  read from the Data-stream PICF/OfficeArt records, floating shapes are
  resolved through the drawing-layer blip store (shape anchor → spid → pib →
  blip, including delayed blips), and deflate-compressed vector metafiles
  (EMF/WMF) are decompressed in the browser via `DecompressionStream`.
  PNG/JPEG/BMP/TIFF embed directly; DIBs are wrapped into valid BMPs.

## Hosting on GitHub Pages

1. Create a repository and push these files to the default branch.
2. In the repo: **Settings → Pages → Source: Deploy from a branch**, pick the
   branch and `/ (root)`.
3. Your converter will be live at `https://<user>.github.io/<repo>/`.

Everything is in a single `index.html`. The only external requests are CDN
assets (JSZip from cdnjs, fonts from Google Fonts).

## Credits

Conversion engine adapted from
[bijoy2unicode](https://github.com/JehadurRE/Bijoy2Unicode) by Md. Jehad
(Jehadur Rahman Emran), MIT — see `licenses/bijoy2unicode-LICENSE.txt`.
