# Prop Firm Genie — four-page compare handoff

This repository **is** the share pack: four compare pages, the Google Sheet pipeline, and these instructions. Take them into [propfirmgenie.com](https://propfirmgenie.com). Read this first. Then read `scripts/DATA-PIPELINE.md` before touching data.

It is **not** the rest of the marketing / auth app. Do not clone `Visdom04/propfirm-genie` for this work.

## Product

Brand: **Prop Firm Genie**. Accent `#3FB185`. Promo code **KAGE**.

The Google Sheet is the source of truth for plan economics. The site must not invent prices, payout rules, or slugs.

| Route | Grain | User job |
|---|---|---|
| `/challenges` | One **row per challenge / plan + size** | Filter by size, steps, price. Buy with KAGE. |
| `/firms` | One **row per firm** (directory) | Ranked browse: ratings, platforms, allocation, promo. |
| `/overview` | One **row per firm** (overview table) | Roll up sizes, eval, drawdown, payout cadence. **View firm** → PFG firm page. |
| `/compare` | Two firms, pick plans | Head-to-head with per-row highlights. |

`/` and `/demo-2` redirect to `/challenges`. Old demo URLs also redirect: `/demo-4` → `/firms`, `/compare-page-2` → `/overview`, `/compare-firms` → `/compare`. Live allow-list lives in `src/proxy.js` (Next.js 16 — this repo uses `proxy.js`, not `middleware.js`).

Nav labels in this pack: Challenges · Firms · Overview · Head to head (`src/components/green/SiteNav.js`). Those labels are for the demo. On propfirmgenie.com, keep the **existing production URLs** below.

## Where these go on propfirmgenie.com

This pack’s routes (`/challenges`, `/firms`, `/overview`, `/compare`) are the reference build on [propfirm-genie-two.vercel.app](https://propfirm-genie-two.vercel.app). They are **not** the production paths. Drop each table onto the PFG URL already in use:

| This pack (reference) | Live PFG URL |
|---|---|
| [`/challenges`](https://propfirm-genie-two.vercel.app/challenges) | [propfirmgenie.com/deals-coupons](https://propfirmgenie.com/deals-coupons) |
| [`/overview`](https://propfirm-genie-two.vercel.app/overview) | [propfirmgenie.com/compare-firms](https://propfirmgenie.com/compare-firms) |
| [`/firms`](https://propfirm-genie-two.vercel.app/firms) | [propfirmgenie.com](https://propfirmgenie.com/) (homepage) |
| [`/compare`](https://propfirm-genie-two.vercel.app/compare) | **No public nav today.** Head-to-head is opened from Overview when the user spots two firms (`/compare?a=…&b=…`). Optional: add a footer link. Do not put it in the main header unless product asks. |

Do **not** copy this pack’s redirects onto PFG. Here `/` goes to Challenges and `/compare-firms` goes to Head to head. On PFG, `/` is the firm directory and `/compare-firms` is Overview.

## Agent rules (do / do not)

**Do**

- Treat `scripts/firm-plans.tsv` + `scripts/firms-meta.tsv` as the ops source. Bake into `src/data/firms.js` with `npm run sync:firms`.
- Compute sale as **List Price × (1 − Discount % / 100)** when both cells exist. Typed **Price** is fallback only (and keeps `(monthly)`). Math: `scripts/lib/plan-price.mjs` → `src/lib/planPrice.js`.
- Keep **Apply discounts** as a viewer toggle. It does not change the sheet.
- On Overview (`/overview`), pin **View firm** to `https://propfirmgenie.com/firm/{slug}` from `src/lib/firmGenie.js`. Not the affiliate / KAGE checkout URL.
- On Overview, compact **Payout freq.** to cadence (`5 winning days`, `Daily`, `Every 5 days`). Strip size-specific dollar notes. Challenges and H2H still show the raw `Payout Freq.` cell.
- Before writing Next.js APIs, read `node_modules/next/dist/docs/` — this app is Next 16.

**Do not**

- Hand-edit plan rows in `src/data/firms.js`.
- Concatenate every plan’s raw payout cell onto Overview (that is what made Apex/Tradeify/FundedNext unreadable).
- Put a Price / KAGE CTA on the Overview pin. Price belongs on Challenges (per plan) and still appears as Eval / All-in mid-columns on Overview.
- Rename sheet headers (`Payout Freq.`, `List Price`, `Discount %`, `Promo CODE`, `Max Allocation`, `Rating`, `Reviews`, …).
- Commit contractor PDFs, `PROPFIRM_LOGO/`, or `demo-2-handoff/` (stale — it still talks about `/demo-2`).
- Box `/challenges`, `/overview`, or `/firms` in `max-height` / inner `overflow-y: auto`. The window scrolls; the board is `overflow-x: auto; overflow-y: clip`.
- Put `--cmp-firm` / `--ov-firm` / `--dir-*` column vars only on the table board. They must sit on the **workbench** so the extracted sticky header rail lines up. The rail is `overflow: hidden; min-width: 0` and copies `scrollLeft` from the board. Extracting headers without that is what stacked/misaligned the titles.

## Copy these files

### Pages + routing

```
src/app/challenges/page.js
src/app/page.js                 # redirect → /challenges
src/app/demo-2/page.js          # redirect → /challenges
src/app/firms/page.js
src/app/demo-4/page.js          # redirect → /firms
src/app/overview/page.js
src/app/compare-page-2/page.js  # redirect → /overview
src/app/compare/page.js
src/app/compare-firms/page.js   # redirect → /compare (keeps query)
src/app/api/sync-firms/route.js
src/proxy.js                    # this pack has no auth — keep NextResponse.next()
```

### UI

```
src/components/DemoHeroGreen.js
src/components/FirmCompareDemoGreen.js
src/components/FirmCompareDemoGreen.edges.css
src/components/FirmOverviewTable.js
src/components/FirmOverviewTable.css
src/components/CompareFilterSidebar.js
src/components/green/GreenPageShell.js
src/components/green/SiteNav.js
src/components/green/PfgControls.js
src/components/green/FirmDirectoryTable.js
src/components/green/FirmDirectoryTable.css
src/components/green/PlatformLogo.js
src/components/green/PlatformMarks.js
src/components/green/TableScrollSlider.js
src/components/compare/CompareFirmsH2H.js
src/components/compare/CompareFirmsH2H.css
```

`src/components/green/CompareTwoFirmsBar.js` is unused — skip it.

### Data + helpers

```
src/lib/firmGenie.js            # PFG /firm/{slug} map
src/lib/firmOverview.js         # one-row-per-firm rollup + payout compact
src/lib/firmPlansSheet.js       # runtime catalog + hide Earn2Trade
src/lib/planPrice.js
src/lib/compareHighlights.js
src/lib/firmLogos.js
src/lib/platformLogos.js
src/lib/firmsApi.js             # slugify for H2H query params
src/lib/firmSort.js
src/data/firms.js               # GENERATED — do not hand-edit plan arrays
```

### Sheet pipeline

```
scripts/DATA-PIPELINE.md        # full column contract
scripts/SHEET-SYNC-SETUP.md     # Apps Script → Vercel
scripts/google-apps-script/SyncToVercel.gs
scripts/firm-plans.tsv          # Plans tab export
scripts/firms-meta.tsv          # Firms tab export
scripts/sync-firm-plans.mjs
scripts/validate-firm-plans.mjs
scripts/extend-firm-plans-cols.mjs
scripts/lib/plan-price.mjs
scripts/lib/firm-plans-parser.mjs
```

Logos: `src/lib/firmLogos.js` and `src/lib/platformLogos.js` point at the public Supabase bucket `genie-assets`. Local fallbacks live under `public/firm/`.

**Firm marks (Apex, a new prop firm, a rebrand):** upload `{Firm Name}.webp` to `genie-assets/firms/`. Paste the public URL in the Firms tab **Logo** column. An `https://` Logo cell wins over the built-in map — that is how you add a firm that is not in `FIRM_LOGOS` yet. Overwrite the same file to refresh art without changing the sheet.

**Platform marks (NinjaTrader, a new broker):** there is no per-platform URL column. Upload `{Exact Name}.webp` to `genie-assets/platforms/`. Put that same name in the firm’s **Platforms** cell (`NinjaTrader, Tradovate, Rithmic`). Unknown names try `genie-assets/platforms/{Name}.webp` and fall back to initials if the file is missing.

Do not put image files in the Google Sheet. Do not put a platform URL in the firm **Logo** column.

## Sheet sync (ops + agent)

Two Google Sheet tabs:

1. **Plans** → `scripts/firm-plans.tsv` — one row = one plan + account size.
2. **Firms** → `scripts/firms-meta.tsv` — affiliate link, last verified, `isPopular`, **Max Allocation**, **Rating**, **Reviews**, **Country**, **Years**, **Assets**, **Platforms**, **Enabled**, **Logo**.

After any sheet change:

```bash
# 1. Export each tab as TSV and replace the two files above
npm run validate:firms
npm run sync:firms
# or all-in-one after column work:
npm run data:firms
```

`validate:firms` must be clean before publish. Typical failures: duplicate Firm+Plan Type+Size, missing Firm name, bad Discount %.

**Pricing cells**

| Column | Role |
|---|---|
| List Price | Retail / strikethrough |
| Discount % | Number `30`, not `30%` |
| Price | Fallback sale if list/% blank. Keep `(monthly)` here for monthly plans. |
| Promo CODE | Default `KAGE` |

Sale on the site = `List × (1 − % / 100)`, rounded to cents. The typed Price dollar amount is ignored when list + % are both set.

**Payout Freq. column**

Free text. Write the official rule in the cell (Challenges / H2H show it verbatim). Overview runs `compactPayout()` in `src/lib/firmOverview.js` and unique-joins cadences.

Examples:

| Sheet cell | Overview shows |
|---|---|
| `5 winning days of $100` / `$200` / `$350` (Apex, per size) | `5 winning days` |
| `Every 5 Days` · `Every 1 Day` · `Every 8 Days` (Lucid mix) | `Every 5 days · Daily · Every 8 days` (unique, first-seen order) |
| `5 days with Minimum profits of $100` · `Daily eligibility…` · `Not Fixed…` (Tradeify) | `5 days · Daily · 5 winning days · Not fixed` |
| `5 days (Weekly; bench ≥$100; 50% profits…)` (FundedNext) | `5 days (weekly)` plus other unique cadences on that firm |

If Overview looks wrong, fix the **sheet cell** or `compactPayout()` — do not paste a one-off string in the table component.

**Runtime vs baked data**

All four pages load `getRuntimeFirms()`. Typing in Google Sheets does **not** live-update the site — use **PropFirm Sync → Sync sheet → site now**. That POST hits `SYNC_URL` (`https://propfirm-genie-two.vercel.app/api/sync-firms`) and, if set, `SYNC_URL_ALSO` (`https://propfirm-genie.vercel.app/api/sync-firms`). Plum is not a sync target. The optional Genie push must not fail the run. `propfirmgenie.com` does not expose this API yet.

On localhost, `scripts/firms-meta.tsv` overlays Rating / Reviews / Max Allocation even if a stale `/tmp` catalog exists. Production keeps the Apps Script push as source of truth. Challenges no longer hard-imports `firms.js`.

## View firm URLs

Overview pin CTA: **View firm** → `https://propfirmgenie.com/firm/{slug}`.

Slugs that do **not** match `slugify(firm name)` are in `GENIE_FIRM_SLUGS` (`src/lib/firmGenie.js`):

| Firm name (sheet) | Slug |
|---|---|
| Apex Trader Funding | `apex` |
| DayTraders | `day-traders` |
| E8 Futures | `e8-markets-futures` |
| FundedNext Futures | `funded-next-futures` |
| Legends Trading | `legends` |
| Phidias Propfirm | `phidias` |

Everyone else uses kebab-case of the sheet name (`Lucid Trading` → `lucid-trading`). Example live page: [https://propfirmgenie.com/firm/apex](https://propfirmgenie.com/firm/apex).

When PFG adds or renames a CMS `firmSlug`, update `GENIE_FIRM_SLUGS`. Do not guess from affiliate domains.

Affiliate / KAGE checkout stays on **Challenges** (per-plan Price pin) and directory CTAs — not Overview.

## How each page is built

### `/challenges`

`src/app/challenges/page.js` → `DemoHeroGreen` → `FirmCompareDemoGreen`. On PFG this is **[ /deals-coupons ](https://propfirmgenie.com/deals-coupons)**.

H1: Compare Prop **Challenges**. Pin columns: Firm (left) · Promo + **View Firm** (right). Mid columns include raw payout freq. Profit split and Price use a smaller numeral than the other mid cells (smaller again on mobile). Mobile Promo / View Firm is a compact sticky stack (`--cmp-cta` in `FirmCompareDemoGreen.edges.css`).

The list is **page-length** (the window scrolls). Body rows are **window-virtualized**: the page still contains every matching plan, but only on-screen rows (plus a small overscan) are in the DOM. Do not mount all ~200 plan rows at once, and do not switch to paged “load more.” Do not restore `max-height` on `.cmp-workbench` or `overflow-y: auto` on `.cmp-edge-board`. Position virtual rows with `top`, never `transform` — a transform on the row breaks sticky Firm / Promo / View Firm. Column widths (`--cmp-firm`, `--cmp-promo`, `--cmp-visit`, `--cmp-cta`) live on `.cmp-workbench` so the sticky header rail matches body columns. Filters + headers stick under the nav (`.cmp-sticky-top`).

### `/firms`

`FirmDirectoryTable` inside `GreenPageShell`. One row per firm, ranked. On PFG this is the **[ homepage ](https://propfirmgenie.com/)**.

H1: Browse Prop **Firms**. Same page-length list as Challenges (`.dir-workbench { max-height: none }`, `.dir-board` is `overflow-x: auto; overflow-y: clip`). Filters + headers stick (`.dir-sticky-top`). Do not box the directory in `calc(100dvh …)`. Platforms: 3 marks + clickable **+N** (same `PlatformMarks` as Overview).

### `/overview`

`FirmOverviewTable` + `summarizeFirm()` in `firmOverview.js`. On PFG this is **[ /compare-firms ](https://propfirmgenie.com/compare-firms)**.

H1: Prop Firm **Overview**. Pin: Firm (left) · **View firm** (right). No Price pin.

Page-length list + sticky chrome/headers, same rules as Challenges (`--ov-firm` / `--ov-price` on `.ov-workbench`). Platforms show 3 marks, then **+N** — click to load the rest in a popover.

Mid: account size range, plan types, platforms, S2F, eval from, activation, all-in, drawdown, max loss, days to pass, news, split, **compact payout**, max funded, discount, overview blurb.

Spotlight two names → link to `/compare?a=…&b=…`. That is the main way users reach Head to head.

### `/compare`

`CompareFirmsH2H`. Query picks two firms + plan/size. Highlights use extended sheet columns (Account Category, Min Trading Days, Daily Drawdown, News Trading, List Price, Discount %).

H1: Compare **Head to Head**.

On PFG there is no header link for this page. Keep it that way: users arrive from Overview (spot two firms). A footer link is optional.

## Wiring into propfirmgenie.com

1. Drop the file tree above into the PFG Next app (or a package). Keep `#3FB185` and `GreenPageShell` unless design says otherwise.
2. Mount pages on the **existing PFG URLs** (see the table above): `/deals-coupons` ← Challenges, `/compare-firms` ← Overview, `/` ← Firms directory, Head to head as `/compare` (from Overview; optional footer).
3. Point `GENIE_FIRM_BASE` at production if the host is not `propfirmgenie.com`.
4. Merge `GENIE_FIRM_SLUGS` with the CMS `firmSlug` field so View firm never 404s.
5. Replace Challenges’ static `@/data/firms` import with the same `getRuntimeFirms()` (or PFG CMS) used elsewhere.
6. Keep sheet headers identical if ops still edits Google Sheets. Later, same columns → Supabase 1:1 (`DATA-PIPELINE.md` “Later”).
7. Promo code on Challenges CTAs is **KAGE** unless the plan row’s `Promo CODE` says otherwise.
8. On the PFG host, add env **`SYNC_SECRET`** (value is sent separately — not in this repo). Sheet sync `POST`s to `/api/sync-firms` with `Authorization: Bearer <SYNC_SECRET>`.

## Verify

```bash
npm run dev
```

- [ ] `/challenges` — one row per plan; Promo + View Firm on the right; page scroll (no inner table box); payout cell is the raw sheet text.
- [ ] `/challenges` still one long page (~200 plans) but only ~20–40 rows in the DOM while scrolling; sticky Firm / Promo / View Firm still line up.
- [ ] `/challenges` mobile — Promo / View Firm stay compact; Profit split % and Price $ are smaller than other mid cells.
- [ ] `/` and `/demo-2` → `/challenges`.
- [ ] `/overview` — no Price pin; **View firm** on Apex opens `https://propfirmgenie.com/firm/apex`; page scroll like Challenges.
- [ ] Overview payout: Apex = `5 winning days` (not `$100 · $200 · $250…`). Tradeify / FundedNext are short cadence lists, not a paragraph dump.
- [ ] `/firms` — directory lists firms; page scroll, not a boxed inner scroller.
- [ ] `/compare` still highlights two picked plans. On PFG this page has no header nav; Overview spotlight (and optional footer) is the entry.
- [ ] PFG URLs (do not use this pack’s redirects): `/deals-coupons` = Challenges, `/compare-firms` = Overview, `/` = Firms directory.
- [ ] `/demo-4` → `/firms`, `/compare-page-2` → `/overview`, `/compare-firms` → `/compare`.
- [ ] After a dummy TSV edit: `validate:firms` → `sync:firms` → Challenges price/payout updates.
- [ ] New firm logo: paste a Supabase `genie-assets/firms/…` URL in **Logo**, sync, mark appears. New platform: upload `platforms/{Name}.webp` and add the name to **Platforms**.

## Stack

Next.js **16.2** App Router (`src/app`), React 19, Tailwind 4, lucide-react, `@tanstack/react-virtual` (window virtualizer on Challenges). Compare tables use a mix of Tailwind + page CSS (`FirmCompareDemoGreen.edges.css`, `FirmOverviewTable.css`). Framer Motion / Anime.js are not required for these four pages. `@vercel/functions` is used for the live sheet catalog cache; localhost still works without it.
