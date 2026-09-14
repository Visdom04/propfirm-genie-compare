/**
 * Paste into: Google Sheet → Extensions → Apps Script
 *
 * SETUP:
 * 1. Keep your existing SYNC_SECRET (same as Vercel env SYNC_SECRET)
 * 2. Reload the sheet → menu "PropFirm Sync"
 * 3. PropFirm Sync → Purge leaky timers (once)
 * 4. PropFirm Sync → Install edit auto-sync (once)
 * 5. PropFirm Sync → Sync sheet → site now
 *
 * IMPORTANT: Do NOT click Google Sheets "Convert to table".
 */

const SYNC_URL = 'https://propfirm-genie-two.vercel.app/api/sync-firms';
const SYNC_URL_ALSO = 'https://propfirm-genie.vercel.app/api/sync-firms';
const SYNC_SECRET = 'PASTE_SAME_SECRET_AS_VERCEL'; // never commit real secret to git
const DEBOUNCE_MS = 60 * 1000;
const PLANS_TAB = 'firm-plans';
const FIRMS_TAB = 'Firms';

const PLANS_TSV_URL = 'https://propfirm-genie-two.vercel.app/data/firm-plans.tsv';
const PLANS_TSV_URL_FALLBACK = 'https://propfirm-genie.vercel.app/data/firm-plans.tsv';

const CORE_HEADERS = [
  'Firm',
  'Plan Type',
  'Account Size',
  'Drawdown Type',
  'Activation Fee',
  'Profit Target',
  'Max Drawdown',
  'Max Contract',
  'Consistency Rule Eval, Funded',
  'Payout Freq.',
  'Profit Split',
  'Price',
  'Promo CODE',
];

const EXTENDED_HEADERS = [
  'Account Category',
  'Min Trading Days',
  'Daily Drawdown',
  'News Trading',
  'List Price',
  'Discount %',
  'Price Note',
  'Info',
];

const FIRMS_HEADERS = [
  'Firm',
  'Affiliate Link',
  'Last Verified',
  'Verified By',
  'isPopular',
  'Max Allocation',
  'Rating',
  'Reviews',
  'Offer',
  'Country',
  'Years',
  'Assets',
  'Platforms',
  'Enabled',
  'Logo',
];

const EXPECTED_HEADERS = CORE_HEADERS.concat(EXTENDED_HEADERS);

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PropFirm Sync')
    .addItem('Diagnose sheet (find issues)', 'diagnoseSheet')
    .addItem('Strip ALL dropdowns', 'stripAllDropdowns')
    .addItem('Ensure header names only', 'ensureHeaderNamesOnly')
    .addItem('Add missing sheet columns', 'ensureOfferAndInfoColumns')
    .addItem('Sync sheet → site now', 'syncNow')
    .addSeparator()
    .addItem('Purge leaky timers', 'purgeLeakyTimers')
    .addItem('Install edit auto-sync', 'installEditTrigger')
    .addToUi();
}

function diagnoseSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = findSheet_(ss, PLANS_TAB);
  if (!sheet) throw new Error('Plans tab not found');

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  var lines = [];
  lines.push('Rows=' + lastRow + ' Cols=' + lastCol);
  lines.push('Expected headers (' + EXPECTED_HEADERS.length + '): ' + EXPECTED_HEADERS.join(' | '));
  lines.push('---');

  var blankHeader = [];
  var unexpected = [];
  for (var c = 0; c < lastCol; c++) {
    var name = String(headers[c] || '').trim();
    var colLetter = columnToLetter_(c + 1);
    var rules = sheet.getRange(2, c + 1, Math.min(lastRow, 5), c + 1).getDataValidations();
    var hasVal = false;
    var sampleRule = '';
    for (var r = 0; r < rules.length; r++) {
      if (rules[r][0]) {
        hasVal = true;
        try {
          sampleRule =
            JSON.stringify(rules[r][0].getCriteriaType()) +
            ' ' +
            JSON.stringify(rules[r][0].getCriteriaValues());
        } catch (e) {
          sampleRule = String(e);
        }
        break;
      }
    }
    if (!name && c < EXPECTED_HEADERS.length) blankHeader.push(colLetter);
    if (name && EXPECTED_HEADERS.indexOf(name) < 0) unexpected.push(colLetter + ':' + name);
    if (c >= EXPECTED_HEADERS.length && !name) {
      if (hasVal) lines.push(colLetter + ' GHOST+DROPDOWN ' + sampleRule);
    } else {
      lines.push(
        colLetter +
          '\t' +
          (name || '(BLANK)') +
          '\t' +
          (hasVal ? 'HAS_DROPDOWN ' + sampleRule : 'no-dropdown') +
          '\texpect=' +
          (EXPECTED_HEADERS[c] || '')
      );
    }
  }

  if (blankHeader.length) lines.push('BLANK HEADERS: ' + blankHeader.join(','));
  if (unexpected.length) lines.push('UNEXPECTED HEADERS: ' + unexpected.join(','));

  Logger.log(lines.join('\n'));
  SpreadsheetApp.getUi().alert(
    'Diagnosis written to Apps Script → Executions/Logs (View → Logs).\n\n' +
      'Blank headers: ' +
      (blankHeader.length ? blankHeader.join(', ') : 'none') +
      '\nUnexpected: ' +
      (unexpected.length ? unexpected.join(', ') : 'none')
  );
}

