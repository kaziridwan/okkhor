/* Bijoy-to-Unicode engine, bundled from bijoy2unicode v1.0.2 (MIT, Md. Jehad / JehadurRE, github.com/JehadurRE/Bijoy2Unicode) */
window.BijoyEngine = (function(){


// src/docx.ts

// src/core.ts
var buildMap = (raw) => Object.entries(raw).map(([k, v]) => [
  new RegExp(escapeForRegex(k), "g"),
  v
]);
function escapeForRegex(literal) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var preConversionMap = buildMap({
  "  ": " ",
  yy: "y",
  vv: "v",
  "\xAD\xAD": "\xAD",
  "y&": "y",
  "\u201E&": "\u201E",
  "\u2021u": "u\u2021",
  wu: "uw",
  " ,": ",",
  " |": "|",
  "\\ ": "",
  " \\": "",
  "\\": "",
  "\n ": "\n",
  " \n": "\n",
  "\n\n\n\n\n": "\n\n",
  "\n\n\n\n": "\n\n",
  "\n\n\n": "\n\n"
});
var conversionMap = buildMap({
  // ---- Multi-character sequences first ----
  // These must run before the single-byte mappings below, otherwise the
  // single-byte mapping on the second char of a sequence would consume
  // it (e.g. `iæ` → `রু` must match before `æ` → `ু`).
  // Some entries are inherited from earlier converters; many are original
  // additions for real-world Sutonny MJ documents.
  "i\xE6": "\u09B0\u09C1",
  "i\u201C": "\u09B0\u09C1",
  // ru with smart-quote variant
  "i\u0192": "\u09B0\u09C2",
  // rū
  "M\xF8": "\u0997\u09CD\u09B2",
  "\u201DQ\xA6": "\u099A\u09CD\u099B\u09CD\u09AC",
  "c\xF8": "\u09AA\u09CD\u09B2",
  "e\xF8": "\u09AC\u09CD\u09B2",
  "k\xF8": "\u09B6\u09CD\u09B2",
  "\xA4\xF8": "\u09AE\u09CD\u09B2",
  "\xAF\xF8": "\u09B8\u09CD\u09B2",
  "\xE5\u201C": "\u09AD\u09CD\u09B0\u09C1",
  // 'Í' (U+00CD) is a Sutonny MJ alternate for '—' (em-dash) used in
  // ন্ত / স্ত / ক্ত style conjuncts. Map every prefix-pair first, then the
  // remaining bare 'Í' falls through to the single-byte map below.
  "\xAF\xCD": "\u09B8\u09CD\u09A4",
  // ¯Í -> স্ত
  "\u0161\xCD": "\u09A8\u09CD\u09A4",
  // šÍ -> ন্ত
  "\xAF\xCD\xA1": "\u09B8\u09CD\u09A4\u09CD\u09AC",
  // ¯Í¡ -> স্ত্ব
  "\u0161\xCD\xA1": "\u09A8\u09CD\u09A4\u09CD\u09AC",
  // šÍ¡ -> ন্ত্ব
  "\xCB\xA1": "\u09A4\u09CD\u09A4\u09CD\u09AC",
  // Ë¡ overrides the single-byte Ë mapping
  "\\\\": "\u0965",
  // ---- Vowels (Av must come before A) ----
  Av: "\u0986",
  A: "\u0985",
  B: "\u0987",
  C: "\u0988",
  D: "\u0989",
  E: "\u098A",
  F: "\u098B",
  G: "\u098F",
  H: "\u0990",
  I: "\u0993",
  J: "\u0994",
  // Consonants
  K: "\u0995",
  L: "\u0996",
  M: "\u0997",
  N: "\u0998",
  O: "\u0999",
  P: "\u099A",
  Q: "\u099B",
  R: "\u099C",
  S: "\u099D",
  T: "\u099E",
  U: "\u099F",
  V: "\u09A0",
  W: "\u09A1",
  X: "\u09A2",
  Y: "\u09A3",
  Z: "\u09A4",
  _: "\u09A5",
  "`": "\u09A6",
  a: "\u09A7",
  b: "\u09A8",
  c: "\u09AA",
  d: "\u09AB",
  e: "\u09AC",
  f: "\u09AD",
  g: "\u09AE",
  h: "\u09AF",
  i: "\u09B0",
  j: "\u09B2",
  k: "\u09B6",
  l: "\u09B7",
  m: "\u09B8",
  n: "\u09B9",
  o: "\u09DC",
  // ড় (precomposed)
  p: "\u09DD",
  // ঢ় (precomposed)
  q: "\u09DF",
  // য় (precomposed)
  r: "\u09CE",
  s: "\u0982",
  t: "\u0983",
  u: "\u0981",
  // Numbers
  "0": "\u09E6",
  "1": "\u09E7",
  "2": "\u09E8",
  "3": "\u09E9",
  "4": "\u09EA",
  "5": "\u09EB",
  "6": "\u09EC",
  "7": "\u09ED",
  "8": "\u09EE",
  "9": "\u09EF",
  // Kars
  "\u2022": "\u0999\u09CD",
  v: "\u09BE",
  w: "\u09BF",
  x: "\u09C0",
  y: "\u09C1",
  z: "\u09C1",
  "\u201C": "\u09C1",
  "\u2013": "\u09C1",
  "~": "\u09C2",
  "\u0192": "\u09C2",
  "\u201A": "\u09C2",
  "\u201E\u201E": "\u09C3",
  "\u201E": "\u09C3",
  "\u2026": "\u09C3",
  "\u2020": "\u09C7",
  "\u2021": "\u09C7",
  "\u02C6": "\u09C8",
  "\u2030": "\u09C8",
  "\u0160": "\u09D7",
  "|": "\u0964",
  "&": "\u09CD\u200C",
  // Conjuncts
  "^": "\u09CD\u09AC",
  "\u2018": "\u09CD\u09A4\u09C1",
  "\u2019": "\u09CD\u09A5",
  "\u2039": "\u09CD\u0995",
  "\u0152": "\u09CD\u0995\u09CD\u09B0",
  "\u201D": "\u099A\u09CD",
  "\u2014": "\u09CD\u09A4",
  "\u02DC": "\u09A6\u09CD",
  "\u2122": "\u09A6\u09CD",
  "\u0161": "\u09A8\u09CD",
  "\u203A": "\u09A8\u09CD",
  "\u0153": "\u09CD\u09A8",
  "\u0178": "\u09CD\u09AC",
  "\xA1": "\u09CD\u09AC",
  "\xA2": "\u09CD\u09AD",
  "\xA3": "\u09CD\u09AD\u09CD\u09B0",
  "\xA4": "\u09AE\u09CD",
  "\xA5": "\u09CD\u09AE",
  "\xA6": "\u09CD\u09AC",
  "\xA7": "\u09CD\u09AE",
  "\xA8": "\u09CD\u09AF",
  "\xA9": "\u09B0\u09CD",
  "\xAA": "\u09CD\u09B0",
  "\xAB": "\u09CD\u09B0",
  "\xAC": "\u09CD\u09B2",
  "\xAD": "\u09CD\u09B2",
  "\xAE": "\u09B7\u09CD",
  "\xAF": "\u09B8\u09CD",
  "\xB0": "\u0995\u09CD\u0995",
  "\xB1": "\u0995\u09CD\u099F",
  "\xB2": "\u0995\u09CD\u09B7\u09CD\u09A3",
  "\xB3": "\u0995\u09CD\u09A4",
  "\xB4": "\u0995\u09CD\u09AE",
  "\xB5": "\u0995\u09CD\u09B0",
  "\xB6": "\u0995\u09CD\u09B7",
  "\xB7": "\u0995\u09CD\u09B8",
  "\xB8": "\u0997\u09C1",
  "\xB9": "\u099C\u09CD\u099E",
  "\xBA": "\u0997\u09CD\u09A6",
  "\xBB": "\u0997\u09CD\u09A7",
  "\xBC": "\u0999\u09CD\u0995",
  "\xBD": "\u0999\u09CD\u0997",
  "\xBE": "\u099C\u09CD\u099C",
  "\xBF": "\u09CD\u09A4\u09CD\u09B0",
  "\xC0": "\u099C\u09CD\u099D",
  "\xC1": "\u099C\u09CD\u099E",
  "\xC2": "\u099E\u09CD\u099A",
  "\xC3": "\u099E\u09CD\u099B",
  "\xC4": "\u099E\u09CD\u099C",
  "\xC5": "\u099E\u09CD\u099D",
  "\xC6": "\u099F\u09CD\u099F",
  "\xC7": "\u09A1\u09CD\u09A1",
  "\xC8": "\u09A3\u09CD\u099F",
  "\xC9": "\u09A3\u09CD\u09A0",
  "\xCA": "\u09A3\u09CD\u09A1",
  "\xCB": "\u09A4\u09CD\u09A4",
  "\xCC": "\u09A4\u09CD\u09A5",
  "\xCD": "\u09A4\u09CD\u09AE",
  "\xCE": "\u09A4\u09CD\u09B0",
  "\xCF": "\u09A6\u09CD\u09A6",
  "\xD0": "-",
  "\xD1": "-",
  "\xD2": '"',
  "\xD3": '"',
  "\xD4": "'",
  "\xD5": "'",
  "\xD6": "\u09CD\u09B0",
  "\xD7": "\u09A6\u09CD\u09A7",
  "\xD8": "\u09A6\u09CD\u09AC",
  "\xD9": "\u09A6\u09CD\u09AE",
  "\xDA": "\u09A8\u09CD\u09A0",
  "\xDB": "\u09A8\u09CD\u09A1",
  "\xDC": "\u09A8\u09CD\u09A7",
  "\xDD": "\u09A8\u09CD\u09B8",
  "\xDE": "\u09AA\u09CD\u099F",
  "\xDF": "\u09AA\u09CD\u09A4",
  "\xE0": "\u09AA\u09CD\u09AA",
  "\xE1": "\u09AA\u09CD\u09B8",
  "\xE2": "\u09AC\u09CD\u099C",
  "\xE3": "\u09AC\u09CD\u09A6",
  "\xE4": "\u09AC\u09CD\u09A7",
  "\xE5": "\u09AD\u09CD\u09B0",
  "\xE6": "\u09C1",
  // æ — u-kar variant (matches Sutonny MJ usage and bnwebtools).
  // The rare ম্ন conjunct uses other byte sequences (e.g. gœ).
  "\xE7": "\u09AE\u09CD\u09AB",
  "\xE8": "\u09CD\u09A8",
  "\xE9": "\u09B2\u09CD\u0995",
  "\xEA": "\u09B2\u09CD\u0997",
  "\xEB": "\u09B2\u09CD\u099F",
  "\xEC": "\u09B2\u09CD\u09A1",
  "\xED": "\u09B2\u09CD\u09AA",
  "\xEE": "\u09B2\u09CD\u09AB",
  "\xEF": "\u09B6\u09C1",
  "\xF0": "\u09B6\u09CD\u099A",
  "\xF1": "\u09B6\u09CD\u099B",
  "\xF2": "\u09B7\u09CD\u09A3",
  "\xF3": "\u09B7\u09CD\u099F",
  "\xF4": "\u09B7\u09CD\u09A0",
  "\xF5": "\u09B7\u09CD\u09AB",
  "\xF6": "\u09B8\u09CD\u0996",
  "\xF7": "\u09B8\u09CD\u099F",
  "\xF8": "\u09B8\u09CD\u09A8",
  "\xF9": "\u09B8\u09CD\u09AB",
  "\xFA": "\u09CD\u09AA",
  "\xFB": "\u09B9\u09C1",
  "\xFC": "\u09B9\u09C3",
  "\xFD": "\u09B9\u09CD\u09A8",
  "\xFE": "\u09B9\u09CD\u09AE",
  // ---- Additional real-world Bijoy / Sutonny MJ encodings (alternate `ÿ`,
  // etc.). Single-byte additions only — multi-char sequences are at the top
  // of this map.
  "\xFF": "\u0995\u09CD\u09B7"
  // ÿ alternate code for ক্ষ (kkho)
});
var proConversionMap = buildMap({
  "\u09CD\u09CD": "\u09CD"
});
var postConversionMap = buildMap({
  "\u09E6\u0983": "\u09E6:",
  "\u09E7\u0983": "\u09E7:",
  "\u09E8\u0983": "\u09E8:",
  "\u09E9\u0983": "\u09E9:",
  "\u09EA\u0983": "\u09EA:",
  "\u09EB\u0983": "\u09EB:",
  "\u09EC\u0983": "\u09EC:",
  "\u09ED\u0983": "\u09ED:",
  "\u09EE\u0983": "\u09EE:",
  "\u09EF\u0983": "\u09EF:",
  " \u0983": ":",
  "\n\u0983": "\n:",
  "]\u0983": "]:",
  "[\u0983": "[:",
  "  ": " ",
  "\u0985\u09BE": "\u0986",
  "\u09CD\u200C\u09CD\u200C": "\u09CD\u200C"
});
function applyMap(text, map) {
  let out = text;
  for (const [pattern, replacement] of map) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
var HALANT = "\u09CD";
function isBanglaPreKar(c) {
  return c === "\u09BF" || c === "\u09C8" || c === "\u09C7";
}
function isBanglaPostKar(c) {
  return c === "\u09BE" || c === "\u09CB" || c === "\u09CC" || c === "\u09D7" || c === "\u09C1" || c === "\u09C2" || c === "\u09C0" || c === "\u09C3";
}
function isBanglaKar(c) {
  return isBanglaPreKar(c) || isBanglaPostKar(c);
}
function isBanglaBanjonborno(c) {
  if (!c) return false;
  return "\u0995\u0996\u0997\u0998\u0999\u099A\u099B\u099C\u099D\u099E\u099F\u09A0\u09A1\u09A2\u09A3\u09A4\u09A5\u09A6\u09A7\u09A8\u09AA\u09AB\u09AC\u09AD\u09AE\u09AF\u09B0\u09B2\u09B6\u09B7\u09B8\u09B9".includes(c) || c === "\u09A1\u09BC" || // U+09DC
  c === "\u09A2\u09BC" || // U+09DD
  c === "\u09AF\u09BC" || // U+09DF
  c === "\u09CE" || c === "\u0982" || c === "\u0983" || c === "\u0981";
}
function isBanglaNukta(c) {
  return c === "\u0981";
}
function isBanglaHalant(c) {
  return c === HALANT;
}
function isSpace(c) {
  return c === " " || c === "	" || c === "\n" || c === "\r";
}
function charAt(s, i) {
  if (i < 0 || i >= s.length) return "";
  return s.charAt(i);
}
function rearrange(input) {
  let str = input;
  let i = 0;
  while (i < str.length) {
    if (i < str.length - 1 && charAt(str, i) === "\u09B0" && isBanglaHalant(charAt(str, i + 1)) && isBanglaHalant(charAt(str, i - 1))) {
      let j = 1;
      while (true) {
        if (i - j < 0) break;
        if (isBanglaBanjonborno(charAt(str, i - j)) && isBanglaHalant(charAt(str, i - j - 1))) {
          j += 2;
        } else if (j === 1 && isBanglaKar(charAt(str, i - j))) {
          j += 1;
        } else {
          break;
        }
      }
      str = str.slice(0, i - j) + charAt(str, i) + charAt(str, i + 1) + str.slice(i - j, i) + str.slice(i + 2);
      i += 1;
      continue;
    }
    i += 1;
  }
  i = 0;
  while (i < str.length - 1) {
    if (charAt(str, i) === "\u09B0" && isBanglaHalant(charAt(str, i + 1)) && i > 0 && // Previous char must be a banjonborno that does NOT itself form a
    // halanted conjunct head (otherwise it's `র + ্ + halant` and the
    // first pass already handled it).
    isBanglaBanjonborno(charAt(str, i - 1)) && !isBanglaHalant(charAt(str, i - 2)) && // The reph must be at end of cluster — meaning the next char after
    // the halant must NOT be the start of a new halanted conjunct.
    // Specifically, block only if (i+2, i+3) is consonant + halant —
    // that pattern means the reph is genuinely in the middle of a
    // multi-consonant cluster and should be left alone.
    !(isBanglaBanjonborno(charAt(str, i + 2)) && isBanglaHalant(charAt(str, i + 3)))) {
      let j = 1;
      while (true) {
        if (i - j - 1 < 0) break;
        if (isBanglaBanjonborno(charAt(str, i - j - 1)) && isBanglaHalant(charAt(str, i - j))) {
          j += 2;
        } else {
          break;
        }
      }
      str = str.slice(0, i - j) + charAt(str, i) + // র
      charAt(str, i + 1) + // halant
      str.slice(i - j, i) + // the cluster
      str.slice(i + 2);
      i += 2;
      continue;
    }
    i += 1;
  }
  str = applyMap(str, proConversionMap);
  i = 0;
  while (i < str.length) {
    if (i < str.length - 1 && charAt(str, i) === "\u09B0" && isBanglaHalant(charAt(str, i + 1)) && !isBanglaHalant(charAt(str, i - 1)) && isBanglaHalant(charAt(str, i + 2))) {
      let j = 1;
      while (true) {
        if (i - j < 0) break;
        if (isBanglaBanjonborno(charAt(str, i - j)) && isBanglaHalant(charAt(str, i - j - 1))) {
          j += 2;
        } else if (j === 1 && isBanglaKar(charAt(str, i - j))) {
          j += 1;
        } else {
          break;
        }
      }
      str = str.slice(0, i - j) + charAt(str, i) + charAt(str, i + 1) + str.slice(i - j, i) + str.slice(i + 2);
      i += 1;
      continue;
    }
    if (i > 0 && charAt(str, i) === HALANT && (isBanglaKar(charAt(str, i - 1)) || isBanglaNukta(charAt(str, i - 1))) && i < str.length - 1) {
      str = str.slice(0, i - 1) + charAt(str, i) + charAt(str, i + 1) + charAt(str, i - 1) + str.slice(i + 2);
    }
    if (i > 0 && i < str.length - 1 && charAt(str, i) === HALANT && charAt(str, i - 1) === "\u09B0" && charAt(str, i - 2) !== HALANT && isBanglaKar(charAt(str, i + 1))) {
      str = str.slice(0, i - 1) + charAt(str, i + 1) + charAt(str, i - 1) + charAt(str, i) + str.slice(i + 2);
    }
    if (i < str.length - 1 && isBanglaPreKar(charAt(str, i)) && !isSpace(charAt(str, i + 1))) {
      let temp = str.slice(0, i);
      let j = 1;
      while (i + j < str.length - 1 && isBanglaBanjonborno(charAt(str, i + j))) {
        if (i + j < str.length && isBanglaHalant(charAt(str, i + j + 1))) {
          j += 2;
        } else {
          break;
        }
      }
      temp += str.slice(i + 1, i + j + 1);
      let l = 0;
      if (charAt(str, i) === "\u09C7" && charAt(str, i + j + 1) === "\u09BE") {
        temp += "\u09CB";
        l = 1;
      } else if (charAt(str, i) === "\u09C7" && charAt(str, i + j + 1) === "\u09D7") {
        temp += "\u09CC";
        l = 1;
      } else {
        temp += charAt(str, i);
      }
      temp += str.slice(i + j + l + 1);
      str = temp;
      i += j;
    }
    if (i < str.length - 1 && isBanglaNukta(charAt(str, i)) && isBanglaPostKar(charAt(str, i + 1))) {
      str = str.slice(0, i) + charAt(str, i + 1) + charAt(str, i) + str.slice(i + 2);
    }
    i += 1;
  }
  return str;
}
function convertBijoyToUnicode(src) {
  if (!src) return src;
  let out = applyMap(src, preConversionMap);
  out = applyMap(out, conversionMap);
  out = rearrange(out);
  out = applyMap(out, postConversionMap);
  return out;
}
function looksLikeBijoy(text) {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 128 && code <= 591) return true;
    if (code >= 8208 && code <= 8250) return true;
  }
  return false;
}
function hasBengaliUnicode(text) {
  if (!text) return false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 2432 && code <= 2559) return true;
  }
  return false;
}

