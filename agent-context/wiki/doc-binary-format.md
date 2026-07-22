# The .doc binary format (what the parser reads)

`src/doc-extract.js` implements a subset of MS-DOC / MS-ODRAW / MS-CFB.
This page is the map — and, at the end, the traps that cost real debugging
time. Read this before modifying the extractor.

## Layer 1 — CFB/OLE container

Signature `D0 CF 11 E0 A1 B1 1A E1`. Sector chains via FAT (with DIFAT
continuation), small streams (< `miniCutoff`, usually 4096) via miniFAT
inside the root entry's mini stream. Streams used: `WordDocument`,
`0Table`/`1Table` (FIB flag bit 0x0200 selects which), `Data` (inline
pictures; may be absent).

## Layer 2 — FIB (start of WordDocument stream)

- `wIdent` u16@0: 0xA5EC (Word 97+) or 0xA5DC (Word 6/95 → legacy fallback:
  contiguous cp1252 text from fcMin@0x18 to fcMac@0x1C, no formatting)
- `nFib` u16@2; `flags` u16@0x0A — bit 0x0100 = encrypted (refuse),
  bit 0x0200 = table stream is `1Table`
- FibRgFcLcb97 fc/lcb pairs at fixed offsets (all verified empirically):

| offset | field | used for |
|---|---|---|
| 0x00FA | fcPlcfBteChpx | character formatting bin table |
| 0x0102 | fcPlcfBtePapx | paragraph formatting bin table |
| 0x0112 | fcSttbfFfn | font table |
| 0x01A2 | fcClx | piece table |
| 0x01DA | fcPlcSpaMom | floating shape anchors (main doc) |
| 0x022A | fcDggInfo | OfficeArt drawing layer |

## Layer 3 — Piece table (CLX in table stream)

Skip `clxt=1` Prc blocks; `clxt=2` → Pcdt: u32 size, then PLC of (n+1) CPs +
n PCDs (8 bytes: 2 flags, 4 fc, 2 prm). PCD fc bit 0x40000000 = "compressed"
→ cp1252 bytes at fc/2; else UTF-16LE at fc. Pieces can be scattered
(fast saves) — `fcRangeToCp()` maps formatting FC ranges onto CP ranges
piece-by-piece; never assume FC order = CP order.

## Layer 4 — Formatting bin tables → FKP pages

Bin tables (PlcfBteChpx/Papx): (n+1) FCs + n page numbers (PN); each PN is a
**512-byte page** at `PN*512` in the WordDocument stream, `crun` in the last
byte.

- **ChpxFkp**: (crun+1) u32 FC boundaries, then crun 1-byte word-offsets to
  CHPX (`offset*2` within page; 0 = default props). CHPX = count byte +
  grpprl. Sprms read: 0x0835 bold, 0x0836 italic, 0x2A3E underline, 0x4A43
  half-point size, 0x4A4F/0x4A51 font indices, 0x6A03 picture FC.
- **PapxFkp**: (crun+1) FCs, then crun **13-byte** BxPap entries (first byte =
  word-offset to PAPX). PAPX: cw byte (if 0, real cw is the next byte), then
  istd u16 + grpprl. Sprms read: 0x2403/0x2461 jc, 0x2416 fInTable, 0x2417
  fTtp, 0xD608 table definition.
- Byte-toggle sprm semantics: 0 off, 1 on, 128 follow-style, 129
  invert-style. Without stylesheet resolution we treat 1/129 as on, 0 as off,
  128 as inherit-nothing.

Sprm operand size comes from `spra` (top 3 bits): 0/1→1B, 2/4/5→2B, 3→4B,
7→3B, 6→first byte is length. **Except the table sprms — see trap #1.**

## Layer 5 — Fonts (SttbfFfn, table stream)

u16 cData, u16 cbExtra, then cData entries: 1-byte `cbFfnM1`, then FFN whose
UTF-16 name starts at **entry+40** (i.e. 39 bytes of fixed FFN fields after
the length byte). Indices from CHPX ftc0/ftc2 index this list.

## Layer 6 — Images