function columnToLetter_(column) {
  var temp = '';
  var col = column;
  while (col > 0) {
    var rem = (col - 1) % 26;
    temp = String.fromCharCode(65 + rem) + temp;
    col = Math.floor((col - 1) / 26);
  }
  return temp;
}

function stripAllDropdowns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = findSheet_(ss, PLANS_TAB);
  if (!sheet) throw new Error('Plans tab not found');
  try {
    var filter = sheet.getFilter();
    if (filter) filter.remove();
  } catch (e) {}
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
  SpreadsheetApp.getUi().alert(
    'All dropdowns stripped from Plans tab. Red triangles should clear after refresh.\nDo NOT Convert to table.'
  );
}

function ensureHeaderNamesOnly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = findSheet_(ss, PLANS_TAB);
  if (!sheet) throw new Error('Plans tab not found');
  sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).setValues([EXPECTED_HEADERS]);
  if (sheet.getMaxColumns() > EXPECTED_HEADERS.length) {
    sheet
      .getRange(1, EXPECTED_HEADERS.length + 1, sheet.getMaxRows(), sheet.getMaxColumns())
      .clear();
  }
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
  SpreadsheetApp.getUi().alert(
    'Header row forced to ' + EXPECTED_HEADERS.length + ' expected names. No dropdowns added.'
  );
}

function appendMissingHeaders_(sheet, expected) {
  if (!sheet) return [];
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet
    .getRange(1, 1, 1, lastCol)
    .getDisplayValues()[0]
    .map(function (h) {
      return String(h || '').trim();
    });
  var have = {};
  headers.forEach(function (h) {
    if (h) have[h] = true;
  });
  var missing = expected.filter(function (h) {
    return !have[h];
  });
  if (!missing.length) return missing;
  sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  return missing;
}

function ensureOfferAndInfoColumns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var plansMissing = appendMissingHeaders_(findSheet_(ss, PLANS_TAB), EXPECTED_HEADERS);
  var firmsMissing = appendMissingHeaders_(findSheet_(ss, FIRMS_TAB), FIRMS_HEADERS);
  SpreadsheetApp.getUi().alert(
    'Plans added: ' +
      (plansMissing.length ? plansMissing.join(', ') : 'none') +
      '\nFirms added: ' +
      (firmsMissing.length ? firmsMissing.join(', ') : 'none') +
      '\n\nOffer = picker promo line (e.g. 25% OFF - code KAGE).' +
      '\nInfo = extra note in the Plans (i) popup. Plan Type + Account Size still fill the list.' +
      '\nFirms: Country, Years, Assets, Platforms. Enabled = YES/NO (blank = show). Logo = paste a public Supabase image URL.'
  );
}

function onEditInstallable() {
  try {
    if (PropertiesService.getScriptProperties().getProperty('skipSync') === '1') return;
    scheduleSync_();
  } catch (err) {
    Logger.log('onEditInstallable ' + err);
  }
}

function installEditTrigger() {
  purgeQuietTriggers_();
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onEditInstallable') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onEditInstallable').forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getUi().alert('One edit trigger installed. Sync waits ~60s after you stop typing.');
}

function purgeLeakyTimers() {
  var n = purgeQuietTriggers_();
  SpreadsheetApp.getUi().alert(
    'Deleted ' + n + ' debounce timers.\nKeep only one “On edit” trigger. Then run Sync sheet → site now.'
  );
}

function countQuietTriggers_() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runSyncIfQuiet_') n += 1;
  });
  return n;
}

function purgeQuietTriggers_() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runSyncIfQuiet_') {
      ScriptApp.deleteTrigger(t);
      n += 1;
    }
  });
  return n;
}

function scheduleSync_() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('pendingSync', '1');
  props.setProperty('lastEditAt', String(Date.now()));
  if (countQuietTriggers_() > 0) return;
  ScriptApp.newTrigger('runSyncIfQuiet_').timeBased().after(DEBOUNCE_MS).create();
}

function runSyncIfQuiet_() {
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('skipSync') === '1' || props.getProperty('pendingSync') !== '1') {
      purgeQuietTriggers_();
      return;
    }

    var last = Number(props.getProperty('lastEditAt') || 0);
    if (Date.now() - last < DEBOUNCE_MS - 2000) {
      purgeQuietTriggers_();
      ScriptApp.newTrigger('runSyncIfQuiet_').timeBased().after(DEBOUNCE_MS).create();
      return;
    }

    props.setProperty('pendingSync', '0');
    purgeQuietTriggers_();
    syncNow();
  } catch (e) {
    Logger.log('runSyncIfQuiet_ ' + e);
    try {
      purgeQuietTriggers_();
    } catch (ignore) {}
  }
}

