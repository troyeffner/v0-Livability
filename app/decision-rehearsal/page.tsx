import type { Metadata } from 'next'
import DrPage from '@/components/decision-rehearsal/dr-page'

export const metadata: Metadata = {
  title: 'Decision Rehearsal — Livability',
  description: 'A rehearsal map for decision pressure. Not financial advice or a prediction engine.',
}

export default function DecisionRehearsalPage() {
  return <DrPage />
}
