# Sheet → site (developer notes)

**PropFirm Sync** pushes the Google Sheet to Vercel (`POST /api/sync-firms`). That is production.

`npm run dev` does **not** get that push. Locally it overlays `scripts/firms-meta.tsv`.

Pages `/challenges`, `/firms`, `/overview` all read `getRuntimeFirms()`.

Code: `scripts/lib/firm-identity.mjs`, `scripts/lib/firm-plans-parser.mjs`, `src/lib/firmPlansSheet.js`, `src/lib/firmLogos.js`, `src/lib/platformLogos.js`.  
Test: `npm run test:firm-identity`.

---

## 1. Firm names are exact IDs

The `Firm` cell (after trim) is the ID. Similar names are **not** merged.

| Sheet | Site |
|---|---|
| `Tradeify` | Tradeify (futures) |
| `Tradeify 247` | Tradeify 247 (crypto). Different firm. |
| `My Funded Futures` | My Funded Futures |
| `My Funded Perps` | My Funded Perps. Different firm. |
| `Vest Markets` | Vest Markets |

Do **not** use `startsWith("Tradeify")` or map `Tradeify 247` → `Tradeify`.  
`FIRM_NAME_MAP` is rename-only (`FXIFY` → `FXIFY Futures`). Add a new alias only for a true rename.

Sheet rules:

- One Firms row per ID. Own Logo URL, own affiliate link, own Rating/Reviews.
- Plans rows must use the **same** spelling (`Tradeify 247`, not `Tradeify`).
- A Firms row with no Plans still appears (Coming soon until you set Coming Soon = `NO`).
- Match is case-sensitive (`tradeify` ≠ `Tradeify`).

Logo: a sheet Logo URL wins unless the **filename** belongs to another known firm (e.g. `Tradeify 247.webp` on the Tradeify row is ignored; Tradeify keeps `Tradeify_new.webp`).

Production = Google Sheet. Local TSV is not live.

---

## 2. Ratings / reviews

Sync already writes Rating and Reviews onto the catalog. `/challenges` and `/overview` used to hide the count when reviews &lt; 10. That gate is gone.

| Rating | What users see |
|---|---|
| `> 0` | `4.8` + stars + `[count]` |
| `0` or blank | **No reviews** (even if Reviews has a number) |

Blank cell = keep last known value. `0` is a real value.

Leftover: Overview gold star on the logo still needs reviews ≥ 10 **and** rating ≥ 4. It does not hide the count.

---

## 3. Coming Soon (Firms tab)

**Enabled** = hide the firm everywhere.  
**Coming Soon** = label + CTA only.

| Cell | Effect |
|---|---|
| `YES` / `soon` | Show Coming soon (even if Plans exist) |
| `NO` / `live` | Live firm; show rating/reviews |
| blank | Auto: Coming soon **only** if that firm has **no** Plans rows |

The bound Apps Script is **already updated** (`Coming Soon` is in `FIRMS_HEADERS`). Do not paste `SyncToVercel.gs` again.

1. **PropFirm Sync → Add missing sheet columns** (adds Coming Soon if the tab does not have it yet).
2. Fill Coming Soon only where auto is wrong.
3. **PropFirm Sync → Sync sheet → site now**.

`live` on Coming Soon = not coming soon. `live` on Enabled = show the firm.

---

## 4. Vest Markets + My Funded Perps logos

Same image is the **firm** mark and the **platform** icon. Files live in `genie-assets/firms/`, not `platforms/`.

| Firm / Platforms cell | URL |
|---|---|
| Vest Markets (also `Vest`) | `…/firms/Vest%20Markets.webp` |
| My Funded Perps (also `MyFundedPerps`) | `…/firms/My%20Funded%20Perps.webp` |

On the sheet: paste the Logo URL on the firm row. Put `Vest` / `Vest Markets` or `My Funded Perps` in **Platforms**. Do not put the Perps logo on **My Funded Futures**.
