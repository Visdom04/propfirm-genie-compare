# Prop Firm Genie — four-page compare handoff

This repository **is** the share pack: four compare pages, the sheet pipeline, and these instructions. Take them into [propfirmgenie.com](https://propfirmgenie.com). Read this first. Then read `scripts/DATA-PIPELINE.md` before touching data.

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

Nav labels: Challenges · Firms · Overview · Head to head (`src/components/green/SiteNav.js`).

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
src/proxy.js
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
src/data/firms.js               # GENERATED — do not hand-edit plan arrays
```

### Sheet pipeline

```
scripts/DATA-PIPELINE.md        # full column contract
scripts/firm-plans.tsv          # Plans tab export
scripts/firms-meta.tsv          # Firms tab export
scripts/sync-firm-plans.mjs
scripts/validate-firm-plans.mjs
scripts/extend-firm-plans-cols.mjs
scripts/lib/plan-price.mjs
scripts/lib/firm-plans-parser.mjs
```

Logos: `src/lib/firmLogos.js` points at Supabase `genie-assets`. Local fallbacks live under `public/firm/`.

## Sheet sync (ops + agent)

Two Google Sheet tabs:

1. **Plans** → `scripts/firm-plans.tsv` — one row = one plan + account size.
2. **Firms** → `scripts/firms-meta.tsv` — affiliate link, last verified, `isPopular`, **Max Allocation**, **Rating**, **Reviews**. Do not add rank / country / years / platforms.

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

- Challenges (`FirmCompareDemoGreen`) currently imports **baked** `@/data/firms`.
- Overview, directory, H2H use `getRuntimeFirms()` (live `/tmp` catalog if a sheet push ran, else baked `firms.js`).

When wiring into PFG, prefer one catalog for all four pages so a sheet sync updates everything.

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

`src/app/challenges/page.js` → `DemoHeroGreen` → `FirmCompareDemoGreen`.

H1: Compare Prop **Challenges**. Pin columns: Firm + Price (sale, strikethrough, KAGE). Mid columns include raw payout freq.

### `/firms`

`FirmDirectoryTable` inside `GreenPageShell`. One row per firm, ranked.

H1: Browse Prop **Firms**.

### `/overview`

`FirmOverviewTable` + `summarizeFirm()` in `firmOverview.js`.

H1: Prop Firm **Overview**. Pin: Firm (left) · **View firm** (right). No Price pin.

Mid: account size range, plan types, platforms, S2F, eval from, activation, all-in, drawdown, max loss, days to pass, news, split, **compact payout**, max funded, discount, overview blurb.

Spotlight two names → link to `/compare?...`.

### `/compare`

`CompareFirmsH2H`. Query picks two firms + plan/size. Highlights use extended sheet columns (Account Category, Min Trading Days, Daily Drawdown, News Trading, List Price, Discount %).

H1: Compare **Head to Head**.

## Wiring into propfirmgenie.com

1. Drop the file tree above into the PFG Next app (or a package). Keep `#3FB185` and `GreenPageShell` unless design says otherwise.
2. Point `GENIE_FIRM_BASE` at production if the host is not `propfirmgenie.com`.
3. Merge `GENIE_FIRM_SLUGS` with the CMS `firmSlug` field so View firm never 404s.
4. Replace Challenges’ static `@/data/firms` import with the same `getRuntimeFirms()` (or PFG CMS) used elsewhere.
5. Keep sheet headers identical if ops still edits Google Sheets. Later, same columns → Supabase 1:1 (`DATA-PIPELINE.md` “Later”).
6. Promo code on Challenges CTAs is **KAGE** unless the plan row’s `Promo CODE` says otherwise.

## Verify

```bash
npm run dev
```

- [ ] `/challenges` — one row per plan; Price + KAGE still there; payout cell is the raw sheet text.
- [ ] `/` and `/demo-2` → `/challenges`.
- [ ] `/overview` — no Price pin; **View firm** on Apex opens `https://propfirmgenie.com/firm/apex`.
- [ ] Overview payout: Apex = `5 winning days` (not `$100 · $200 · $250…`). Tradeify / FundedNext are short cadence lists, not a paragraph dump.
- [ ] `/firms` directory still lists firms.
- [ ] `/compare` still highlights two picked plans.
- [ ] `/demo-4` → `/firms`, `/compare-page-2` → `/overview`, `/compare-firms` → `/compare`.
- [ ] After a dummy TSV edit: `validate:firms` → `sync:firms` → Challenges price/payout updates.

## Stack

Next.js **16.2** App Router (`src/app`), React 19, Tailwind 4, lucide-react. Compare tables use a mix of Tailwind + page CSS (`FirmCompareDemoGreen.edges.css`, `FirmOverviewTable.css`). Framer Motion / Anime.js are not required for these four pages.
