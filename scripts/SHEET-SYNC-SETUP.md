# Google Sheet → Vercel live sync (PUSH mode)

Site: https://propfirm-genie-two.vercel.app/

Apps Script **pushes** Plans + Firms TSV to `/api/sync-firms` on genie-two, and optionally to Prop Firm Genie (`propfirm-genie.vercel.app`). Plum is retired — do not point `SYNC_URL_ALSO` at it.  
Sheet can stay **private** (no “Anyone with link” needed).

`propfirmgenie.com` does not have `/api/sync-firms` yet. Keep the optional push on the Vercel app until that route exists on the .com host.

## Vercel env

| Name | Required |
|------|----------|
| `SYNC_SECRET` | Yes — same as Apps Script |

`GOOGLE_SHEET_ID` / gids are optional in PUSH mode.

## Apps Script

1. Paste latest `scripts/google-apps-script/SyncToVercel.gs` (replace old script)
2. Set `SYNC_SECRET`
3. If Plans tab is not named `Plans`, set `PLANS_TAB` (e.g. `firm-plans`)
4. Run `installEditTrigger` once, then `syncNow`
5. **Extended compare cols:** run `ensureExtendedColumns` once (or rely on `syncNow` auto-append). Fill Min Trading Days / Daily Drawdown / News Trading / List Price / Discount % / Price Note.

Local seed (optional before paste into Sheet):

```bash
npm run extend:firms -- --write
npm run validate:firms
```

## Import from URL (one click)

After this branch is **pushed + Vercel deployed**:

1. Paste latest `scripts/google-apps-script/SyncToVercel.gs` (keep your real `SYNC_SECRET`)
2. Confirm `SYNC_URL` is `https://propfirm-genie-two.vercel.app/api/sync-firms`
3. Confirm `SYNC_URL_ALSO` is `https://propfirm-genie.vercel.app/api/sync-firms` (optional; must not fail the run)
4. Reload the spreadsheet → menu **PropFirm Sync**
5. **Strip ALL dropdowns** (clears red Invalid triangles)
6. Optional: **Diagnose sheet** → Apps Script Logs show per-column HAS_DROPDOWN

**Do NOT** click Google Sheets **Convert to table** — Tables invent dropdowns and cause red “Invalid input” on Min Days / Daily DD / News / List Price.

Red triangles ≠ bad data. They mean a dropdown rule rejects the cell (`setAllowInvalid(true)` still shows warnings).

## Test

After deploy is Ready, run `syncNow` — expect `"ok": true`.
