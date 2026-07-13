import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { loadCalcPatterns, loadMoojib } from './data/loadData.ts'
import { computeStudentPercentile } from './engine/percentile.ts'
import { judge } from './engine/judge.ts'
import type { CalcPattern, Moojib, Naeshin, StudentScores } from './types.ts'
import { emptyNaeshin } from './naeshin.ts'
import ScoreInput from './ui/ScoreInput.tsx'
import NaeshinInput from './ui/NaeshinInput.tsx'
import NaeshinSummary from './ui/NaeshinSummary.tsx'
import ResultTable from './ui/ResultTable.tsx'

// 골든 학생 (엑셀 판정 결과 재현용 기본값).
const GOLDEN_SCORES: StudentScores = {
  kor: 94,
  math: 96,
  tam1: 68,
  tam2: 83,
  engGrade: 2,
  hanGrade: null,
}

function App() {
  const [moojib, setMoojib] = useState<Moojib[] | null>(null)
  const [patterns, setPatterns] = useState<CalcPattern[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [scores, setScores] = useState<StudentScores>(GOLDEN_SCORES)
  const [naeshin, setNaeshin] = useState<Naeshin>(emptyNaeshin())
  const [regions, setRegions] = useState<string[]>([])
  const [gyeyeols, setGyeyeols] = useState<string[]>([])
  const [month, setMonth] = useState(9)
  const [fiveGrade, setFiveGrade] = useState(false)
  const [univQuery, setUnivQuery] = useState('')
  const [moojibQuery, setMoojibQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([loadMoojib(), loadCalcPatterns()])
      .then(([m, p]) => {
        if (cancelled) return
        setMoojib(m)
        setPatterns(p)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const regionOptions = useMemo(() => {
    if (!moojib) return []
    return [...new Set(moojib.map((m) => m.kwon))].sort()
  }, [moojib])

  const gyeyeolOptions = useMemo(() => {
    if (!moojib) return []
    return [...new Set(moojib.map((m) => m.gyeyeol))].sort()
  }, [moojib])

  // 반영패턴 code → 학생 백분위 맵. 성적이 바뀔 때만 재계산.
  const percentileByCode = useMemo(() => {
    const map = new Map<string, number | null>()
    if (!patterns) return map
    for (const pattern of patterns) {
      map.set(pattern.code, computeStudentPercentile(pattern, scores))
    }
    return map
  }, [patterns, scores])

  const rows = useMemo(() => {
    if (!moojib) return []
    const result = judge(moojib, {
      studentPercentileByCode: (code) => (code != null ? (percentileByCode.get(code) ?? null) : null),
      fiveGrade,
      regions,
      gyeyeols,
      univQuery,
      moojibQuery,
    })
    return result
      .filter((r) => r.diff != null)
      .sort((a, b) => a.rank - b.rank)
  }, [moojib, percentileByCode, fiveGrade, regions, gyeyeols, univQuery, moojibQuery])

  const loading = !moojib || !patterns

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>수시 NAVI 판정</h1>
      </header>

      {loadError && <p className="error-note">데이터 로드 실패: {loadError}</p>}

      {loading && !loadError ? (
        <p className="loading-note">데이터 불러오는 중…</p>
      ) : (
        <main>
          <ScoreInput
            scores={scores}
            onScoresChange={setScores}
            regionOptions={regionOptions}
            selectedRegions={regions}
            onRegionsChange={setRegions}
            gyeyeolOptions={gyeyeolOptions}
            selectedGyeyeols={gyeyeols}
            onGyeyeolsChange={setGyeyeols}
            month={month}
            onMonthChange={setMonth}
            fiveGrade={fiveGrade}
            onFiveGradeChange={setFiveGrade}
            univQuery={univQuery}
            onUnivQueryChange={setUnivQuery}
            moojibQuery={moojibQuery}
            onMoojibQueryChange={setMoojibQuery}
          />
          <NaeshinInput naeshin={naeshin} onNaeshinChange={setNaeshin} />
          <NaeshinSummary naeshin={naeshin} />
          <ResultTable rows={rows} fiveGrade={fiveGrade} />
        </main>
      )}
    </div>
  )
}

export default App
