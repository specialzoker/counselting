import { NAESHIN_COMBOS } from '../naeshin.ts'
import type { Naeshin } from '../types.ts'

interface NaeshinSummaryProps {
  naeshin: Naeshin
}

function formatGrade(x: number | null): string {
  return x == null ? '-' : x.toFixed(2)
}

export default function NaeshinSummary({ naeshin }: NaeshinSummaryProps) {
  return (
    <div className="naeshin-summary">
      <span className="naeshin-summary-label">학생 내신</span>
      <div className="naeshin-summary-badges">
        {NAESHIN_COMBOS.map((combo) => (
          <span key={combo} className="naeshin-summary-badge">
            {combo} <strong>{formatGrade(naeshin[combo])}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
