import { NAESHIN_COMBOS, NAESHIN_SEMESTERS, comboAverage } from '../naeshin.ts'
import type { Naeshin, NaeshinCombo, NaeshinSemester } from '../types.ts'

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

function formatAvg(x: number | null): string {
  return x == null ? '-' : x.toFixed(2)
}

export default function NaeshinInput({ naeshin, onNaeshinChange }: NaeshinInputProps) {
  const setCell = (combo: NaeshinCombo, semester: NaeshinSemester, raw: string) => {
    onNaeshinChange({
      ...naeshin,
      [combo]: { ...naeshin[combo], [semester]: parseGrade(raw) },
    })
  }

  return (
    <section className="panel naeshin-input">
      <h2>내신 입력</h2>
      <div className="table-scroll">
        <table className="naeshin-table">
          <thead>
            <tr>
              <th>교과조합</th>
              {NAESHIN_SEMESTERS.map((s) => (
                <th key={s}>{s}</th>
              ))}
              <th>평균</th>
            </tr>
          </thead>
          <tbody>
            {NAESHIN_COMBOS.map((combo) => (
              <tr key={combo}>
                <td className="naeshin-combo-label">{combo}</td>
                {NAESHIN_SEMESTERS.map((semester) => (
                  <td key={semester}>
                    <input
                      type="number"
                      step={0.01}
                      min={1}
                      max={9}
                      value={naeshin[combo][semester] ?? ''}
                      onChange={(e) => setCell(combo, semester, e.target.value)}
                    />
                  </td>
                ))}
                <td className="naeshin-combo-avg">{formatAvg(comboAverage(naeshin[combo]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="field-note">
        평균은 1-1~3-1 학기 중 입력된 값들의 평균입니다 (없으면 전체 값을 사용). 참고용 표시이며 판정 계산에는
        반영되지 않습니다.
      </p>
    </section>
  )
}
