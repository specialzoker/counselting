import type { StudentScores } from '../types.ts'

const MONTHS = [3, 5, 6, 7, 9, 10, 11]

interface ScoreInputProps {
  scores: StudentScores
  onScoresChange: (scores: StudentScores) => void

  regionOptions: string[]
  selectedRegions: string[]
  onRegionsChange: (regions: string[]) => void

  gyeyeolOptions: string[]
  selectedGyeyeols: string[]
  onGyeyeolsChange: (gyeyeols: string[]) => void

  month: number
  onMonthChange: (month: number) => void

  fiveGrade: boolean
  onFiveGradeChange: (value: boolean) => void

  univQuery: string
  onUnivQueryChange: (value: string) => void

  moojibQuery: string
  onMoojibQueryChange: (value: string) => void
}

function parseNum(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export default function ScoreInput({
  scores,
  onScoresChange,
  regionOptions,
  selectedRegions,
  onRegionsChange,
  gyeyeolOptions,
  selectedGyeyeols,
  onGyeyeolsChange,
  month,
  onMonthChange,
  fiveGrade,
  onFiveGradeChange,
  univQuery,
  onUnivQueryChange,
  moojibQuery,
  onMoojibQueryChange,
}: ScoreInputProps) {
  const setField = (field: keyof StudentScores, raw: string) => {
    onScoresChange({ ...scores, [field]: parseNum(raw) })
  }

  return (
    <section className="panel score-input">
      <h2>성적 입력</h2>

      <div className="field-grid">
        <label className="field">
          <span>국어 백분위</span>
          <input
            type="number"
            min={0}
            max={100}
            value={scores.kor ?? ''}
            onChange={(e) => setField('kor', e.target.value)}
          />
        </label>
        <label className="field">
          <span>수학 백분위</span>
          <input
            type="number"
            min={0}
            max={100}
            value={scores.math ?? ''}
            onChange={(e) => setField('math', e.target.value)}
          />
        </label>
        <label className="field">
          <span>탐구1 백분위</span>
          <input
            type="number"
            min={0}
            max={100}
            value={scores.tam1 ?? ''}
            onChange={(e) => setField('tam1', e.target.value)}
          />
        </label>
        <label className="field">
          <span>탐구2 백분위</span>
          <input
            type="number"
            min={0}
            max={100}
            value={scores.tam2 ?? ''}
            onChange={(e) => setField('tam2', e.target.value)}
          />
        </label>
        <label className="field">
          <span>영어 등급</span>
          <input
            type="number"
            min={1}
            max={9}
            value={scores.engGrade ?? ''}
            onChange={(e) => setField('engGrade', e.target.value)}
          />
        </label>
        <label className="field">
          <span>한국사 등급</span>
          <input
            type="number"
            min={1}
            max={9}
            value={scores.hanGrade ?? ''}
            onChange={(e) => setField('hanGrade', e.target.value)}
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>기준 모의고사</span>
          <select value={month} onChange={(e) => onMonthChange(Number(e.target.value))}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </label>

        <label className="field checkbox-field">
          <span>
            <input
              type="checkbox"
              checked={fiveGrade}
              onChange={(e) => onFiveGradeChange(e.target.checked)}
            />
            5등급제 변환
          </span>
        </label>
      </div>
      <p className="field-note">
        기준 모의고사 월은 현재 단계에서 계산에 반영되지 않습니다 (참고용). 5등급제 변환은 결과표의 교과·종합
        50%/70%컷 표시에 반영됩니다 (차이값·판정 기준은 정시 백분위로 동일합니다).
      </p>

      <div className="field-grid">
        <label className="field">
          <span>대학명 검색</span>
          <input type="text" value={univQuery} onChange={(e) => onUnivQueryChange(e.target.value)} />
        </label>
        <label className="field">
          <span>모집단위 검색</span>
          <input type="text" value={moojibQuery} onChange={(e) => onMoojibQueryChange(e.target.value)} />
        </label>
      </div>

      <div className="chip-group">
        <span className="chip-group-label">지역(권역)</span>
        <div className="chips">
          {regionOptions.map((r) => (
            <button
              key={r}
              type="button"
              className={selectedRegions.includes(r) ? 'chip chip-selected' : 'chip'}
              onClick={() => onRegionsChange(toggle(selectedRegions, r))}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="chip-group">
        <span className="chip-group-label">계열</span>
        <div className="chips">
          {gyeyeolOptions.map((g) => (
            <button
              key={g}
              type="button"
              className={selectedGyeyeols.includes(g) ? 'chip chip-selected' : 'chip'}
              onClick={() => onGyeyeolsChange(toggle(selectedGyeyeols, g))}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
