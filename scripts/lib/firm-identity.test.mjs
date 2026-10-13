import assert from 'node:assert/strict';
import {
  exactFirmName,
  filenameSlugFromUrl,
  logoConflictsWithOtherFirm,
  similarFirmNameWarnings,
  unusedMetaFirmNames,
} from './firm-identity.mjs';
import { parseFirmsMetaTsv, resolveFirmName } from './firm-plans-parser.mjs';

assert.equal(exactFirmName('  Tradeify 247  '), 'Tradeify 247');
assert.equal(resolveFirmName('Tradeify 247'), 'Tradeify 247');
assert.equal(resolveFirmName('FXIFY'), 'FXIFY Futures');
assert.notEqual(resolveFirmName('Tradeify 247'), 'Tradeify');

const TRADEIFY_LOGO =
  'https://rtzkywwbsldinjgykqag.supabase.co/storage/v1/object/public/genie-assets/firms/Tradeify_new.webp';
const TRADEIFY_247_LOGO =
  'https://rtzkywwbsldinjgykqag.supabase.co/storage/v1/object/public/genie-assets/firms/Tradeify%20247.webp';
const known = ['Tradeify', 'Tradeify 247'];

assert.equal(filenameSlugFromUrl(TRADEIFY_247_LOGO), 'tradeify-247');
assert.equal(logoConflictsWithOtherFirm('Tradeify', TRADEIFY_247_LOGO, known), true);
assert.equal(logoConflictsWithOtherFirm('Tradeify', TRADEIFY_LOGO, known), false);
assert.equal(logoConflictsWithOtherFirm('Tradeify 247', TRADEIFY_247_LOGO, known), false);

const tsv = [
  'Firm\tAffiliate Link\tLast Verified\tVerified By\tisPopular\tMax Allocation\tRating\tReviews\tOffer\tCountry\tYears\tAssets\tPlatforms\tEnabled\tLogo\tComing Soon',
  'Tradeify\thttps://bit.ly/tradeifydiscount\t2026-08-28\tops\ttrue\t$750k\t4.8\t189\tSave $148 with code KAGE\tUS\t2\tFutures\tTradovate\t\t' +
    TRADEIFY_LOGO +
    '\tNO',
  'Tradeify 247\thttps://bit.ly/tradeify-crypto\t\tops\ttrue\t$300,000\tNone\t0\t\tUnited States\t0\tTokenized Indices, Crypto\tDXTrade, MT5\t\t' +
    TRADEIFY_247_LOGO +
    '\tYES',
].join('\n');

const meta = parseFirmsMetaTsv(tsv);
assert.equal(meta.has('Tradeify'), true);
assert.equal(meta.has('Tradeify 247'), true);
assert.notEqual(meta.get('Tradeify').logo, meta.get('Tradeify 247').logo);
assert.equal(meta.get('Tradeify 247').affiliateLink, 'https://bit.ly/tradeify-crypto');
assert.equal(meta.get('Tradeify').logo.includes('Tradeify_new'), true);
assert.equal(meta.get('Tradeify').comingSoon, false);
assert.equal(meta.get('Tradeify 247').comingSoon, true);

const unused = unusedMetaFirmNames(meta, ['Tradeify']);
assert.deepEqual(unused, ['Tradeify 247']);

const warnings = similarFirmNameWarnings(['Tradeify', 'Tradeify 247']);
assert.equal(warnings.length, 1);

console.log('firm-identity tests passed');
