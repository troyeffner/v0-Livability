# Livability

A housing decision toolkit: Mortgage & Move Planner, Decision Rehearsal, Home Sale, and Ongoing Budget.

Live: **[https://troyeffner.github.io/v0-Livability/](https://troyeffner.github.io/v0-Livability/)**

## Local development

**Install dependencies:**
```
pnpm install
```

**Dev server** (hot reload, no basePath — fastest for development):
```
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000)

**Static preview** (matches production output exactly):
```
pnpm build && npx serve out -p 3010
```
Open [http://localhost:3010](http://localhost:3010)

Note: `pnpm build` produces `./out` (static export). The dev server does not use `./out`.

## How basePath works

- **Locally** (`pnpm dev` or `pnpm build`): `GITHUB_ACTIONS` is not set, so `basePath` is empty. Assets resolve at the root.
- **GitHub Actions CI**: `GITHUB_ACTIONS=true` is set automatically, so `basePath: '/v0-Livability'` is applied and assets resolve correctly on GitHub Pages.
- The `configure-pages@v5` action validates the static export. Do not remove `output: 'export'` from `next.config.mjs`.

## Deploy

Push to `main` — GitHub Actions builds and deploys to GitHub Pages automatically.
