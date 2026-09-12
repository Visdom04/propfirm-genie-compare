#!/usr/bin/env node
/**
 * Validate scripts/firm-plans.tsv before sync.
 * Exit 1 on errors — keeps bad data out of the demo site.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFirmPlans } from './lib/firm-plans-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsvPath = path.join(__dirname, 'firm-plans.tsv');

const { validation } = await loadFirmPlans(tsvPath);

console.log(`Validated ${validation.stats.rows} plan rows across ${validation.stats.firms} firms.`);

if (validation.warnings.length) {
  console.log('\nWarnings:');
  for (const w of validation.warnings) console.warn(`  ⚠ ${w}`);
}

if (validation.errors.length) {
  console.error('\nErrors:');
  for (const e of validation.errors) console.error(`  ✗ ${e}`);
  console.error(`\nFix ${path.relative(process.cwd(), tsvPath)} and run again.`);
  process.exit(1);
}

console.log('\nOK — sheet data is valid.');
