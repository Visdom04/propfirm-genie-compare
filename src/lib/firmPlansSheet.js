import fs from 'node:fs';
import path from 'node:path';
import { firms as staticFirms } from '@/data/firms';
import { firmLogo } from '@/lib/firmLogos';
import {
  parseTsv,
  parseFirmsMetaTsv,
  validateFirmPlans,
  rowToPlan,
} from '../../scripts/lib/firm-plans-parser.mjs';

export const FIRMS_SHEET_TAG = 'firms-sheet';

/** Firms removed from all live pages — filtered from runtime catalog. */
export const HIDDEN_FIRMS = new Set(['Earn2Trade']);

function withoutHiddenFirms(firms) {
  return firms.filter(f => !HIDDEN_FIRMS.has(f.name));
}

const CATALOG_PATH = path.join('/tmp', 'propfirm-firms-catalog.json');

function applyFirmSheetMeta(firm, meta = {}) {
  if (!meta || !Object.keys(meta).length) return firm;
  return {
    ...firm,
    ...(meta.affiliateLink ? { affiliateLink: meta.affiliateLink } : {}),
    ...(meta.lastVerified ? { lastVerified: meta.lastVerified } : {}),
    ...(meta.verifiedBy ? { verifiedBy: meta.verifiedBy } : {}),
    ...(typeof meta.isPopular === 'boolean' ? { isPopular: meta.isPopular } : {}),
    ...(meta.maxAlloc ? { maxAlloc: meta.maxAlloc } : {}),
    ...(typeof meta.rating === 'number' ? { rating: meta.rating } : {}),
    ...(typeof meta.reviews === 'number' ? { reviews: meta.reviews } : {}),
  };
}

function mergeSheetIntoFirms(parsedPlans, metaMap) {
  const byFirm = new Map();
  for (const { firmName, plan } of parsedPlans) {
    if (!byFirm.has(firmName)) byFirm.set(firmName, []);
    byFirm.get(firmName).push(plan);
  }

  const staticByName = new Map(staticFirms.map(f => [f.name, f]));
  const result = [];

  for (const [name, plans] of byFirm) {
    const base = staticByName.get(name);
    const meta = metaMap.get(name) || {};
    const sizes = [...new Set(plans.map(p => p.accountSize))].sort(
      (a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))
    );
    const steps = [...new Set(plans.map(p => p.steps))];
    const priceTypes = [...new Set(plans.map(p => p.priceType))];

    if (base) {
      const pop = base.likes || 1000;
      for (const p of plans) p.popularity = pop;
      result.push({
        ...base,
        logo: firmLogo(name, base.logo),
        comingSoon: plans.length === 0,
        ...(meta.affiliateLink ? { affiliateLink: meta.affiliateLink } : {}),
        ...(meta.lastVerified ? { lastVerified: meta.lastVerified } : {}),
        ...(meta.verifiedBy ? { verifiedBy: meta.verifiedBy } : {}),
        ...(typeof meta.isPopular === 'boolean' ? { isPopular: meta.isPopular } : {}),
        ...(meta.maxAlloc ? { maxAlloc: meta.maxAlloc } : {}),
        ...(typeof meta.rating === 'number' ? { rating: meta.rating } : {}),
        ...(typeof meta.reviews === 'number' ? { reviews: meta.reviews } : {}),
        accountSizes: sizes,
        steps,
        priceType: priceTypes,
        plans,
      });
    } else {
      for (const p of plans) p.popularity = 1000;
      result.push({
        name,
        logo: firmLogo(name, '/firm/placeholder.png'),
        rating: 0,
        reviews: 0,
        description: `${name} plans synced from Google Sheet.`,
        platforms: [],
        maxAccounts: '—',
        maxAlloc: sizes[sizes.length - 1] || '—',
        promoCode: plans[0]?.promoCode || 'KAGE',
        discount: 'KAGE',
        website: '',
        ...(meta.affiliateLink ? { affiliateLink: meta.affiliateLink } : {}),
        ...(meta.lastVerified ? { lastVerified: meta.lastVerified } : {}),
        type: 'Challenge',
        countryCode: 'US',
        likes: 1000,
        years: 1,
        yearsLabel: '1',
        assets: ['Futures'],
        accountSizes: sizes,
        steps,
        priceType: priceTypes,
        allocPct: 0.5,
        isNew: true,
        isPopular: Boolean(meta.isPopular),
        ...(meta.maxAlloc ? { maxAlloc: meta.maxAlloc } : {}),
        ...(typeof meta.rating === 'number' ? { rating: meta.rating } : {}),
        ...(typeof meta.reviews === 'number' ? { reviews: meta.reviews } : {}),
        comingSoon: false,
        plans,
      });
    }
  }

  for (const f of staticFirms) {
    if (!byFirm.has(f.name)) result.push(applyFirmSheetMeta(f, metaMap.get(f.name)));
  }

  return result;
}

