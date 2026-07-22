# Okkhor (অক্ষর)

Client-side converter for legacy Bangla ANSI documents (Bijoy/SutonnyMJ) to
Unicode Bangla — including full parsing of the binary Word `.doc` format in
the browser. One HTML file, no server, files never leave the tab.

- **Use it:** open `dist/index.html`, or host `dist/` on GitHub Pages.
- **Develop:** `npm install && npm run build && npm test` — sources in `src/`,
  docs in `agent-context/wiki/`, agent instructions in `CLAUDE.md`.

Conversion engine adapted from
[bijoy2unicode](https://github.com/JehadurRE/Bijoy2Unicode) (MIT) — see
`dist/licenses/`.
