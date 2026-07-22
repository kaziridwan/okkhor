# Bijoy conversion

## The encoding problem

Bijoy-era documents store Bangla as ASCII/cp1252 codepoints; a Bijoy font
(SutonnyMJ etc.) maps those codepoints to Bangla glyphs *visually*. The bytes
say `Avwg evsjvq Mvb MvB`; the screen shows আমি বাংলায় গান গাই. Conversion is
a glyph-map plus reordering rules, because Bijoy stores text in **visual**
order while Unicode uses **logical** order:

- Pre-base vowels (ি ে ৈ) are stored *before* their consonant → move after.
- Reph (র্) is stored after the cluster (trailing `©`) → move before it in
  the Unicode sequence.
- Conjunct glyphs are single codepoints → decompose to consonant + hasanta +
  consonant (e.g. `¯` = স্).
- Some conjuncts are "prefix pairs" (`¯Í` = স্ত etc.) needing lookahead.

Inside .docx XML the text is already Unicode-encoded, so Bijoy's 0x80–0x9F
bytes appear as their **cp1252 equivalents** (‡ † ¯ š Ö — curly quotes,
daggers, etc.). The engine's mapping keys off those Unicode codepoints. The
.doc extractor reproduces exactly this by decoding compressed pieces through
an explicit cp1252 high-range table (`CP1252_HIGH` in `doc-extract.js`) — if
that table were wrong, every e-kar and conjunct would break.

## The engine (`src/engine.js`)

Bundled from `bijoy2unicode` v1.0.2 (MIT) — see decisions.md D-001. Exposed as
`window.BijoyEngine`. Symbols the app uses:

- `convertBijoyToUnicode(text)` — core text conversion (emits precomposed
  য়/ড়/ঢ়)
- `convertFile / convertDocx / convertRtf / convertOdt / convertHtml /
  convertTxt`, `detectExt`, `suggestOutputName` — the non-.doc pipeline
- `scanUnmapped`, `isSuspiciousLeftover`, `describeCodepoint` — leftover
  detection for the per-file report (these come from upstream `dist/index.js`
  via `src/scan-fns.js`; they're absent from upstream `dist/docx.js`)
- `looksLikeBijoy`, `hasBengaliUnicode`, `countBijoyBigrams`,
  `looksLikeEnglish`, `fontIsBijoyName`, `fontIsUnicodeBangla` — detection
  helpers (internal to upstream; exported by our bundling wrapper)

If you regenerate the engine (`scripts/rebuild-engine.sh`), the export list
in that script must keep all of the above.

## Detection ladder (per run, .doc path — `classifyRun` in doc-convert.js)

1. Text already contains Bengali Unicode → pass through (tag Nikosh).
2. Run's font (CHPX ftc0/ftc2 → font table) is a known Bijoy font → convert.
3. Font is a known Unicode-Bangla font → pass through.
4. Font is known-other (e.g. Times): convert only if force, or if the text
   carries high-byte Bijoy glyphs *and* the paragraph is Bijoy (mis-tagged
   runs are common in old files).
5. No font info: paragraph heuristic — high-byte Bijoy glyphs, else ≥2 Bijoy
   bigrams and not English-looking, else (document ≥40% Bijoy-ish) ≥1 bigram
   and not English-looking.

The "Convert all text" UI toggle forces conversion of anything that isn't
already Unicode Bangla.

## Known limitations

- **Run-boundary reordering:** conversion is per run; a kar or reph exactly at
  a formatting seam reorders within its own run only. Shared with the
  upstream .docx path. Rare in practice.
- **Precomposed output:** the engine emits য় as U+09DF (not য+়). Tests must
  normalise; downstream consumers generally don't care.
- **Unmapped glyphs:** any Bijoy codepoint absent from the map passes through
  unchanged; `scanUnmapped` surfaces these as chips in the file card. When
  real files reveal holes, patch the map in upstream terms (or post-process)
  and add a fixture.
