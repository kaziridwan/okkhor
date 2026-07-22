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