function sheetToTsv_(sheet) {
  if (!sheet) return '';
  var values = sheet.getDataRange().getDisplayValues();
  return values
    .map(function (row) {
      return row
        .map(function (cell) {
          return String(cell).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
        })
        .join('\t');
    })
    .join('\n');
}

function findSheet_(ss, name) {
  var exact = ss.getSheetByName(name);
  if (exact) return exact;
  if (name === PLANS_TAB) return ss.getSheets()[0];
  return null;
}

/** Push sheet → genie-two. Prop Firm Genie is optional and must not fail the run. */
function syncNow() {
  if (!SYNC_SECRET || SYNC_SECRET.indexOf('PASTE_') === 0) {
    throw new Error('Set SYNC_SECRET in this script to match Vercel SYNC_SECRET');
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var plansSheet = findSheet_(ss, PLANS_TAB);
  var firmsSheet = findSheet_(ss, FIRMS_TAB);
  var plansTsv = sheetToTsv_(plansSheet);
  var firmsTsv = sheetToTsv_(firmsSheet);

  if (!plansTsv || plansTsv.indexOf('Firm') !== 0) {
    throw new Error('Plans tab missing or header row must start with Firm');
  }

  var payload = JSON.stringify({
    source: 'google-apps-script',
    at: new Date().toISOString(),
    plansTsv: plansTsv,
    firmsTsv: firmsTsv || '',
  });
  var urls = [SYNC_URL, SYNC_URL_ALSO].filter(function (u) {
    return u && u.indexOf('https://') === 0;
  });
  var byUrl = {};
  urls.forEach(function (url) {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + SYNC_SECRET,
      },
      payload: payload,
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    byUrl[url] = { code: code, body: body };
    Logger.log(url + ' ' + code + ' ' + formatSyncBody_(body));
  });

  var primary = byUrl[SYNC_URL];
  if (!primary || primary.code < 200 || primary.code >= 300) {
    var detail = formatSyncBody_(primary && primary.body);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Genie-two failed ' + ((primary && primary.code) || '?') + ': ' + String(detail).slice(0, 180),
      'PropFirm Sync',
      10
    );
    throw new Error(
      'Genie-two sync failed: ' +
        SYNC_URL +
        ' → ' +
        ((primary && primary.code) || '?') +
        '\n' +
        detail
    );
  }

  var parsed = {};
  try {
    parsed = JSON.parse(primary.body);
  } catch (e) {}
  var msg =
    'Genie-two synced · ' +
    (parsed.firmCount || '?') +
    ' firms · Lucid reviews=' +
    (parsed.lucidReviews != null ? parsed.lucidReviews : '?') +
    ' · Tradeify reviews=' +
    (parsed.tradeifyReviews != null ? parsed.tradeifyReviews : '?');
  if (parsed.persisted) msg += ' · ' + parsed.persisted;
  if (parsed.partial || parsed.warningCount) {
    msg += ' · ' + (parsed.warningCount || parsed.warnings.length) + ' warning(s)';
  }
  SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'PropFirm Sync', 8);

  var also = SYNC_URL_ALSO && byUrl[SYNC_URL_ALSO];
  if (also && (also.code < 200 || also.code >= 300)) {
    Logger.log('Optional Prop Firm Genie sync skipped: ' + also.code + ' ' + also.body);
  }
}

function formatSyncBody_(body) {
  var text = String(body || '');
  try {
    var j = JSON.parse(text);
    var parts = [];
    if (j.ok === true) parts.push('ok');
    if (j.error) parts.push(j.error);
    if (j.message) parts.push(j.message);
    if (j.firmCount != null) parts.push('firms=' + j.firmCount);
    if (j.lucidReviews != null) parts.push('Lucid reviews=' + j.lucidReviews);
    if (j.tradeifyReviews != null) parts.push('Tradeify reviews=' + j.tradeifyReviews);
    if (j.persisted) parts.push('persisted=' + j.persisted);
    if (j.stats && j.stats.rows != null) parts.push('planRows=' + j.stats.rows);
    var warnCount = j.warningCount != null ? j.warningCount : ((j.warnings && j.warnings.length) || 0);
    if (warnCount) parts.push('warnings=' + warnCount);
    var errs = (j.validation && j.validation.errors) || [];
    if (errs.length) parts.push(errs.slice(0, 3).join(' | '));
    var warns = j.warnings || [];
    if (warns.length) parts.push(warns.slice(0, 3).join(' | '));
    return parts.join(' · ') || text.slice(0, 400);
  } catch (e) {
    return text.slice(0, 400);
  }
}
