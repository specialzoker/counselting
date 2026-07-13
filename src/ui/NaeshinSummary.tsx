import { NAESHIN_COMBOS, comboAverage } from '../naeshin.ts'
import type { Naeshin } from '../types.ts'

interface NaeshinSummaryProps {
  naeshin: Naeshin
}

function formatAvg(x: number | null): string {
  return x == null ? '-' : x.toFixed(2)
}

export default function NaeshinSummary({ naeshin }: NaeshinSummaryProps) {
  return (
    <div className="naeshin-summary">
      <span className="naeshin-summary-label">학생 내신 평균</span>
      <div className="naeshin-summary-badges">
        {NAESHIN_COMBOS.map((combo) => (
          <span key={combo} className="naeshin-summary-badge">
            {combo} <strong>{formatAvg(comboAverage(naeshin[combo]))}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
