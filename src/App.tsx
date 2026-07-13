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
import RefTable from './ui/RefTable.tsx'

// 골든 학생 (엑셀 판정 결과 재현용 기본값).
const GOLDEN_SCORES: StudentScores = {
  kor: 94,
  math: 96,
  tam1: 68,
  tam2: 83,
  engGrade: 2,
  hanGrade: null,
}

// 상단 탭: 판정 도구 + 참고 데이터 시트. key는 public/data/ref/<key>.json 파일명과 일치.
const REF_TABS: { key: string; label: string }[] = [
  { key: 'schedule', label: '전형일정' },
  { key: 'jayul', label: '전공자율' },
  { key: 'gyogwaBanyeong', label: '교과반영' },
  { key: 'jonghap', label: '종합' },
  { key: 'special', label: '특별전형' },
  { key: 'y2028', label: '2028대입' },
]

const TABS = [{ key: 'judge', label: '판정' }, ...REF_TABS]

function App() {
  const [activeTab, setActiveTab] = useState('judge')
  // 한 번 열린 탭은 계속 마운트 상태로 유지한다 (display:none으로 숨김) —
  // 참고 데이터 재요청 방지 + 판정 탭 입력 상태 보존.
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['judge']))

  function selectTab(key: string) {
    setActiveTab(key)
    setVisitedTabs((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }

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

      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab${activeTab === tab.key ? ' tab-active' : ''}`}
            onClick={() => selectTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div style={{ display: activeTab === 'judge' ? undefined : 'none' }}>
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

      {REF_TABS.filter((tab) => visitedTabs.has(tab.key)).map((tab) => (
        <div key={tab.key} style={{ display: activeTab === tab.key ? undefined : 'none' }}>
          <main>
            <RefTable tabKey={tab.key} />
          </main>
        </div>
      ))}
    </div>
  )
}

export default App
