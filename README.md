# Okkhor (অক্ষর) — Bijoy → Unicode Converter

A fully client-side converter for legacy Bangla ANSI documents (SutonnyMJ and
other Bijoy fonts) to modern Unicode Bangla. No server, no uploads — files
never leave the browser tab.

**Supported inputs:** `.docx` `.rtf` `.odt` `.html` `.txt`
(binary `.doc` is not supported — re-save as `.docx` first)

## Features

- Font-aware conversion for `.docx`: only runs tagged with a Bijoy font are
  converted, so mixed English/Bangla documents come out clean. A "convert all
  text" toggle handles Bijoy text typed in generic fonts.
- Formatting is preserved; Bijoy font tags are re-pointed to a Unicode font
  (Nikosh).
- Leftover-glyph scanner flags suspicious unmapped codepoints per file.
- Live paste box for quick text conversions.

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
