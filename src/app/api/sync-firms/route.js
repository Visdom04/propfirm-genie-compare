import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
import {
  buildFirmsFromTsv,
  isSheetSyncConfigured,
  saveFirmsCatalog,
  readFirmsCatalog,
} from '@/lib/firmPlansSheet';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}

function checkSecret(request) {
  const expected = process.env.SYNC_SECRET;
  if (!expected) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const query = new URL(request.url).searchParams.get('secret') || '';
  return bearer === expected || query === expected;
}

/**
 * POST /api/sync-firms
 * Apps Script PUSHES Plans + Firms TSV in the body (no public sheet share needed).
 */
export async function POST(request) {
  if (!checkSecret(request)) return unauthorized();

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected JSON body' }, { status: 400 });
  }

  const plansTsv = body.plansTsv || body.plans || '';
  const firmsTsv = body.firmsTsv || body.firms || '';

  if (!plansTsv || typeof plansTsv !== 'string') {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Missing plansTsv. Update Apps Script to PUSH sheet data (see scripts/google-apps-script/SyncToVercel.gs).',
      },
      { status: 400 }
    );
  }

  try {
    const result = buildFirmsFromTsv(plansTsv, firmsTsv);
    const warnings = result.validation?.warnings || [];
    if (warnings.length) {
      console.warn('[sync-firms]', result.error || 'partial', warnings.slice(0, 20));
    }

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          validation: result.validation,
          message: 'Sync rejected — last good data kept live.',
        },
        { status: 422 }
      );
    }

    const saved = await saveFirmsCatalog({
      firms: result.firms,
      source: 'google-sheet-push',
      syncedAt: result.syncedAt,
      stats: result.stats,
      validation: result.validation,
    });

    revalidatePath('/challenges');
    revalidatePath('/firms');
    revalidatePath('/overview');
    revalidatePath('/compare');

    const lucid = result.firms.find(f => f.name === 'Lucid Trading');
    const tradeify = result.firms.find(f => f.name === 'Tradeify');
    const warningCount = warnings.length;
    console.info('[sync-firms] saved', {
      persisted: saved.persisted,
      firmCount: result.firms.length,
      lucidReviews: lucid?.reviews ?? null,
      tradeifyReviews: tradeify?.reviews ?? null,
      warningCount,
    });
    return NextResponse.json({
      ok: true,
      message: result.partial
        ? 'Sheet synced with warnings — invalid plan rows skipped. Firms tab applied.'
        : 'Sheet synced via Apps Script push.',
      stats: result.stats,
      syncedAt: saved.syncedAt,
      persisted: saved.persisted,
      firmCount: result.firms.length,
      lucidReviews: lucid?.reviews ?? null,
      tradeifyReviews: tradeify?.reviews ?? null,
      warningCount,
      warnings: warnings.slice(0, 8),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  if (!checkSecret(request)) return unauthorized();
  const live = await readFirmsCatalog();
  const lucid = live?.firms?.find(f => f.name === 'Lucid Trading');
  const tradeify = live?.firms?.find(f => f.name === 'Tradeify');
  return NextResponse.json({
    ok: true,
    configured: isSheetSyncConfigured(),
    mode: 'apps-script-push',
    hasLiveCatalog: Boolean(live?.firms?.length),
    syncedAt: live?.syncedAt || null,
    firmCount: live?.firms?.length || 0,
    lucidReviews: lucid?.reviews ?? null,
    tradeifyReviews: tradeify?.reviews ?? null,
  });
}
