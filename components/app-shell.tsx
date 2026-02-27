'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  external?: boolean
  soon?: boolean
}

const NAV: NavItem[] = [
  { label: 'Mortgage & Move',    href: '/' },
  { label: 'Decision Rehearsal', href: '/decision-rehearsal' },
  { label: 'Home Sale',          href: '/home-sale',      soon: true },
  { label: 'Ongoing Budget',     href: '/ongoing-budget', soon: true },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-6">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="text-base font-semibold text-foreground tracking-tight">
                Livability
              </span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Main navigation">
              {NAV.map((item) => {
                const isActive =
                  !item.external &&
                  (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href))

                const baseClasses =
                  'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors'

                const activeClasses = isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'

                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${baseClasses} ${activeClasses}`}
                    >
                      {item.label}
                    </a>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${baseClasses} ${activeClasses}`}
                  >
                    {item.label}
                    {item.soon && (
                      <span className="rounded px-1 py-0.5 text-[10px] font-medium leading-none bg-muted text-muted-foreground">
                        Soon
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main>{children}</main>
    </div>
  )
}