export function buildFirmsFromTsv(plansTsv, firmsTsv = '') {
  const parsed = parseTsv(plansTsv, { fileLabel: 'Plans' });
  const validation = validateFirmPlans(parsed);
  if (validation.errors.length) {
    return {
      ok: false,
      error: 'Sheet validation failed',
      validation,
      firms: staticFirms,
    };
  }

  const parsedPlans = parsed.rows.map(rowToPlan);
  const metaMap = parseFirmsMetaTsv(firmsTsv);
  const firms = mergeSheetIntoFirms(parsedPlans, metaMap);

  return {
    ok: true,
    validation,
    firms,
    stats: validation.stats,
    syncedAt: new Date().toISOString(),
  };
}

export function saveFirmsCatalog(payload) {
  const body = {
    firms: payload.firms,
    source: payload.source || 'google-sheet-push',
    syncedAt: payload.syncedAt || new Date().toISOString(),
    stats: payload.stats || null,
    warnings: payload.validation?.warnings || [],
  };
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(body), 'utf8');
  // Also keep a process-local copy for this instance
  globalThis.__propfirmFirmsCatalog = body;
  return body;
}

export function readFirmsCatalog() {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
      globalThis.__propfirmFirmsCatalog = raw;
      return raw;
    }
  } catch {
    // ignore corrupt cache
  }
  // Long-lived `next dev` used to keep a process cache after /tmp was gone,
  // which hid Firms-tab edits (reviews / rating / max allocation).
  globalThis.__propfirmFirmsCatalog = null;
  return null;
}

export function isSheetSyncConfigured() {
  return Boolean(process.env.SYNC_SECRET);
}

function firmsMetaTsvPath() {
  return path.join(process.cwd(), 'scripts', 'firms-meta.tsv');
}

function overlayLocalFirmMeta(firms) {
  try {
    const file = firmsMetaTsvPath();
    if (!fs.existsSync(file)) return firms;
    const metaMap = parseFirmsMetaTsv(fs.readFileSync(file, 'utf8'));
    if (!metaMap.size) return firms;
    return firms.map(f => applyFirmSheetMeta(f, metaMap.get(f.name) || {}));
  } catch {
    return firms;
  }
}

export async function getRuntimeFirms() {
  const live = readFirmsCatalog();
  const fromSheetPush = Boolean(live?.firms?.length);
  let firms = fromSheetPush ? live.firms : staticFirms;
  // Dev: overlay scripts/firms-meta.tsv so Rating/Reviews/Max Allocation
  // show even if a stale Apps Script catalog is sitting in /tmp.
  // Production: the Google push is source of truth — do not let the last
  // git TSV overwrite a successful sync.
  if (!fromSheetPush || process.env.NODE_ENV !== 'production') {
    firms = overlayLocalFirmMeta(firms);
  }
  return {
    firms: withoutHiddenFirms(firms),
    source: fromSheetPush ? live.source || 'google-sheet-push' : 'static',
    syncedAt: live?.syncedAt || null,
    error: null,
  };
}
