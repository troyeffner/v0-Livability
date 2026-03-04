# Dispatch to Coach

**From:** Livability QB
**Date:** 2026-03-03
**Priority:** Normal

## Request

Migrate Livability deploy + hosting from GitHub Pages to Vercel.

**Current state:** `git push origin main` → GitHub Actions (nextjs.yml) → GitHub Pages (`troyeffner.github.io/v0-Livability/`)

**Why:** Vercel is better suited for Next.js apps — SSR support, preview deploys, faster builds, no base path workaround needed.

## Scope Note

This applies to **all migrated projects**, not just Livability. Coach should evaluate which projects in the registry are currently on GitHub Pages and batch-migrate them to Vercel hosting.

## What's Needed from Coach

1. Determine which registry projects need this migration
2. Set up Vercel project(s) and link to GitHub repos
3. Update `dev-gateway/projects.json` and registry entries with new production URLs
4. Retire GitHub Pages workflows (nextjs.yml) after Vercel is confirmed live
