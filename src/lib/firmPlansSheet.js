import fs from 'node:fs';
import path from 'node:path';
import { getCache } from '@vercel/functions';
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
  return firms.filter(f => !HIDDEN_FIRMS.has(f.name) && f.enabled !== false);
}

const CATALOG_PATH = path.join('/tmp', 'propfirm-firms-catalog.json');
const CATALOG_CACHE_KEY = 'propfirm-firms-catalog-v1';
const META_CACHE_KEY = 'propfirm-firms-meta-v1';
const CATALOG_TTL_SEC = 60 * 60 * 24 * 14;

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
    ...(meta.discount ? { discount: meta.discount } : {}),
    ...(meta.countryCode ? { countryCode: meta.countryCode } : {}),
    ...(typeof meta.years === 'number'
      ? { years: meta.years, yearsLabel: String(meta.yearsLabel ?? meta.years) }
      : {}),
    ...(Array.isArray(meta.assets) && meta.assets.length ? { assets: meta.assets } : {}),
    ...(Array.isArray(meta.platforms) && meta.platforms.length ? { platforms: meta.platforms } : {}),
    ...(typeof meta.enabled === 'boolean' ? { enabled: meta.enabled } : {}),
    ...(meta.logo ? { logo: firmLogo(firm.name, meta.logo) } : {}),
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
      result.push(
        applyFirmSheetMeta(
          {
            ...base,
            logo: firmLogo(name, base.logo),
            comingSoon: plans.length === 0,
            accountSizes: sizes,
            steps,
            priceType: priceTypes,
            plans,
          },
          meta
        )
      );
    } else {
      for (const p of plans) p.popularity = 1000;
      result.push(
        applyFirmSheetMeta(
          {
            name,
            logo: firmLogo(name, '/firm/placeholder.png'),
            rating: 0,
            reviews: 0,
            description: `${name} plans synced from Google Sheet.`,
            platforms: [],
            maxAccounts: '—',
            maxAlloc: sizes[sizes.length - 1] || '—',
            promoCode: plans[0]?.promoCode || 'KAGE',
            discount: 'No verified offer',
            website: '',
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
            isPopular: false,
            comingSoon: false,
            plans,
          },
          meta
        )
      );
    }
  }

  for (const f of staticFirms) {
    if (!byFirm.has(f.name)) result.push(applyFirmSheetMeta(f, metaMap.get(f.name)));
  }

  return result;
}

function planErrorLine(msg) {
  const m = String(msg).match(/^Plans:(\d+)/);
  return m ? Number(m[1]) : null;
}

function overlayMetaOnFirms(firms, metaMap) {
  if (!metaMap?.size) return firms;
  return firms.map(f => applyFirmSheetMeta(f, metaMap.get(f.name) || {}));
}

export function buildFirmsFromTsv(plansTsv, firmsTsv = '') {
  const metaMap = parseFirmsMetaTsv(firmsTsv);
  const syncedAt = new Date().toISOString();

  let parsed;
  try {
    parsed = parseTsv(plansTsv, { fileLabel: 'Plans' });
  } catch (err) {
    return {
      ok: true,
      partial: true,
      error: err instanceof Error ? err.message : 'Plans tab could not be parsed',
      validation: {
        errors: [],
        warnings: [
          err instanceof Error ? err.message : 'Plans tab could not be parsed',
          'Applied Firms tab (rating / reviews) onto last known plans.',
        ],
      },
      firms: overlayMetaOnFirms(staticFirms, metaMap),
      stats: { rows: 0, firms: metaMap.size },
      syncedAt,
    };
  }

  const validation = validateFirmPlans(parsed);
  const fatalLines = new Set(validation.errors.map(planErrorLine).filter(Boolean));
  const goodRows = parsed.rows.filter(r => !fatalLines.has(r.line));
  const skipped = parsed.rows.length - goodRows.length;
  const warnings = [
    ...(validation.warnings || []),
    ...validation.errors,
    ...(skipped ? [`Skipped ${skipped} invalid plan row(s); rest of the sheet still applied.`] : []),
  ];

  if (!goodRows.length) {
    return {
      ok: true,
      partial: true,
      error: 'No valid plan rows — applied Firms tab only',
      validation: { ...validation, errors: [], warnings },
      firms: overlayMetaOnFirms(staticFirms, metaMap),
      stats: { rows: 0, firms: metaMap.size },
      syncedAt,
    };
  }

  const parsedPlans = goodRows.map(rowToPlan);
  const firms = mergeSheetIntoFirms(parsedPlans, metaMap);

  return {
    ok: true,
    partial: skipped > 0,
    validation: { ...validation, errors: [], warnings },
    firms,
    stats: {
      rows: goodRows.length,
      firms: new Set(goodRows.map(r => r.firmName)).size,
    },
    syncedAt,
  };
}

