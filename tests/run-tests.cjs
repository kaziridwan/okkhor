#!/usr/bin/env node
/* Regression suite for the Okkhor converter.
 *
 * Loads the three src/ modules the same way the browser does (engine first,
 * then doc-extract, then doc-convert; JSZip provided as a global) and runs
 * every fixture through the full pipeline with assertions.
 *
 *   npm install        (installs jszip, dev-only; the browser uses cdnjs)
 *   node tests/run-tests.cjs
 *
 * Note: fixtures compare against precomposed Bangla forms; the engine emits
 * precomposed য়/ড়/ঢ় (U+09DF etc.), so expectations normalise both sides.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
global.window = {};
global.JSZip = require("jszip");
for (const f of ["engine.js", "doc-extract.js", "doc-convert.js"]) {
  eval(fs.readFileSync(path.join(ROOT, "src", f), "utf8"));
}
const E = window.BijoyEngine;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  PASS", name); }
  else { fail++; console.log("  FAIL", name, detail || ""); }
}
const norm = (s) => s.replace(/\u09AF\u09BC/g, "\u09DF")
                     .replace(/\u09A1\u09BC/g, "\u09DC")
                     .replace(/\u09A2\u09BC/g, "\u09DD");
function fixture(name) {
  const buf = fs.readFileSync(path.join(ROOT, "fixtures", name));
  return new File([buf], name);
}
async function docxXml(blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return zip.file("word/document.xml").async("string");
}

(async () => {
  console.log("== text conversion ==");
  const textCases = [
    ["Avwg evsjvq Mvb MvB", "আমি বাংলায় গান গাই"],
    ["evsjv\u2021`k", "বাংলাদেশ"],
    ["\u00AF^vaxbZv", "স্বাধীনতা"],
    ["wek\u00A6we`\u00A8vjq", "বিশ্ববিদ্যালয়"],
    ["MYcÖRvZš¿x evsjv\u2021`k miKvi", "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার"],
    ["Kg©KZ©vi", "কর্মকর্তার"],
  ];
  for (const [src, want] of textCases) {
    const got = E.convertBijoyToUnicode(src);
    check(JSON.stringify(src), norm(got) === norm(want), "got " + got);
  }

  console.log("== docx path (font-aware) ==");
  {
    const r = await E.convertFile(fixture("test-bijoy.docx"));
    const xml = await docxXml(r.blob);
    check("bijoy runs converted", /আমি বাংলা/.test(xml));
    check("english preserved", /untouched/.test(xml));
    check("font swapped to Nikosh", /Nikosh/.test(xml));
  }

  console.log("== .doc pipeline ==");
  {
    const r = await window.DocConvert.convertDoc(fixture("rich2.doc"));
    const xml = await docxXml(r.blob);
    check("font-aware", r.stats.fontAware === true);
    check("mixed-para conversion", /সাহেব/.test(norm(xml)));
    check("bold preserved", xml.includes("<w:b/>"));
    check("justify preserved", xml.includes('w:val="both"'));
    check("size preserved", xml.includes('w:val="36"'));
  }
  {
    const r = await window.DocConvert.convertDoc(fixture("mixed.doc"));
    const xml = await docxXml(r.blob);
    check("unicode bangla passthrough", /আমার সোনার বাংলা/.test(xml));
    check("english fillers intact",
      (xml.match(/Filler paragraph 3\d /g) || []).length === 30);  // paragraphs 30-39, sentence repeated 3x each
    check("exactly 2 runs converted", r.stats.converted === 2, "got " + r.stats.converted);
  }
  {
    const r = await window.DocConvert.convertDoc(fixture("imgdoc.doc"));
    const zip = await JSZip.loadAsync(await r.blob.arrayBuffer());
    check("2 images", r.stats.images === 2, "got " + r.stats.images);
    const png = await zip.file("word/media/image1.png").async("uint8array");
    const emf = await zip.file("word/media/image2.emf").async("uint8array");
    check("png intact", png.length === 157 && png[0] === 0x89);
    check("emf decompressed", emf.length === 2756 && emf[0] === 1);
    check("drawings placed", ((await docxXml(r.blob)).match(/<w:drawing>/g) || []).length === 2);
  }
  {
    const r = await window.DocConvert.convertDoc(fixture("floatdoc.doc"));
    check("floating image recovered", r.stats.images === 1);
  }
  {
    const r = await window.DocConvert.convertDoc(fixture("tabledoc.doc"));
    const xml = await docxXml(r.blob);
    check("1 table", r.stats.tables === 1);
    check("3 rows / 9 cells",
      (xml.match(/<w:tr>/g) || []).length === 3 && (xml.match(/<w:tc>/g) || []).length === 9);
    check("column widths from sprmTDefTable", xml.includes('w:w="2999"'));
    check("borders detected", xml.includes("tblBorders"));
    check("bijoy cells converted", /সহকারী শিক্ষক/.test(norm(xml)));
    check("english cells preserved", /Rahim Ahmed/.test(xml));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