**Inline:** text char 0x01 + CHPX sprm 0x6A03 → PICF in the **Data stream**:
u32 lcb, u16 cbHeader (usually 68), display size dxaGoal/dyaGoal u16@28/30
(twips) scaled by mx/my u16@32/34 (/1000). Picture bytes from
`fcPic+cbHeader` to `fcPic+lcb` are OfficeArt records.

**OfficeArt records:** 8-byte header (verInstance u16, recType u16, recLen
u32); container iff `(verInstance & 0xF) == 0xF`. Blips:

- Raster — 0xF01D JPEG, 0xF01E PNG, 0xF01F DIB, 0xF029 TIFF: payload after
  16-byte UID (+16 more if instance is the "dual UID" variant: 0x46B / 0x6E1 /
  0x7A9 / 0x6E5) + 1 tag byte. DIB needs a 14-byte BITMAPFILEHEADER prepended
  (`dibToBmp`, computes palette-aware offBits).
- Metafile — 0xF01A EMF, 0xF01B WMF (dual-UID instances 0x3D5 / 0x217):
  after UID(s), a **34-byte metafile header**: cbSize u32@0 (uncompressed
  size), rcBounds@4, ptSize@20, **cbSave u32@28**, compression byte@32
  (0 = zlib-deflate), filter@33; data at +34. Decompression happens later in
  doc-convert via `DecompressionStream`.
- FBSE 0xF007: 36-byte header; if recLen > 36 the blip is embedded right
  after; else `foDelay` u32@+28 (within the FBSE payload) is an offset **into
  the WordDocument stream** where the blip record lives.

**Floating:** DggInfo blob (table stream) → harvest all FBSEs in order (the
blip store, 1-based) and all SpContainers (0xF004) pairing FSP(0xF00A) spid
with FOPT(0xF00B) property 260 (pib = blip index). PlcSpaMom: (n+1) CPs +
n×26-byte SPAs (spid u32@0; bounding rect int32 L/T/R/B twips @4..20 gives
real display size). Anchor CP → insert image run there.

## Layer 7 — Tables

Text stream: each cell ends with 0x07; each row additionally ends with a
0x07 that is its own paragraph whose PAPX has fTtp=1. Multi-paragraph cells
contain 0x0D between paragraphs. sprmTDefTable (0xD608) on the TTP paragraph:
operand = u16 cb, then u8 column count N, (N+1) int16 column boundaries in
twips (widths = diffs), then N×20-byte TC80s (border BRC80s at +4/+8/+12/+16;
byte 2 of each BRC = brcType, 0 = none). Nested tables (itap sprm 0x6649 > 1)
are not handled — they flatten into the outer cell.

## ⚠ The five traps (each cost real debugging time)

1. **sprmTDefTable length quirk.** 0xD608/0xD609 have spra=6 but use a
   **2-byte** length whose value is "bytes following, plus one" (data length
   = cb − 1). The generic 1-byte spra=6 rule silently desyncs the walker and
   corrupts every sprm after it. Special-cased at the top of `walkSprms`.
2. **Metafile header offsets.** cbSave is at **+28**, not +4 (+4 is
   rcBounds). Misreading it truncates the compressed stream → zlib "incomplete
   stream".
3. **dgglbl bytes between OfficeArt containers.** The DggInfo blob has 1-byte
   drawing labels between the DggContainer and each DgContainer. A naive
   record walk reads garbage type/length there and jumps past the buffer. The
   harvest loop resyncs by advancing 1 byte whenever recType is outside
   0xF000–0xF1FF.
4. **OOXML justify is `"both"`.** `w:jc w:val="justify"` is invalid and
   silently ignored (LibreOffice drops it on .doc export). Bit us in a test
   fixture; the parser was right, the fixture was wrong.
5. **cp1252 high range is load-bearing.** Bytes 0x80–0x9F map to specific
   Unicode punctuation the Bijoy tables key on. Decoding compressed pieces as
   latin-1 (identity) breaks every kar. Use `CP1252_HIGH`.

Also worth knowing: `alignByCp` fill once had a copy-paste ternary writing to
the wrong index — alignment bugs that affect only *some* paragraphs suggest a
fill-loop problem, not a sprm-parse problem.
