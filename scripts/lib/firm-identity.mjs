/** Exact firm identity. "Tradeify" and "Tradeify 247" are different firms. */

export function exactFirmName(raw) {
  return String(raw || '').trim();
}

export function slugifyFirmIdentity(name) {
  return exactFirmName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function filenameSlugFromUrl(url) {
  const file = decodeURIComponent(String(url || '').split('/').pop()?.split('?')[0] || '');
  return slugifyFirmIdentity(file.replace(/\.[a-z0-9]+$/i, ''));
}

/**
 * True when a sheet logo URL belongs to a *different* firm identity.
 * "Tradeify 247.webp" must not replace Tradeify's logo.
 * A more specific firm (Tradeify 247) may still use a filename that starts
 * with the shorter name.
 */
export function logoConflictsWithOtherFirm(firmName, url, knownNames = []) {
  if (!/^https?:\/\//i.test(String(url || ''))) return false;
  const fileSlug = filenameSlugFromUrl(url);
  if (!fileSlug) return false;
  const self = slugifyFirmIdentity(firmName);
  for (const other of knownNames) {
    const o = slugifyFirmIdentity(other);
    if (!o || o === self) continue;
    if (self.startsWith(`${o}-`)) continue;
    if (fileSlug === o || fileSlug.startsWith(`${o}-`)) return true;
  }
  return false;
}

export function similarFirmNameWarnings(names) {
  const list = [...new Set([...names].map(exactFirmName).filter(Boolean))];
  const warnings = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      if (a.startsWith(`${b} `) || b.startsWith(`${a} `)) {
        warnings.push(
          `"${a}" and "${b}" stay separate firms — similar names are not merged.`
        );
      }
    }
  }
  return warnings;
}

export function unusedMetaFirmNames(metaMap, existingNames) {
  const have = new Set([...existingNames].map(exactFirmName));
  return [...metaMap.keys()].filter(name => !have.has(exactFirmName(name)));
}
