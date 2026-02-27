/** @type {import('next').NextConfig} */

// GITHUB_ACTIONS=true is set automatically by GitHub Actions.
// Locally (pnpm dev / pnpm build) this env var is absent, so basePath is empty
// and assets resolve correctly at http://localhost:3000 or via `npx serve out`.
const isCI = process.env.GITHUB_ACTIONS === 'true'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Static export — required for GitHub Pages.
  // Also used locally: `pnpm build` → ./out, then `npx serve out -p 3010`.
  output: 'export',
  // basePath injected only in CI so GitHub Pages sub-path works.
  basePath: isCI ? '/v0-Livability' : '',
  // trailingSlash ensures sub-pages (e.g. /home-sale/) export as index.html files.
  trailingSlash: true,
}

export default nextConfig
