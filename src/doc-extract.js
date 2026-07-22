/* .doc (Word binary) extractor, v3: text + formatting.
 * Layers:
 *   1. CFB/OLE container (FAT, miniFAT, directory)
 *   2. FIB + piece table (CLX/PlcPcd) -> text with an FC->CP map
 *   3. SttbfFfn font table -> font names
 *   4. PlcfBteChpx -> ChpxFkp pages -> per-CP character props
 *      (bold, italic, underline, half-point size, font indices)
 *   5. PlcfBtePapx -> PapxFkp pages -> per-CP paragraph alignment
 * Output: { paragraphs: [{ align, runs: [{ text, props }] }], fonts }
 * Word 6/95 falls back to a single unformatted run per paragraph.
 */
window.DocExtract = (function () {
  var CP1252_HIGH = [
    0x20AC, 0x0081, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
    0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008D, 0x017D, 0x008F,
    0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
    0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x009D, 0x017E, 0x0178
  ];
  function cp1252(b) {
    return b >= 0x80 && b <= 0x9F
      ? String.fromCharCode(CP1252_HIGH[b - 0x80])
      : String.fromCharCode(b);
  }
  function u16(dv, o) { return dv.getUint16(o, true); }
  function u32(dv, o) { return dv.getUint32(o, true); }

  /* ---------- 1. CFB ---------- */
  function parseCfb(buf) {
    var dv = new DataView(buf);
    if (u32(dv, 0) !== 0xE011CFD0 || u32(dv, 4) !== 0xE11AB1A1) {
      throw new Error("Not an OLE compound file (is this really a .doc?)");
    }
    var sec = 1 << u16(dv, 30);
    var miniSec = 1 << u16(dv, 32);
    var numDifat = u32(dv, 72);
    var firstDir = u32(dv, 48);
    var miniCutoff = u32(dv, 56);
    var firstMiniFat = u32(dv, 60);
    var numMiniFat = u32(dv, 64);
    var firstDifat = u32(dv, 68);
    function sectorOff(s) { return 512 + s * sec; }

    var fatSectors = [];
    for (var i = 0; i < 109; i++) {
      var v = u32(dv, 76 + i * 4);
      if (v !== 0xFFFFFFFF) fatSectors.push(v);
    }
    var difat = firstDifat, guard = 0;
    while (difat !== 0xFFFFFFFE && difat !== 0xFFFFFFFF && guard++ < numDifat + 4) {
      var base = sectorOff(difat);
      for (var j = 0; j < (sec / 4) - 1; j++) {
        var w = u32(dv, base + j * 4);
        if (w !== 0xFFFFFFFF) fatSectors.push(w);
      }
      difat = u32(dv, base + sec - 4);
    }
    var perSec = sec / 4;
    function fatNext(s) {
      return u32(dv, sectorOff(fatSectors[Math.floor(s / perSec)]) + (s % perSec) * 4);
    }
    function readChain(start, size) {
      var out = new Uint8Array(size), pos = 0, s = start, g = 0;
      while (s !== 0xFFFFFFFE && pos < size && g++ < 1e6) {
        var take = Math.min(sec, size - pos);
        out.set(new Uint8Array(buf, sectorOff(s), take), pos);
        pos += take; s = fatNext(s);
      }
      return out;
    }
    var dirBytes = [], s0 = firstDir, g2 = 0;
    while (s0 !== 0xFFFFFFFE && g2++ < 1e5) {
      dirBytes.push(new Uint8Array(buf, sectorOff(s0), sec));
      s0 = fatNext(s0);
    }
    var dir = new Uint8Array(dirBytes.length * sec);
    dirBytes.forEach(function (b, i) { dir.set(b, i * sec); });
    var ddv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
    var entries = [];
    for (var e = 0; e + 128 <= dir.length; e += 128) {
      var nameLen = u16(ddv, e + 64);
      if (!nameLen) continue;
      var name = "";
      for (var c = 0; c < nameLen / 2 - 1; c++) name += String.fromCharCode(u16(ddv, e + c * 2));
      entries.push({ name: name, type: dir[e + 66], startSector: u32(ddv, e + 116), size: u32(ddv, e + 120) });
    }
    var root = entries.find(function (x) { return x.type === 5; });
    var miniFat = readChain(firstMiniFat, numMiniFat * sec);
    var mfdv = new DataView(miniFat.buffer, miniFat.byteOffset, miniFat.byteLength);
    var miniStream = root ? readChain(root.startSector, root.size) : new Uint8Array(0);
    function readMiniChain(start, size) {
      var out = new Uint8Array(size), pos = 0, ms = start, g3 = 0;
      while (ms !== 0xFFFFFFFE && pos < size && g3++ < 1e6) {
        var take = Math.min(miniSec, size - pos);
        out.set(miniStream.subarray(ms * miniSec, ms * miniSec + take), pos);
        pos += take; ms = u32(mfdv, ms * 4);
      }
      return out;
    }
    return {
      stream: function (name) {
        var ent = entries.find(function (x) { return x.name === name && x.type === 2; });
        if (!ent) return null;
        return ent.size < miniCutoff ? readMiniChain(ent.startSector, ent.size)
                                     : readChain(ent.startSector, ent.size);
      }
    };
  }

  /* ---------- sprm walker (operand size from spra bits) ---------- */
  function walkSprms(bytes, dv, start, end, handler) {
    var off = start;
    while (off < end - 1) {
      var sprm = u16(dv, off);
      var spra = (sprm >> 13) & 7;
      off += 2;
      handler(sprm, off);
      if (sprm === 0xD608 || sprm === 0xD609) {
        // Table-definition operands: 2-byte cb whose value counts the
        // following bytes plus one (MS-DOC quirk).
        off += 2 + Math.max(0, u16(dv, off) - 1);
        continue;
      }
      if (spra === 0 || spra === 1) off += 1;
      else if (spra === 2 || spra === 4 || spra === 5) off += 2;
      else if (spra === 3) off += 4;
      else if (spra === 7) off += 3;
      else if (spra === 6) off += bytes[off] + 1;
      else return;
    }
  }
  // Byte-toggle sprm semantics: 0 off, 1 on, 128 follow style, 129 invert
  // style. Without stylesheet resolution: 1 and 129 -> on, else inherit.
  function toggleVal(b) { return b === 1 || b === 129 ? true : b === 0 ? false : null; }

  /* ---------- main ---------- */
  function extract(buf) {
    var cfb = parseCfb(buf);
    var wd = cfb.stream("WordDocument");
    if (!wd) throw new Error("No WordDocument stream found");
    var wdv = new DataView(wd.buffer, wd.byteOffset, wd.byteLength);
    var wIdent = u16(wdv, 0);
    if (wIdent !== 0xA5EC && wIdent !== 0xA5DC) {
      throw new Error("Unrecognized Word format (wIdent 0x" + wIdent.toString(16) + ")");
    }
    var nFib = u16(wdv, 2);
    var flags = u16(wdv, 0x0A);
    if (flags & 0x0100) throw new Error("This .doc is password-protected/encrypted");

    /* ----- Word 6/95: plain text, one run per paragraph ----- */
    if (wIdent === 0xA5DC || nFib < 101) {
      var fcMin = u32(wdv, 0x18), fcMac = u32(wdv, 0x1C), t = "";
      for (var i0 = fcMin; i0 < fcMac && i0 < wd.length; i0++) t += cp1252(wd[i0]);
      return legacyResult(t);
    }

    var table = cfb.stream((flags & 0x0200) ? "1Table" : "0Table")
             || cfb.stream("1Table") || cfb.stream("0Table");
    if (!table) throw new Error("No table stream found");
    var tdv = new DataView(table.buffer, table.byteOffset, table.byteLength);
    var dataStream = cfb.stream("Data");
    var ddvData = dataStream
      ? new DataView(dataStream.buffer, dataStream.byteOffset, dataStream.byteLength)
      : null;

    /* ----- 2. Pieces: text + FC->CP mapping ----- */
    var fcClx = u32(wdv, 0x01A2), lcbClx = u32(wdv, 0x01A6);
    if (!lcbClx || fcClx + lcbClx > table.length) throw new Error("Invalid piece table location");
    var p = fcClx, end = fcClx + lcbClx, plcOff = -1, plcSize = 0;
    while (p < end) {
      var clxt = table[p];
      if (clxt === 1) p += 3 + u16(tdv, p + 1);
      else if (clxt === 2) { plcSize = u32(tdv, p + 1); plcOff = p + 5; break; }
      else throw new Error("Malformed CLX");
    }
    if (plcOff < 0) throw new Error("No piece descriptor table found");
    var n = (plcSize - 4) / 12;
    var cps = [];
    for (var k = 0; k <= n; k++) cps.push(u32(tdv, plcOff + k * 4));
    var pcdBase = plcOff + (n + 1) * 4;

    var totalCp = cps[n];
    var chars = new Array(totalCp);
    var pieces = [];               // { cpStart, cpEnd, fc, bytesPerChar }
    for (var pi = 0; pi < n; pi++) {
      var fcRaw = u32(tdv, pcdBase + pi * 8 + 2);
      var compressed = (fcRaw & 0x40000000) !== 0;
      var fc = fcRaw & 0x3FFFFFFF;
      if (compressed) fc = fc / 2;
      var len = cps[pi + 1] - cps[pi];
      var bpc = compressed ? 1 : 2;
      pieces.push({ cpStart: cps[pi], cpEnd: cps[pi + 1], fc: fc, bpc: bpc });
      for (var a = 0; a < len; a++) {
        chars[cps[pi] + a] = compressed
          ? cp1252(wd[fc + a])
          : String.fromCharCode(u16(wdv, fc + a * 2));
      }
    }

    // FC range -> list of CP ranges (pieces may be scattered in fast saves)
    function fcRangeToCp(fcS, fcE, apply) {
      for (var q = 0; q < pieces.length; q++) {
        var pc = pieces[q];
        var pcFcEnd = pc.fc + (pc.cpEnd - pc.cpStart) * pc.bpc;
        var s = Math.max(fcS, pc.fc), e = Math.min(fcE, pcFcEnd);
        if (s >= e) continue;
        var cpS = pc.cpStart + Math.floor((s - pc.fc) / pc.bpc);
        var cpE = pc.cpStart + Math.ceil((e - pc.fc) / pc.bpc);
        apply(cpS, Math.min(cpE, pc.cpEnd));
      }
    }

    /* ----- 3. Font table ----- */
    var fonts = [];
    var fcSttbfFfn = u32(wdv, 0x0112), lcbSttbfFfn = u32(wdv, 0x0116);
    if (lcbSttbfFfn && fcSttbfFfn + lcbSttbfFfn <= table.length) {
      var fo = fcSttbfFfn;
      var cData = u16(tdv, fo); fo += 2;
      fo += 2; // cbExtra
      for (var fi = 0; fi < cData && fo < fcSttbfFfn + lcbSttbfFfn; fi++) {
        var cbFfnM1 = table[fo];
        var entryStart = fo + 1;            // start of FFN payload
        // FFN: flags(1) wWeight(2) chs(1) ixchSzAlt(1) panose(10) fs(24) name
        var nameOff = entryStart + 39;
        var fname = "";
        for (var ci = nameOff; ci + 1 < entryStart + cbFfnM1 + 1; ci += 2) {
          var cc = u16(tdv, ci);
          if (cc === 0) break;
          fname += String.fromCharCode(cc);
        }
        fonts.push(fname);
        fo = entryStart + cbFfnM1;
      }
    }

    /* ----- 4. CHPX -> per-CP character props ----- */
    var propsList = [{}];                       // index 0 = default props
    var propIdx = new Int32Array(totalCp);      // all default initially
    var fcPlcfBteChpx = u32(wdv, 0x00FA), lcbPlcfBteChpx = u32(wdv, 0x00FE);
    if (lcbPlcfBteChpx && fcPlcfBteChpx + lcbPlcfBteChpx <= table.length) {
      var cnt = (lcbPlcfBteChpx - 4) / 8;
      var dataOff = fcPlcfBteChpx + (cnt + 1) * 4;
      for (var bi = 0; bi < cnt; bi++) {
        var pn = u32(tdv, dataOff + bi * 4);
        var page = pn * 512;
        if (page + 512 > wd.length) continue;
        var crun = wd[page + 511];
        for (var r = 0; r < crun; r++) {
          var rgfc = u32(wdv, page + r * 4);
          var rgfcNext = u32(wdv, page + (r + 1) * 4);
          var rgb = wd[page + (crun + 1) * 4 + r];
          if (rgb === 0) continue;               // default props
          var chpxOff = page + rgb * 2;
          var cb = wd[chpxOff];
          var pr = { bold: null, italic: null, ul: null, hps: null, ftc0: null, ftc2: null, fcPic: null };
          walkSprms(wd, wdv, chpxOff + 1, chpxOff + 1 + cb, function (sprm, opOff) {
            switch (sprm) {
              case 0x0835: pr.bold = toggleVal(wd[opOff]); break;      // sprmCFBold
              case 0x0836: pr.italic = toggleVal(wd[opOff]); break;    // sprmCFItalic
              case 0x2A3E: pr.ul = wd[opOff] !== 0; break;             // sprmCKul
              case 0x4A43: pr.hps = u16(wdv, opOff); break;            // sprmCHps
              case 0x4A4F: pr.ftc0 = u16(wdv, opOff); break;           // sprmCRgFtc0
              case 0x4A51: pr.ftc2 = u16(wdv, opOff); break;           // sprmCRgFtc2
              case 0x6A03: pr.fcPic = u32(wdv, opOff); break;           // sprmCPicLocation
            }
          });
          if (pr.bold === null && pr.italic === null && pr.ul === null &&
              pr.hps === null && pr.ftc0 === null && pr.ftc2 === null &&
              pr.fcPic === null) continue;
          var idx = propsList.push(pr) - 1;
          fcRangeToCp(rgfc, rgfcNext, function (cpS, cpE) {
            for (var cc2 = cpS; cc2 < cpE; cc2++) propIdx[cc2] = idx;
          });
        }
      }
    }

    /* ----- 5. PAPX -> per-CP alignment + table structure ----- */
    var alignByCp = new Int8Array(totalCp);      // 0 l, 1 c, 2 r, 3 j
    var inTableByCp = new Int8Array(totalCp);
    var ttpByCp = new Int8Array(totalCp);
    var rowDefByCp = {};                         // TTP cp -> { widths, bordered }
    function parseTDefTable(opOff) {
      var cb = u16(wdv, opOff);
      if (cb < 3) return null;
      var d = opOff + 2;
      var cols = wd[d];
      if (!cols || cols > 63) return null;
      var widths = [], bordered = false;
      for (var ci = 0; ci < cols; ci++) {
        var a = wdv.getInt16(d + 1 + ci * 2, true);
        var b = wdv.getInt16(d + 1 + (ci + 1) * 2, true);
        widths.push(Math.max(120, b - a));
      }
      var tcBase = d + 1 + (cols + 1) * 2;
      for (var ti = 0; ti < cols; ti++) {
        var tc = tcBase + ti * 20;
        if (tc + 20 > d + cb - 1) break;
        for (var bi2 = 0; bi2 < 4; bi2++) {
          if (wd[tc + 4 + bi2 * 4 + 1] !== 0) { bordered = true; break; }
        }
        if (bordered) break;
      }
      return { widths: widths, bordered: bordered };
    }
    var fcPlcfBtePapx = u32(wdv, 0x0102), lcbPlcfBtePapx = u32(wdv, 0x0106);
    if (lcbPlcfBtePapx && fcPlcfBtePapx + lcbPlcfBtePapx <= table.length) {
      var pcnt = (lcbPlcfBtePapx - 4) / 8;
      var pDataOff = fcPlcfBtePapx + (pcnt + 1) * 4;
      for (var pbi = 0; pbi < pcnt; pbi++) {
        var ppn = u32(tdv, pDataOff + pbi * 4);
        var ppage = ppn * 512;
        if (ppage + 512 > wd.length) continue;
        var pcrun = wd[ppage + 511];
        for (var prr = 0; prr < pcrun; prr++) {
          var prgfc = u32(wdv, ppage + prr * 4);
          var prgfcNext = u32(wdv, ppage + (prr + 1) * 4);
          var bx = wd[ppage + (pcrun + 1) * 4 + prr * 13];
          if (bx === 0) continue;
          var papxOff = ppage + bx * 2;
          var cw = wd[papxOff], grpStart;
          if (cw !== 0) { grpStart = papxOff + 1; } else { cw = wd[papxOff + 1]; grpStart = papxOff + 2; }
          var grpEnd = grpStart + cw * 2 - (wd[papxOff] !== 0 ? 1 : 0);
          var jc = -1, fInTable = false, fTtp = false, rowDef = null;
          walkSprms(wd, wdv, grpStart + 2 /* skip istd */, grpEnd, function (sprm, opOff) {
            if (sprm === 0x2403 || sprm === 0x2461) jc = wd[opOff];    // sprmPJc80 / sprmPJc
            else if (sprm === 0x2416) fInTable = wd[opOff] === 1;      // sprmPFInTable
            else if (sprm === 0x2417) fTtp = wd[opOff] === 1;          // sprmPFTtp
            else if (sprm === 0xD608) rowDef = parseTDefTable(opOff);  // sprmTDefTable
          });
          if (jc >= 0 && jc <= 3 || fInTable || fTtp) {
            fcRangeToCp(prgfc, prgfcNext, function (cpS, cpE) {
              for (var cc3 = cpS; cc3 < cpE; cc3++) {
                if (jc >= 0 && jc <= 3) alignByCp[cc3] = jc;
                if (fInTable) inTableByCp[cc3] = 1;
                if (fTtp) {
                  ttpByCp[cc3] = 1;
                  if (rowDef) rowDefByCp[cc3] = rowDef;
                }
              }
            });
          }
        }
      }
    }

    /* ----- images: blip decoding ----- */
    // OfficeArt blip record -> { ext, bytes, compressed } or null.
    function decodeBlip(bytes, bdv, off) {
      var vi = u16(bdv, off), rt = u16(bdv, off + 2), rl = u32(bdv, off + 4);
      var inst = vi >> 4, payload = off + 8, endB = off + 8 + rl;
      if (endB > bytes.length) return null;
      var RASTER = { 0xF01D: "jpeg", 0xF01E: "png", 0xF01F: "dib", 0xF029: "tiff" };
      var META = { 0xF01A: "emf", 0xF01B: "wmf" };
      if (RASTER[rt]) {
        var dual = inst === 0x46B || inst === 0x6E1 || inst === 0x7A9 || inst === 0x6E5;
        var s = payload + 16 + (dual ? 16 : 0) + 1;   // UID(s) + tag byte
        if (s >= endB) return null;
        var raw = bytes.slice(s, endB);
        if (RASTER[rt] === "dib") return { ext: "bmp", bytes: dibToBmp(raw), compressed: false };
        return { ext: RASTER[rt], bytes: raw, compressed: false };
      }
      if (META[rt]) {
        var dual2 = inst === 0x3D5 || inst === 0x217;
        var mh = payload + 16 + (dual2 ? 16 : 0);      // metafile header: 34 bytes
        if (mh + 34 > endB) return null;
        var cbSave = u32(bdv, mh + 28);
        var compression = bytes[mh + 32];
        var raw2 = bytes.slice(mh + 34, Math.min(mh + 34 + cbSave, endB));
        return { ext: META[rt], bytes: raw2, compressed: compression === 0 };
      }
      return null;
    }
    function dibToBmp(dib) {
      var dv2 = new DataView(dib.buffer, dib.byteOffset, dib.byteLength);
      var headerSize = u32(dv2, 0);
      var bitCount = u16(dv2, 14);
      var clrUsed = headerSize >= 36 ? u32(dv2, 32) : 0;
      var palette = bitCount <= 8 ? (clrUsed || (1 << bitCount)) : clrUsed;
      var offBits = 14 + headerSize + palette * 4;
      var out = new Uint8Array(14 + dib.length);
      var odv = new DataView(out.buffer);
      out[0] = 0x42; out[1] = 0x4D;                    // "BM"
      odv.setUint32(2, out.length, true);
      odv.setUint32(10, offBits, true);
      out.set(dib, 14);
      return out;
    }
    // Walk OfficeArt records in [start,end): descend containers, resolve
    // FBSEs (embedded blip after 36-byte header, or delayed blip in the
    // WordDocument stream via foDelay), return first blip found.
    function findBlip(bytes, bdv, start, endB) {
      var off = start;
      while (off + 8 <= endB) {
        var vi = u16(bdv, off), rt = u16(bdv, off + 2), rl = u32(bdv, off + 4);
        if (rt >= 0xF01A && rt <= 0xF029) {
          var b = decodeBlip(bytes, bdv, off);
          if (b) return b;
        } else if (rt === 0xF007) {
          var b2 = resolveFbse(bytes, bdv, off, rl);
          if (b2) return b2;
        } else if ((vi & 0xF) === 0xF) {
          var b3 = findBlip(bytes, bdv, off + 8, Math.min(off + 8 + rl, endB));
          if (b3) return b3;
        }
        off += 8 + rl;
        if (rl === 0 && (vi & 0xF) !== 0xF) break;
      }
      return null;
    }
    function resolveFbse(bytes, bdv, off, rl) {
      if (rl > 36) {                                   // embedded blip follows FBSE header
        return decodeBlip(bytes, bdv, off + 8 + 36);
      }
      var foDelay = u32(bdv, off + 8 + 28);            // delayed: offset in WordDocument
      if (foDelay > 0 && foDelay + 8 < wd.length) {
        return decodeBlip(wd, wdv, foDelay);
      }
      return null;
    }
    // Inline picture: PICF structure in the Data stream at fcPic.
    function parsePicf(fcPic) {
      if (!dataStream || fcPic == null || fcPic + 68 > dataStream.length) return null;
      var lcb = u32(ddvData, fcPic);
      var cbHeader = u16(ddvData, fcPic + 4);
      if (lcb < cbHeader || fcPic + lcb > dataStream.length) return null;
      var dxaGoal = u16(ddvData, fcPic + 28), dyaGoal = u16(ddvData, fcPic + 30);
      var mx = u16(ddvData, fcPic + 32) || 1000, my = u16(ddvData, fcPic + 34) || 1000;
      var blip = findBlip(dataStream, ddvData, fcPic + cbHeader, fcPic + lcb);
      if (!blip) return null;
      blip.wTwips = Math.max(1, Math.round((dxaGoal || 1440) * mx / 1000));
      blip.hTwips = Math.max(1, Math.round((dyaGoal || 1440) * my / 1000));
      return blip;
    }
    /* ----- floating shapes: BStore blips + spid->pib + anchors ----- */
    var floatingByCp = {};
    (function () {
      var fcDgg = u32(wdv, 0x022A), lcbDgg = u32(wdv, 0x022E);
      if (!lcbDgg || fcDgg + lcbDgg > table.length) return;
      var bstore = [], spidToPib = {};
      (function harvest(start, endB) {
        var off = start;
        while (off + 8 <= endB) {
          var vi = u16(tdv, off), rt = u16(tdv, off + 2), rl = u32(tdv, off + 4);
          if (rt < 0xF000 || rt > 0xF1FF) { off += 1; continue; }  // resync (dgglbl bytes etc.)
          if (rt === 0xF007) {
            bstore.push(resolveFbse(table, tdv, off, rl));
          } else if (rt === 0xF004) {                  // SpContainer: pair spid + pib
            var spid = null, pib = null, so = off + 8, sEnd = off + 8 + rl;
            while (so + 8 <= sEnd) {
              var svi = u16(tdv, so), srt = u16(tdv, so + 2), srl = u32(tdv, so + 4);
              if (srt === 0xF00A) spid = u32(tdv, so + 8);
              if (srt === 0xF00B) {
                var cnt = svi >> 4, po = so + 8;
                for (var oi = 0; oi < cnt && po + 6 <= sEnd; oi++) {
                  var opid = u16(tdv, po), val = u32(tdv, po + 2);
                  if ((opid & 0x3FFF) === 260) pib = val;
                  po += 6;
                }
              }
              so += 8 + srl;
              if (srl === 0 && (svi & 0xF) !== 0xF) break;
            }
            if (spid != null && pib != null) spidToPib[spid] = pib;
          } else if ((vi & 0xF) === 0xF) {
            harvest(off + 8, Math.min(off + 8 + rl, endB));
          } else if (rl === 0) break;
          off += 8 + rl;
        }
      })(fcDgg, fcDgg + lcbDgg);
      var fcSpa = u32(wdv, 0x01DA), lcbSpa = u32(wdv, 0x01DE);
      if (!lcbSpa || fcSpa + lcbSpa > table.length) return;
      var nSpa = Math.floor((lcbSpa - 4) / 30);
      for (var si = 0; si < nSpa; si++) {
        var cp = u32(tdv, fcSpa + si * 4);
        var spid2 = u32(tdv, fcSpa + (nSpa + 1) * 4 + si * 26);
        var pib2 = spidToPib[spid2];
        if (pib2 != null && bstore[pib2 - 1]) {
          var img = bstore[pib2 - 1];
          // SPA rectangle: spid(4) then left/top/right/bottom int32 twips
          var spaOff = fcSpa + (nSpa + 1) * 4 + si * 26;
          var L = tdv.getInt32(spaOff + 4, true), T = tdv.getInt32(spaOff + 8, true);
          var R = tdv.getInt32(spaOff + 12, true), B = tdv.getInt32(spaOff + 16, true);
          var w = R - L, h = B - T;
          img.wTwips = (w > 0 && w < 200000) ? w : (img.wTwips || 2880);
          img.hTwips = (h > 0 && h < 200000) ? h : (img.hTwips || 2160);
          floatingByCp[cp] = img;
        }
      }
    })();

    /* ----- assemble styled blocks ----- */
    return assemble(chars, propIdx, alignByCp, propsList, fonts, parsePicf, floatingByCp,
                    inTableByCp, ttpByCp, rowDefByCp);
  }

  var ALIGN = ["left", "center", "right", "justify"];

  function assemble(chars, propIdx, alignByCp, propsList, fonts, parsePicf, floatingByCp,
                    inTableByCp, ttpByCp, rowDefByCp) {
    parsePicf = parsePicf || function () { return null; };
    floatingByCp = floatingByCp || {};
    inTableByCp = inTableByCp || new Int8Array(chars.length);
    ttpByCp = ttpByCp || new Int8Array(chars.length);
    rowDefByCp = rowDefByCp || {};

    var blocks = [];
    var runs = [], curText = "", curIdx = -1;
    var cellParas = null, curRow = null, curTable = null;
    var inField = false;

    function flushRun() {
      if (curText) runs.push({ text: curText, props: propsList[curIdx] || {} });
      curText = "";
    }
    function makePara(alignCode) {
      var p = { align: ALIGN[alignCode] || "left", runs: runs };
      runs = []; curIdx = -1;
      return p;
    }
    function closeTable() {
      if (curRow && curRow.cells.length) curTable.rows.push(curRow);
      if (curTable && curTable.rows.length) blocks.push(curTable);
      curTable = null; curRow = null; cellParas = null;
    }
    function ensureCell() {
      if (!curTable) curTable = { type: "table", rows: [] };
      if (!curRow) curRow = { cells: [], widths: null, bordered: true };
      if (!cellParas) cellParas = [];
    }

    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i], code = ch ? ch.charCodeAt(0) : 0;
      var inTbl = inTableByCp[i] === 1;

      if (floatingByCp[i]) {
        flushRun(); curIdx = -1;
        runs.push({ image: floatingByCp[i], props: {} });
      }
      if (code === 0x01) {
        var rp = propsList[propIdx[i]] || {};
        var img = parsePicf(rp.fcPic);
        if (img) { flushRun(); curIdx = -1; runs.push({ image: img, props: {} }); }
        continue;
      }
      if (code === 0x13) { inField = true; continue; }
      if (code === 0x14 || code === 0x15) { inField = false; continue; }
      if (inField) continue;

      if (code === 0x07 && inTbl) {
        flushRun();
        if (ttpByCp[i]) {                          // row mark
          ensureCell();
          if (cellParas.length || runs.length) {   // stray content before mark
            if (runs.length) cellParas.push(makePara(alignByCp[i]));
            if (cellParas.length) curRow.cells.push(cellParas);
          }
          var def = rowDefByCp[i];
          if (def) { curRow.widths = def.widths; curRow.bordered = def.bordered; }
          curTable.rows.push(curRow);
          curRow = null; cellParas = null;
          runs = []; curIdx = -1;
        } else {                                   // cell mark
          ensureCell();
          cellParas.push(makePara(alignByCp[i]));
          curRow.cells.push(cellParas);
          cellParas = null;
        }
        continue;
      }
      if (code === 0x0D || code === 0x0B || code === 0x0C) {
        flushRun();
        if (inTbl) {                               // paragraph break inside a cell
          ensureCell();
          cellParas.push(makePara(alignByCp[i]));
        } else {
          if (curTable) closeTable();
          var p2 = makePara(alignByCp[i]);
          p2.type = "p";
          blocks.push(p2);
        }
        continue;
      }
      if (!inTbl && curTable) closeTable();
      if (code === 0x1E) { ch = "-"; }
      else if (code === 0x09) { ch = "\t"; }
      else if (code < 0x20) { continue; }
      if (propIdx[i] !== curIdx) { flushRun(); curIdx = propIdx[i]; }
      curText += ch;
    }
    flushRun();
    if (curTable) closeTable();
    if (runs.length) { var pl = makePara(0); pl.type = "p"; blocks.push(pl); }

    while (blocks.length) {
      var last = blocks[blocks.length - 1];
      if (last.type === "p" &&
          (last.runs.length === 0 ||
           last.runs.every(function (r) { return !r.image && !r.text.trim(); }))) blocks.pop();
      else break;
    }
    return { blocks: blocks, fonts: fonts };
  }

  function legacyResult(text) {
    var blocks = text.split(/[\r\x0B\x0C]/).map(function (t) {
      return { type: "p", align: "left",
               runs: t ? [{ text: t.replace(/[\x00-\x08\x0E-\x1F]/g, ""), props: {} }] : [] };
    });
    while (blocks.length && (!blocks[blocks.length - 1].runs.length ||
           !blocks[blocks.length - 1].runs[0].text.trim())) blocks.pop();
    return { blocks: blocks, fonts: [] };
  }

  return { extract: extract };
})();
