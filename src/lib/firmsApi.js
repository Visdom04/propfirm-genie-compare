import { firms as staticFirms } from '@/data/firms';
import { getRuntimeFirms } from '@/lib/firmPlansSheet';
import { firmLogo } from '@/lib/firmLogos';

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function filterFirms(firms, { search, asset, page = 1, perPage = 50 } = {}) {
  let filtered = firms;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
  }
  if (asset) {
    filtered = filtered.filter(f => f.assets?.includes(asset));
  }

  const total = filtered.length;
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage).map(toSummary);

  return {
    data: pageItems,
    meta: {
      current_page: page,
      per_page: perPage,
      total,
      last_page: Math.max(1, Math.ceil(total / perPage)),
    },
  };
}

/** Sync helper — uses static catalog (build-time / fallback). */
export function listFirms(opts = {}) {
  return filterFirms(staticFirms, opts);
}

/** Prefer live Google Sheet when configured. */
export async function listFirmsAsync(opts = {}) {
  const { firms } = await getRuntimeFirms();
  return filterFirms(firms, opts);
}

export function getFirmBySlug(slug) {
  const firm = staticFirms.find(f => slugify(f.name) === slug);
  return firm ? toDetail(firm) : null;
}

export async function getFirmBySlugAsync(slug) {
  const { firms } = await getRuntimeFirms();
  const firm = firms.find(f => slugify(f.name) === slug);
  return firm ? toDetail(firm) : null;
}

function toSummary(f) {
  return {
    slug: slugify(f.name),
    name: f.name,
    logo: firmLogo(f.name, f.logo),
    rating: f.rating,
    reviews: f.reviews,
    website: f.website,
    affiliateLink: f.affiliateLink,
    type: f.type,
    countryCode: f.countryCode,
    assets: f.assets,
    accountSizes: f.accountSizes,
    steps: f.steps,
    priceType: f.priceType,
    maxAlloc: f.maxAlloc,
    promoCode: f.promoCode,
    discount: f.discount,
    isNew: f.isNew,
    isPopular: f.isPopular,
    lastVerified: f.lastVerified,
  };
}

function toDetail(f) {
  return {
    ...toSummary(f),
    description: f.description,
    platforms: f.platforms,
    maxAccounts: f.maxAccounts,
    likes: f.likes,
    years: f.years,
    yearsLabel: f.yearsLabel,
    allocPct: f.allocPct,
    plans: f.plans,
  };
}
