# Prop Firm Genie — compare pages handoff

This repo is **only** the four compare surfaces, the Google Sheet pipeline, and the instruction files. It is not the full Prop Firm Genie marketing app.

Read **[HANDOFF.md](./HANDOFF.md)** first (written for a developer or a coding agent). Sheet columns: **[scripts/DATA-PIPELINE.md](./scripts/DATA-PIPELINE.md)**.

## Pages

| Route | What it is |
|---|---|
| `/challenges` | One row per challenge / plan + size |
| `/demo-4` | Firm directory |
| `/compare-page-2` | One row per firm (overview) |
| `/compare-firms` | Head to head |

`/` and `/demo-2` redirect to `/challenges`.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000/challenges

After editing the sheet exports:

```bash
npm run validate:firms
npm run sync:firms
```