// src/docx.ts
function decodeXmlText(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function encodeXmlText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
var BIJOY_FONT_PATTERNS = [
  /Sutonny\s*MJ/i,
  /SutonnyMJ/i,
  /SutonnyOMJ/i,
  /Sutonny\s*OMJ/i,
  /Sutonny\s*XMJ/i,
  /SutonnyXMJ/i,
  /Sulekha[a-z\s]*/i,
  /Boishakhi/i,
  /Lekhoni/i,
  /BijoyEkattor/i,
  /Bijoy[a-z0-9 ]*MJ/i,
  /[A-Za-z]+MJ\b/i,
  /\bMJ\s+[A-Za-z]+/i
];
var UNICODE_FONT_PATTERNS = [
  /Nikosh/i,
  /SolaimanLipi/i,
  /Solaiman\s*Lipi/i,
  /Kalpurush/i,
  /Siyam\s*Rupali/i,
  /Mukti/i,
  /Vrinda/i,
  /Shonar\s*Bangla/i,
  /Hind\s*Siliguri/i,
  /Noto\s*Sans\s*Bengali/i,
  /Noto\s*Serif\s*Bengali/i,
  /AdorshoLipi/i
];
var LATIN_FONT_PATTERNS = [
  /^Calibri$/i,
  /^Cambria$/i,
  /Times\s*New\s*Roman/i,
  /^Arial$/i,
  /Arial\s*Unicode\s*MS/i,
  /^Tahoma$/i,
  /^Verdana$/i,
  /^Georgia$/i,
  /^Helvetica$/i,
  /^Segoe\s*UI/i,
  /^Trebuchet\s*MS$/i,
  /^Courier\s*New$/i,
  /^Consolas$/i,
  /^Liberation/i
];
function fontIsLatin(name) {
  if (!name) return false;
  return LATIN_FONT_PATTERNS.some((p) => p.test(name));
}
function fontIsBijoyName(name) {
  if (!name) return false;
  return BIJOY_FONT_PATTERNS.some((p) => p.test(name));
}
function fontIsUnicodeBangla(name) {
  if (!name) return false;
  return UNICODE_FONT_PATTERNS.some((p) => p.test(name));
}
var UNICODE_FONT = "Nikosh";
var ALL_FONT_REGEX = (() => {
  const sources = BIJOY_FONT_PATTERNS.map((r) => r.source);
  return new RegExp(`(${sources.join("|")})`, "gi");
})();
function swapBijoyFontInBlock(s) {
  return s.replace(ALL_FONT_REGEX, UNICODE_FONT);
}
var BIJOY_BIGRAMS = /* @__PURE__ */ new Set([
  "wA",
  "wB",
  "wC",
  "wD",
  "wE",
  "wF",
  "wG",
  "wH",
  "wI",
  "wJ",
  "wK",
  "wL",
  "wM",
  "wN",
  "wO",
  "wP",
  "wQ",
  "wR",
  "wS",
  "wT",
  "wU",
  "wV",
  "wW",
  "wX",
  "wY",
  "wZ",
  "wa",
  "wb",
  "wc",
  "wd",
  "wf",
  "wg",
  "wh",
  "wj",
  "wk",
  "wl",
  "wm",
  "wn",
  "wo",
  "wp",
  "wq",
  "wr",
  "wt",
  "wv",
  "Av",
  "Bv",
  "Cv",
  "Dv",
  "Ev",
  "Fv",
  "Gv",
  "Hv",
  "Iv",
  "Jv",
  "Kv",
  "Lv",
  "Mv",
  "Nv",
  "Ov",
  "Pv",
  "Qv",
  "Sv",
  "Tv",
  "Uv",
  "Vv",
  "Wv",
  "Xv",
  "Yv",
  "Zv",
  "_v",
  "av",
  "bv",
  "cv",
  "dv",
  "ev",
  "fv",
  "gv",
  "hv",
  "iv",
  "jv",
  "kv",
  "lv",
  "mv",
  "nv",
  "ov",
  "pv",
  "qv",
  "rv",
  "tv",
  "Mz",
  "M\xAA",
  "M\u0161",
  "K\xAA",
  "P\xAA",
  "Z\xAA",
  "\xA9K",
  "\xA9M",
  "\xA9Z",
  "\xA9c",
  "\xA9e",
  "\xA9g",
  "\xA9h",
  "\xA9i",
  "\xA9k",
  "\xA9l",
  "\xA9m",
  "\xD1",
  "\u0152",
  "\u2039",
  "\u2021",
  "\xAA",
  "\xD6",
  "\u0160",
  "eK",
  "eL",
  "eM",
  "eN",
  "eP",
  "eQ",
  "eR",
  "eS",
  "eT",
  "eU",
  "eV",
  "eW",
  "eX",
  "eY",
  "eZ"
]);
function countBijoyBigrams(s) {
  let n = 0;
  for (let i = 0; i < s.length - 1; i++) {
    if (BIJOY_BIGRAMS.has(s.slice(i, i + 2))) n++;
  }
  return n;
}
function hasBijoyBigram(s) {
  return countBijoyBigrams(s) > 0;
}
var ENGLISH_HINT_WORDS = /* @__PURE__ */ new Set([
  "the",
  "of",
  "and",
  "to",
  "in",
  "is",
  "was",
  "are",
  "be",
  "by",
  "for",
  "on",
  "at",
  "with",
  "from",
  "this",
  "that",
  "as",
  "or",
  "if",
  "an",
  "a",
  "it",
  "its",
  "but",
  "not",
  "you",
  "your",
  "my",
  "our",
  "their",
  "they",
  "i",
  "we",
  "name",
  "date",
  "age",
  "year",
  "month",
  "day",
  "sir",
  "madam",
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "mister",
  "born",
  "father",
  "mother",
  "spouse",
  "son",
  "daughter",
  "family",
  "address",
  "village",
  "district",
  "thana",
  "upazila",
  "division",
  "country",
  "email",
  "phone",
  "mobile",
  "cell",
  "office",
  "home",
  "present",
  "permanent",
  "yes",
  "no",
  "male",
  "female",
  "married",
  "unmarried",
  "single",
  "total",
  "page",
  "education",
  "school",
  "college",
  "university",
  "degree",
  "class",
  "subject",
  "department",
  "branch",
  "designation",
  "post",
  "position",
  "rank",
  "grade",
  "officer",
  "officers",
  "service",
  "duty",
  "duties",
  "joining",
  "retirement",
  "passport",
  "number",
  "reg",
  "regd",
  "cert",
  "certificate",
  "training",
  "experience",
  "english",
  "bangla",
  "bengali",
  "national",
  "government",
  "ministry",
  "secretariat",
  "honorable",
  "honourable",
  "please",
  "kindly",
  "thank",
  "thanks",
  "regards",
  "yours",
  "faithfully",
  "sincerely",
  "whatsapp",
  "telephone",
  "bio",
  "data",
  "cv",
  "resume",
  "photo",
  "total",
  "sl",
  "sn",
  "ref",
  "subject",
  "ddg",
  "adg",
  "ig",
  "sp",
  "asp",
  "gen",
  "brig",
  "col",
  "lt",
  "capt",
  "major",
  "maj",
  "cmdr",
  "cmdt"
]);
function looksLikeEnglish(text) {
  const t = text.trim();
  if (!t) return false;
  if (/`/.test(t)) return false;
  if (/[~^][A-Za-z]/.test(t)) return false;
  if (/[A-Za-z]&/.test(t)) return false;
  if (/\d[A-Za-z]/.test(t)) return false;
  if (hasBijoyBigram(t)) return false;
  if (/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{3,}/.test(t)) return false;
  const lower = t.toLowerCase();
  const tokens = lower.match(/[a-z][a-z']*/g) || [];
  for (const tok of tokens) if (ENGLISH_HINT_WORDS.has(tok)) return true;
  const letters = lower.replace(/[^a-z]/g, "");
  if (letters.length === 0) return true;
  if (letters.length < 4) {
    return tokens.every((tok) => ENGLISH_HINT_WORDS.has(tok));
  }
  let vowels = 0;
  for (const c of letters) if ("aeiouy".includes(c)) vowels++;
  const ratio = vowels / letters.length;
  if (ratio < 0.35) return false;
  let earlyVowel = false;
  for (let i = 0; i < Math.min(4, letters.length); i++) {
    if ("aeiouy".includes(letters[i])) {
      earlyVowel = true;
      break;
    }
  }
  return earlyVowel;
}
var DOCX_PARTS = [
  /^word\/document\.xml$/,
  /^word\/header\d*\.xml$/,
  /^word\/footer\d*\.xml$/,
  /^word\/footnotes\.xml$/,
  /^word\/endnotes\.xml$/,
  /^word\/comments\.xml$/,
  /^word\/glossary\/document\.xml$/
];
function mergeFontRef(base, override) {
  return {
    ascii: override.ascii ?? base.ascii,
    hAnsi: override.hAnsi ?? base.hAnsi,
    cs: override.cs ?? base.cs,
    eastAsia: override.eastAsia ?? base.eastAsia
  };
}
function chooseRelevantFont(font, runText) {
  let hasNonAscii = false;
  for (let i = 0; i < runText.length; i++) {
    if (runText.charCodeAt(i) > 126) {
      hasNonAscii = true;
      break;
    }
  }
  if (hasNonAscii) {
    return font.cs ?? font.ascii ?? font.hAnsi ?? font.eastAsia;
  }
  return font.ascii ?? font.hAnsi ?? font.cs ?? font.eastAsia;
}
function fontRefIsBijoyForText(f, runText) {
  return fontIsBijoyName(chooseRelevantFont(f, runText));
}
function fontRefIsUnicodeForText(f, runText) {
  return fontIsUnicodeBangla(chooseRelevantFont(f, runText));
}
function parseRFonts(tag) {
  const out = {};
  const m = tag.match(/<w:rFonts\b([^/>]*)\/?>/);
  if (!m) return out;
  const attrs = m[1];
  const grab = (name) => {
    const am = attrs.match(new RegExp(`${name}="([^"]+)"`));
    return am ? am[1] : void 0;
  };
  out.ascii = grab("w:ascii");
  out.hAnsi = grab("w:hAnsi");
  out.cs = grab("w:cs");
  out.eastAsia = grab("w:eastAsia");
  return out;
}
function parseStylesXml(stylesXml) {
  const byId = /* @__PURE__ */ new Map();
  const styleRe = /<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g;
  let sm;
  while (sm = styleRe.exec(stylesXml)) {
    const attrs = sm[1];
    const body = sm[2];
    const idM = attrs.match(/w:styleId="([^"]+)"/);
    if (!idM) continue;
    const id = idM[1];
    const basedM = body.match(/<w:basedOn\b[^>]*w:val="([^"]+)"/);
    const fontTag = body.match(/<w:rFonts\b[^/>]*\/?>/);
    const font = fontTag ? parseRFonts(fontTag[0]) : {};
    byId.set(id, { id, basedOn: basedM?.[1], font });
  }
  let defaults = {};
  const ddM = stylesXml.match(/<w:rPrDefault\b[^>]*>([\s\S]*?)<\/w:rPrDefault>/);
  if (ddM) {
    const fontTag = ddM[1].match(/<w:rFonts\b[^/>]*\/?>/);
    if (fontTag) defaults = parseRFonts(fontTag[0]);
  }
  return { byId, defaults };
}
function resolveStyleFont(styleId, styles, defaults, visited = /* @__PURE__ */ new Set()) {
  if (!styleId) return { ...defaults };
  if (visited.has(styleId)) return { ...defaults };
  visited.add(styleId);
  const s = styles.get(styleId);
  if (!s) return { ...defaults };
  const base = resolveStyleFont(s.basedOn, styles, defaults, visited);
  return mergeFontRef(base, s.font);
}
function runBodyText(runBody) {
  const ts = runBody.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
  return ts.map((t) => decodeXmlText(t.replace(/^<w:t(?:\s[^>]*)?>|<\/w:t>$/g, ""))).join("");
}
function textHasBijoyMarkers(runBody) {
  const text = runBodyText(runBody);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 128 && c <= 591) return true;
    if (c >= 8208 && c <= 8250) return true;
  }
  return false;
}
function computeIsBijoyHeavy(xml) {
  for (const p of BIJOY_FONT_PATTERNS) {
    if (p.test(xml)) return true;
  }
  let bijoyChars = 0;
  let totalChars = 0;
  const tRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let tm;
  while (tm = tRe.exec(xml)) {
    const inner = decodeXmlText(tm[1]);
    totalChars += inner.length;
    for (let i = 0; i < inner.length; i++) {
      const c = inner.charCodeAt(i);
      if (c >= 128 && c <= 591 || c >= 8208 && c <= 8250) {
        bijoyChars++;
      }
    }
  }
  if (totalChars === 0) return false;
  return bijoyChars / totalChars > 0.05;
}
function transformDocxXml(xml, ctx, force = false, bijoyHeavy = false) {
  const paraRe = /(<w:p\b[^>]*>)([\s\S]*?)(<\/w:p>)/g;
  let out = xml.replace(paraRe, (_m, pOpen, pBody, pClose) => {
    const pPr = pBody.match(/<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/);
    const paraStyleId = pPr?.[1].match(/<w:pStyle\b[^>]*w:val="([^"]+)"/)?.[1] || null;
    const paraRPrFontTag = pPr?.[1].match(
      /<w:rPr\b[^>]*>[\s\S]*?<w:rFonts\b[^/>]*\/?>/
    );
    const paraRPrFont = paraRPrFontTag ? parseRFonts(paraRPrFontTag[0].match(/<w:rFonts\b[^/>]*\/?>/)[0]) : {};
    const paraFont = mergeFontRef(
      resolveStyleFont(paraStyleId, ctx.styles, ctx.defaults),
      paraRPrFont
    );
    const newBody = pBody.replace(
      /(<w:r\b[^>]*>)([\s\S]*?)(<\/w:r>)/g,
      (__, rOpen, rBody, rClose) => {
        const rPr = rBody.match(/<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/);
        const runStyleId = rPr?.[1].match(/<w:rStyle\b[^>]*w:val="([^"]+)"/)?.[1] || null;
        const runFontTag = rPr?.[1].match(/<w:rFonts\b[^/>]*\/?>/);
        const runFont = runFontTag ? parseRFonts(runFontTag[0]) : {};
        const effective = mergeFontRef(
          mergeFontRef(
            resolveStyleFont(runStyleId, ctx.styles, ctx.defaults),
            paraFont
          ),
          runFont
        );
        const plainText = runBodyText(rBody);
        const isBijoy = fontRefIsBijoyForText(effective, plainText);
        const isUnicode = fontRefIsUnicodeForText(effective, plainText);
        const isLatin = fontIsLatin(chooseRelevantFont(effective, plainText));
        const hasBangla = hasBengaliUnicode(plainText);
        const letterCount = (plainText.match(/[A-Za-z]/g) || []).length;
        const isShortLatinFragment = letterCount > 0 && letterCount <= 2;
        const hasHighByte = textHasBijoyMarkers(rBody);
        const hasHardBijoyMarker = hasHighByte || /`/.test(plainText);
        const bigramCount = countBijoyBigrams(plainText);
        const hasMultipleBigrams = bigramCount >= 2;
        const hasSoftBijoyMarker = /\d[A-Za-z]/.test(plainText) || bigramCount >= 1;
        let strongBijoy = hasMultipleBigrams;
        if (!strongBijoy && bigramCount === 1 && letterCount >= 3) {
          const lower = plainText.toLowerCase().replace(/[^a-z]/g, "");
          let v = 0;
          for (const c of lower) if ("aeiouy".includes(c)) v++;
          const ratio = lower.length ? v / lower.length : 0;
          if (ratio < 0.25) {
            strongBijoy = true;
          } else {
            const tokens = lower.match(/[a-z]+/g) || [];
            const allAlien = tokens.length > 0 && tokens.every((t) => !ENGLISH_HINT_WORDS.has(t) && t.length <= 6);
            if (allAlien) strongBijoy = true;
          }
        }
        let convert;
        if (hasBangla) convert = false;
        else if (hasHardBijoyMarker) convert = true;
        else if (strongBijoy) convert = true;
        else if (isBijoy) convert = true;
        else if (isLatin && !isShortLatinFragment) convert = false;
        else if (isUnicode) convert = false;
        else if (hasSoftBijoyMarker) convert = true;
        else if (force) convert = true;
        else if (bijoyHeavy && !looksLikeEnglish(plainText)) convert = true;
        else convert = false;
        if (!convert) return rOpen + rBody + rClose;
        const converted = rBody.replace(
          /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g,
          (___, o, inner, c) => {
            if (!inner) return o + inner + c;
            const decoded = decodeXmlText(inner);
            if (hasBengaliUnicode(decoded)) return o + inner + c;
            return o + encodeXmlText(convertBijoyToUnicode(decoded)) + c;
          }
        ).replace(
          /(<w:instrText(?:\s[^>]*)?>)([\s\S]*?)(<\/w:instrText>)/g,
          (___, o, inner, c) => {
            if (!inner) return o + inner + c;
            const decoded = decodeXmlText(inner);
            if (hasBengaliUnicode(decoded)) return o + inner + c;
            return o + encodeXmlText(convertBijoyToUnicode(decoded)) + c;
          }
        );
        const finalBody = swapBijoyFontInBlock(converted);
        return rOpen + finalBody + rClose;
      }
    );
    return pOpen + newBody + pClose;
  });
  out = out.replace(/<w:rFonts\b[^/>]*\/?>/g, (tag) => swapBijoyFontInBlock(tag));
  return out;
}
async function convertDocx(file, options = {}) {
  const { onProgress, force = false } = options;
  onProgress?.({ stage: "Reading file", percent: 5 });
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  onProgress?.({ stage: "Parsing styles", percent: 15 });
  let ctx = { styles: /* @__PURE__ */ new Map(), defaults: {} };
  const stylesEntry = zip.file("word/styles.xml");
  if (stylesEntry) {
    const stylesXml = await stylesEntry.async("string");
    const parsed = parseStylesXml(stylesXml);
    ctx = { styles: parsed.byId, defaults: parsed.defaults };
  }
  onProgress?.({ stage: "Scanning document parts", percent: 25 });
  let bijoyHeavy = false;
  const mainDoc = zip.file("word/document.xml");
  if (mainDoc) {
    const mainXml = await mainDoc.async("string");
    bijoyHeavy = computeIsBijoyHeavy(mainXml);
  }
  const names = Object.keys(zip.files).filter(
    (n) => DOCX_PARTS.some((re) => re.test(n))
  );
  let processed = 0;
  for (const name of names) {
    const entry = zip.file(name);
    if (!entry) continue;
    const xml = await entry.async("string");
    zip.file(name, transformDocxXml(xml, ctx, force, bijoyHeavy));
    processed++;
    onProgress?.({
      stage: `Converted ${name}`,
      percent: 25 + Math.round(processed / Math.max(1, names.length) * 60)
    });
  }
  if (stylesEntry) {
    const stylesXml = await stylesEntry.async("string");
    zip.file("word/styles.xml", swapBijoyFontInBlock(stylesXml));
  }
  onProgress?.({ stage: "Repackaging .docx", percent: 90 });
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  onProgress?.({ stage: "Done", percent: 100 });
  return blob;
}
async function convertOdt(file, options = {}) {
  const { onProgress, force = false } = options;
  onProgress?.({ stage: "Reading file", percent: 10 });
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files).filter(
    (n) => /^(content|styles|meta)\.xml$/.test(n)
  );
  onProgress?.({ stage: "Building style \u2192 font map", percent: 25 });
  const styleFontMap = /* @__PURE__ */ new Map();
  for (const name of names) {
    const entry = zip.file(name);
    if (!entry) continue;
    const xml = await entry.async("string");
    const blockRe = /<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/g;
    let m;
    while (m = blockRe.exec(xml)) {
      const nameAttr = m[1].match(/style:name="([^"]+)"/);
      const fontAttr = m[2].match(/style:font-name="([^"]+)"/);
      if (nameAttr && fontAttr) {
        styleFontMap.set(nameAttr[1], fontAttr[1]);
      }
    }
  }
  onProgress?.({ stage: "Converting text", percent: 40 });
  const textElems = /(<text:(?:p|span|h)\b)([^>]*)>([\s\S]*?)(<\/text:(?:p|span|h)>)/g;
  let processed = 0;
  for (const name of names) {
    const entry = zip.file(name);
    if (!entry) continue;
    let xml = await entry.async("string");
    xml = xml.replace(textElems, (_m, openTag, attrs, inner, close) => {
      const sm = attrs.match(/text:style-name="([^"]+)"/);
      const styleName = sm?.[1];
      const fontName = styleName ? styleFontMap.get(styleName) : null;
      const fontIsBijoy = fontIsBijoyName(fontName);
      const fontIsUnicode = fontIsUnicodeBangla(fontName);
      let convert;
      if (fontIsBijoy) convert = true;
      else if (fontIsUnicode) convert = false;
      else convert = force;
      if (!convert) return `${openTag}${attrs}>${inner}${close}`;
      const converted = inner.replace(
        /(>)([^<]+)(<)/g,
        (__, gt, txt, lt) => {
          const decoded = decodeXmlText(txt);
          if (hasBengaliUnicode(decoded)) return gt + txt + lt;
          return gt + encodeXmlText(convertBijoyToUnicode(decoded)) + lt;
        }
      );
      const finalInner = inner.includes("<") ? converted : (() => {
        const decoded = decodeXmlText(inner);
        if (hasBengaliUnicode(decoded)) return inner;
        return encodeXmlText(convertBijoyToUnicode(decoded));
      })();
      return `${openTag}${attrs}>${finalInner}${close}`;
    });
    xml = swapBijoyFontInBlock(xml);
    zip.file(name, xml);
    processed++;
    onProgress?.({
      stage: `Converted ${name}`,
      percent: 40 + Math.round(processed / Math.max(1, names.length) * 45)
    });
  }
  onProgress?.({ stage: "Repackaging .odt", percent: 90 });
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.oasis.opendocument.text",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  onProgress?.({ stage: "Done", percent: 100 });
  return blob;
}
var CP1252_TABLE = [
  8364,
  129,
  8218,
  402,
  8222,
  8230,
  8224,
  8225,
  710,
  8240,
  352,
  8249,
  338,
  141,
  381,
  143,
  144,
  8216,
  8217,
  8220,
  8221,
  8226,
  8211,
  8212,
  732,
  8482,
  353,
  8250,
  339,
  157,
  382,
  376
];
function cp1252Byte(n) {
  if (n < 128 || n > 159) return String.fromCharCode(n);
  return String.fromCharCode(CP1252_TABLE[n - 128]);
}
function rtfEscapeUnicode(s) {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code < 128) {
      if (ch === "\\" || ch === "{" || ch === "}") {
        out += "\\" + ch;
      } else {
        out += ch;
      }
    } else if (code <= 65535) {
      const signed = code > 32767 ? code - 65536 : code;
      out += `\\u${signed}?`;
    } else {
      const cp = code - 65536;
      const high = 55296 + (cp >> 10);
      const low = 56320 + (cp & 1023);
      const hs = high > 32767 ? high - 65536 : high;
      const ls = low > 32767 ? low - 65536 : low;
      out += `\\u${hs}?\\u${ls}?`;
    }
  }
  return out;
}
async function convertRtf(file, options = {}) {
  const { onProgress, force = false } = options;
  onProgress?.({ stage: "Reading file", percent: 10 });
  const text = await file.text();
  onProgress?.({ stage: "Converting RTF", percent: 40 });
  let i = 0;
  let out = "";
  let bijoyBuf = "";
  const flush = () => {
    if (!bijoyBuf) return;
    const isHighByte = looksLikeBijoy(bijoyBuf);
    const shouldConvert = force || isHighByte;
    if (!shouldConvert || hasBengaliUnicode(bijoyBuf)) {
      out += bijoyBuf;
    } else {
      const converted = convertBijoyToUnicode(bijoyBuf);
      out += rtfEscapeUnicode(converted);
    }
    bijoyBuf = "";
  };
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") {
      if (text[i + 1] === "'" && /[0-9a-fA-F]{2}/.test(text.slice(i + 2, i + 4))) {
        const byte = parseInt(text.slice(i + 2, i + 4), 16);
        bijoyBuf += cp1252Byte(byte);
        i += 4;
        continue;
      }
      if (text[i + 1] === "u" && /\d/.test(text[i + 2] ?? "")) {
        flush();
        const m = /^\\u(-?\d+)\??([^\\]?)/.exec(text.slice(i));
        if (m) {
          out += m[0];
          i += m[0].length;
          continue;
        }
      }
      flush();
      if (text[i + 1] === "\\" || text[i + 1] === "{" || text[i + 1] === "}") {
        out += text.slice(i, i + 2);
        i += 2;
        continue;
      }
      const cw = /^\\[a-zA-Z]+-?\d* ?/.exec(text.slice(i));
      if (cw) {
        out += cw[0];
        i += cw[0].length;
        continue;
      }
      out += ch;
      i++;
      continue;
    }
    if (ch === "{" || ch === "}" || ch === "\r" || ch === "\n") {
      flush();
      out += ch;
      i++;
      continue;
    }
    bijoyBuf += ch;
    i++;
  }
  flush();
  onProgress?.({ stage: "Done", percent: 100 });
  return new Blob([out], { type: "application/rtf" });
}
function inheritedFontIsBijoy(el) {
  let cur = el;
  while (cur) {
    const face = cur.getAttribute?.("face");
    if (face) {
      if (fontIsBijoyName(face)) return true;
      if (fontIsUnicodeBangla(face)) return false;
    }
    const style = cur.getAttribute?.("style") || "";
    const m = style.match(/font-family\s*:\s*([^;]+)/i);
    if (m) {
      const fams = m[1];
      if (fontIsBijoyName(fams)) return true;
      if (fontIsUnicodeBangla(fams)) return false;
    }
    cur = cur.parentElement;
  }
  return void 0;
}
async function convertHtml(file, options = {}) {
  const { onProgress, force = false } = options;
  onProgress?.({ stage: "Reading file", percent: 10 });
  const html = await file.text();
  onProgress?.({ stage: "Converting", percent: 40 });
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const walker = doc.createTreeWalker(doc.body || doc, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const t = node.nodeValue || "";
      if (t.trim()) {
        const fontIsBijoy = inheritedFontIsBijoy(node.parentElement);
        let convert;
        if (fontIsBijoy === true) convert = true;
        else if (fontIsBijoy === false) convert = false;
        else convert = force;
        if (convert && !hasBengaliUnicode(t)) {
          node.nodeValue = convertBijoyToUnicode(t);
        }
      }
      node = walker.nextNode();
    }
    doc.querySelectorAll("[style]").forEach((el) => {
      const s = (el.getAttribute("style") || "").replace(
        ALL_FONT_REGEX,
        UNICODE_FONT
      );
      el.setAttribute("style", s);
    });
    doc.querySelectorAll("font[face]").forEach((el) => {
      const s = (el.getAttribute("face") || "").replace(
        ALL_FONT_REGEX,
        UNICODE_FONT
      );
      el.setAttribute("face", s);
    });
    let head = doc.head;
    if (!head) {
      head = doc.createElement("head");
      doc.documentElement.insertBefore(head, doc.body);
    }
    if (!head.querySelector("meta[charset]")) {
      const meta = doc.createElement("meta");
      meta.setAttribute("charset", "utf-8");
      head.insertBefore(meta, head.firstChild);
    }
    const serialized = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    onProgress?.({ stage: "Done", percent: 100 });
    return new Blob([serialized], { type: "text/html;charset=utf-8" });
  }
  const out = html.replace(
    /(>)([^<]+)(<)/g,
    (_m, gt, txt, lt) => {
      if (!force) return gt + txt + lt;
      if (hasBengaliUnicode(txt)) return gt + txt + lt;
      return gt + convertBijoyToUnicode(txt) + lt;
    }
  );
  return new Blob([out], { type: "text/html;charset=utf-8" });
}
async function convertTxt(file, options = {}) {
  const { force = false } = options;
  const text = await file.text();
  const out = text.replace(/[^\r\n]+/g, (line) => {
    if (hasBengaliUnicode(line)) return line;
    if (force) return convertBijoyToUnicode(line);
    if (looksLikeBijoy(line)) return convertBijoyToUnicode(line);
    return line;
  });
  return new Blob([out], { type: "text/plain;charset=utf-8" });
}
function detectExt(name) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!m) return null;
  const ext = m[1];
  if (["docx", "odt", "rtf", "html", "htm", "txt"].includes(ext)) {
    return ext;
  }
  return null;
}
function suggestOutputName(originalName, ext) {
  const dot = originalName.lastIndexOf(".");
  const base = dot >= 0 ? originalName.slice(0, dot) : originalName;
  return `${base}-unicode.${ext}`;
}
async function convertFile(file, options = {}) {
  const ext = detectExt(file.name);
  if (!ext) {
    throw new Error(
      "Unsupported file type. Supported: .docx, .odt, .rtf, .html, .htm, .txt"
    );
  }
  let blob;
  switch (ext) {
    case "docx":
      blob = await convertDocx(file, options);
      break;
    case "odt":
      blob = await convertOdt(file, options);
      break;
    case "rtf":
      blob = await convertRtf(file, options);
      break;
    case "html":
    case "htm":
      blob = await convertHtml(file, options);
      break;
    case "txt":
      blob = await convertTxt(file, options);
      break;
  }
  return {
    blob,
    filename: suggestOutputName(file.name, ext)
  };
}


function scanUnmapped(unicodeText) {
  const out = /* @__PURE__ */ new Map();
  if (!unicodeText) return out;
  for (const ch of unicodeText) {
    if (isSuspiciousLeftover(ch)) {
      out.set(ch, (out.get(ch) ?? 0) + 1);
    }
  }
  return out;
}
function isSuspiciousLeftover(ch) {
  const code = ch.codePointAt(0);
  if (code >= 2432 && code <= 2559) return false;
  if (code >= 32 && code <= 126) return false;
  if (code === 9 || code === 10 || code === 13) return false;
  if (code === 8204 || code === 8205) return false;
  if (code === 2404 || code === 2405) return false;
  if (code >= 128 && code <= 591) return true;
  if (code >= 8208 && code <= 8250) return true;
  if (code === 338 || code === 339 || code === 352 || code === 353) return true;
  return false;
}
function describeCodepoint(ch) {
  const cp = ch.codePointAt(0);
  return "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
}
return { convertDocx, convertFile, convertHtml, convertOdt, convertRtf, convertTxt, detectExt, suggestOutputName, convertBijoyToUnicode, looksLikeBijoy, hasBengaliUnicode, scanUnmapped, isSuspiciousLeftover, describeCodepoint, countBijoyBigrams, looksLikeEnglish, fontIsBijoyName, fontIsUnicodeBangla };
})();