function slimFirmMeta(firms = []) {
  const map = {};
  for (const f of firms) {
    if (!f?.name) continue;
    map[f.name] = {
      ...(f.affiliateLink ? { affiliateLink: f.affiliateLink } : {}),
      ...(f.lastVerified ? { lastVerified: f.lastVerified } : {}),
      ...(f.verifiedBy ? { verifiedBy: f.verifiedBy } : {}),
      ...(typeof f.isPopular === 'boolean' ? { isPopular: f.isPopular } : {}),
      ...(f.maxAlloc ? { maxAlloc: f.maxAlloc } : {}),
      ...(typeof f.rating === 'number' ? { rating: f.rating } : {}),
      ...(typeof f.reviews === 'number' ? { reviews: f.reviews } : {}),
      ...(f.discount ? { discount: f.discount } : {}),
      ...(f.countryCode ? { countryCode: f.countryCode } : {}),
      ...(typeof f.years === 'number' ? { years: f.years, yearsLabel: f.yearsLabel || String(f.years) } : {}),
      ...(Array.isArray(f.assets) && f.assets.length ? { assets: f.assets } : {}),
      ...(Array.isArray(f.platforms) && f.platforms.length ? { platforms: f.platforms } : {}),
      ...(typeof f.enabled === 'boolean' ? { enabled: f.enabled } : {}),
      ...(f.logo ? { logo: f.logo } : {}),
    };
  }
  return map;
}

function overlayMetaObject(firms, metaByName = {}) {
  return firms.map(f => applyFirmSheetMeta(f, metaByName[f.name] || {}));
}

function isLiveCatalog(raw) {
  return Boolean(raw && typeof raw === 'object' && Array.isArray(raw.firms) && raw.firms.length);
}

function runtimeCache() {
  try {
    return getCache({ namespace: 'propfirm' });
  } catch (err) {
    console.error('[firms-catalog] runtime cache unavailable', err);
    return null;
  }
}

export async function saveFirmsCatalog(payload) {
  const body = {
    firms: payload.firms,
    source: payload.source || 'google-sheet-push',
    syncedAt: payload.syncedAt || new Date().toISOString(),
    stats: payload.stats || null,
    warnings: payload.validation?.warnings || [],
  };
  globalThis.__propfirmFirmsCatalog = body;
  try {
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(body), 'utf8');
  } catch {
    // /tmp can be missing in some runtimes
  }

  let persisted = 'tmp';
  const cache = runtimeCache();
  if (cache) {
    try {
      await cache.set(CATALOG_CACHE_KEY, body, {
        ttl: CATALOG_TTL_SEC,
        tags: ['firms-sheet'],
        name: 'firms-catalog',
      });
      await cache.set(META_CACHE_KEY, slimFirmMeta(body.firms), {
        ttl: CATALOG_TTL_SEC,
        tags: ['firms-sheet'],
        name: 'firms-meta',
      });
      persisted = 'runtime-cache';
    } catch (err) {
      console.error('[firms-catalog] runtime cache set failed', err);
    }
  }
  return { ...body, persisted };
}

export async function readFirmsCatalog() {
  const cache = runtimeCache();
  if (cache) {
    try {
      const cached = await cache.get(CATALOG_CACHE_KEY);
      if (isLiveCatalog(cached)) {
        globalThis.__propfirmFirmsCatalog = cached;
        return cached;
      }
      const meta = await cache.get(META_CACHE_KEY);
      if (meta && typeof meta === 'object' && Object.keys(meta).length) {
        return {
          firms: overlayMetaObject(staticFirms, meta),
          source: 'google-sheet-meta',
          syncedAt: null,
          stats: null,
          warnings: [],
        };
      }
    } catch (err) {
      console.error('[firms-catalog] runtime cache get failed', err);
    }
  }

  try {
    if (fs.existsSync(CATALOG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
      globalThis.__propfirmFirmsCatalog = raw;
      return raw;
    }
  } catch {
    // ignore corrupt cache
  }
  // Dev: do not keep a process cache after /tmp is gone — it hid Firms-tab edits.
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__propfirmFirmsCatalog = null;
    return null;
  }
  return globalThis.__propfirmFirmsCatalog || null;
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
  const live = await readFirmsCatalog();
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
