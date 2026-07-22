/* .doc → Unicode .docx pipeline, v3: formatting-aware.
 * Uses per-run font names recovered from the .doc CHPX layer for the same
 * strict font-aware detection the .docx path has; falls back to paragraph
 * heuristics only when a run has no font information. Bold, italic,
 * underline, font size, and paragraph alignment are carried into the
 * output .docx.
 */
window.DocConvert = (function () {
  var E = window.BijoyEngine;

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function runFontName(props, fonts) {
    if (props.ftc0 != null && fonts[props.ftc0]) return fonts[props.ftc0];
    if (props.ftc2 != null && fonts[props.ftc2]) return fonts[props.ftc2];
    return null;
  }

  // Paragraph-level heuristic for runs without font info (same as v2)
  function paraLooksBijoy(text, force, docIsBijoyHeavy) {
    var t = text.trim();
    if (!t || E.hasBengaliUnicode(t)) return false;
    if (force) return true;
    if (E.looksLikeBijoy(t)) return true;
    var bigrams = E.countBijoyBigrams(t);
    if (bigrams >= 2 && !E.looksLikeEnglish(t)) return true;
    if (docIsBijoyHeavy && bigrams >= 1 && !E.looksLikeEnglish(t)) return true;
    return false;
  }

  // Decide per run: "convert" | "bangla" (already Unicode) | "keep"
  function classifyRun(run, fonts, paraBijoy, force) {
    var t = run.text || "";
    if (!t.trim()) return "keep";
    if (E.hasBengaliUnicode(t)) return "bangla";
    var font = runFontName(run.props, fonts);
    if (font) {
      if (E.fontIsBijoyName(font)) return "convert";
      if (E.fontIsUnicodeBangla(font)) return "bangla";
      // Known non-Bangla font: only force overrides
      if (force) return "convert";
      // A run in e.g. Times inside a Bijoy paragraph: convert only if the
      // text itself carries Bijoy markers (mis-tagged runs are common).
      if (E.looksLikeBijoy(t) && paraBijoy) return "convert";
      return "keep";
    }
    return (force || paraBijoy) ? "convert" : "keep";
  }

  var JC = { left: null, center: "center", right: "right", justify: "both" };

  function rPrXml(props, mode, fonts) {
    var parts = [];
    if (mode === "convert" || mode === "bangla") {
      parts.push('<w:rFonts w:ascii="Nikosh" w:hAnsi="Nikosh" w:cs="Nikosh"/>');
    } else {
      var f = runFontName(props, fonts);
      if (f) parts.push('<w:rFonts w:ascii="' + esc(f) + '" w:hAnsi="' + esc(f) + '"/>');
    }
    if (props.bold) parts.push("<w:b/>");
    if (props.italic) parts.push("<w:i/>");
    if (props.ul) parts.push('<w:u w:val="single"/>');
    if (props.hps) {
      parts.push('<w:sz w:val="' + props.hps + '"/>');
      parts.push('<w:szCs w:val="' + props.hps + '"/>');
    }
    return parts.length ? "<w:rPr>" + parts.join("") + "</w:rPr>" : "";
  }

  async function inflate(bytes) {
    var tryFmt = async function (fmt) {
      var ds = new DecompressionStream(fmt);
      var stream = new Blob([bytes]).stream().pipeThrough(ds);
      return new Uint8Array(await new Response(stream).arrayBuffer());
    };
    try { return await tryFmt("deflate"); }
    catch (e) { return await tryFmt("deflate-raw"); }
  }

  function drawingXml(rid, wTwips, hTwips, id) {
    var cx = Math.max(1, wTwips * 635), cy = Math.max(1, hTwips * 635);  // twip -> EMU
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:docPr id="' + id + '" name="Picture ' + id + '"/>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:nvPicPr><pic:cNvPr id="' + id + '" name="Picture ' + id + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>' +
      '<a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }

  function runXml(text, rpr) {
    var parts = text.split("\t");
    var xml = "";
    for (var i = 0; i < parts.length; i++) {
      if (i > 0) xml += "<w:r>" + rpr + "<w:tab/></w:r>";
      if (parts[i]) {
        xml += "<w:r>" + rpr + '<w:t xml:space="preserve">' + esc(parts[i]) + "</w:t></w:r>";
      }
    }
    return xml;
  }

  var MIME = { png: "image/png", jpeg: "image/jpeg", bmp: "image/bmp",
               tiff: "image/tiff", emf: "image/x-emf", wmf: "image/x-wmf" };

  function paraXml(p) {
    var ppr = p.jc ? '<w:pPr><w:jc w:val="' + p.jc + '"/></w:pPr>' : "";
    var runs = p.runs.map(function (r) {
      return r.drawing ? r.drawing : runXml(r.text, r.rpr);
    }).join("");
    return "<w:p>" + ppr + (runs || "<w:r><w:t/></w:r>") + "</w:p>";
  }

  function tableXml(t) {
    var grid = (t.rows[0] && t.rows[0].widths) || [];
    var borders = t.rows.some(function (r) { return r.bordered; })
      ? "<w:tblBorders>" +
        ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (s) {
          return "<w:" + s + ' w:val="single" w:sz="4" w:space="0" w:color="000000"/>';
        }).join("") + "</w:tblBorders>"
      : "";
    var xml = "<w:tbl><w:tblPr>" +
      '<w:tblW w:w="0" w:type="auto"/>' + borders +
      '<w:tblLayout w:type="fixed"/></w:tblPr>';
    if (grid.length) {
      xml += "<w:tblGrid>" + grid.map(function (w) {
        return '<w:gridCol w:w="' + w + '"/>';
      }).join("") + "</w:tblGrid>";
    }
    t.rows.forEach(function (row) {
      xml += "<w:tr>";
      row.cells.forEach(function (cell, ci) {
        var w = (row.widths && row.widths[ci]) || 0;
        xml += "<w:tc><w:tcPr>" +
          (w ? '<w:tcW w:w="' + w + '" w:type="dxa"/>' : '<w:tcW w:w="0" w:type="auto"/>') +
          "</w:tcPr>" +
          (cell.map(paraXml).join("") || "<w:p/>") +
          "</w:tc>";
      });
      xml += "</w:tr>";
    });
    return xml + "</w:tbl>";
  }

  function buildDocx(blocks, media) {
    var body = blocks.map(function (b) {
      return b.type === "table" ? tableXml(b) : paraXml(b);
    }).join("");
    // A table may not be the final body element; pad with an empty paragraph.
    if (blocks.length && blocks[blocks.length - 1].type === "table") body += "<w:p/>";
    var documentXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      "<w:body>" + body + "</w:body></w:document>";

    var zip = new JSZip();
    var exts = {};
    media.forEach(function (m) { exts[m.ext] = MIME[m.ext] || "application/octet-stream"; });
    var defaults = Object.keys(exts).map(function (e) {
      return '<Default Extension="' + e + '" ContentType="' + exts[e] + '"/>';
    }).join("");
    zip.file("[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' + defaults +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      "</Types>");
    zip.file("_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>");
    if (media.length) {
      var rels = media.map(function (m) {
        return '<Relationship Id="' + m.rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + m.name + '"/>';
      }).join("");
      zip.file("word/_rels/document.xml.rels",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        rels + "</Relationships>");
      media.forEach(function (m) { zip.file("word/media/" + m.name, m.bytes); });
    }
    zip.file("word/document.xml", documentXml);
    return zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  async function convertDoc(file, options) {
    options = options || {};
    var progress = options.onProgress || function () {};
    var force = !!options.force;

    progress({ stage: "Reading file", percent: 5 });
    var buf = await file.arrayBuffer();

    progress({ stage: "Parsing .doc binary", percent: 20 });
    var extracted = window.DocExtract.extract(buf);
    var blocks = extracted.blocks;
    var fonts = extracted.fonts;
    var fontAware = fonts.length > 0;
    // Flat view of every paragraph (body + inside table cells)
    var paras = [];
    blocks.forEach(function (b) {
      if (b.type === "table") {
        b.rows.forEach(function (r) { r.cells.forEach(function (c) {
          c.forEach(function (p) { paras.push(p); });
        }); });
      } else paras.push(b);
    });

    progress({ stage: fontAware ? "Detecting Bijoy fonts" : "Detecting Bijoy text", percent: 45 });
    var bijoyish = 0, nonEmpty = 0;
    paras.forEach(function (p) {
      var t = p.runs.map(function (r) { return r.text; }).join("").trim();
      if (!t) return;
      nonEmpty++;
      var anyBijoyFont = p.runs.some(function (r) {
        var f = runFontName(r.props, fonts);
        return f && E.fontIsBijoyName(f);
      });
      if (anyBijoyFont || E.looksLikeBijoy(t) || E.countBijoyBigrams(t) >= 2) bijoyish++;
    });
    var docIsBijoyHeavy = nonEmpty > 0 && bijoyish / nonEmpty >= 0.4;

    progress({ stage: "Converting to Unicode", percent: 60 });
    var converted = 0, total = 0;
    var media = [], imgSeq = 0;
    function registerImage(img) {
      imgSeq++;
      var m = { name: "image" + imgSeq + "." + img.ext, rid: "rIdImg" + imgSeq,
                ext: img.ext, bytes: img.bytes, compressed: img.compressed };
      media.push(m);
      return drawingXml(m.rid, img.wTwips, img.hTwips, imgSeq);
    }
    function convertPara(p) {
      var joined = p.runs.map(function (r) { return r.text || ""; }).join("");
      var paraBijoy = paraLooksBijoy(joined, false, docIsBijoyHeavy) ||
        p.runs.some(function (r) {
          var f = runFontName(r.props, fonts);
          return f && E.fontIsBijoyName(f);
        });
      var outRuns = p.runs.map(function (r) {
        if (r.image) return { drawing: registerImage(r.image) };
        if (r.text.trim()) total++;
        var mode = classifyRun(r, fonts, paraBijoy, force);
        if (mode === "convert") {
          converted++;
          return { text: E.convertBijoyToUnicode(r.text), rpr: rPrXml(r.props, "convert", fonts) };
        }
        return { text: r.text, rpr: rPrXml(r.props, mode, fonts) };
      });
      return { jc: JC[p.align] || null, runs: outRuns };
    }
    var outBlocks = blocks.map(function (b) {
      if (b.type === "table") {
        return { type: "table", rows: b.rows.map(function (r) {
          return { widths: r.widths, bordered: r.bordered,
                   cells: r.cells.map(function (c) { return c.map(convertPara); }) };
        }) };
      }
      var cp = convertPara(b); cp.type = "p"; return cp;
    });

    if (media.some(function (m) { return m.compressed; })) {
      progress({ stage: "Decompressing images", percent: 78 });
      for (var mi = 0; mi < media.length; mi++) {
        if (media[mi].compressed) {
          try { media[mi].bytes = await inflate(media[mi].bytes); }
          catch (e) { media.splice(mi--, 1); }         // drop undecodable image
        }
      }
    }
    progress({ stage: "Building .docx", percent: 85 });
    var blob = await buildDocx(outBlocks, media);

    progress({ stage: "Done", percent: 100 });
    var base = file.name.replace(/\.doc$/i, "");
    return {
      blob: blob,
      filename: base + "-unicode.docx",
      textForScan: (function () {
        var lines = [];
        outBlocks.forEach(function (b) {
          if (b.type === "table") {
            b.rows.forEach(function (r) { r.cells.forEach(function (c) {
              c.forEach(function (p) {
                lines.push(p.runs.map(function (x) { return x.text || ""; }).join(""));
              });
            }); });
          } else lines.push(b.runs.map(function (x) { return x.text || ""; }).join(""));
        });
        return lines.join("\n");
      })(),
      stats: { paragraphs: paras.length, converted: converted, runs: total,
               fontAware: fontAware, images: media.length,
               tables: outBlocks.filter(function (b) { return b.type === "table"; }).length }
    };
  }

  return { convertDoc: convertDoc };
})();
