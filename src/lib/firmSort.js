/** Shared A–Z compare for firm names across /firms, /challenges, and /overview. */

export function firmNameKey(value) {
  return String(value ?? '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Case-insensitive, numeric-aware name compare.
 * Empty / missing names sort last in both directions.
 */
export function compareFirmNames(a, b, dir = 'asc') {
  const left = firmNameKey(a);
  const right = firmNameKey(b);
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  const cmp = left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
  return dir === 'desc' ? -cmp : cmp;
}

export function defaultSortDir(key) {
  if (key === 'firm' || key === 'name') return 'asc';
  if (key === 'default') return 'asc';
  return 'desc';
}
