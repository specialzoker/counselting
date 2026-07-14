import { useEffect, useMemo, useState } from 'react'
import { loadCaseChart } from '../data/loadCaseChart.ts'
import type { CaseChartData, CaseRow } from '../data/loadCaseChart.ts'
import DataTable from './DataTable.tsx'

// 레이아웃(px 고정 — 축 헤더와 본문 SVG를 정확히 정렬).
const LABEL_W = 210
const PLOT_W = 500
const RIGHT = 28
const TOTAL_W = LABEL_W + PLOT_W + RIGHT
const ROW_H = 24
const AXIS_H = 26

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function niceDomain(rows: CaseRow[]): [number, number] {
  const lows = rows.map((r) => r.c30).filter((v): v is number => v != null)
  const highs = rows.map((r) => r.c70).filter((v): v is number => v != null)
  if (lows.length === 0 || highs.length === 0) return [1, 5]
  const min = Math.floor(Math.min(...lows) / 0.5) * 0.5
  const max = Math.ceil(Math.max(...highs) / 0.5) * 0.5
  return [min, max === min ? min + 0.5 : max]
}

function CaseChart({ rows }: { rows: CaseRow[] }) {
  const [gmin, gmax] = useMemo(() => niceDomain(rows), [rows])
  const x = (g: number) => LABEL_W + ((g - gmin) / (gmax - gmin)) * PLOT_W

  const ticks: number[] = []
  for (let t = gmin; t <= gmax + 1e-9; t += 0.5) ticks.push(Math.round(t * 10) / 10)

  const bodyH = rows.length * ROW_H + 8

  return (
    <div className="casechart-scroll">
      <svg className="casechart-axis" width={TOTAL_W} height={AXIS_H} role="presentation">
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={AXIS_H - 8} textAnchor="middle" className="casechart-axis-text">
            {t.toFixed(1)}
          </text>
        ))}
        <text x={LABEL_W - 8} y={AXIS_H - 8} textAnchor="end" className="casechart-axis-text">
          내신 등급 →
        </text>
      </svg>

      <svg width={TOTAL_W} height={bodyH} role="img" aria-label="대학·전형별 30/50/70%컷 내신 범위 차트">
        {/* 그리드 */}
        {ticks.map((t) => (
          <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={bodyH} className="casechart-grid" />
        ))}
        {rows.map((r, i) => {
          const cy = i * ROW_H + ROW_H / 2 + 2
          const hasBar = r.c30 != null && r.c70 != null
          const label = `${r.univ} ${r.jh}`.trim()
          const tip =
            `${label} · ${r.cases ?? '-'}건\n` +
            `30% ${r.c30 ?? '-'} / 50% ${r.c50 ?? '-'} / 70% ${r.c70 ?? '-'}`
          return (
            <g key={i} className="casechart-row">
              <title>{tip}</title>
              <rect x={0} y={cy - ROW_H / 2} width={TOTAL_W} height={ROW_H} className="casechart-hit" />
              <text x={8} y={cy + 4} className="casechart-label">
                {truncate(label, 16)}
              </text>
              {hasBar && (
                <rect
                  x={x(r.c30 as number)}
                  y={cy - 3}
                  width={Math.max(2, x(r.c70 as number) - x(r.c30 as number))}
                  height={6}
                  rx={3}
                  className="casechart-bar"
                />
              )}
              {r.c50 != null && (
                <circle cx={x(r.c50)} cy={cy} r={4.5} className="casechart-marker" />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const TABLE_COLUMNS = ['순번', '대학', '세부전형', '합격 사례수', '30%컷', '50%컷', '70%컷']

export default function CaseChartTab() {
  const [data, setData] = useState<CaseChartData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'chart' | 'table'>('chart')

  useEffect(() => {
    let cancelled = false
    loadCaseChart()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tableRows = useMemo(
    () => (data ? data.rows.map((r) => [r.rank, r.univ, r.jh, r.cases, r.c30, r.c50, r.c70]) : []),
    [data],
  )

  if (error) {
    return <p className="error-note">데이터 로드 실패: {error}</p>
  }
  if (!data) {
    return <p className="loading-note">데이터 불러오는 중…</p>
  }

  return (
    <section className="panel casechart-tab">
      <div className="result-table-header">
        <h2>사례차트</h2>
        <button type="button" className="casechart-toggle" onClick={() => setView((v) => (v === 'chart' ? 'table' : 'chart'))}>
          {view === 'chart' ? '표로 보기' : '차트로 보기'}
        </button>
      </div>

      {data.intro.length > 0 && (
        <div className="special-intro">
          {data.intro.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      <p className="casechart-criteria">
        <strong>기준</strong> {data.criteria}
      </p>

      {view === 'chart' ? (
        <>
          <CaseChart rows={data.rows} />
          <p className="casechart-legend">
            막대 = 30~70%컷 범위 · 점 = 50%컷 · 내신 등급(낮을수록 우수)
          </p>
        </>
      ) : (
        <DataTable columns={TABLE_COLUMNS} rows={tableRows} />
      )}
    </section>
  )
}
