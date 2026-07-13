import { NAESHIN_COMBOS } from '../naeshin.ts'
import type { Naeshin, NaeshinCombo } from '../types.ts'

interface NaeshinInputProps {
  naeshin: Naeshin
  onNaeshinChange: (naeshin: Naeshin) => void
}

function parseGrade(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export default function NaeshinInput({ naeshin, onNaeshinChange }: NaeshinInputProps) {
  const setCombo = (combo: NaeshinCombo, raw: string) => {
    onNaeshinChange({ ...naeshin, [combo]: parseGrade(raw) })
  }

  return (
    <section className="panel naeshin-input">
      <h2>내신 입력</h2>
      <div className="naeshin-grid">
        {NAESHIN_COMBOS.map((combo) => (
          <label key={combo} className="naeshin-field">
            <span className="naeshin-field-label">{combo}</span>
            <input
              type="number"
              step={0.01}
              min={1}
              max={9}
              placeholder="등급"
              value={naeshin[combo] ?? ''}
              onChange={(e) => setCombo(combo, e.target.value)}
            />
          </label>
        ))}
      </div>
      <p className="field-note">
        교과조합별 내신 등급(1~9)을 입력하세요. 교과·종합전형 판정에 사용됩니다.
      </p>
    </section>
  )
}
