/** Live Prop Firm Genie firm pages: https://propfirmgenie.com/firm/{slug} */

export const GENIE_FIRM_BASE = 'https://propfirmgenie.com/firm';

/**
 * Official PFG slugs where they differ from slugify(firm name).
 * Verified against live /firm/* routes and PFG CMS firmSlug values.
 */
export const GENIE_FIRM_SLUGS = {
  'Apex Trader Funding': 'apex',
  'DayTraders': 'day-traders',
  'E8 Futures': 'e8-markets-futures',
  'FundedNext Futures': 'funded-next-futures',
  'Legends Trading': 'legends',
  'Phidias Propfirm': 'phidias',
};

export function slugifyFirmName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function genieFirmSlug(name) {
  return GENIE_FIRM_SLUGS[name] || slugifyFirmName(name);
}

export function genieFirmUrl(name) {
  const slug = genieFirmSlug(name);
  return slug ? `${GENIE_FIRM_BASE}/${slug}` : '';
}
