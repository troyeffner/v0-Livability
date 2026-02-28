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

---

## Using Codex Desktop in This Repo

### Startup Commands
```bash
# 1. Open Codex Desktop pointing to this folder:
#    /Users/troyeffner/Dropbox/DEV/Livability

# 2. Confirm baseline works before touching code:
pnpm install
pnpm build
npx serve out -p 3010   # → http://localhost:3010
```

Codex reads `AGENTS.md` on session start for build commands, architecture map, and safety constraints.

### Expected Daily Loop
1. `pnpm dev` → http://localhost:3000 — hot-reload dev session
2. Make changes in `components/` or `lib/`
3. `pnpm build` — verify static export builds cleanly to `out/`
4. `npx serve out -p 3010` — confirm preview matches GitHub Pages output
5. `git push origin main` — triggers GitHub Actions deploy

### Where to Make Changes
| Goal | Location |
|---|---|
| Business logic / calculations | `lib/` — pure TypeScript, no DOM |
| Mortgage & Move Planner UI | `components/property-workbench/` |
| Decision Rehearsal UI | `components/decision-rehearsal/dr-page.tsx` |
| Navigation / global layout | `components/app-shell.tsx` (NAV_ITEMS array) |
| New page/route | `app/[route-name]/page.tsx` |
| Brand colors / design tokens | `tailwind.config.ts` |
| UI primitives | `components/ui/` — use `npx shadcn@latest add`, never hand-edit |

### Where Specs and Contracts Live
| Artifact | Location |
|---|---|
| Build commands, architecture, safety rules | [`AGENTS.md`](./AGENTS.md) |
| Product context, glossary, decision policy | [`CODEX_CONTEXT.md`](./CODEX_CONTEXT.md) |
| Migration status and 7-day plan | [`07_Strategy_Canon_Artifacts/MIGRATION_BASELINE.md`](./07_Strategy_Canon_Artifacts/MIGRATION_BASELINE.md) |
| Entity map, governance gates, ownership | [`08_Data_Model_and_API_Contracts/codex_migration_checklist.md`](./08_Data_Model_and_API_Contracts/codex_migration_checklist.md) |
| Math formula canon | [`lib/finance-core.ts`](./lib/finance-core.ts) |

### Migration Artifacts
All migration and governance artifacts live in numbered folders at repo root:
- `07_Strategy_Canon_Artifacts/` — strategy, baseline, canon decisions
- `08_Data_Model_and_API_Contracts/` — entity contracts, governance checklists
