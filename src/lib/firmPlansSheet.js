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
  if (globalThis.__propfirmFirmsCatalog?.firms?.length) {
    return globalThis.__propfirmFirmsCatalog;
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
  return null;
}

export function isSheetSyncConfigured() {
  return Boolean(process.env.SYNC_SECRET);
}

export async function getRuntimeFirms() {
  const live = readFirmsCatalog();
  if (live?.firms?.length) {
    return {
      firms: withoutHiddenFirms(live.firms),
      source: live.source || 'google-sheet-push',
      syncedAt: live.syncedAt || null,
      error: null,
    };
  }
  return { firms: withoutHiddenFirms(staticFirms), source: 'static', syncedAt: null, error: null };
}
