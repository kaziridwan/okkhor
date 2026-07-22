#!/usr/bin/env python3
"""Assemble docs/index.html from src/.

The app is a single HTML file: src/template.html contains the UI and app
logic, with a /*__ENGINE__*/ placeholder inside a <script> block. This
script replaces the placeholder with the three JS modules in load order
(engine, doc-extract, doc-convert) and writes docs/index.html.

Run from anywhere:  python3 scripts/assemble.py
Then syntax-check:  python3 scripts/assemble.py --check   (requires node)
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
OUT = ROOT / "docs" / "index.html"

def build() -> str:
    tpl = (SRC / "template.html").read_text(encoding="utf-8")
    assert "/*__ENGINE__*/" in tpl, "template.html is missing the /*__ENGINE__*/ placeholder"
    payload = "\n".join(
        (SRC / name).read_text(encoding="utf-8")
        for name in ("engine.js", "doc-extract.js", "doc-convert.js")
    )
    return tpl.replace("/*__ENGINE__*/", payload)

def check(html: str) -> bool:
    ok = True
    for i, block in enumerate(re.findall(r"<script>(.*?)</script>", html, re.S)):
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
            f.write(block)
            path = f.name
        r = subprocess.run(["node", "--check", path], capture_output=True, text=True)
        print(f"script block {i}:", "OK" if r.returncode == 0 else r.stderr[:400])
        ok = ok and r.returncode == 0
    return ok

if __name__ == "__main__":
    html = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT} ({len(html)} bytes)")
    if "--check" in sys.argv and not check(html):
        sys.exit(1)
