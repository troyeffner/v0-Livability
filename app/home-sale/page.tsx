import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Home Sale — Livability',
  description: 'Estimate sale proceeds and transition costs.',
}

export default function HomeSalePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Home Sale</h1>
        <p className="mt-1 text-muted-foreground">
          Coming soon — estimate sale proceeds and transition costs.
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
                Net proceeds from sale (price minus agent fees, payoff, and taxes)
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Timeline from list to close
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Overlap cost window if carrying two homes
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Transition cost estimate (moving, repairs, staging)
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Roll equity forward into the next purchase
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
                Current home value estimate
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Remaining mortgage balance
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Agent commission rate
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Estimated closing costs
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">—</span>
                Target sale timeline
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
