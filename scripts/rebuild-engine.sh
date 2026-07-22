#!/bin/bash
# Rebuild src/engine.js from the upstream bijoy2unicode npm package.
#
# src/engine.js is COMMITTED — you only need this script when upgrading the
# upstream converter. It downloads the package, wraps its dist/docx.js
# (which inlines the core converter) in an IIFE assigned to
# window.BijoyEngine, appends the scan helpers from dist/index.js that
# docx.js doesn't include (src/scan-fns.js holds the extracted copy), and
# exports the symbols the app uses.
#
# Usage: bash scripts/rebuild-engine.sh
set -euo pipefail
cd "$(dirname "$0")/.."

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
(cd "$WORK" && npm pack bijoy2unicode@1.0.2 --silent && tar xzf bijoy2unicode-*.tgz)
PKG="$WORK/package"

# If upgrading past 1.0.2: refresh src/scan-fns.js with the scanUnmapped /
# isSuspiciousLeftover / describeCodepoint functions from dist/index.js
# (they are absent from dist/docx.js), then update the version pins here
# and in the exports line below if the API changed.

{
  echo "/* Bijoy-to-Unicode engine, bundled from bijoy2unicode v1.0.2 (MIT, Md. Jehad / JehadurRE, github.com/JehadurRE/Bijoy2Unicode) */"
  echo "window.BijoyEngine = (function(){"
  sed -e "s/^import JSZip from 'jszip';//" -e "s/^export {.*//" "$PKG/dist/docx.js" | sed '/sourceMappingURL/d'
  cat src/scan-fns.js
  echo "return { convertDocx, convertFile, convertHtml, convertOdt, convertRtf, convertTxt, detectExt, suggestOutputName, convertBijoyToUnicode, looksLikeBijoy, hasBengaliUnicode, scanUnmapped, isSuspiciousLeftover, describeCodepoint, countBijoyBigrams, looksLikeEnglish, fontIsBijoyName, fontIsUnicodeBangla };"
  echo "})();"
} > src/engine.js
node --check src/engine.js && echo "src/engine.js rebuilt and syntax-checked"
