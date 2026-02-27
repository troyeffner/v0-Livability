import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Ongoing Budget — Livability',
  description: 'Cashflow, reserves, and envelopes.',
}

export default function OngoingBudgetPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ongoing Budget</h1>
        <p className="mt-1 text-muted-foreground">
          Coming soon — cashflow, reserves, and envelopes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              What this will do
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Monthly cashflow by envelope (operating, smoothing, reserve)
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Annual obligation tracking (insurance, taxes, registration)
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Pressure valve — flag reserve excess for redistribution
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Peak-funding shield for variable spending categories
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Liquidity Elasticity Index — a health score for financial flexibility
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Inputs we will need
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Monthly take-home income
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Fixed recurring expenses by category
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Annual obligations with due months
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Envelope balances (checking, smoothing buckets, reserve)
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Variable expense history — 12 months per category
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div>
        <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10">
          <Link href="/">Back to Mortgage &amp; Move</Link>
        </Button>
      </div>
    </div>
  )
}
